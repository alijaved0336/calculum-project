import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createAppPinia } from '@ada/core'
import { configureAuth } from '@ada/auth'
import { messages, defaultLocale } from '@ada/design-system/locales/index'
import App from './App.vue'
import { router } from './router'
import './styles/main.scss'

configureAuth(import.meta.env.VITE_BASE_URL)

const { pinia } = createAppPinia({
  storageSecret: import.meta.env.VITE_APP_STORAGE_SECRET,
  encryptionNamespace: 'apv2-pinia',
  debug: import.meta.env.VITE_DEBUG === 'true',
})

const i18n = createI18n({
  messages,
  locale: defaultLocale,
  fallbackLocale: defaultLocale,
  legacy: false,
  globalInjection: true,
  warnHtmlMessage: false,
})

const app = createApp(App)

app.use(pinia)
app.use(i18n)
app.use(router)
app.mount('#app')
