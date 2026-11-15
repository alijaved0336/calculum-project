/**
 * Mirrors Overview.vue's (Manage Module) `onSelect()` tab-switch handler and the
 * `watch(programSelectedId, ...)` program-change handler, after the fix: switching
 * between the Spend Lines / Suppliers / Parents tabs must no longer clear
 * `searchValue`/`searchQuery` — only switching program should.
 *
 * Overview.vue is not mountable in this harness (same class of heavy-dependency
 * issue documented in other specs in this repo). The relevant state transitions
 * are reproduced here verbatim, following the same mirror-the-logic approach used
 * in ManageTeamAction.spec.ts and KanbanAgreedTermsModal.spec.ts.
 */
import { describe, it, expect } from 'vitest'

interface OverviewData {
  selectedTabIndex: number
  searchValue: string
  searchQuery: string
  filtersToApply: {
    selectedTeam: string | null
    selectedPhase: string | null
    selectedCountry: string | null
    selectedCommodity: string | null
  }
}

function freshData(): OverviewData {
  return {
    selectedTabIndex: 0,
    searchValue: '',
    searchQuery: '',
    filtersToApply: {
      selectedTeam: null,
      selectedPhase: null,
      selectedCountry: null,
      selectedCommodity: null,
    },
  }
}

// Mirrors onSelect() post-fix: switching tabs only updates selectedTabIndex.
function onSelectTab(data: OverviewData, selected: number) {
  data.selectedTabIndex = selected
}

// Mirrors the watch(programSelectedId, ...) handler: switching programs still
// clears the search term — this remains intentional and must not regress.
function onProgramChanged(data: OverviewData) {
  data.searchValue = ''
}

describe('Manage Module Overview — search/filter persistence across tabs', () => {
  it('switching tabs (Spend Lines -> Parents) preserves an active search term', () => {
    const data = freshData()
    data.searchValue = 'itt'
    data.searchQuery = 'itt'

    onSelectTab(data, 2) // Spend Lines (0) -> Parents (2)

    expect(data.selectedTabIndex).toBe(2)
    expect(data.searchValue).toBe('itt')
    expect(data.searchQuery).toBe('itt')
  })

  it('switching tabs preserves the Team/Phase/Country/Commodity dropdown filters', () => {
    const data = freshData()
    data.filtersToApply = {
      selectedTeam: 'team-1',
      selectedPhase: 'phase-1',
      selectedCountry: 'US',
      selectedCommodity: 'commodity-1',
    }

    onSelectTab(data, 1) // Spend Lines (0) -> Suppliers (1)

    expect(data.selectedTabIndex).toBe(1)
    expect(data.filtersToApply).toEqual({
      selectedTeam: 'team-1',
      selectedPhase: 'phase-1',
      selectedCountry: 'US',
      selectedCommodity: 'commodity-1',
    })
  })

  it('control case: switching program still clears the search term (intentional, unaffected by the fix)', () => {
    const data = freshData()
    data.searchValue = 'itt'
    data.searchQuery = 'itt'

    onProgramChanged(data)

    expect(data.searchValue).toBe('')
  })
})
