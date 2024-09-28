import { Pool } from 'pg';
import { getDatabaseUrl } from '../../config.js'; // Importa la función desde config.ts

const eventStore = (saveEvent: (arg0: any) => any, getEvents: () => any) => ({
    save: async (event: any) => await saveEvent(event),
    getAll: async () => await getEvents(),
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
const postgresStore = (connectionString: string) => {
    const pool = new Pool({ connectionString });

    const saveEventToDB = async (event: { id: any; type: any; data: any; }) => {
        const query = 'INSERT INTO events (id, type, data) VALUES ($1, $2, $3)';
        const values = [event.id, event.type, JSON.stringify(event.data)];
        await pool.query(query, values);
    };

    const getEventsFromDB = async () => {
        const result = await pool.query('SELECT id, type, data FROM events');
        return result.rows.map(row => ({
            id: row.id,
            type: row.type,
            data: JSON.parse(row.data),
        }));
    };

    return eventStore(saveEventToDB, getEventsFromDB);
};

// Uso con Postgres
/*const connectionString = 'postgresql://user:password@localhost:5432/mydb';
const postgresStorage = postgresStore(connectionString);
postgresStorage.save({ id: 2, type: 'EVENT_TYPE', data: 'EventData' });
postgresStorage.getAll().then(console.log); // [{ id: 2, type: 'EVENT_TYPE', data: 'EventData' }]*/

const useEventStorage = (environment: string) => {
    if (environment === 'production') {
        return postgresStore(getDatabaseUrl());
    } else {
        return inMemoryStore();
    }
};

// Selección del almacenamiento según el entorno
const eventStorage = useEventStorage(process.env.NODE_ENV);

// Uso del almacenamiento seleccionado
//eventStorage.save({ id: 3, type: 'EVENT_TYPE', data: 'EventData' });
//eventStorage.getAll().then(console.log); // Dependiendo del entorno, se obtendrán eventos de memoria o de Postgres

export { eventStorage }