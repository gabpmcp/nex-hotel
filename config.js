import * as dotenv from 'dotenv';

// Carga las variables de entorno desde el archivo .env
dotenv.config();

// Tipo para las variables de entorno
//type EnvKey = 'DATABASE_URL' | 'PORT' | 'ENVIRONMENT' | 'DB_PORT' | 'POSTGRES_DB' | 'POSTGRES_USER' | 'POSTGRES_PASSWORD';

// Exportar funciones para obtener variables de entorno específicas con un valor predeterminado
export const getEnv = (key, defaultValue = '') =>
    process.env[key] || defaultValue;

// Exportar variables de entorno específicas como funciones
export const getDatabaseUrl = () => getEnv('DATABASE_URL');
export const getAppPort = () => parseInt(getEnv('PORT', '3000'), 10);
export const getEnvironment = () => getEnv('ENVIRONMENT', 'development');
export const getDBPort = () => parseInt(getEnv('DB_PORT', '5432'), 10);
export const getDBName = () => getEnv('POSTGRES_DB', '');
export const getUser = () => getEnv('POSTGRES_USER', '');
export const getPassword = () => getEnv('POSTGRES_PASSWORD', '');
