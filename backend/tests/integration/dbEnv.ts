/**
 * Verbindingsgegevens voor de testdatabase. Zowel de Vitest-config als de
 * globalSetup gebruiken deze waarden, zodat ze nooit uit elkaar lopen.
 * In CI komen ze uit de MySQL service container; lokaal uit je eigen MySQL.
 */
export const dbEnv = {
  DB_HOST: process.env.DB_HOST ?? '127.0.0.1',
  DB_PORT: process.env.DB_PORT ?? '3306',
  DB_USER: process.env.DB_USER ?? 'root',
  DB_PASSWORD: process.env.DB_PASSWORD ?? '',
  // Een eigen database, zodat een testrun de ontwikkeldata nooit wist.
  DB_NAME: process.env.DB_NAME ?? 'clockit_test',
  JWT_SECRET: 'test-geheim-alleen-voor-tests',
  COOKIE_SECURE: 'false',
  APP_TIMEZONE: 'Europe/Amsterdam',
};
