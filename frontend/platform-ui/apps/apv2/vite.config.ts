import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevtools from 'vite-plugin-vue-devtools'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
const version: string = packageJson.version || '0.0.0'

let shortSha = 'local'
try {
  shortSha = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  // local dev without git history
}
const release = `${version}+${shortSha}`

const certPath = path.resolve(__dirname, 'ssl/localhost.pem')
const keyPath  = path.resolve(__dirname, 'ssl/localhost-key.pem')
const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath)

export default defineConfig(({ mode }) => ({
  plugins: [
    ...(mode === 'development' ? [vueDevtools()] : []),
    vue(),
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org:       'calculum',
            project:   'ada-vue',
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: {
              name: release,
              setCommits: { auto: true, ignoreMissing: true },
            },
            sourcemaps: {
              filesToDeleteAfterUpload: ['./dist/**/*.map'],
            },
          }),
        ]
      : []),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '~inter-ui': path.resolve(__dirname, '../../packages/design-system/node_modules/inter-ui'),
    },
  },

  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },

  server: {
    host: 'localhost',
    // Same port as AP so backend `base_uri=http://localhost:8081` lands here.
    // Do not run `dev:ap` and `dev:apv2` at the same time until a separate
    // APv2 backend (or base_uri support for 8083) is available.
    port: 8081,
    ...(useHttps && {
      https: {
        key:  fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
    }),
    proxy: {
      '/api': {
        target:       'https://localhost:8080',
        changeOrigin: true,
        secure:       false,
        ws:           true,
      },
    },
  },

  build: {
    sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [path.resolve(__dirname, '../../packages/design-system/src/styles')],
        silenceDeprecations: ['legacy-js-api', 'import', 'color-functions', 'global-builtin', 'if-function', 'abs-percent', 'slash-div'],
      },
      sass: {
        loadPaths: [path.resolve(__dirname, '../../packages/design-system/src/styles')],
        silenceDeprecations: ['legacy-js-api', 'import', 'color-functions', 'global-builtin', 'if-function', 'abs-percent', 'slash-div'],
      },
    },
  },
}))
