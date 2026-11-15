/**
 * Tests for the "Pending Approval" badge on EntityCardRecentSearchCompany.
 *
 * An unapproved potential supplier is invisible to customers; it reaches the grid only for the
 * internal teams (SuperAdmin, Sales, Data) via the COMPANY_TYPE_POTENTIAL_ADMIN promotion in
 * EntityCardController. Before this badge existed there was no way to tell an unapproved card
 * from a published one, not even as a SuperAdmin.
 *
 * The real component is mounted and every dependency around it is replaced, following
 * HomeOverviewTabs.spec.ts. That matters here: a wrapper component that re-states the same v-if
 * would keep passing no matter what the real template does.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computed, ref } from 'vue'

const userSession = ref<Record<string, unknown> | null>(null)
const roleFlags = {
  userIsSuperAdmin: ref(false),
  userSalesRoleEnabled: ref(false),
  userDataRoleEnabled: ref(false),
}

vi.mock('@/composables', () => ({
  useUser: () => ({
    user: userSession,
    isPilotAccount: () => false,
    useFeatureSME: computed(() => false),
    useFeatureForecastVolume: computed(() => false),
    userIsSuperAdmin: roleFlags.userIsSuperAdmin,
    userSalesRoleEnabled: roleFlags.userSalesRoleEnabled,
    userDataRoleEnabled: roleFlags.userDataRoleEnabled,
  }),
  useReceivablesComposable: () => ({}),
}))

// Cuts the barrel that transitively drags in icon SFCs vitest cannot transform.
vi.mock('@/utils', () => ({
  StringUtils: { formatBigNumbers: (v: number) => String(v) },
  IsSMEUtils: { getSMESource: () => 'default' },
}))

vi.mock('@/resources/assets/assets', () => ({ fontIcons: {}, images: {} }))
vi.mock('@/services/media/mediaActions', () => ({ getMediaUrl: () => '' }))
vi.mock('@/services/media/mediaTypes', () => ({ ImageType: { MEDIA: 'MEDIA' } }))
vi.mock('@/utils/ForecastUtils', () => ({ calculateForecastValues: () => ({}) }))

vi.mock('@/stores/entityCard', () => ({
  useEntityCardStore: () => ({ deleteRecentEntityCard: vi.fn() }),
}))

vi.mock('@/modules/negotiationStatus/composables/useNegotiationStatus', () => ({
  default: () => ({
    negotiationStatusGetPillColorClasses: () => '',
    negotiationStatusGetStatusesTranslated: () => [],
    negotiationStatusGetStatusTranslated: () => '',
    negotiationStatusTrackingNumber: () => 0,
  }),
}))

vi.mock('@progress/kendo-vue-tooltip', async () => {
  const { h } = await import('vue')
  return {
    Tooltip: {
      name: 'Tooltip',
      setup(_props: unknown, { slots }: any) {
        return () => h('span', slots.default?.())
      },
    },
  }
})

vi.mock('@ada/design-system', async () => {
  const { h } = await import('vue')
  return {
    CalculumLoading: { name: 'CalculumLoading', render: () => h('div') },
  }
})

// vi.mock factories are hoisted above every top-level binding, so each stub is built inline.
vi.mock('@/modules/components/PillLabelNumberBadgeParentSupplierLevel.vue', async () => {
  const { h } = await import('vue')
  return { default: { name: 'PillLabelNumberBadgeParentSupplierLevel', render: () => h('span') } }
})
vi.mock('@/modules/components/CalculumCloseWithoutTestID.vue', async () => {
  const { h } = await import('vue')
  return { default: { name: 'CalculumCloseWithoutTestID', render: () => h('span') } }
})
vi.mock('@/resources/assets/images/icons/starIcon.vue', async () => {
  const { h } = await import('vue')
  return { default: { name: 'star', render: () => h('span') } }
})
vi.mock('@/resources/assets/images/icons/smeBadge.vue', async () => {
  const { h } = await import('vue')
  return { default: { name: 'smeBadge', render: () => h('span') } }
})
vi.mock('@/resources/assets/images/icons/iconChartForecast.vue', async () => {
  const { h } = await import('vue')
  return { default: { name: 'IconChartForecast', render: () => h('span') } }
})
vi.mock('@/resources/assets/images/icons/iconChartForecastDown.vue', async () => {
  const { h } = await import('vue')
  return { default: { name: 'IconChartForecastDown', render: () => h('span') } }
})

import EntityCardRecentSearchCompany from '@/modules/home/entityCard/components/EntityCardRecentSearchCompany.vue'

const BADGE = '.pending-approval-badge'

function mountCard(overrides: Record<string, unknown> = {}) {
  return mount(EntityCardRecentSearchCompany, {
    props: {
      buyers: 'Buyer Co',
      companyType: 'potential-supplier',
      country: 'US',
      domain: 'acme.com',
      industry: '-',
      logoUrl: '',
      name: 'Acme Corp',
      negotiationStatus: {} as never,
      originalSupplierName: 'ACME CORP',
      parentName: 'Acme Holding',
      region: '-',
      spendsAmount: 0,
      supplier: {},
      isApprovedAndReadyToPublish: false,
      ...overrides,
    },
    global: {
      mocks: { $t: (key: string) => key },
    },
  })
}

describe('EntityCardRecentSearchCompany — Pending Approval badge', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    userSession.value = { isSuperAdmin: false, email: 'someone@customer.com' }
    roleFlags.userIsSuperAdmin.value = false
    roleFlags.userSalesRoleEnabled.value = false
    roleFlags.userDataRoleEnabled.value = false
  })

  it('is hidden for a plain customer user, even on an unapproved potential', () => {
    expect(mountCard().find(BADGE).exists()).toBe(false)
  })

  it.each([
    ['super admin', 'userIsSuperAdmin'],
    ['sales', 'userSalesRoleEnabled'],
    ['data', 'userDataRoleEnabled'],
  ])('is shown for %s on an unapproved potential', (_label, flag) => {
    roleFlags[flag as keyof typeof roleFlags].value = true

    expect(mountCard().find(BADGE).exists()).toBe(true)
  })

  it('is hidden once the potential has been approved', () => {
    roleFlags.userDataRoleEnabled.value = true

    expect(mountCard({ isApprovedAndReadyToPublish: true }).find(BADGE).exists()).toBe(false)
  })

  /**
   * null means "not applicable" - a real supplier or a parent - and must never read as pending.
   */
  it('is hidden when the flag is null', () => {
    roleFlags.userDataRoleEnabled.value = true

    expect(mountCard({ isApprovedAndReadyToPublish: null }).find(BADGE).exists()).toBe(false)
  })

  it('is hidden on a non-potential entity even when the flag says false', () => {
    roleFlags.userDataRoleEnabled.value = true

    expect(mountCard({ companyType: 'supplier' }).find(BADGE).exists()).toBe(false)
  })
})
