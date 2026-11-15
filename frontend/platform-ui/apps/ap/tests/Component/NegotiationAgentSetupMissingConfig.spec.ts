/**
 * Same bug as ChatAgentPanel: agentApiBaseUrl reads `import.meta.env.VITE_AGENT_API_URL ?? ""`,
 * which only guards `undefined`. The widget-vs-fallback gate here only checks `userId && tenantId`,
 * so an unset VITE_AGENT_API_URL still renders SetupWidget with an empty
 * :api-base-url — which, per the shared widget's own fallback behavior, silently talks to its
 * hardcoded production URL instead of surfacing a "not configured" state.
 *
 * Also covers VITE_ENABLE_CALCULUM_AGENT: the whole calculum-ui integration is meant to show
 * in production only (see .env's committed default of false, overridden true per-environment).
 * Every case below stubs it explicitly, same reasoning as VITE_AGENT_API_URL — an unstubbed
 * case would assert on whatever .env.local happens to have on that machine.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    getUser: { azureId: 'user-1', activeCompany: { tenantId: 'tenant-1' } }
  })
}))

async function mountPanel() {
  const { default: NegotiationAgentSetup } = await import(
    '@/modules/home/views/settings/NegotiationAgentSetup.vue'
  )
  return mount(NegotiationAgentSetup, {
    global: {
      stubs: { SetupWidget: { template: '<div class="setup-widget-stub" />' } },
      mocks: { $t: (key: string) => key }
    }
  })
}

describe('NegotiationAgentSetup — missing agent API URL', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('falls back instead of rendering the widget when VITE_AGENT_API_URL is unset', async () => {
    vi.stubEnv('VITE_AGENT_API_URL', undefined)
    vi.stubEnv('VITE_ENABLE_CALCULUM_AGENT', 'true')

    const wrapper = await mountPanel()

    expect(wrapper.find('.setup-widget-stub').exists()).toBe(false)
  })

  it('falls back instead of rendering the widget when VITE_ENABLE_CALCULUM_AGENT is not true', async () => {
    vi.stubEnv('VITE_AGENT_API_URL', 'https://agent.example.com')
    vi.stubEnv('VITE_ENABLE_CALCULUM_AGENT', undefined)

    const wrapper = await mountPanel()

    expect(wrapper.find('.setup-widget-stub').exists()).toBe(false)
  })

  it('renders the widget when user, tenant, API URL are present and the feature is enabled', async () => {
    vi.stubEnv('VITE_AGENT_API_URL', 'https://agent.example.com')
    vi.stubEnv('VITE_ENABLE_CALCULUM_AGENT', 'true')

    const wrapper = await mountPanel()

    expect(wrapper.find('.setup-widget-stub').exists()).toBe(true)
  })
})
