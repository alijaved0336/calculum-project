import { createApp } from 'vue'
import * as Sentry from '@sentry/vue'
import { createI18n } from 'vue-i18n'
// AR was not loading the design tokens at all, so every var(--color-*, --bg-*, --font-*) the
// design-system components reference resolved to nothing; this import closes that.
import '@ada/design-system/styles/tokens.css'
import 'vue-toastification/dist/index.css'
import Toast, { POSITION } from 'vue-toastification'
import { configureAuth } from '@ada/auth'
import { messages, defaultLocale } from '@ada/design-system/locales/index'
import pinia from './services/pinia'
import App from './App.vue'
import { router } from './router'
import Footer from './components/layout/Footer.vue'
// Configure auth so authLogin/authLogout know which backend to use
configureAuth(import.meta.env.VITE_BASE_URL)

const i18n = createI18n({
  messages,
  locale: defaultLocale,
  fallbackLocale: defaultLocale,
  legacy: false,
  globalInjection: true,
  warnHtmlMessage: false,
})

const app = createApp(App)

// Registered globally so <CalculumLayout>'s footer slot (in design-system)
// can resolve it by name in AR, without every view importing it directly.
app.component('AppFooter', Footer)

app.use(pinia)
app.use(i18n)
app.use(router)
// API outcomes (saved / refused) as toasts, the same plugin and container AP uses.
app.use(Toast, { position: POSITION.TOP_RIGHT, shareAppContext: app })

// Observability, matching apps/ap and gated the same way.
//
// AR has been uploading source maps to Sentry on every deploy and posting a release marker from
// the pipeline, for an application that initialised Sentry nowhere and therefore sent no events.
// Maps and markers for a project with nothing to attach them to is the apparatus of observability
// without the thing itself, which reads as covered on every dashboard that lists it. ADR-0003 in
// `Ada-Platform` makes this a standing requirement on the backend at the level of testing; the UI
// had no equivalent. See G-58.
//
// Off unless VITE_ALLOW_SENTRY is set, so local development and tests stay silent.
if (import.meta.env.VITE_ALLOW_SENTRY === 'true') {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    // Baked in by vite.config's `define`, from the same constant the source-map upload uses.
    release: __APP_RELEASE__,
    integrations: [Sentry.browserTracingIntegration({ router })],
    // Same rate AP uses. Traces are for latency, not for counting: a full sample would bill for
    // every route change to learn what a tenth of them already says.
    tracesSampleRate: 0.1,
    // The AR screens carry customer financial data, so nothing is attached by default. A field
    // worth sending is sent deliberately, named, one at a time.
    sendDefaultPii: false,
  })
}

app.mount('#app')
