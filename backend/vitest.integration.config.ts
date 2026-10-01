import { defineConfig } from 'vitest/config';
import { dbEnv } from './tests/integration/dbEnv.js';

/**
 * Integratietests draaien tegen een echte MySQL: een service container in CI,
 * een lokale MySQL daarbuiten. Geen dekkingsdrempel: deze tests bewaken gedrag.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: './tests/integration/globalSetup.ts',
    setupFiles: ['./tests/integration/setup.ts'],
    // Eén bestand tegelijk: de tests delen één database en zouden elkaar anders storen.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: dbEnv,
  },
});
