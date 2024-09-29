import { getDatabaseUrl } from './config.js';
//import { Knex } from 'knex';

// Extrae la configuración de la URL
const url = new URL(getDatabaseUrl());
//type KnexConfigMap = { [key: string]: Knex.Config } | Knex.Config;

//const knexConfig: KnexConfigMap = {
const knexConfig = {
    client: 'postgresql',
    connection: {
        host: url.hostname,
        port: parseInt(url.port, 10), // Convertir el puerto a número
        database: url.pathname.split('/')[1],
        user: url.username,
        password: url.password
    },
    pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 60000, // Tiempo de espera para adquirir una conexión (60s)
        createTimeoutMillis: 30000, // Tiempo de espera para crear una nueva conexión (30s)
        idleTimeoutMillis: 30000, // Tiempo de espera para cerrar una conexión inactiva (30s)
        reapIntervalMillis: 10000, // Intervalo para revisar conexiones inactivas
        createRetryIntervalMillis: 1000 // Intervalo para reintentar crear una conexión
    },
    acquireConnectionTimeout: 60000, // Tiempo máximo para obtener una conexión antes de fallar (60s)
    migrations: {
        tableName: 'knex_migrations'
    }
};

export default knexConfig;
