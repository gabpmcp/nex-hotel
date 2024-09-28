import { getEnvironment } from '../../config.js'; // Importa la función desde config.ts
import knex from 'knex';
import knexConfig from '../../knexfile.js'; // Importa la configuración de knexfile

//Aquí se garantiza que solo hay una instancia única y reutilizable de Knex aprovechando la caché del sistema de modulos de NodeJS usando la configuración de knexfile.js
const db = knex(knexConfig);

/**
 * Crea un objeto para interactuar con un almacén de eventos.
 * El objeto resultante tiene dos métodos:
 * - `save(event)`: Guarda el evento en el almacén.
 * - `getAll()`: Obtiene todos los eventos del almacén.
 *
 * @param saveEvent Función que se llama para guardar un evento.
 * @param getEvents Función que se llama para obtener todos los eventos.
 * @returns Un objeto con los métodos mencionados.
 */
const eventStore = (saveEvent: (arg0: any) => any, getEvents: (aggregateId: string, minVersion: number) => any) => ({
    save: async (event: any) => await saveEvent(event),
    getEvents: async (aggregateId: string, minVersion: number) => await getEvents(aggregateId, minVersion),
});

// Implementación de almacenamiento en memoria
const inMemoryStore = () => {
    let events = [];
    return eventStore(
        (event) => {
            events.push(event);
            return Promise.resolve();
        },
        () => Promise.resolve(events)
    );
};

// Uso en memoria
/*const memoryStorage = inMemoryStore();
memoryStorage.save({ id: 1, type: 'EVENT_TYPE', data: 'EventData' });
memoryStorage.getAll().then(console.log); // [{ id: 1, type: 'EVENT_TYPE', data: 'EventData' }]*/


// Implementación de almacenamiento en Postgres
// Función para interactuar con el store de eventos usando Knex
const postgresStore = () => {
    // Función para guardar un evento en la base de datos
    const saveEventToDB = async (event: {
        aggregateId: string;
        eventType: string;
        eventData: any;
        metadata?: any;
        version?: number;
        processed?: boolean;
    }) => {
        db('events').insert({
            aggregate_id: event.aggregateId,
            event_type: event.eventType,
            event_data: event.eventData,
            metadata: event.metadata || {},
            version: event.version || 1,
            processed: event.processed || false,
        });
    };

    // Función para obtener eventos de la base de datos por llave de negocio
    const getEventsFromDB = async (aggregateId: string, minVersion: number = 0) =>
        db('events')
            .where('aggregate_id', aggregateId)
            .andWhere('version', '>', minVersion)
            .select('*');

    // Devuelve el store con las funciones de interacción con la base de datos
    return eventStore(saveEventToDB, getEventsFromDB);
};

// Uso con Postgres
/*const connectionString = 'postgresql://user:password@localhost:5432/mydb';
const postgresStorage = postgresStore(connectionString);
postgresStorage.save({ id: 2, type: 'EVENT_TYPE', data: 'EventData' });
postgresStorage.getAll().then(console.log); // [{ id: 2, type: 'EVENT_TYPE', data: 'EventData' }]*/

const useEventStorage = (environment: string) => {
    if (environment === 'production') {
        return postgresStore();
    } else {
        return inMemoryStore();
    }
};

// Selección del almacenamiento según el entorno
const eventStorage = useEventStorage(getEnvironment());

export { eventStorage }