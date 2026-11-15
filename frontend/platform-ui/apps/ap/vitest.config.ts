import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// Mirror vite.config's handling of `?type=svg` blocks so components that import
// inline SVGs can be mounted in tests (the SVG payload itself is irrelevant here).
const ignoreSvgCustomBlocks = {
  name: 'ignore-svg-custom-blocks',
  transform(_src: string, id: string) {
    if (/\.vue(\?.*&type=svg)/.test(id)) {
      return { code: 'export default {}', map: null }
    }
  },
}

export default defineConfig({
  plugins: [vue(), ignoreSvgCustomBlocks],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml'
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
        'e2e/',
        'dist/',
        'docs/',
        'public/',
        'scripts/',
        'test-results/',
        'playwright-report/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/types',
        'src/main.ts',
        'src/shims-vue.d.ts',
        'src/posthog.d.ts',
        'src/vue-shepherd.d.ts'
      ]
      // Thresholds disabled - enable gradually as coverage grows
      // thresholds: {
      //   statements: 70,
      //   branches: 60,
      //   functions: 70,
      //   lines: 70
      // }
    },
    include: ['tests/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['e2e/**/*', 'node_modules/**/*', 'dist/**/*'],
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~': path.resolve(__dirname, './src')
    }
  }
})

