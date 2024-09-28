import * as dotenv from 'dotenv';

// Carga las variables de entorno desde el archivo .env
dotenv.config();

// Tipo para las variables de entorno
type EnvKey = 'DATABASE_URL' | 'PORT' | 'ENVIRONMENT' | 'DB_PORT' | 'POSTGRES_DB' | 'POSTGRES_USER' | 'POSTGRES_PASSWORD';

// Exportar funciones para obtener variables de entorno específicas con un valor predeterminado
export const getEnv = (key: EnvKey, defaultValue: string = ''): string =>
    process.env[key] || defaultValue;

// Exportar variables de entorno específicas como funciones
export const getDatabaseUrl = (): string => getEnv('DATABASE_URL');
export const getAppPort = (): number => parseInt(getEnv('PORT', '3000'), 10);
export const getEnvironment = (): string => getEnv('ENVIRONMENT', 'development');
export const getDBPort = (): number => parseInt(getEnv('DB_PORT', '5432'), 10);
export const getDBName = (): string => getEnv('POSTGRES_DB', '');
export const getUser = (): string => getEnv('POSTGRES_USER', '');
export const getPassword = (): string => getEnv('POSTGRES_PASSWORD', '');
