/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*.svg' {
  const src: string
  export default src
}

/**
 * The app's environment contract. Declared so a typo in a variable name is a compile error rather
 * than `undefined` concatenated into a URL at runtime, which is how `undefined/api/session/info`
 * happens.
 */
interface ImportMetaEnv {
  /** Base URL of Ada.Ar.Api. Also the base the auth session uses. */
  readonly VITE_BASE_URL: string
  readonly VITE_APP_STORAGE_SECRET?: string
  readonly VITE_DEBUG?: string
  /** "true" starts Sentry. Off everywhere it is not set, so tests and local runs send nothing. */
  readonly VITE_ALLOW_SENTRY?: string
  /** Sentry DSN. Only read when VITE_ALLOW_SENTRY is "true". */
  readonly VITE_SENTRY_DSN?: string
  /** Google Maps JavaScript API key, for `@ada/design-system`'s `LocationMap`. */
  readonly VITE_GOOGLE_MAP_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * The release name, replaced at build time by vite.config's `define`. It is the same string the
 * source-map upload uses, which is the whole point: a mismatch here yields minified stack traces
 * with maps sitting unused in the Sentry project and nothing anywhere saying why.
 */
declare const __APP_RELEASE__: string
