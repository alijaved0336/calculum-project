import { createAppRouter } from '@ada/core'
import { mainRoute } from '@/modules/main/MainRoutes'
import { layoutRoute } from '@/modules/layout/LayoutRoutes'
import { matchRoutes } from '@/modules/match/MatchRoutes'
import { buyersRoutes } from '@/modules/buyers/BuyersRoutes'
import { opportunityRoutes } from '@/modules/opportunity/OpportunityRoutes'
import { entityCardRoutes } from '@/modules/entityCard/EntityCardRoutes'
import * as SignoutRouting from '@/router/SignoutRouting'
import { AUTH_ROUTE_ERRORS } from '@ada/auth'
import { setupRoutes } from '@/modules/setup/SetupRoutes'
import * as OpportunityRouting from '@/modules/opportunity/OpportunityRouting'
// Every module's routes are attached here as children of the parent layout route.
layoutRoute.children = [
  ...matchRoutes,
  ...buyersRoutes,
  ...opportunityRoutes,
  ...entityCardRoutes,
  ...setupRoutes,
]

// Fallback for a direct visit to "/" with no matching child.
layoutRoute.redirect = { name: OpportunityRouting.opportunity }

const routes = [
  mainRoute,
  layoutRoute,
  {
    path: '/signout',
    name: SignoutRouting.signout,
    meta: { public: true },
    component: () => import('@/views/SignoutView.vue'),
  },
  {
    // Where a failed sign-in lands (G-349). The API used to answer its refusals with a JSON body,
    // which the browser painted raw on the API's own domain, because a redirect into the SPA landed
    // on a guarded route and looped: guard, `/api/session/info`, 401, `authLogin()`, again.
    //
    // `meta.public` is what breaks that, and it is the whole reason this route can exist. A caller
    // arriving here has just failed to get a session, so it is the one page that must not ask for
    // one.
    //
    // AUTH_ROUTE_ERRORS rather than a string: `packages/auth` declares these names with the comment
    // that both applications register them, and AR registered none of the five until now.
    path: '/auth/error',
    name: AUTH_ROUTE_ERRORS,
    meta: { public: true },
    component: () => import('@/views/AuthErrorView.vue'),
  },
  {
    // Without this, an unknown URL matches nothing and renders a blank page: no error, no
    // navigation, nothing to click. A mistyped link and a broken application look identical.
    // Redirecting rather than showing a 404 screen because every route here is behind the auth
    // guard anyway, so there is exactly one place an unknown URL can usefully go.
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: { name: OpportunityRouting.opportunity },
  },
]

export const router = createAppRouter(routes, 'ADA Receivables')