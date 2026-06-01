import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js', 'tests/**/*.spec.js'],
    reporters: ['verbose', 'junit'],
    outputFile: 'test-results.xml',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['backend/**/*.js'],
      exclude: ['backend/scripts/**', '**/node_modules/**'],
    },
  },
});
