import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OverviewGridLevel } from '@/modules/opportunity/data/overviewRows'

/**
 * The Sale Lines/Buyers/Parents tab selected on NineBoxOverview's and OverviewList's own grids -
 * previously local component state, which `App.vue`'s bare `<RouterView>` (no `KeepAlive`) resets
 * to each component's hardcoded default the moment a user navigates away from Opportunity and back.
 * In-memory only, same as `layout.ts`/`customerCardModal.ts` - nothing here needs to survive a
 * browser refresh, only a same-session route change.
 */
export const useOpportunityGridLevelStore = defineStore('ar-opportunity-grid-level', () => {
  const nineBoxLevel = ref<OverviewGridLevel>('buyers')
  const overviewListLevel = ref<OverviewGridLevel>('saleLines')

  /** Sign-out (UC-ENT-09): the next sign-in on this browser starts from each grid's own default. */
  function clear(): void {
    nineBoxLevel.value = 'buyers'
    overviewListLevel.value = 'saleLines'
  }

  return { nineBoxLevel, overviewListLevel, clear }
})
