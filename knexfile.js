import { getDatabaseUrl } from './config.js'; // Importa la función desde config.ts

// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
const url = new URL(getDatabaseUrl());
export const client = 'postgresql';
export const connection = {
  host: url.hostname,
  port: url.port,
  database: url.pathname.split('/')[1],
  user: url.username,
  password: url.password
};
export const pool = {
  min: 2,
  max: 10
};
export const migrations = {
  tableName: 'knex_migrations'
};
