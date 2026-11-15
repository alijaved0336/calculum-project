import { RouteRecordRaw, createRouter, createWebHistory, Router } from 'vue-router'

export function createAppRouter(routes: RouteRecordRaw[], appTitle = 'ADA'): Router {
  const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior() {
      return { top: 0 }
    },
  })

  router.beforeEach((to, _from, next) => {
    window.document.title = to.meta?.title ? `${appTitle} - ${String(to.meta.title)}` : appTitle
    next()
  })

  return router
}
