import { createAppRouter } from '@ada/core'
import { installAuthGuard, useSession } from '@ada/auth'
import { mainRoute } from '@/modules/main/MainRoutes'
import { layoutRoute } from '@/modules/layout/LayoutRoutes'
import { homeRoutes } from '@/modules/home/HomeRoutes'
import * as HomeRouting from '@/modules/home/HomeRouting'

layoutRoute.children = [
  ...homeRoutes,
]

layoutRoute.redirect = { name: HomeRouting.home }

const routes = [
  mainRoute,
  layoutRoute,
  {
    path: '/signout',
    name: 'Signout',
    meta: { public: true },
    component: () => import('@/views/SignoutView.vue'),
  },
]

export const router = createAppRouter(routes, 'ADA APV2')

installAuthGuard(router, async () => {
  const { isAuthenticated, fetchSession } = useSession()
  if (isAuthenticated.value) return true
  return fetchSession()
})
