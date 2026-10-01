import { config } from './config.js';
import { waitForDb } from './db.js';
import { migrate } from './migrate.js';
import { startJobs } from './jobs.js';
import { createApp } from './app.js';

await waitForDb();
await migrate();
startJobs();

createApp().listen(config.port, () => {
  console.log(`Klokit API draait op poort ${config.port}`);
});
