import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevtools from 'vite-plugin-vue-devtools'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import path from 'path'
import fs from 'fs'
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

// Serve over TLS when a certificate pair is present in ssl/, which is what makes a local sign-in
// work at all: the API is on https://localhost:65173, and while this side is http the two are
// cross-site under schemeful same-site, so the session cookies are dropped as third-party and the
// sign-in loops (G-295). ssl/ is gitignored; nothing here is committed.
//
// Two key filenames are accepted on purpose. `dotnet dev-certs https --format PEM` writes
// localhost.pem + localhost.KEY and is the tool the guide prescribes, because every developer
// already has the .NET SDK and its certificate covers localhost, 127.0.0.1 and ::1 — that last one
// matters for anyone working around G-98 with `--host 127.0.0.1`. mkcert writes
// localhost-KEY.pem instead. Accepting both costs three lines and removes a rename step from every
// developer's setup, which is a step that can be forgotten and produces a silent fall back to http.
const httpsCert = ((): { cert: string; key: string } | undefined => {
  const cert = path.resolve(__dirname, 'ssl/localhost.pem')
  const key = [
    path.resolve(__dirname, 'ssl/localhost-key.pem'), // mkcert
    path.resolve(__dirname, 'ssl/localhost.key'),     // dotnet dev-certs
  ].find(candidate => fs.existsSync(candidate))

  return fs.existsSync(cert) && key ? { cert, key } : undefined
})()

export default defineConfig(({ mode, command }) => {
  // The VITE_BYPASS_AUTH build guard stood here until UC-ENT-18 (G-47, G-60). It refused any
  // production build while that flag was set, because the flag made the router guard admit every
  // route without validating a session and an inlined env var is invisible once built.
  //
  // The flag has no reader left — the last one went with 6bd021715b — so the guard was protecting
  // a bundle that could not contain the thing it guarded against, and its waiver had to be carried
  // by two pipelines to keep DEV building at all. Declaration, guard and both waivers go together.
  //
  // What changed in kind, and is worth knowing before adding a switch like it again: the
  // protection is now that the flag does not exist, not that the build refuses it. `apps/ap` never
  // had an equivalent switch, which is why nothing there ever needed guarding, and that is the
  // shape to copy. The receivables API makes the same move on its own side of the wire: its
  // development bypass is refused outside Development rather than trusted to configuration.

  // A missing VITE_APP_STORAGE_SECRET already throws in services/pinia/index.ts, but that throw
  // fires at module scope in the browser: on a deploy with the variable unset, the result is a
  // white screen and nothing reported anywhere a pipeline would see it (G-61). It stays a runtime
  // throw on purpose, because it also has to fire on a developer's machine, where no build guard
  // runs. What was missing is the earlier check, so this refuses the production build itself
  // rather than waiting to fail in a browser nobody is watching.
  if (mode === 'production') {
    const env = loadEnv(mode, __dirname, 'VITE_')
    const required = ['VITE_BASE_URL', 'VITE_APP_STORAGE_SECRET']
    const missing = required.filter(name => !env[name])
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variable(s) for a production build: ${missing.join(', ')}. ` +
          'Set them in the deploy environment (or .env.production.local for a local production ' +
          'build) before building.',
      )
    }
  }

  return {
  plugins: [
    // Gated on `command`, not `mode`: `mode` is independent of the command (e.g. `vite build
    // --mode development` is a real dev/QA deploy pattern this config already supports via
    // loadEnv(mode, ...) above), so a mode check alone can ship the devtools client in a
    // production bundle, or drop it from a dev server started with a custom mode. `command ===
    // 'serve'` is what actually means "only while running the dev server".
    ...(command === 'serve' ? [vueDevtools()] : []),
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
    'process.env.NODE_ENV':             JSON.stringify(mode),
    'process.env.PACKAGE_VERSION':      JSON.stringify(version),
    'process.env.PACKAGE_VERSION_DATE': JSON.stringify(versionDate),
    'process.env.RELEASE_VERSION':      JSON.stringify(release),
    // The SAME string the source maps are uploaded under, above, baked in for Sentry.init to
    // report at runtime. Deliberately not a VITE_ variable: a release name configured in two
    // places drifts, and the failure is invisible — events arrive, maps sit in the project, and
    // the stack traces are minified with nothing to say why. One constant, one source.
    __APP_RELEASE__: JSON.stringify(release),
  },

  server: {
    // '127.0.0.1', not 'localhost': 'localhost' resolves to whatever the machine's DNS/hosts
    // order says first, which is '[::1]' (IPv6-only) on at least one machine this has been run
    // on, so the dev server listened on IPv6 only and Chrome — which resolves 'localhost' to
    // 127.0.0.1 there — could not reach it at all (G-98). Binding the literal IPv4 loopback
    // address is unambiguous regardless of a given machine's resolver order.
    host: '127.0.0.1',
    port: 8082,
    ...(httpsCert && {
      https: {
        key:  fs.readFileSync(httpsCert.key),
        cert: fs.readFileSync(httpsCert.cert),
      },
    }),
    // No `/api` proxy. It forwarded relative calls to the API, and nothing has made one since
    // UC-FE-08: `src/utils/getBaseApi.ts` returns VITE_BASE_URL and every request is absolute.
    // Keeping it would misrepresent how the app reaches the API locally — cross-origin, so the
    // API's CORS list and SameSite=None cookies are what make local development work, not this.
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
  }
})
