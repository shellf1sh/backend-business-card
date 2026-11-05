export function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value || !/^postgres(?:ql)?:\/\//.test(value)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
  }
  return value;
}

export function port(): number {
  const value = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return value;
}
