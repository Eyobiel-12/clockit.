import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      // Alleen modules met tests. Breid deze lijst uit zodra er tests bij komen,
      // zodat de drempel van 80% betekenis houdt in plaats van altijd rood te staan.
      include: [
        'src/api.ts',
        'src/auth.tsx',
        'src/useApi.ts',
        'src/lib/**/*.ts',
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
