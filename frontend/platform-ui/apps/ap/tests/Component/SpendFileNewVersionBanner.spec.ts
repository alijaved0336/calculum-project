import { describe, it, expect, beforeEach } from 'vitest'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../Helpers/mountWithProviders'
import SpendFileNewVersionBanner from '@/modules/components/SpendFileNewVersionBanner.vue'

const DEFAULT_VERSION = {
  '@id': '/api/spend_file_versions/sfv-1',
  name: 'Q1 2025 Spend',
  version: 3,
}

describe('SpendFileNewVersionBanner', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mountWithProviders(SpendFileNewVersionBanner, {
      props: { version: DEFAULT_VERSION },
    })
  })

  // ─── Rendering ──────────────────────────────────────────────────────────────

  it('renders the warning icon', () => {
    expect(wrapper.find('.banner-icon').exists()).toBe(true)
  })

  it('renders the banner message text element', () => {
    expect(wrapper.find('.banner-text').exists()).toBe(true)
  })

  it('renders the load button', () => {
    expect(wrapper.find('button.banner-load-btn').exists()).toBe(true)
  })

  it('renders the dismiss button', () => {
    expect(wrapper.find('button.banner-close-btn').exists()).toBe(true)
  })

  it('dismiss button has aria-label attribute', () => {
    const closeBtn = wrapper.find('button.banner-close-btn')
    expect(closeBtn.attributes('aria-label')).toBeDefined()
  })

  // ─── Emits ──────────────────────────────────────────────────────────────────

  it('emits "load" with the version object when load button is clicked', async () => {
    await wrapper.find('button.banner-load-btn').trigger('click')

    const emissions = wrapper.emitted('load')
    expect(emissions).toHaveLength(1)
    expect(emissions![0][0]).toEqual(DEFAULT_VERSION)
  })

  it('emits "dismiss" when close button is clicked', async () => {
    await wrapper.find('button.banner-close-btn').trigger('click')

    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })

  it('does not emit "dismiss" when load button is clicked', async () => {
    await wrapper.find('button.banner-load-btn').trigger('click')
    expect(wrapper.emitted('dismiss')).toBeFalsy()
  })

  it('does not emit "load" when close button is clicked', async () => {
    await wrapper.find('button.banner-close-btn').trigger('click')
    expect(wrapper.emitted('load')).toBeFalsy()
  })

  // ─── Multiple interactions ───────────────────────────────────────────────────

  it('emits "load" with updated version when prop changes', async () => {
    const newVersion = { '@id': '/api/spend_file_versions/sfv-2', name: 'Q2 2025', version: 4 }
    await wrapper.setProps({ version: newVersion })
    await wrapper.find('button.banner-load-btn').trigger('click')

    const emissions = wrapper.emitted('load')
    expect(emissions).toHaveLength(1)
    expect(emissions![0][0]).toEqual(newVersion)
  })

  it('can emit "load" multiple times on repeated clicks', async () => {
    await wrapper.find('button.banner-load-btn').trigger('click')
    await wrapper.find('button.banner-load-btn').trigger('click')

    expect(wrapper.emitted('load')).toHaveLength(2)
  })
})
