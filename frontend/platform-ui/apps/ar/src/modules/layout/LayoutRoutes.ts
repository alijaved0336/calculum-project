import type { RouteRecordRaw } from 'vue-router'
import LayoutView from './LayoutView.vue'

/**
 * Parent layout route. Its component renders the app shell and a RouterView —
 * every module's routes attach to `children` (see router/index.ts) so they
 * render inside that shell instead of each module owning its own layout.
 */
export const layoutRoute: RouteRecordRaw = {
  path: '/',
  name: 'Ar',
  component: LayoutView,
  children: [],
}
