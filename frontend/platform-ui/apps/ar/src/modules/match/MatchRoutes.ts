import type { RouteRecordRaw } from 'vue-router'
import MatchHome from './views/MatchHome.vue'
import CustomerCardViewPreview from './views/CustomerCardViewPreview.vue'
import SaleLineDetailView from './views/SaleLineDetailView.vue'
import VersionProgressView from './views/VersionProgressView.vue'
import VersionErrorsView from './views/VersionErrorsView.vue'
import * as MatchRouting from './MatchRouting'
import { requireActiveSession } from '@/router/guards'

export const matchRoutes: RouteRecordRaw[] = [
  {
    path: '/match',
    name: MatchRouting.match,
    component: MatchHome,
    beforeEnter: requireActiveSession,
    meta: { title: 'Match' },
  },
  {
    // UC-FE-05a / UC-API-04: watch one version move through parse and calculation. Same
    // string-param contract as the Customer Card below: the view parses `:versionId` itself.
    path: '/match/versions/:versionId',
    name: MatchRouting.versionProgress,
    component: VersionProgressView,
    beforeEnter: requireActiveSession,
    props: true,
    meta: { title: 'Match' },
  },
  {
    // UC-API-02 / FE-06: the Customer Card, one buyer's identity, size, revenue and DPO
    // position. Route params are strings; the view is responsible for parsing them to numbers,
    // same as every other :id param elsewhere in the app.
    path: '/match/versions/:versionId/buyers/:buyerId',
    name: MatchRouting.customerCard,
    component: CustomerCardViewPreview,
    beforeEnter: requireActiveSession,
    props: true,
    meta: { title: 'Match' },
  },
  {
    // UC-API-13: one buyer's own sale line, everything it carries plus what each strategy
    // produced for it. A route rather than a modal, deliberately: this is a verification screen
    // (does this line's own figures square with the strategy that ran on it), so it has to be
    // linkable - you send someone the URL of the line that does not add up. Same string-param
    // contract as the Customer Card above: the view parses all three segments itself.
    path: '/match/versions/:versionId/buyers/:buyerId/lines/:lineId',
    name: MatchRouting.saleLineDetail,
    component: SaleLineDetailView,
    beforeEnter: requireActiveSession,
    props: true,
    meta: { title: 'Match' },
  },
  {
    // UC-VAL-03: the error groups and no-match rows behind one version - UC-FE-05b's alternate
    // flow A1, surfaced in the application rather than only emailed. Same string-param contract
    // as the two routes above.
    path: '/match/versions/:versionId/errors',
    name: MatchRouting.versionErrors,
    component: VersionErrorsView,
    beforeEnter: requireActiveSession,
    props: true,
  },
]
