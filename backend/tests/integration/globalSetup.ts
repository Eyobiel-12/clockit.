import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { dbEnv } from './dbEnv.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * In CI draait MySQL in een container die net is opgestart. Even wachten tot hij
 * verbindingen aanneemt, anders faalt de hele suite op een toevallige timing.
 */
async function connect(attempts = 30) {
  for (let i = 1; ; i++) {
    try {
      return await mysql.createConnection({
        host: dbEnv.DB_HOST,
        port: Number(dbEnv.DB_PORT),
        user: dbEnv.DB_USER,
        password: dbEnv.DB_PASSWORD,
        multipleStatements: true,
      });
    } catch (error) {
      if (i >= attempts) throw error;
      console.log(`MySQL nog niet bereikbaar (poging ${i}/${attempts}), opnieuw over 2s…`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

/**
 * Zet een lege testdatabase klaar: aanmaken, schema laden en demodata invoeren.
 * De runtime-migraties uit `src/migrate.ts` draaien daarna in `setup.ts`, zodat
 * de tests precies het schema zien dat de API in productie ook gebruikt.
 */
export default async function setup() {
  const connection = await connect();

  await connection.query(`DROP DATABASE IF EXISTS \`${dbEnv.DB_NAME}\``);
  await connection.query(
    `CREATE DATABASE \`${dbEnv.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.changeUser({ database: dbEnv.DB_NAME });

  for (const file of ['db/init/001_schema.sql', 'db/init/002_seed.sql']) {
    await connection.query(readFileSync(join(root, file), 'utf8'));
  }

  await connection.end();
}
