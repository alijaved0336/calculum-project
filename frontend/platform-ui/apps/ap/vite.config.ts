import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevtools from 'vite-plugin-vue-devtools'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { execSync } from 'child_process'

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
const version: string = packageJson.version || '0.0.0'
const versionDate: string = new Date().toISOString().slice(0, 10).replace(/-/g, '')

let shortSha = 'local'
try {
  shortSha = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  // local dev without git history
}
const release = `${version}+${shortSha}`

const certPath = path.resolve(__dirname, 'ssl/localhost.pem')
const keyPath = path.resolve(__dirname, 'ssl/localhost-key.pem')
const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath)

const ignoreSvgCustomBlocks = {
  name: 'ignore-svg-custom-blocks',
  transform(_src: string, id: string) {
    if (/\.vue(\?.*&type=svg)/.test(id)) {
      return { code: 'export default {}', map: null }
    }
  },
}

const LIVE_API = 'https://api-nbot.hello-ada.com'
const LOCAL_SUPPORT_API = 'http://localhost:8080'
function localProxy(env: Record<string, string>, target: string = LIVE_API) {
  return {
    target,
    changeOrigin: true,
    secure: false,
    ws: true,
    configure: (proxy: any) => {
      const attach = (proxyReq: any) =>
        env.DEV_SESSION_COOKIE && proxyReq.setHeader('cookie', env.DEV_SESSION_COOKIE)
      proxy.on('proxyReq', attach)
      proxy.on('proxyReqWs', attach)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // The session token lasts ~10 min. Re-read it from .env.local on every proxied request so a
  // pasted-in fresh cookie takes effect without restarting the dev server.
  Object.defineProperty(env, 'DEV_SESSION_COOKIE', {
    get: () => loadEnv(mode, process.cwd(), '').DEV_SESSION_COOKIE,
  })
  return {
    plugins: [
      ...(mode === 'development' ? [vueDevtools()] : []),
      vue(),
      ignoreSvgCustomBlocks,
      ...(process.env.SENTRY_AUTH_TOKEN
        ? [
          sentryVitePlugin({
            org: 'calculum',
            project: 'ada-vue',
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
        '~': path.resolve(__dirname, 'src'),
        '@ds': path.resolve(__dirname, 'src/modules/components'),
        '@core': path.resolve(__dirname, 'src/services'),
        '@auth': path.resolve(__dirname, 'src/modules/auth'),
      },
    },

    define: {
      'process.env.PACKAGE_VERSION': JSON.stringify(version),
      'process.env.PACKAGE_VERSION_DATE': JSON.stringify(versionDate),
      'process.env.RELEASE_VERSION': JSON.stringify(release),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },

    server: {
      host: 'localhost',
      port: 8081,
      ...(useHttps && {
        https: {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        },
      }),
      proxy: {
        ...Object.fromEntries(
          [
            '/session', '/suppliers', '/threads', '/auth', '/tenants', '/playbooks', '/settings', '/health',
          ].map((p) => [p, localProxy(env)]),
        ),
        '^/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}': localProxy(env),
        '/negotiation-ingestion/settings': {
          ...localProxy(env),
          rewrite: (path: string) => path.replace(/^\/negotiation-ingestion/, ''),
        },
        '/negotiation-ingestion': localProxy(env),
        // Support agent backend runs locally for now.
        '/support-core': localProxy(env, LOCAL_SUPPORT_API),
        '/support-ingestion': localProxy(env, LOCAL_SUPPORT_API),
        // PRODUCTION services — own -prod prefix on the live host, forwarded as-is. Pair with the
        // PRODUCTION block in .env.local; comment these out when using the staging URLs there.
        '/negotiation-prod': localProxy(env),
        '/negotiation-ingestion-prod': localProxy(env),
        '/support-ingestion-prod': localProxy(env),
        '/support-core-prod': localProxy(env),
        '/api': {
          target: 'https://dev-api.hello-ada.com',
          changeOrigin: true,
          ws: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              if (env.DEV_SESSION_COOKIE) proxyReq.setHeader('cookie', env.DEV_SESSION_COOKIE)
              if (req.method === 'OPTIONS') {
                res.writeHead(200, {
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                  'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization, idk',
                  'Access-Control-Allow-Credentials': 'true',
                  'Access-Control-Max-Age': '86400',
                })
                res.end()
                return
              }
            })
            proxy.on('proxyRes', (proxyRes) => {
              proxyRes.headers['Access-Control-Allow-Origin'] = '*'
              proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
              proxyRes.headers['Access-Control-Allow-Headers'] = 'X-Requested-With, content-type, Authorization, idk'
              proxyRes.headers['Access-Control-Allow-Credentials'] = 'true'
            })
          },
        },
      },
    },

    // NOTE: this build needs NODE_OPTIONS=--max-old-space-size=6144 in CI (both AP pipelines set
    // it). Two things make the rollup render pass memory-hungry, and both are structural rather
    // than incidental:
    //
    //  1. '@ada/design-system' resolves (via its package.json "exports") straight to the package
    //     SOURCE, not a built artifact, and its entry is a barrel. Any of the ~160 AP files
    //     importing a single symbol from it pulls the whole barrel's import graph — including
    //     subsystems AP never renders, such as the
    //     Kendo charts added in PR 13602. Tree-shaking removes unused code from the OUTPUT, but
    //     rollup still has to parse and hold every module in the graph first, so the memory is
    //     spent either way. Subpath entry points would bound this.
    //  2. manualChunks below emits one vendor chunk per node_modules package (~1345 of them), and
    //     the render phase keeps them all in flight.
    //
    // Raising the ceiling unblocks the build; it does not address either cause.
    build: {
      sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
      // TEMP: CSS minification (esbuild and lightningcss both) corrupts the
      // unicode escapes Font Awesome 7 uses for icon glyphs (--fa: "\fXXX"
      // ends up empty). Disabled while manually testing @fortawesome/fontawesome-free
      // from design-system; revert once a scoped fix is in place.
      cssMinify: false,
      assetsDir: 'img',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              const match = id.match(/node_modules\/(.*?)(\/|$)/)
              if (match) {
                const hash = crypto
                  .createHash('md5')
                  .update(match[1])
                  .digest('hex')
                  .slice(0, 8)
                return `vendor.${hash}`
              }
            }
          },
        },
      },
    },

    css: {
      preprocessorOptions: {
        scss: {
          loadPaths: [path.resolve(__dirname), path.resolve(__dirname, '../../packages/design-system/src/styles')],
          silenceDeprecations: ['legacy-js-api', 'import', 'color-functions', 'global-builtin', 'if-function', 'abs-percent', 'slash-div'],
        },
        sass: {
          loadPaths: [path.resolve(__dirname), path.resolve(__dirname, '../../packages/design-system/src/styles')],
          silenceDeprecations: ['legacy-js-api', 'import', 'color-functions', 'global-builtin', 'if-function', 'abs-percent', 'slash-div'],
        },
      },
    },
  }
})
