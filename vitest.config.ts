import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { 'server-only': new URL('./tests/unit/stubs/server-only.ts', import.meta.url).pathname },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    testTimeout: 20000,
  },
});
