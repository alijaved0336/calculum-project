/**
 * Tests for useNegotiationSpendTabs — selected tab, All Spends vs spend,
 * and resultsFeedback via retrieveSpendNewTerms (watch path; not exported).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick, reactive, ref, type Ref } from 'vue'

vi.mock('@/services/pinia/index', () => ({
  secureStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}))
vi.mock('@/modules/home/entityCard/api', () => ({}))
vi.mock('@/modules/home/analyze/api', () => ({}))
vi.mock('@/services/router/Routing', () => ({}))
vi.mock('@/stores/entityCard', () => ({ useEntityCardStore: vi.fn() }))

import { useEntityCardStore } from '@/stores/entityCard'
import useNegotiationSpendTabs from '@/modules/home/entityCard/composables/useNegotiationSpendTabs'
import type { NegotiationTabsSlice } from '@/modules/home/entityCard/components/opportunity/negotiation-view-types'

const ALL_SPENDS_UUID = 'spend-all'
const SPEND_UUID = 'spend-1'
const RESULT_ID = 'result-1'

function makeTab(overrides: Record<string, unknown> = {}) {
  return {
    id: '0',
    alias: 'All spends',
    uuid: 'cfg-all',
    spendUUID: ALL_SPENDS_UUID,
    spend_volume: 100,
    disabled: false,
    hasResults: null,
    ...overrides,
  }
}

function makeTabsSlice(
  overrides: Partial<NegotiationTabsSlice> = {},
): NegotiationTabsSlice {
  return reactive({
    tabsData: [
      makeTab(),
      makeTab({
        id: '1',
        alias: 'Spend line',
        uuid: 'cfg-1',
        spendUUID: SPEND_UUID,
        spend_volume: 50,
        hasResults: RESULT_ID,
      }),
    ],
    belongtoProgram: true,
    spendConfigurationUuid: '',
    spendUUID: '',
    levelType: '',
    levelTypeForStrategies: '',
    allSpendsTab: true,
    hideControls: false,
    inRecalculation: false,
    keyTermsStrategies: 0,
    showStrategies: false,
    ...overrides,
  }) as NegotiationTabsSlice
}

function makeLoaders() {
  return {
    fetchCalculatedCashFlow: vi.fn(),
    retrieveSpendInk: vi.fn(),
    retrieveSupplierSpendInK: vi.fn(),
    retrieveSavings: vi.fn(),
    getEntityDetails: vi.fn(),
    getSpends: vi.fn(),
    retrieveHarmonizationGroupsArray: vi.fn(),
    retrieveFinancingGroupsArray: vi.fn(),
    beginCashFlowLoad: vi.fn(),
    failVCardInfoLoad: vi.fn(),
  }
}

describe('useNegotiationSpendTabs', () => {
  let getSpendNewTerms: ReturnType<typeof vi.fn>
  let loaders: ReturnType<typeof makeLoaders>
  let selectedTabIndex: Ref<number>
  let tabsSlice: NegotiationTabsSlice
  let paymentTermsDescriptions: Ref<Array<unknown> | null>
  let keyGrid: Ref<number>

  function setup(sliceOverrides: Partial<NegotiationTabsSlice> = {}) {
    tabsSlice = makeTabsSlice(sliceOverrides)
    selectedTabIndex = ref(0)
    paymentTermsDescriptions = ref(null)
    keyGrid = ref(0)
    loaders = makeLoaders()

    return useNegotiationSpendTabs({
      tabsSlice,
      props: {
        companyId: 'company-1',
        companyType: 'supplier',
        overviewTabEventUUID: '',
        retrieveAllSpends: [
          { spendUUID: ALL_SPENDS_UUID, spend_volume: 100 },
          { spendUUID: SPEND_UUID, spend_volume: 50 },
        ],
        programUuid: 'program-1',
      },
      translate: { t: (key: string) => key },
      moveToPhaseData: reactive({ level: '', uuid: '' }),
      selectedTabIndex,
      loaders,
      paymentTermsDescriptions,
      keyGrid,
    })
  }

  beforeEach(() => {
    getSpendNewTerms = vi.fn((params: { callbackSuccess: (data: unknown) => void }) => {
      params.callbackSuccess({
        feedbackRating: 4,
        additionalFeedback: 'Looks good',
        labels: [{ id: 'label-1' }],
      })
    })
    vi.mocked(useEntityCardStore).mockReturnValue({
      getSpendNewTerms,
      postSpendsBySupplierAndButProgram: vi.fn(),
      setSelectedTabIndex: vi.fn(),
    } as any)
  })

  it('exposes the tab at selectedTabIndex as tabsDataTabSelected', () => {
    const tabs = setup()

    expect(tabs.tabsDataTabSelected.value?.spendUUID).toBe(ALL_SPENDS_UUID)

    selectedTabIndex.value = 1

    expect(tabs.tabsDataTabSelected.value?.spendUUID).toBe(SPEND_UUID)
    expect(tabs.tabsDataTabSelected.value?.alias).toBe('Spend line')
  })

  it('treats selectedTabIndex 0 as All Spends (hide controls, supplier loaders)', async () => {
    const tabs = setup()

    selectedTabIndex.value = 1
    await nextTick()
    vi.clearAllMocks()

    selectedTabIndex.value = 0
    await nextTick()

    expect(tabs.tabsSlice.hideControls).toBe(true)
    expect(tabs.tabsSlice.levelType).toBe('supplier')
    expect(loaders.retrieveSupplierSpendInK).toHaveBeenCalled()
    expect(loaders.retrieveSavings).toHaveBeenCalled()
    expect(loaders.fetchCalculatedCashFlow).toHaveBeenCalledWith('supplier')
    expect(loaders.retrieveSpendInk).not.toHaveBeenCalled()
  })

  it('treats a non-zero tab as spend (show controls, spend loaders)', async () => {
    const tabs = setup()

    selectedTabIndex.value = 1
    await nextTick()

    expect(tabs.tabsSlice.hideControls).toBe(false)
    expect(tabs.tabsSlice.levelType).toBe('spend')
    expect(loaders.retrieveSpendInk).toHaveBeenCalled()
    expect(loaders.fetchCalculatedCashFlow).toHaveBeenCalledWith('spend')
    expect(loaders.retrieveSupplierSpendInK).not.toHaveBeenCalled()
    expect(loaders.retrieveSavings).not.toHaveBeenCalled()
  })

  it('writes resultsFeedback when retrieveSpendNewTerms succeeds for a tab with results', async () => {
    const tabs = setup()

    selectedTabIndex.value = 1
    await nextTick()

    expect(getSpendNewTerms).toHaveBeenCalledWith(
      expect.objectContaining({ resultId: RESULT_ID }),
    )
    expect(tabs.resultsFeedback.feedbackRating).toBe(4)
    expect(tabs.resultsFeedback.additionalFeedback).toBe('Looks good')
    expect(tabs.resultsFeedback.feedbackLabels).toEqual([{ id: 'label-1' }])
  })

  it('clears resultsFeedback when switching to a tab with no results', async () => {
    const tabs = setup()

    selectedTabIndex.value = 1
    await nextTick()
    expect(tabs.resultsFeedback.feedbackRating).toBe(4)

    selectedTabIndex.value = 0
    await nextTick()

    expect(tabs.resultsFeedback.feedbackRating).toBeNull()
    expect(tabs.resultsFeedback.additionalFeedback).toBe('')
    expect(tabs.resultsFeedback.feedbackLabels).toEqual([])
  })
})
