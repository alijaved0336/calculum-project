import { defineStore } from 'pinia'
import type { GraphqlGridColumnOrGroup } from '@ada/design-system/components/graphql-grid/types'
import { secureStorage } from '@/services/pinia'

interface GridColumnPreferencesState {
  // Keyed per grid (e.g. 'sale-match-list') rather than one property per grid - a new grid just
  // picks its own key, no store shape change needed. Mirrors apps/ap/src/stores/home.ts's
  // per-grid column caching (matchColumnsLists, homeAnalyzeGridColumnsList, etc.), collapsed into
  // a single map instead of one ref/getter/setter triple per grid. Each entry is a full column
  // snapshot (not just a hidden-by-field map) - same shape apps/ap's homeStore.matchColumnsLists
  // stores, so design-system's mergeCachedGraphqlGridColumns can restore `hidden`/`allowHide`/
  // `width` from it while still picking up any column added to the grid's own definitions since.
  columnsByGrid: Record<string, GraphqlGridColumnOrGroup[]>
}

/**
 * Persists each grid's own column snapshot (visibility, width, allowHide) so the user's choices
 * survive a reload or a return visit. Pair with design-system's `mergeCachedGraphqlGridColumns`
 * (packages/design-system/src/components/graphql-grid/types.ts) to merge a grid's freshly built
 * column definitions with what's cached here for that grid's key.
 */
export const useGridColumnPreferencesStore = defineStore('ar-grid-column-preferences', {
  state: (): GridColumnPreferencesState => ({
    columnsByGrid: {},
  }),
  getters: {
    getColumns(state) {
      return (gridKey: string): GraphqlGridColumnOrGroup[] => state.columnsByGrid[gridKey] ?? []
    },
  },
  actions: {
    setColumns(gridKey: string, columns: GraphqlGridColumnOrGroup[]) {
      this.columnsByGrid[gridKey] = columns
    },
    /** Sign-out (UC-ENT-09): cached column snapshots can name a tenant's own custom-attribute
     * columns, so a browser signing in as a different tenant must not still have them cached. */
    clear() {
      this.columnsByGrid = {}
    },
  },
  persist: {
    storage: secureStorage,
    key: 'ada-ar-grid-column-preferences',
  },
})
