/**
 * Tests for useNegotiationPlan — belong-to-plan formula and writing the
 * parent-owned validateBelongToAplan ref.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, nextTick, reactive, ref } from 'vue'

vi.mock('@/services/pinia/index', () => ({
  secureStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
}))
vi.mock('@/modules/home/entityCard/api', () => ({}))
vi.mock('@/modules/home/analyze/api', () => ({}))
vi.mock('@/services/router/Routing', () => ({}))
vi.mock('@/stores/plan', () => ({ usePlanStore: vi.fn() }))
vi.mock('@/composables', () => ({
  useModulePlan: () => ({
    modulePlanIsAvailable: { value: false },
  }),
}))
vi.mock('@/resources/assets/assets', () => ({
  fontIcons: { plan: 'plan-icon' },
  images: {},
}))

import { usePlanStore } from '@/stores/plan'
import useNegotiationPlan from '@/modules/home/entityCard/composables/useNegotiationPlan'

const SPEND_UUID = 'spend-1'

function makeOptions(overrides: Record<string, unknown> = {}) {
  const selectedTabIndex = ref(0)
  const spendSelected = ref<{ spendUUID: string } | null>(null)
  const validateBelongToAplan = ref(false)
  const props = reactive({
    companyId: 'company-1',
    entityDetails: {
      planNamePhaseStatus: '',
      supplierName: 'Acme',
    },
    programData: { '@id': '/api/analyze/programs/p1' },
    retrieveAllSpends: [] as Array<Record<string, unknown>>,
  })

  const options = {
    props,
    translate: { t: (key: string) => key },
    selectedTabIndex,
    spendFileVersionIdActive: computed(() => '/api/spend_file_versions/sfv-1'),
    entityCardNegotiationSpendsSelectedId: computed(
      () => spendSelected.value?.spendUUID ?? '',
    ),
    entityCardNegotiationSpendsSpendSelected: computed(
      () => spendSelected.value,
    ),
    levelType: ref('supplier'),
    postByGroup: vi.fn(),
    nineBoxes: reactive({
      boxesSelected: [],
      boxesSelectedFinancing: [],
      boxesSelectedSCF: [],
      supplierNParentBox: '',
      supplierNParentBoxFinancing: '',
      supplierNParentBoxSCF: '',
    }),
    keyTermsStrategies: ref(0),
    isFinancingEnabled: computed(() => false),
    isFinancingEnabledSCFProvider: computed(() => false),
    validateBelongToAplan,
    ...overrides,
  }

  return {
    ...options,
    selectedTabIndex,
    spendSelected,
    validateBelongToAplan,
    props,
  }
}

describe('useNegotiationPlan', () => {
  beforeEach(() => {
    vi.mocked(usePlanStore).mockReturnValue({
      getAllPlans: vi.fn(),
    } as any)
  })

  it('uses entityDetails.planNamePhaseStatus on All Spends and writes the shared ref', async () => {
    const ctx = makeOptions()
    ctx.props.entityDetails.planNamePhaseStatus = 'Plan A - Phase 1 - Active'

    const plan = useNegotiationPlan(ctx as any)

    expect(plan.validateBelongToAplan.value).toBe(true)
    expect(ctx.validateBelongToAplan.value).toBe(true)

    ctx.props.entityDetails.planNamePhaseStatus = ''
    await nextTick()

    expect(plan.validateBelongToAplan.value).toBe(false)
    expect(ctx.validateBelongToAplan.value).toBe(false)
  })

  it('is false on All Spends when planNamePhaseStatus is empty', () => {
    const ctx = makeOptions()
    ctx.props.entityDetails.planNamePhaseStatus = ''

    useNegotiationPlan(ctx as any)

    expect(ctx.validateBelongToAplan.value).toBe(false)
  })

  it('is false when there is no spend selected even if retrieveAllSpends has a plan', () => {
    const ctx = makeOptions()
    ctx.props.retrieveAllSpends = [
      { spendUUID: SPEND_UUID, planName: 'Spend Plan' },
    ]
    ctx.props.entityDetails.planNamePhaseStatus = ''
    ctx.spendSelected.value = null
    ctx.selectedTabIndex.value = 0

    useNegotiationPlan(ctx as any)

    expect(ctx.validateBelongToAplan.value).toBe(false)
  })

  it('uses retrieveAllSpends[].planName on a spend tab and writes the shared ref', async () => {
    const ctx = makeOptions()
    ctx.selectedTabIndex.value = 1
    ctx.spendSelected.value = { spendUUID: SPEND_UUID }
    ctx.props.retrieveAllSpends = [
      { spendUUID: SPEND_UUID, planName: 'Q1 Plan' },
    ]

    const plan = useNegotiationPlan(ctx as any)

    expect(plan.validateBelongToAplan.value).toBe(true)
    expect(ctx.validateBelongToAplan.value).toBe(true)

    ctx.props.retrieveAllSpends = [{ spendUUID: SPEND_UUID, planName: '' }]
    await nextTick()

    expect(plan.validateBelongToAplan.value).toBe(false)
    expect(ctx.validateBelongToAplan.value).toBe(false)
  })

  it('is false on a spend tab when the spend has no planName', () => {
    const ctx = makeOptions()
    ctx.selectedTabIndex.value = 1
    ctx.spendSelected.value = { spendUUID: SPEND_UUID }
    ctx.props.retrieveAllSpends = [{ spendUUID: SPEND_UUID, planName: '' }]

    useNegotiationPlan(ctx as any)

    expect(ctx.validateBelongToAplan.value).toBe(false)
  })
})
