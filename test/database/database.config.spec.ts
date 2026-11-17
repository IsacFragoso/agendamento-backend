import { createDatabaseOptions } from '../../src/database/database.config';

describe('createDatabaseOptions', () => {
  it('uses SSL by default for a remote PostgreSQL host', () => {
    const options = createDatabaseOptions({
      DB_HOST: 'ep-example-pooler.c-2.us-east-1.aws.neon.tech',
    });

    expect(options.ssl).toEqual({ rejectUnauthorized: false });
  });

  it('uses a Neon connection URL and enables SSL from its host', () => {
    const options = createDatabaseOptions({
      DATABASE_URL: 'postgresql://user:password@ep-example.neon.tech/app',
    });

    expect(options.url).toBe('postgresql://user:password@ep-example.neon.tech/app');
    expect(options.ssl).toEqual({ rejectUnauthorized: false });
  });

  it('allows SSL to be explicitly disabled for a local database', () => {
    const options = createDatabaseOptions({
      DB_HOST: 'localhost',
      DB_SSL: 'false',
    });

    expect(options.ssl).toBe(false);
  });

  it('rejects invalid SSL settings', () => {
    expect(() => createDatabaseOptions({ DB_SSL: 'sometimes' })).toThrow(
      'DB_SSL must be set to true or false',
    );
  });
});
