import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const ingestionLogsEnabled = import.meta.env.VITE_INGESTION_LOGS_ENABLED === 'true'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'suppliers',
      component: () => import('@/views/SuppliersView.vue'),
    },
    {
      path: '/chat/:supplierId',
      name: 'chat',
      component: () => import('@/views/ChatView.vue'),
    },
    {
      path: '/setup',
      name: 'setup',
      component: () => import('@/views/SetupView.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/super-admin',
      name: 'super-admin',
      component: () => import('@/views/SuperAdminView.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/super-admin/ingestion-logs',
      name: 'ingestion-logs',
      component: () => import('@/views/IngestionLogsView.vue'),
      meta: { requiresGlobalAdmin: true },
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  const uiStore = useUiStore()

  if (!to.meta.public && !authStore.isAuthenticated) {
    uiStore.setPendingRedirect(to.fullPath === '/' ? null : to.fullPath)
    return { name: 'login' }
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    return uiStore.consumePendingRedirect() ?? { name: 'suppliers' }
  }

  if (to.meta.requiresAdmin && authStore.role === 'user') {
    return { name: 'suppliers' }
  }

  if (to.meta.requiresGlobalAdmin && (!ingestionLogsEnabled || authStore.role !== 'global_platform_admin')) {
    return { name: 'suppliers' }
  }
})

export default router
