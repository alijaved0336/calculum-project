import type { RouteRecordRaw } from 'vue-router'
import MainView from './MainView.vue'

/**
 * Mounted at "/". Renders while the session is being validated
 * (mirrors AP's modules/main/Main.vue) and then hands off to the
 * Dashboard route once the session check resolves.
 */
export const mainRoute: RouteRecordRaw = {
  path: '/',
  name: 'Main',
  component: MainView,
}
