/**
 * WI#19918 AC-06 — with no commodity selected, Supplier Insights must not sit on its skeletons.
 *
 * The two Lovelace calls are correctly skipped (that is what AC-06 asks for), but
 * initLovelaceFlow raises both loading flags before calling them, so a bail-out that left the
 * flags on kept the Procurement Insights and Market Share panels on their skeletons forever —
 * a screen that looks like it is still loading while the not-found banner says otherwise.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const { postLovelaceNegotiationInsightsArguments, postLovelaceMarketShare } = vi.hoisted(() => ({
  postLovelaceNegotiationInsightsArguments: vi.fn(),
  postLovelaceMarketShare: vi.fn(),
}))

vi.mock('@/modules/home/entityCard/api', () => ({
  postLovelaceNegotiationInsightsArguments,
  postLovelaceMarketShare,
}))

vi.mock('@/services/router', () => ({ default: { push: vi.fn() } }))

const ENTITY_DETAILS = {
  supplierName: '3A Composites Mobility S.A.',
  supplierCountry: 'Poland',
  supplierCountryAlpha3Code: 'POL',
  buyerCountry: 'Spain',
}

const Panel = (
  await import('@/modules/home/entityCard/views/EntityCardSupplierInsights.vue')
).default

async function mountPanel(selectedHsCode: string) {
  const wrapper = mount(Panel, {
    props: { companyId: 'company-1', entityDetails: ENTITY_DETAILS, selectedHsCode },
    global: {
      mocks: { $t: (key: string) => key },
      stubs: { Skeleton: { template: '<div class="stub-skeleton" />' }, HorizontalBarChart: { template: '<div />' } },
    },
  })

  await new Promise((resolve) => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()

  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('Supplier Insights with no commodity selected (WI#19918)', () => {
  it('does not request AI content and does not stay loading', async () => {
    const wrapper = await mountPanel('')

    expect(postLovelaceNegotiationInsightsArguments).not.toHaveBeenCalled()
    expect(postLovelaceMarketShare).not.toHaveBeenCalled()
    expect((wrapper.vm as any).negotiationLoading).toBe(false)
    expect((wrapper.vm as any).marketShareLoading).toBe(false)
  })
})
