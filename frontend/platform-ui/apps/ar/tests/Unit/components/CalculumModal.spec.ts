import { afterEach, describe, expect, it } from 'vitest'
import { DOMWrapper, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import CalculumModal from '@/components/CalculumModal.vue'

const messages = { en: { button: { close: 'Close' } } }

// CalculumModal renders through <Teleport to="body">, so its content lands as a real sibling
// under jsdom's document.body rather than inside the mounted wrapper's own root element -
// wrapper.find() only searches wrapper.element's own subtree, so queries go through this instead.
const body = new DOMWrapper(document.body)

const wrappers: Array<ReturnType<typeof mount>> = []

function mountModal(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  const wrapper = mount(CalculumModal, { props, slots, global: { plugins: [i18n] } })
  wrappers.push(wrapper)
  return wrapper
}

describe('CalculumModal', () => {
  afterEach(() => {
    // Left un-unmounted, a Teleported modal would leak into whichever test runs next.
    wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('renders the default slot as its body', () => {
    mountModal({}, { default: '<p class="body-content">Hello</p>' })

    expect(body.get('.body-content').text()).toBe('Hello')
  })

  it('renders a title when given one', () => {
    mountModal({ title: 'Confirm action' })

    expect(body.text()).toContain('Confirm action')
  })

  it('renders no header at all when there is no title and no title slot', () => {
    mountModal()

    expect(body.find('.calculum-modal-header').exists()).toBe(false)
  })

  it('renders the title slot instead of the plain title prop when given one', () => {
    mountModal({ title: 'Ignored' }, { title: '<span class="custom-title">Custom</span>' })

    expect(body.find('.custom-title').exists()).toBe(true)
    expect(body.text()).not.toContain('Ignored')
  })

  it('renders the footer slot only when given one', () => {
    const withoutFooter = mountModal()
    expect(body.find('.calculum-modal-footer').exists()).toBe(false)
    withoutFooter.unmount()

    mountModal({}, { footer: '<button class="footer-btn">Save</button>' })
    expect(body.find('.calculum-modal-footer .footer-btn').exists()).toBe(true)
  })

  it('shows a close button by default, and emits close when it is clicked', async () => {
    const wrapper = mountModal()

    await body.get('.calculum-modal-close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('hides the close button when showClose is false', () => {
    mountModal({ showClose: false })

    expect(body.find('.calculum-modal-close').exists()).toBe(false)
  })

  it('emits close when the overlay backdrop is clicked, but not the content itself', async () => {
    const wrapper = mountModal()

    await body.get('.calculum-modal-content').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()

    await body.get('.calculum-modal-overlay').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not emit close on overlay click when closeOnOverlayClick is false', async () => {
    const wrapper = mountModal({ closeOnOverlayClick: false })

    await body.get('.calculum-modal-overlay').trigger('click')

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('applies the size preset class by default', () => {
    mountModal({ size: 'lg' })

    expect(body.get('.calculum-modal-content').classes()).toContain('calculum-modal-content--lg')
  })

  it('applies an explicit width over the size preset', () => {
    mountModal({ size: 'lg', width: '70%' })

    expect(body.get('.calculum-modal-content').attributes('style')).toContain('width: 70%')
  })

  it('closes on Escape by default', async () => {
    const wrapper = mountModal()

    await document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('does not close on Escape when closeOnEscape is false', async () => {
    const wrapper = mountModal({ closeOnEscape: false })

    await document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('closes only the topmost modal when two are stacked and Escape is pressed', async () => {
    const bottom = mountModal({ title: 'Bottom' })
    const top = mountModal({ title: 'Top' })

    await document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(top.emitted('close')).toHaveLength(1)
    expect(bottom.emitted('close')).toBeUndefined()
  })

  it('falls back to the remaining modal once the topmost one closes', async () => {
    const bottom = mountModal({ title: 'Bottom' })
    const top = mountModal({ title: 'Top' })
    top.unmount()
    wrappers.pop()

    await document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(bottom.emitted('close')).toHaveLength(1)
  })
})
