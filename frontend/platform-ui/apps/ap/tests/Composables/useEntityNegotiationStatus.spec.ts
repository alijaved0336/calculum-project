/**
 * Tests for useEntityNegotiationStatus — selected spend id, nineBoxes
 * fallback vs spend, and live validateBelongToAplan on statusPill.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'

vi.mock('@/services/pinia/index', () => ({
  secureStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}))
vi.mock('@/modules/home/entityCard/api', () => ({}))
vi.mock('@/modules/home/analyze/api', () => ({}))
vi.mock('@/services/router/Routing', () => ({}))
vi.mock('@/stores/negotiationStatus', () => ({
  useNegotiationStatusStore: vi.fn(),
}))
vi.mock('@/modules/negotiationStatus/composables/useNegotiationStatus', () => ({
  default: () => ({
    negotiationStatusGetStatusTranslated: (status: string) => status ?? '',
    negotiationStatusGetPillColorClasses: (status: string) => `pill-${status}`,
  }),
}))
vi.mock('vue-toastification', () => ({
  useToast: () => ({
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

import { useNegotiationStatusStore } from '@/stores/negotiationStatus'
import useEntityNegotiationStatus from '@/modules/home/entityCard/composables/useEntityNegotiationStatus'

const SPEND_UUID = 'spend-1'

function makeOptions(overrides: Record<string, unknown> = {}) {
  const selectedTabIndex = ref(0)
  const tabsData = ref<Array<{ spendUUID: string }>>([
    { spendUUID: 'spend-all' },
    { spendUUID: SPEND_UUID },
  ])
  const listSpend = ref<Array<Record<string, unknown>>>([])
  const levelType = ref('supplier')
  const loadingApi = ref(false)
  const validateBelongToAplan = ref(false)

  const options = {
    props: {
      companyId: 'company-1',
      companyType: 'supplier',
      entityDetails: {
        negotiationStatus: 'analyzed',
        negotiationStatusCodes: 'analyzed',
      },
    },
    selectedTabIndex,
    spendFileVersionIdActive: computed(() => '/api/spend_file_versions/sfv-1'),
    tabsData,
    listSpend,
    levelType,
    loadingApi,
    validateBelongToAplan,
    ...overrides,
  }

  return { ...options, selectedTabIndex, tabsData, listSpend, levelType, validateBelongToAplan }
}

describe('useEntityNegotiationStatus', () => {
  beforeEach(() => {
    vi.mocked(useNegotiationStatusStore).mockReturnValue({
      negotiationStatusAPIUpdate: vi.fn(),
      setTrackingNumber: vi.fn(),
      getTrackingNumber: vi.fn(() => 0),
    } as any)
  })

  it('returns empty spend id on All Spends (index 0) and the tab uuid otherwise', () => {
    const ctx = makeOptions()
    const status = useEntityNegotiationStatus(ctx as any)

    expect(status.entityCardNegotiationSpendsSelectedId.value).toBe('')

    ctx.selectedTabIndex.value = 1

    expect(status.entityCardNegotiationSpendsSelectedId.value).toBe(SPEND_UUID)
  })

  it('returns empty spend id when tabsData is empty', () => {
    const ctx = makeOptions()
    ctx.tabsData.value = []
    ctx.selectedTabIndex.value = 1
    const status = useEntityNegotiationStatus(ctx as any)

    expect(status.entityCardNegotiationSpendsSelectedId.value).toBe('')
  })

  it('falls back nineBoxes to parent/supplier boxes when no spend is selected', () => {
    const ctx = makeOptions()
    const status = useEntityNegotiationStatus(ctx as any)

    status.nineBoxes.supplierNParentBox = 'A1'
    status.nineBoxes.supplierNParentBoxFinancing = 'F-parent'
    status.nineBoxes.supplierNParentBoxSCF = 'S-parent'

    status.validateDataSpends()

    expect(status.nineBoxes.boxesSelected).toEqual(['A1'])
    expect(status.nineBoxes.boxesSelectedFinancing).toEqual(['F-parent'])
    expect(status.nineBoxes.boxesSelectedSCF).toEqual(['S-parent'])
  })

  it('sets nineBoxes from the selected spend when a spend tab is active', () => {
    const ctx = makeOptions()
    ctx.selectedTabIndex.value = 1
    ctx.listSpend.value = [
      {
        spendUUID: SPEND_UUID,
        uuid: 'cfg-1',
        box: 'B2',
        financial_box: 'F-spend',
        scfBox: 'S-spend',
      },
    ]
    ctx.levelType.value = 'spend'

    const status = useEntityNegotiationStatus(ctx as any)
    status.validateDataSpends()

    expect(status.nineBoxes.boxesSelected).toEqual(['B2'])
    expect(status.nineBoxes.boxesSelectedFinancing).toEqual(['F-spend'])
    expect(status.nineBoxes.boxesSelectedSCF).toEqual(['S-spend'])
  })

  it('tracks the injected validateBelongToAplan ref live on statusPill', () => {
    const ctx = makeOptions()
    const status = useEntityNegotiationStatus(ctx as any)

    expect(status.statusPill.value.validateBelongToAplan).toBe(false)

    ctx.validateBelongToAplan.value = true

    expect(status.statusPill.value.validateBelongToAplan).toBe(true)

    ctx.validateBelongToAplan.value = false

    expect(status.statusPill.value.validateBelongToAplan).toBe(false)
  })
})
