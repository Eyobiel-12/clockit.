function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Omgevingsvariabele ${name} ontbreekt`);
  return value;
}

export const config = {
  port: Number(env('PORT', '4000')),
  db: {
    host: env('DB_HOST', 'localhost'),
    port: Number(env('DB_PORT', '3306')),
    user: env('DB_USER', 'clockit'),
    password: env('DB_PASSWORD', 'clockit'),
    database: env('DB_NAME', 'clockit'),
  },
  jwtSecret: env('JWT_SECRET', 'dev-secret-verander-mij'),
  cookieSecure: env('COOKIE_SECURE', 'false') === 'true',
  timeZone: env('APP_TIMEZONE', 'Europe/Amsterdam'),
};
