import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export interface DatabaseEnvironment {
  DATABASE_URL?: string;
  DB_HOST?: string;
  DB_PORT?: string | number;
  DB_USER?: string;
  DB_PASSWORD?: string;
  DB_NAME?: string;
  DB_SSL?: string;
}

export function createDatabaseOptions(
  env: DatabaseEnvironment = process.env,
): PostgresConnectionOptions {
  const databaseUrl = env.DATABASE_URL?.trim();
  const host = env.DB_HOST?.trim() || 'localhost';
  let connectionHost = host;

  if (databaseUrl) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(databaseUrl);
    } catch {
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
    }

    if (parsedUrl.protocol !== 'postgres:' && parsedUrl.protocol !== 'postgresql:') {
      throw new Error('DATABASE_URL must use the postgres or postgresql protocol');
    }

    connectionHost = parsedUrl.hostname;
  }

  const sslSetting = env.DB_SSL?.trim().toLowerCase();
  if (sslSetting && sslSetting !== 'true' && sslSetting !== 'false') {
    throw new Error('DB_SSL must be set to true or false');
  }

  const useSsl =
    sslSetting === 'true' ||
    (sslSetting !== 'false' &&
      connectionHost !== 'localhost' &&
      connectionHost !== '127.0.0.1' &&
      connectionHost !== '::1');

  return {
    type: 'postgres',
    ...(databaseUrl
      ? { url: databaseUrl }
      : {
          host,
          port: Number(env.DB_PORT || 5432),
          username: env.DB_USER || 'postgres',
          password: env.DB_PASSWORD || '',
          database: env.DB_NAME || 'agendamento',
        }),
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  };
}
