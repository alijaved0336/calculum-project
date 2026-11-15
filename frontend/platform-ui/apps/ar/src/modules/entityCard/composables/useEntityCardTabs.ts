/**
 * The Entity Card's tab shell (UC-UI-06). Adapted from AP's tab-bar mechanism -
 * apps/ap/src/modules/home/entityCard/composables/useTopMenuTabs.ts at commit b5538527d1
 * (the fixed `TOP_MENU_TAB_ORDER` list, `id`/`label`/`active` per tab, "the first/last visible
 * tab keeps its rounded edge" - see EntityCardTabBar.vue) - simplified for what this story
 * actually needs: AR has no per-tab feature-flag visibility (AP's `buildTopMenuTabShowFlags`),
 * so every tab is always shown, and the order is the three downstream stories that depend on
 * this shell (UI-07, UI-08, UI-09), Opportunity first because UC-UI-06's basic flow selects it
 * by default.
 */

/** One entry per tab this shell offers today. A tab a later story adds is a new id appended
 * here, not a change to how the shell resolves or renders the ones that already exist. */
export const ENTITY_CARD_TAB_ORDER = ['opportunity', 'corporate-tree', 'company-details'] as const

export type EntityCardTabId = (typeof ENTITY_CARD_TAB_ORDER)[number]

export interface EntityCardTab {
  id: EntityCardTabId
  label: string
  active: boolean
}

const isEntityCardTabId = (value: string): value is EntityCardTabId =>
  (ENTITY_CARD_TAB_ORDER as readonly string[]).includes(value)

/**
 * The tab a route segment names, or the default (Opportunity, UC-UI-06's basic flow step 3)
 * for anything this build does not recognise - absent, a stale bookmark, or a tab id a later
 * story has since retired. Never leaves the shell with no tab selected.
 */
export function resolveEntityCardTab(value: string | undefined): EntityCardTabId {
  return value !== undefined && isEntityCardTabId(value) ? value : 'opportunity'
}

/** Every tab in its fixed display order, labelled and flagged active against `selected`. */
export function buildEntityCardTabs(
  selected: EntityCardTabId,
  labels: Record<EntityCardTabId, string>,
): EntityCardTab[] {
  return ENTITY_CARD_TAB_ORDER.map((id) => ({
    id,
    label: labels[id],
    active: id === selected,
  }))
}
