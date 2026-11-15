import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/stores/globalFilters', () => ({ useGlobalFiltersStore: vi.fn() }))
vi.mock('@/stores/negotiationStatus', () => ({ useNegotiationStatusStore: vi.fn() }))
vi.mock('@/stores/entityCard', () => ({ useEntityCardStore: vi.fn() }))
vi.mock('@/stores/app', () => ({ useAppStore: vi.fn() }))
vi.mock('@/utils/FormatData', () => ({ convertFiltersToREST: vi.fn((filters: any) => filters) }))
vi.mock('vue-toastification', () => ({ useToast: () => ({ error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn(), dismiss: vi.fn() }) }))
vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})
// The API layer this composable calls reaches services/api/response ->
// utils/CookieSessionsFns -> useFirebase -> firebase/config, which calls
// getAuth() at load time and throws without the Firebase env vars.
vi.mock('@/composables/firebase/config', () => ({
  auth: {},
  firestore: {},
  storage: {},
  appFirebase: {},
}))
const { showUndoToastSpy } = vi.hoisted(() => ({ showUndoToastSpy: vi.fn() }))
vi.mock('@/modules/home/manageModule/composables/useUndoToast', () => ({
  useUndoToast: () => ({ showUndoToast: showUndoToastSpy })
}))

import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useNegotiationStatusStore } from '@/stores/negotiationStatus'
import { useEntityCardStore } from '@/stores/entityCard'
import { useAppStore } from '@/stores/app'
import { useKanbanDragAndDrop } from '@/modules/home/manageModule/composables/useKanbanDragAndDrop'

function makeGlobalFiltersStore(filtersCount = 0, disableWatchers = false) {
  return {
    getFiltersApplied: { filters: new Array(filtersCount).fill({}), logic: 'and' },
    getDisableWatchers: disableWatchers
  }
}

function makeColumnRef() {
  return { moveCardIn: vi.fn(), removeCardByUuid: vi.fn(), refetch: vi.fn() }
}

function card(overrides: Record<string, any> = {}) {
  return { uuid: 'e1', entityUuid: 'e1', entityName: 'Acme', spendCounts: 1, ...overrides }
}

function partialCard(overrides: Record<string, any> = {}) {
  return card({ negotiationStatusCodes: 'planned,contacted', ...overrides })
}

describe('useKanbanDragAndDrop', () => {
  let negotiationStatusAPIUpdate: ReturnType<typeof vi.fn>
  let postSpendNewTerms: ReturnType<typeof vi.fn>
  let patchSpendNewTerms: ReturnType<typeof vi.fn>
  let saveAndEditAgrreedTerms: ReturnType<typeof vi.fn>
  let setRefreshAfterUpdateStatusKanbanSpy: ReturnType<typeof vi.fn>
  let columnRefs: Record<string, ReturnType<typeof makeColumnRef>>

  function setup(opts: { filtersCount?: number; disableWatchers?: boolean; isAnyFilterActive?: boolean } = {}) {
    vi.mocked(useGlobalFiltersStore).mockReturnValue(
      makeGlobalFiltersStore(opts.filtersCount ?? 0, opts.disableWatchers ?? false) as any
    )
    return useKanbanDragAndDrop({
      programSelectedId: { value: 'prog1' } as any,
      spendFileVersionActiveId: { value: 'sfv1' } as any,
      getColumnRef: (status: string) => columnRefs[status],
      isAnyFilterActive: () => opts.isAnyFilterActive ?? false
    })
  }

  beforeEach(() => {
    negotiationStatusAPIUpdate = vi.fn()
    setRefreshAfterUpdateStatusKanbanSpy = vi.fn()
    postSpendNewTerms = vi.fn()
    patchSpendNewTerms = vi.fn()
    saveAndEditAgrreedTerms = vi.fn()
    columnRefs = {
      analyzed: makeColumnRef(),
      onHold: makeColumnRef(),
      planned: makeColumnRef(),
      contacted: makeColumnRef(),
      agreed: makeColumnRef(),
      agreedExtended: makeColumnRef()
    }
    vi.mocked(useNegotiationStatusStore).mockReturnValue({
      negotiationStatusAPIUpdate,
      getTrackingNumber: vi.fn(() => 0),
      setTrackingNumber: vi.fn()
    } as any)
    vi.mocked(useEntityCardStore).mockReturnValue({
      postSpendNewTerms,
      patchSpendNewTerms,
      saveAndEditAgrreedTerms,
      // The non-Partial success path bumps this so the entity card re-reads the status it
      // just changed; without it callbackSuccess throws before reaching the undo toast.
      setRefreshAfterUpdateStatusKanban: setRefreshAfterUpdateStatusKanbanSpy
    } as any)
    vi.mocked(useAppStore).mockReturnValue({ getCurrencyAmount: 1 } as any)
    showUndoToastSpy.mockClear()
  })

  it('simple forward drop calls the API directly with no gating dialogs', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'analyzed', toStatus: 'contacted', levelofGrid: 0 })

    expect(negotiationStatusAPIUpdate).toHaveBeenCalledTimes(1)
    const params = negotiationStatusAPIUpdate.mock.calls[0][0]
    expect(params.negotiationStatus).toBe('contacted')
    expect(params.level).toBe('spend')
    expect(params.sourceStatus).toBeUndefined()
    expect(dnd.showGlobalWarning.value).toBe(false)
    expect(dnd.showTier2Confirm.value).toBeNull()
  })

  it('tier1 backward drop calls the API immediately, no confirm dialog', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'contacted', toStatus: 'analyzed', levelofGrid: 0 })

    expect(negotiationStatusAPIUpdate).toHaveBeenCalledTimes(1)
    expect(negotiationStatusAPIUpdate.mock.calls[0][0].negotiationStatus).toBe('analyzed')
  })

  it('tier2A backward from Agreed blocks the API behind a confirm dialog', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'agreed', toStatus: 'contacted', levelofGrid: 0 })

    expect(dnd.showTier2Confirm.value).toBe('tier2A')
    expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()

    dnd.onTier2Continue()
    expect(negotiationStatusAPIUpdate).toHaveBeenCalledTimes(1)
    expect(negotiationStatusAPIUpdate.mock.calls[0][0].negotiationStatus).toBe('contacted')
  })

  it('tier2A cancel reverts the card to its source column and never calls the API', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'agreed', toStatus: 'contacted', levelofGrid: 0 })
    dnd.onTier2Cancel()

    expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()
    expect(columnRefs.contacted.removeCardByUuid).toHaveBeenCalledWith('e1')
    expect(columnRefs.agreed.moveCardIn).toHaveBeenCalled()
  })

  it('reclassifying Agreed <-> AgreedExtended is tier2B and opens the Agreed Terms modal after confirm', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'agreed', toStatus: 'agreedExtended', levelofGrid: 0 })
    expect(dnd.showTier2Confirm.value).toBe('tier2B')

    dnd.onTier2Continue()
    expect(dnd.showAgreedTermsModal.value).toBe(true)
    expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()
  })

  it('dropping onto Planned opens the Plan Modal and blocks the API until confirmed', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'analyzed', toStatus: 'planned', levelofGrid: 0 })
    expect(dnd.showPlanModal.value).toBe(true)
    expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()

    dnd.onPlanModalConfirm({ planPhaseId: 'phase1' })
    expect(negotiationStatusAPIUpdate).toHaveBeenCalledTimes(1)
    expect(negotiationStatusAPIUpdate.mock.calls[0][0].planPhaseId).toBe('phase1')
  })

  it('cancelling the Plan Modal (forward path) never calls the API', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'analyzed', toStatus: 'planned', levelofGrid: 0 })
    dnd.onPlanModalCancel()
    expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()
  })

  it('tier1 backward into Planned leaves the eager move standing and opens the Plan Modal on top', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'contacted', toStatus: 'planned', levelofGrid: 0 })

    // The move is assumed already applied by vue-draggable-plus before this handler runs;
    // per the NFR, no dialog precedes a Tier 1 move, so nothing should have been reverted.
    expect(columnRefs.planned.removeCardByUuid).not.toHaveBeenCalled()
    expect(columnRefs.contacted.moveCardIn).not.toHaveBeenCalled()
    expect(dnd.showPlanModal.value).toBe(true)
    expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()
  })

  it('cancelling the Plan Modal after a tier1-backward-into-Planned move reverts it (no valid call without a phase)', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'contacted', toStatus: 'planned', levelofGrid: 0 })

    dnd.onPlanModalCancel()
    expect(columnRefs.planned.removeCardByUuid).toHaveBeenCalledWith('e1')
    expect(columnRefs.contacted.moveCardIn).toHaveBeenCalled()
    expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()
  })

  it('dropping onto Agreed opens the Agreed Terms modal, creates the terms row, then calls the status API with the backend-resolved status', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'contacted', toStatus: 'agreed', levelofGrid: 0 })
    expect(dnd.showAgreedTermsModal.value).toBe(true)

    saveAndEditAgrreedTerms.mockImplementation((params: any) => params.callbackSuccess({ negotiationStatus: 'agreedExtended' }))
    dnd.onAgreedTermsModalConfirm({ termsWithoutCashDiscount: 30 })

    expect(saveAndEditAgrreedTerms).toHaveBeenCalledTimes(1)
    expect(negotiationStatusAPIUpdate).toHaveBeenCalledTimes(1)
    expect(negotiationStatusAPIUpdate.mock.calls[0][0].negotiationStatus).toBe('agreedExtended')
    expect(columnRefs.agreedExtended.moveCardIn).toHaveBeenCalled()
  })

  it('saves the agreed terms with the entity and terms payload from the modal', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'contacted', toStatus: 'agreed', levelofGrid: 0 })
    saveAndEditAgrreedTerms.mockImplementation((params: any) => params.callbackSuccess({ negotiationStatus: 'agreed' }))
    dnd.onAgreedTermsModalConfirm({ termsWithoutCashDiscount: 30 })

    expect(saveAndEditAgrreedTerms).toHaveBeenCalledTimes(1)
    const params = saveAndEditAgrreedTerms.mock.calls[0][0]
    expect(params.entity).toBe('e1')
    expect(params.spendsTerms).toEqual({ termsWithoutCashDiscount: 30 })
  })

  it('cancelling the Agreed Terms modal never saves the terms or calls the status API', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'contacted', toStatus: 'agreed', levelofGrid: 0 })
    dnd.onAgreedTermsModalCancel()

    expect(saveAndEditAgrreedTerms).not.toHaveBeenCalled()
    expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()
  })

  it('global warning appears at supplier level with no active filters and multiple spend lines', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card({ spendCounts: 3 }), fromStatus: 'analyzed', toStatus: 'contacted', levelofGrid: 1 })

    expect(dnd.showGlobalWarning.value).toBe(true)
    expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()

    dnd.onGlobalWarningContinue({ dontShowAgain: false })
    expect(negotiationStatusAPIUpdate).toHaveBeenCalledTimes(1)
  })

  it('global warning does not appear for a single-spend-line card', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card({ spendCounts: 1 }), fromStatus: 'analyzed', toStatus: 'contacted', levelofGrid: 1 })

    expect(dnd.showGlobalWarning.value).toBe(false)
    expect(negotiationStatusAPIUpdate).toHaveBeenCalledTimes(1)
  })

  it('global warning cancel fully reverts the move', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card({ spendCounts: 3 }), fromStatus: 'analyzed', toStatus: 'contacted', levelofGrid: 1 })
    dnd.onGlobalWarningCancel()

    expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()
    expect(columnRefs.contacted.removeCardByUuid).toHaveBeenCalledWith('e1')
    expect(columnRefs.analyzed.moveCardIn).toHaveBeenCalled()
  })

  it('API failure reverts the card to its source column and does not throw', () => {
    negotiationStatusAPIUpdate.mockImplementation((params: any) => params.callbackError())
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'analyzed', toStatus: 'contacted', levelofGrid: 0 })

    expect(columnRefs.contacted.removeCardByUuid).toHaveBeenCalledWith('e1')
    expect(columnRefs.analyzed.moveCardIn).toHaveBeenCalled()
  })

  it('does nothing while a company/spend-file switch is in flight (getDisableWatchers)', () => {
    const dnd = setup({ disableWatchers: true })
    dnd.handleCardMoved({ card: card(), fromStatus: 'analyzed', toStatus: 'contacted', levelofGrid: 0 })
    expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()
  })

  it('filter scope dialog appears at supplier level with active filters; cancel fully reverts', () => {
    const dnd = setup({ filtersCount: 1, isAnyFilterActive: true })
    dnd.handleCardMoved({ card: card(), fromStatus: 'analyzed', toStatus: 'contacted', levelofGrid: 1 })

    expect(dnd.showFilterScopeDialog.value).toBe(true)
    expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()

    dnd.onFilterScopeCancel()
    expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()
    expect(columnRefs.contacted.removeCardByUuid).toHaveBeenCalledWith('e1')
  })

  it('filter scope "Move Only Filtered" sends the scoped filters at supplier level', () => {
    const dnd = setup({ filtersCount: 1, isAnyFilterActive: true })
    dnd.handleCardMoved({ card: card(), fromStatus: 'analyzed', toStatus: 'contacted', levelofGrid: 1 })
    dnd.onFilterScopeConfirm({ scope: 'filtered', savePreference: false })

    expect(negotiationStatusAPIUpdate).toHaveBeenCalledTimes(1)
    const params = negotiationStatusAPIUpdate.mock.calls[0][0]
    expect(params.level).toBe('supplier')
    expect(params.filters).not.toBeNull()
  })

  it('filter scope "Move All" sends no filters at parent level', () => {
    const dnd = setup({ filtersCount: 1, isAnyFilterActive: true })
    dnd.handleCardMoved({ card: card(), fromStatus: 'analyzed', toStatus: 'contacted', levelofGrid: 2 })
    dnd.onFilterScopeConfirm({ scope: 'all', savePreference: false })

    const params = negotiationStatusAPIUpdate.mock.calls[0][0]
    expect(params.level).toBe('parent')
  })

  it('no-op when dropping a card back onto its own column', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'analyzed', toStatus: 'analyzed', levelofGrid: 0 })
    expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()
  })

  // The source column travels as `sourceStatus`, a numeric status code (100 analyzed,
  // 200 planned, 300 contacted, 400 agreed), and the backend narrows the move to it:
  // NegotiationManager filters the spends by `negotiationStatusCode = :sourceStatusParam`.
  // It is omitted at spend level, where the dragged row is already the one spend line.
  it('always includes the source status code for supplier/parent moves, even for a non-Partial card', () => {
    const dnd = setup()
    dnd.handleCardMoved({ card: card(), fromStatus: 'analyzed', toStatus: 'contacted', levelofGrid: 1 })

    const params = negotiationStatusAPIUpdate.mock.calls[0][0]
    expect(params.sourceStatus).toBe(100)
    // Non-Partial, no gate: the eager library move already stands untouched — no refetch needed.
    expect(columnRefs.analyzed.refetch).not.toHaveBeenCalled()
    expect(columnRefs.contacted.refetch).not.toHaveBeenCalled()
  })

  // A Partial entity is a supplier or parent whose spend lines do not all share one
  // negotiation status. Its move never keeps the library's eager local move: the true
  // post-move column set is only known after the server refetch that refreshAllColumns
  // triggers on success, 100ms behind the Apollo store reset — hence the fake timers.
  describe('Partial entities', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('reverts the eager local move immediately on drop, before any API call', () => {
      const dnd = setup()
      dnd.handleCardMoved({ card: partialCard(), fromStatus: 'planned', toStatus: 'contacted', levelofGrid: 1 })

      // planned(200) -> contacted(300) is forward, no gate, so the API already fired by now —
      // but the eager library move must have been undone first, before that call.
      expect(columnRefs.contacted.removeCardByUuid).toHaveBeenCalledWith('e1')
      expect(columnRefs.planned.moveCardIn).toHaveBeenCalledTimes(1)
    })

    it('includes the source status code scoped to the source column for a forward move', () => {
      const dnd = setup()
      dnd.handleCardMoved({ card: partialCard(), fromStatus: 'planned', toStatus: 'contacted', levelofGrid: 1 })

      expect(negotiationStatusAPIUpdate).toHaveBeenCalledTimes(1)
      const params = negotiationStatusAPIUpdate.mock.calls[0][0]
      expect(params.sourceStatus).toBe(200)
      expect(params.negotiationStatus).toBe('contacted')
    })

    it('refetches every column on success, with no additional local splice', () => {
      negotiationStatusAPIUpdate.mockImplementation((params: any) => params.callbackSuccess())
      const dnd = setup()
      dnd.handleCardMoved({ card: partialCard(), fromStatus: 'planned', toStatus: 'contacted', levelofGrid: 1 })
      vi.runAllTimers()

      // Every column is refetched, not only source and destination: a partial move can
      // add or drop the entity anywhere, so a two-column refresh would leave stale cards.
      Object.values(columnRefs).forEach((column) => {
        expect(column.refetch).toHaveBeenCalledTimes(1)
      })
      // Only the initial eager-revert touched moveCardIn/removeCardByUuid — exactly once each,
      // not a second time from any local splice attempt on success.
      expect(columnRefs.planned.moveCardIn).toHaveBeenCalledTimes(1)
      expect(columnRefs.contacted.removeCardByUuid).toHaveBeenCalledTimes(1)
    })

    it('on API failure, does not refetch — the card never left its column, so there is nothing to revert', () => {
      negotiationStatusAPIUpdate.mockImplementation((params: any) => params.callbackError())
      const dnd = setup()
      dnd.handleCardMoved({ card: partialCard(), fromStatus: 'planned', toStatus: 'contacted', levelofGrid: 1 })
      vi.runAllTimers()

      expect(columnRefs.planned.refetch).not.toHaveBeenCalled()
      expect(columnRefs.contacted.refetch).not.toHaveBeenCalled()
    })

    it('fires immediately for a tier1Backward move (no confirm dialog) but suppresses the undo toast', () => {
      negotiationStatusAPIUpdate.mockImplementation((params: any) => params.callbackSuccess())
      const dnd = setup()
      // contacted(300) -> analyzed(100) is tier1Backward; single spend line so no global warning.
      dnd.handleCardMoved({ card: partialCard({ spendCounts: 1 }), fromStatus: 'contacted', toStatus: 'analyzed', levelofGrid: 1 })
      vi.runAllTimers()

      expect(dnd.showGlobalWarning.value).toBe(false)
      expect(dnd.showTier2Confirm.value).toBeNull()
      expect(negotiationStatusAPIUpdate).toHaveBeenCalledTimes(1)
      expect(negotiationStatusAPIUpdate.mock.calls[0][0].sourceStatus).toBe(300)
      // The refetch is what settles a partial move, so there is no local move to undo.
      expect(showUndoToastSpy).not.toHaveBeenCalled()
    })

    it('shows the undo toast for an equivalent non-Partial tier1Backward move (regression guard)', () => {
      negotiationStatusAPIUpdate.mockImplementation((params: any) => params.callbackSuccess())
      const dnd = setup()
      dnd.handleCardMoved({ card: card({ spendCounts: 1 }), fromStatus: 'contacted', toStatus: 'analyzed', levelofGrid: 1 })
      vi.runAllTimers()

      expect(showUndoToastSpy).toHaveBeenCalledTimes(1)
    })

    it('dropped onto Planned still opens the Plan Modal and defers the move to a refetch on confirm', () => {
      const dnd = setup()
      dnd.handleCardMoved({ card: partialCard(), fromStatus: 'analyzed', toStatus: 'planned', levelofGrid: 1 })
      expect(dnd.showPlanModal.value).toBe(true)
      expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()

      negotiationStatusAPIUpdate.mockImplementation((params: any) => params.callbackSuccess())
      dnd.onPlanModalConfirm({ planPhaseId: 'phase1' })
      vi.runAllTimers()

      expect(negotiationStatusAPIUpdate).toHaveBeenCalledTimes(1)
      expect(negotiationStatusAPIUpdate.mock.calls[0][0].planPhaseId).toBe('phase1')
      expect(columnRefs.analyzed.refetch).toHaveBeenCalledTimes(1)
      expect(columnRefs.planned.refetch).toHaveBeenCalledTimes(1)
      // No local splice was ever attempted for the Partial entity.
      expect(columnRefs.planned.moveCardIn).not.toHaveBeenCalled()
    })

    it('still respects Tier 2A confirm gating (from Agreed) before firing', () => {
      const dnd = setup()
      dnd.handleCardMoved({
        card: partialCard({ negotiationStatusCodes: 'agreed,contacted' }),
        fromStatus: 'agreed',
        toStatus: 'contacted',
        levelofGrid: 1
      })
      expect(dnd.showTier2Confirm.value).toBe('tier2A')
      expect(negotiationStatusAPIUpdate).not.toHaveBeenCalled()

      negotiationStatusAPIUpdate.mockImplementation((params: any) => params.callbackSuccess())
      dnd.onTier2Continue()
      vi.runAllTimers()

      expect(negotiationStatusAPIUpdate).toHaveBeenCalledTimes(1)
      expect(columnRefs.agreed.refetch).toHaveBeenCalledTimes(1)
      expect(columnRefs.contacted.refetch).toHaveBeenCalledTimes(1)
    })
  })
})
