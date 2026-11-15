import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import CustomerCardHeader from '@/modules/buyers/components/customerCard/CustomerCardHeader.vue'

const messages = {
  en: {
    arMatch: {
      roles: { parent: 'Parent', counterparty: 'Counterparty', self: 'Self' },
    },
    arCustomerCard: {
      notAvailable: '—',
    },
  },
}

function mountHeader(card: {
  name: string | null
  role: 'Self' | 'Counterparty' | 'Parent'
  country?: string | null
  countryFlagUrl?: string | null
}) {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  return mount(CustomerCardHeader, { props: { card }, global: { plugins: [i18n] } })
}

describe('CustomerCardHeader', () => {
  it('renders the name and role', () => {
    const view = mountHeader({ name: 'Caterpillar Inc', role: 'Parent' })

    expect(view.text()).toContain('Caterpillar Inc')
    expect(view.text()).toContain('Parent')
  })

  it('falls back to the not-available marker for a null name', () => {
    const view = mountHeader({ name: null, role: 'Counterparty' })

    expect(view.text()).toContain('—')
  })

  it('shows the country flag next to the name when countryFlagUrl is given', () => {
    const view = mountHeader({
      name: 'Caterpillar Inc',
      role: 'Parent',
      country: 'United States',
      countryFlagUrl: 'https://example.com/us.svg',
    })

    const flag = view.find('.ar-country-flag')
    expect(flag.exists()).toBe(true)
    expect(flag.attributes('src')).toBe('https://example.com/us.svg')
    expect(flag.attributes('alt')).toBe('United States')
  })

  it('renders no flag when countryFlagUrl is null', () => {
    const view = mountHeader({ name: 'Caterpillar Inc', role: 'Parent', countryFlagUrl: null })

    expect(view.find('.ar-country-flag').exists()).toBe(false)
  })

  it('hides the flag once it fails to load', async () => {
    const view = mountHeader({ name: 'Caterpillar Inc', role: 'Parent', countryFlagUrl: 'https://example.com/us.svg' })

    await view.get('.ar-country-flag').trigger('error')

    expect(view.find('.ar-country-flag').exists()).toBe(false)
  })
})
