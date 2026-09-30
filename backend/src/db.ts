import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  ...config.db,
  connectionLimit: 10,
  timezone: 'Z',
  dateStrings: false,
});

export async function waitForDb(retries = 30) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (i === retries) throw err;
      console.log(`Database nog niet bereikbaar (poging ${i}/${retries}), opnieuw over 2s…`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
