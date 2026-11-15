import type { RouteRecordRaw } from 'vue-router'
import BuyersView from './views/BuyersView.vue'
import * as BuyersRouting from './BuyersRouting'
import { requireActiveSession } from '@/router/guards'

export const buyersRoutes: RouteRecordRaw[] = [
  {
    // UC-UI-05: the buyer roster, grid or card. No :versionId segment - like /match, it reads
    // the selected version from the shared context store rather than the URL.
    path: '/buyers',
    name: BuyersRouting.buyers,
    component: BuyersView,
    beforeEnter: requireActiveSession,
    meta: { title: 'Buyers' },
  },
]
