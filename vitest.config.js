import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/icons/**', 'src/manifest.json'],
      thresholds: {
        lines: 85,
        branches: 75,
        functions: 85,
        statements: 85
      }
    },
    setupFiles: ['tests/mocks/chrome-api.js']
  }
});
