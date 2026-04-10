import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: [
        'src/icons/**',
        'src/manifest.json',
        'src/config.example.js',
        'src/background/service-worker.js',  // WS-07: shell only
        'src/content/content-script.js',     // WS-02: shell, logic in extractor.js
        'src/ui/popup.js',                   // WS-08: shell only
        'src/shared/message-types.js'        // re-export only
      ],
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
