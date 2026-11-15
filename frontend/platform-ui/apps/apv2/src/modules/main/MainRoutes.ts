import type { RouteRecordRaw } from 'vue-router'
import MainView from './MainView.vue'

export const mainRoute: RouteRecordRaw = {
  path: '/',
  name: 'Main',
  component: MainView,
}
