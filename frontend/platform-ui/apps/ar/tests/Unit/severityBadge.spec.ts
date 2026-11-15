import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import SeverityBadge from '@/modules/match/components/SeverityBadge.vue'

const messages = {
  en: {
    arMatch: {
      severity: { blocking: 'Blocking', warning: 'Warning' },
    },
  },
}

function mountBadge(severity: string) {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', globalInjection: true, messages })
  return mount(SeverityBadge, { props: { severity }, global: { plugins: [i18n] } })
}

describe('SeverityBadge', () => {
  it('renders blocking with the danger variant', () => {
    const view = mountBadge('blocking')

    expect(view.text()).toBe('Blocking')
    expect(view.find('.ds-custom-badge').classes()).toContain('ds-custom-badge--danger')
  })

  it('renders warning with the warning variant', () => {
    const view = mountBadge('warning')

    expect(view.text()).toBe('Warning')
    expect(view.find('.ds-custom-badge').classes()).toContain('ds-custom-badge--warning')
  })

  it('falls back to the warning variant and the raw value for an unknown severity, rather than throwing', () => {
    const view = mountBadge('critical')

    expect(view.text()).toBe('critical')
    expect(view.find('.ds-custom-badge').classes()).toContain('ds-custom-badge--warning')
  })
})
