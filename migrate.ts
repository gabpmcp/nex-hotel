// migrate.js (script para ejecutar migraciones con ES6)
import knex from 'knex';
import config from 'knexfile.js';
import { getEnvironment } from './config.js'; // Importa la función desde config.ts

const environment = getEnvironment();
const knexInstance = knex(config[environment]);

(async () => {
    try {
        await knexInstance.migrate.latest();
        console.log('Migrations applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error applying migrations:', err);
        process.exit(1);
    }
})();
