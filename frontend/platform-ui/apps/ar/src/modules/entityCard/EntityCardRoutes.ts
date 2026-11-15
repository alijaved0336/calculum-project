import type { RouteRecordRaw } from 'vue-router'
import EntityCardView from './views/EntityCardView.vue'
import * as EntityCardRouting from './EntityCardRouting'
import { requireActiveSession } from '@/router/guards'

export const entityCardRoutes: RouteRecordRaw[] = [
  {
    // UC-UI-06: the Entity Card shell for one buyer. `:tab` is optional and deep-links straight
    // to one of the shell's tabs (UI-07/UI-08/UI-09's own destinations); its own route param
    // rather than a query string, matching the Customer Card's `:versionId/:buyerId` shape.
    path: '/entity-card/versions/:versionId/buyers/:buyerId/:tab?',
    name: EntityCardRouting.entityCard,
    component: EntityCardView,
    beforeEnter: requireActiveSession,
    props: true,
  },
]
