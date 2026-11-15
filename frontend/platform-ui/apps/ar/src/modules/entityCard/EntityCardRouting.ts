import { route } from '@/router/Routing'
import { router } from '@/router'
import type { EntityCardTabId } from './composables/useEntityCardTabs'

export const entityCard = 'EntityCard'

/**
 * Opens the Entity Card for one buyer (UC-UI-06). `tab` is omitted for the default entry point
 * (UC-UI-06's basic flow: the shell selects Opportunity itself) and given only when the caller
 * wants to land directly on a specific tab.
 */
export const openEntityCard = (versionId: number, buyerId: number, tab?: EntityCardTabId) =>
  route(entityCard, { versionId: String(versionId), buyerId: String(buyerId), tab })

/**
 * Switches the shell's own tab. `router.replace`, not `openEntityCard`'s `push`: clicking
 * between the Entity Card's own tabs is one screen changing what it shows, not a new place to
 * land on with the back button - `push` here would make every tab click its own history entry,
 * and "back" from the Company Details tab would reopen the same buyer on Opportunity instead of
 * leaving the card.
 */
export const selectEntityCardTab = (versionId: number, buyerId: number, tab: EntityCardTabId) =>
  router.replace({
    name: entityCard,
    params: { versionId: String(versionId), buyerId: String(buyerId), tab },
  })
