import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OverviewChartDimension, OverviewChartMeasure } from '@/api'
import { secureStorage } from '@/services/pinia'

export interface OverviewChartSelectionValue {
  measure: OverviewChartMeasure
  dimension: OverviewChartDimension
  dimensionOrdinal?: number
}

/**
 * Persists each chart card's own last measure/dimension pick so it survives a reload or a return
 * visit, instead of resetting to the catalog's own default every time the card remounts (e.g.
 * switching to the List tab and back). Only written on a USER pick (OverviewMetricsCard's own
 * onMeasureChange/onDimensionChange) - never on the catalog's own automatic default adoption, so an
 * untouched card still opens on whatever the catalog (or its own card position) says is the default.
 */
export const useOverviewChartSelectionStore = defineStore(
  'ar-overview-chart-selection',
  () => {
    // Keyed per CARD, not one shared selection - the Opportunity Overview screen renders two
    // OverviewMetricsCard instances side by side (AP's primary/secondary pair), and each remembers
    // its own last pick independently. Mirrors gridColumnPreferences.ts's per-grid map for the same
    // reason: a new card just picks its own key, no store shape change needed.
    const selectionByCard = ref<Record<string, OverviewChartSelectionValue>>({})

    function getSelection(cardKey: string): OverviewChartSelectionValue | null {
      return selectionByCard.value[cardKey] ?? null
    }

    function setSelection(cardKey: string, selection: OverviewChartSelectionValue): void {
      selectionByCard.value[cardKey] = selection
    }

    /** Sign-out (UC-ENT-09): a selection can name a tenant's own custom attribute
     * (`dimensionOrdinal`), and this is persisted (see below), so it must not survive into
     * another tenant signing in on the same browser. */
    function clear(): void {
      selectionByCard.value = {}
    }

    return { selectionByCard, getSelection, setSelection, clear }
  },
  {
    persist: {
      storage: secureStorage,
      key: 'ada-ar-overview-chart-selection',
    },
  },
)
