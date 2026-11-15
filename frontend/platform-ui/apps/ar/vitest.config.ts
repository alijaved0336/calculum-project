import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    // `services/pinia/index.ts` throws at import time when this is unset (deliberately - G-61,
    // so a missing secret fails loudly instead of silently encrypting persisted state under a
    // well-known default). CI's real secret comes from the S3-hosted `.env.local` this repo
    // cannot show a local checkout; a bare `pnpm test` has neither that file nor this value, so
    // any spec that reaches `useContextStore`, `ListMatch.vue`'s grid-column-preferences store,
    // or anything else importing that module - even transitively, even through an unrelated
    // route in `@/router` - throws before a single assertion runs. A fixed, obviously-fake value
    // here, not a real secret: nothing this unlocks is sensitive in a test run, since nothing
    // persisted here ever leaves the process.
    env: {
      VITE_APP_STORAGE_SECRET: 'vitest-fixed-non-secret-test-value',
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,ts,vue}'],
      reportsDirectory: './test-results/coverage',
      reporter: ['text', 'json', 'html', 'lcov', 'cobertura'],
      exclude: [
        '.git/',
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/main.ts',
        // Specs are not production code: counting them as covered lines inflates the number.
        'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      ],
    },
    // Both roots. With `tests/**` alone, a spec written next to the file it covers was silently
    // never run, while coverage still counted that file's lines as uncovered: a spec that made
    // the gate harder to pass by existing.
    include: [
      'tests/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: ['node_modules/**/*', 'dist/**/*'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
