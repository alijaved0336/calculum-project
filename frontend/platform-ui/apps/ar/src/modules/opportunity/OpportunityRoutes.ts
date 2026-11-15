import type { RouteRecordRaw } from 'vue-router'
import OpportunityHome from './views/OpportunityHome.vue'
import * as OpportunityRouting from './OpportunityRouting'
import { requireActiveSession } from '@/router/guards'

export const opportunityRoutes: RouteRecordRaw[] = [
  {
    path: '/opportunity',
    name: OpportunityRouting.opportunity,
    component: OpportunityHome,
    beforeEnter: requireActiveSession,
    meta: { title: 'Opportunity' },
  },
]
