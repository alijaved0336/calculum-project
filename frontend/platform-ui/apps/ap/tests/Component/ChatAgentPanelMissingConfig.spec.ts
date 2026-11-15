/**
 * AGENT_API_URL is read once at module load as `import.meta.env.VITE_AGENT_API_URL ?? ""`,
 * which only guards `undefined`. An unset env var becomes "", which is passed straight
 * through as CalculumApp's :api-base-url — and per the comment above that constant, the
 * widget falls back to its hardcoded PRODUCTION url when that prop is empty. So any
 * environment that forgets to set VITE_AGENT_API_URL (local dev, QA, staging) silently
 * sends real userId/tenantId/supplierId chat traffic to prod instead of failing loudly.
 * `missingConfig` must treat a missing base URL the same as a missing tenant/user id —
 * each dynamic import below gets a fresh module evaluation of the stubbed env var.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('calculum-ui', () => ({
  CalculumApp: { name: 'CalculumApp', template: '<div class="calculum-app-stub" />' }
}))

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    getUser: { azureId: 'user-1', activeCompany: { tenantId: 'tenant-1' } }
  })
}))

vi.mock('@/composables', () => ({
  useSpendFile: () => ({ spendFileVersionActiveId: { value: 'v1' } })
}))

async function mountPanel() {
  const { default: ChatAgentPanel } = await import(
    '@/modules/home/entityCard/components/ChatAgentPanel.vue'
  )
  return mount(ChatAgentPanel, { props: { supplierId: 's1', entityName: 'Acme' } })
}

describe('ChatAgentPanel — missingConfig with an unset agent API URL', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('treats a missing VITE_AGENT_API_URL as missing configuration instead of defaulting to prod', async () => {
    vi.stubEnv('VITE_AGENT_API_URL', undefined)

    const wrapper = await mountPanel()

    expect(wrapper.text()).toContain('Agent not configured')
    expect(wrapper.findComponent({ name: 'CalculumApp' }).exists()).toBe(false)
  })

  it('renders the agent widget when tenant, user and API URL are all present', async () => {
    vi.stubEnv('VITE_AGENT_API_URL', 'https://agent.example.com')

    const wrapper = await mountPanel()

    expect(wrapper.findComponent({ name: 'CalculumApp' }).exists()).toBe(true)
  })
})
