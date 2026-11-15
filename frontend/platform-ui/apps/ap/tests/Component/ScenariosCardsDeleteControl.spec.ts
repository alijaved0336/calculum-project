import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountWithProviders } from '../Helpers/mountWithProviders'

// AB#19912 — the trash icon on a scenario card was rendered for everybody while the API only let
// admins delete, so a regular user saw a control that answered 403. The card now shows it only to
// the scenario's creator or to an admin, which is the rule the Back-End enforces.
//
// Mounts the real ScenariosCards.vue: a stub copy of the v-if would stay green when the component
// changes.

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

// Two separate paths reach the router and, behind it, every view — where MetricsComponents.vue
// reads NumberUtils at module scope and gets undefined from the half-initialised barrel. Both have
// to be cut: @/utils via RedirectSection -> services/router/Routing, and @/stores/user on its own.
// The card only ever calls StringUtils.formatBigNumbers.
//
// The factory must return a plain object: an `await import` inside it deadlocks vitest here.
vi.mock('@/utils', () => ({
  StringUtils: {
    formatBigNumbers: (value: number) => String(value),
  },
}))

// Same plain-factory mock the other component specs use — NineBoxesBox.spec.ts:56.
//
// isAdmin is handed in rather than derived from roles on purpose: it is the store's own computed
// (ROLE_ADMIN || ROLE_COMPANY_ADMIN || isSuperAdmin) and recomputing it here would test a copy of
// it instead of the card. What this spec owns is the card's rule, "admin or creator".
const session: { actualUser: unknown; isAdmin: boolean } = { actualUser: null, isAdmin: false }

vi.mock('@/stores/user', () => ({
  useUserStore: () => session,
}))

import ScenariosCards from '@/modules/home/entityCard/components/ScenariosCards.vue'

const OWNER_IRI = '/api/users/1001'
const OTHER_IRI = '/api/users/1002'
const SCENARIO_IRI = '/api/calculated_scenarios/f5b45dfc-ba5f-45a1-82ea-6c6d1f51787d'

function scenario(createdBy: unknown) {
  return {
    '@id': SCENARIO_IRI,
    '@type': 'CalculatedScenario',
    createdBy,
    name: 'E2E scenario',
    changeInTerms: 10,
    priceChange: -1,
    calculationType: 'none',
    calculatedData: { data: { buyer: { economicProfit: 1234 } } },
  }
}

function mountCard(scenarios: unknown, user: unknown, isAdmin = false) {
  session.actualUser = user
  session.isAdmin = isAdmin
  return mountWithProviders(ScenariosCards, { props: { scenarios } })
}

describe('ScenariosCards — delete control (AB#19912)', () => {
  beforeEach(() => {
    session.actualUser = null
    session.isAdmin = false
    vi.clearAllMocks()
  })

  it('shows the trash to the scenario creator and emits deleteScenario with the card @id', async () => {
    const wrapper = mountCard(scenario({ '@id': OWNER_IRI }), { '@id': OWNER_IRI })

    const trash = wrapper.find('.close-scenarios-card i')
    expect(trash.exists()).toBe(true)

    await trash.trigger('click')
    expect(wrapper.emitted('deleteScenario')).toEqual([[SCENARIO_IRI]])
  })

  it('hides the trash from a same-company user who did not create the scenario', () => {
    const wrapper = mountCard(scenario({ '@id': OWNER_IRI }), { '@id': OTHER_IRI })

    expect(wrapper.find('.close-scenarios-card').exists()).toBe(false)
  })

  it('shows the trash to an admin who did not create the scenario', () => {
    const wrapper = mountCard(scenario({ '@id': OWNER_IRI }), { '@id': OTHER_IRI }, true)

    expect(wrapper.find('.close-scenarios-card').exists()).toBe(true)
  })

  it('accepts createdBy collapsed to an IRI string', () => {
    const wrapper = mountCard(scenario(OWNER_IRI), { '@id': OWNER_IRI })

    expect(wrapper.find('.close-scenarios-card').exists()).toBe(true)
  })

  it('hides the trash when there is no session user at all', () => {
    const wrapper = mountCard(scenario({ '@id': OWNER_IRI }), null)

    expect(wrapper.find('.close-scenarios-card').exists()).toBe(false)
  })

  it('hides the trash when the scenario carries no creator', () => {
    const wrapper = mountCard(scenario(null), { '@id': OWNER_IRI })

    expect(wrapper.find('.close-scenarios-card').exists()).toBe(false)
  })

  it('does not carry the shared id that duplicated across cards (AB#19914)', () => {
    const wrapper = mountCard(scenario({ '@id': OWNER_IRI }), { '@id': OWNER_IRI })

    expect(wrapper.find('#close-scenarios-card').exists()).toBe(false)
    expect(wrapper.find('.close-scenarios-card').exists()).toBe(true)
  })

  it('still renders the card body for a user who may not delete', () => {
    const wrapper = mountCard(scenario({ '@id': OWNER_IRI }), { '@id': OTHER_IRI })

    expect(wrapper.text()).toContain('E2E scenario')
  })
})
