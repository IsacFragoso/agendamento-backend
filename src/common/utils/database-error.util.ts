export function getPostgresErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const databaseError = error as {
    code?: unknown;
    driverError?: { code?: unknown };
  };
  const code = databaseError.driverError?.code ?? databaseError.code;
  return typeof code === 'string' ? code : undefined;
}
