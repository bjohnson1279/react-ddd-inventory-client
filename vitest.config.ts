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
        statements: 73, branches: 62, functions: 69, lines: 73,
        'src/App.tsx': { statements: 31, branches: 26, functions: 17, lines: 32 },
      },
    },
  },
});
