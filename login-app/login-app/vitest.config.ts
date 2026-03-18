import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'node18',
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['*.test.ts'],
  },
});