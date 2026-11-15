/**
 * EntityCardOverview.vue's side panel mounts ActivityPanel with :standalone="false" and
 * @refresh="handleRefreshActivity" bound (see EntityCardOverview.vue's side-panel-header,
 * which only re-implements the Agent tab actions and the close button). ActivityPanel used
 * to gate its whole `.activity-header` — title AND header-actions (filter dropdown, refresh
 * button) — behind `v-if="standalone"`, so in the only non-standalone consumer neither
 * control was reachable even though `@refresh` was still wired up. header-actions must stay
 * visible regardless of `standalone`; only the title is standalone-only.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ActivityPanel from '@/modules/home/entityCard/components/ActivityPanel.vue'

// Neither bubble's own internals matter for this test — only ActivityPanel's own header —
// and the real ones drag in stores/toast/CalculumModal chains this test doesn't need.
vi.mock('@/modules/home/entityCard/components/ActivityNoteBubble.vue', () => ({
  default: { name: 'ActivityNoteBubble', template: '<div />' }
}))
vi.mock('@/modules/home/entityCard/components/ActivityLogBubble.vue', () => ({
  default: { name: 'ActivityLogBubble', template: '<div />' }
}))

// StringUtils re-exports through the `@/utils` barrel, which is circular with StringUtils
// itself and eagerly pulls in route definitions (and, transitively, unrelated views) —
// harmless in the real app's load order but broken when this test is the entry point.
// Neither helper it exposes runs in the header-actions path this test exercises.
vi.mock('@/utils/StringUtils', () => ({
  default: {
    getDisplayNameFromUser: () => '',
    escapeHtml: (value: string) => value
  }
}))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} }
})

function mountPanel(standalone: boolean) {
  return mount(ActivityPanel, {
    props: { standalone, totalItems: 5 },
    global: { plugins: [i18n] }
  })
}

describe('ActivityPanel — header actions when embedded non-standalone', () => {
  it('keeps the refresh control reachable and working when standalone is false', async () => {
    const wrapper = mountPanel(false)

    const refreshButton = wrapper.find('button[title="Refresh"]')
    expect(refreshButton.exists()).toBe(true)

    await refreshButton.trigger('click')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })

  it('keeps the activity filter dropdown reachable when standalone is false', () => {
    const wrapper = mountPanel(false)

    expect(wrapper.find('.filter-wrapper').exists()).toBe(true)
  })
})
