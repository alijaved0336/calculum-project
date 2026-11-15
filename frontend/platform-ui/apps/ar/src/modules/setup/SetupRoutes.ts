import type { RouteRecordRaw } from 'vue-router'
import SetupView from './views/SetupView.vue'
import * as SetupRouting from './SetupRouting'
import { requireActiveSession } from '@/router/guards'

export const setupRoutes: RouteRecordRaw[] = [
  {
    // AB#20702 (FR-02): the chosen tab is kept in the address; no tab means Payment Terms Reduction.
    path: '/setup/:tab(payment-terms|client-standard|cash-flow)?',
    name: SetupRouting.setup,
    component: SetupView,
    beforeEnter: requireActiveSession,
    meta: { title: 'Setup' },
  },
]
