import { defineConfig } from 'vitest/config';

/**
 * Unit tests: geen database nodig. Integratietests staan in `tests/integration`
 * en draaien via `vitest.integration.config.ts`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      // Alleen modules met tests. Zet een module hier pas bij als er tests voor zijn,
      // zodat de drempel van 80% echt iets betekent in plaats van altijd rood te staan.
      include: [
        'src/time.ts',
        'src/geo.ts',
        'src/summary.ts',
        'src/shift.ts',
        'src/auth.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
