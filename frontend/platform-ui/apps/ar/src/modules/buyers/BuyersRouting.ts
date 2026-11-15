import { route } from '@/router/Routing'

export const buyers = 'Buyers'

/** The buyer roster (UC-UI-05). Bare route, same shape as `MatchRouting.openMatch()` - the
 * version it reads comes from the shared context store, not a route param. */
export const openBuyers = (): void => route(buyers)
