import { createI18n } from 'vue-i18n'
import { messages, defaultLocale } from '@ada/design-system/locales/index'
import { secureStorage } from '@/services/pinia/index'

/**
 * Data modules (grid columns, chart options) resolve their labels at import time, and every route
 * is imported at boot — before the user, and therefore their language, is known. So the locale has
 * to be set when this instance is created; the persisted user store already holds it and SecureLS
 * reads are synchronous.
 */
function getPersistedLocale(): string {
  try {
    const stored = secureStorage.getItem('ada-user')
    const state = typeof stored === 'string' ? JSON.parse(stored) : stored
    const language = state?.actualUser?.language

    return language && language in messages ? language : defaultLocale
  } catch {
    return defaultLocale
  }
}

const i18n = createI18n({
  messages,
  locale: getPersistedLocale(),
  fallbackLocale: defaultLocale,
  legacy: false,
  globalInjection: true,
  warnHtmlMessage: false
})

/** Installed in main.ts, so `translate` and the components' `$t`/`useI18n` share one locale. */
export default i18n

export const translate = i18n.global
