import { PrismaClient } from '@prisma/client';
import { getEnvironment } from '../../config.js'; // Importa la función desde config.ts
import { skip } from 'node:test';

// Instanciar Prisma Client
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'], // Puedes ajustar los niveles de logs si es necesario
});

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
const eventStore = (saveEvent: (arg0: any) => any, getEvents: (aggregateId: string, minVersion: number) => any, findLastVersionByAggregateId: (aggregateId: string) => any) => ({
    save: (event: any) => saveEvent(event),
    getEvents: (aggregateId: string, minVersion: number) => getEvents(aggregateId, minVersion),
    findLastEvent: async (aggregateId: string) => findLastVersionByAggregateId(aggregateId).version
});

// Implementación de almacenamiento en memoria
const inMemoryStore = () => {
    let events: Event[] = [];
    return eventStore(
        (event) => {
            events.push(event);
            return Promise.resolve();

        },
        () => Promise.resolve(events),
        () => Promise.resolve(events.length)
    );
};

// Implementación de almacenamiento en Postgres con Prisma
const postgresStore = () => {
    // Función para guardar un evento en la base de datos
    const saveEventsToDB = async (events: {
        aggregate_id: string
        event_type: string
        event_data: any
        metadata: any
        version: number
        processed: boolean
    }[]) => await prisma.events.createMany({
        data: events
    });

    // Función para obtener eventos de la base de datos por llave de negocio
    const getEventsFromDB = async (aggregateId: string, minVersion: number = 0) =>
        await prisma.events.findMany({
            where: {
                aggregate_id: aggregateId,
                version: {
                    gt: minVersion,
                },
            },
        });

    const findLastVersionByAggregateId = async (aggregateId: string) =>
        await prisma.events.findFirst({
            where: {
                aggregate_id: aggregateId,
            },
            orderBy: {
                version: 'desc', // Ordena por versión en orden descendente
            }
        });

    // Devuelve el store con las funciones de interacción con la base de datos
    return eventStore(saveEventsToDB, getEventsFromDB, findLastVersionByAggregateId);
};

// Uso con Postgres
const useEventStorage = (environment: string) => {
    if (environment === 'production') {
        return postgresStore();
    } else {
        return inMemoryStore();
    }
};

// Selección del almacenamiento según el entorno
const eventStorage = useEventStorage(getEnvironment());

export { eventStorage };
