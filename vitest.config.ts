import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    pool: 'threads',
    fileParallelism: false,
    maxWorkers: 1,
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/unit/setup.ts',
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**'],
      reporter: ['text', 'json-summary', 'lcov', 'cobertura'],
      thresholds: {
        statements: 66, branches: 54, functions: 60, lines: 66,
        'src/App.tsx': { statements: 30, branches: 26, functions: 16, lines: 30 },
      },
    },
  },
});
