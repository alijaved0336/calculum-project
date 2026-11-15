/**
 * Contract tests for CalculumClose.
 *
 * `#entity-close-modal` is the handle the e2e suite uses to close the entity
 * card modal, and it is produced by a *bound* id on the component root. That
 * makes it silently breakable: a static `id` added next to the binding wins at
 * compile time and drops the binding altogether, which is what commit
 * 29b0ba8a37 did — the id vanished from the DOM and every e2e test that closes
 * the entity card broke at once, with nothing failing at build or unit level.
 *
 * These tests pin the rendered contract so that class of change fails here,
 * in CI, instead of in the e2e run against a deployed environment.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import CalculumClose from '@/modules/components/CalculumClose.vue'

const ENTITY_CARD_CLOSE_ID = 'entity-close-modal'

describe('CalculumClose', () => {
  it('exposes the entity card close id when hasId is set', () => {
    const wrapper = mount(CalculumClose, { props: { hasId: true } })

    expect(wrapper.attributes('id')).toBe(ENTITY_CARD_CLOSE_ID)
    expect(wrapper.find(`#${ENTITY_CARD_CLOSE_ID}`).exists()).toBe(true)
  })

  it('does not expose the id when hasId is not set', () => {
    const wrapper = mount(CalculumClose)

    // The binding resolves to an empty string rather than being absent, so
    // assert on the value: what matters is that the handle does not resolve.
    expect(wrapper.attributes('id')).toBeFalsy()
  })

  it('keeps a single root element so class and listeners still fall through', () => {
    // A second root node (a stray comment or sibling element) turns the
    // component into a fragment, and Vue then stops applying the `class` and
    // `@click` that every call site passes.
    const wrapper = mount(CalculumClose, {
      props: { hasId: true },
      attrs: { class: 'cursor-pointer' },
    })

    expect(wrapper.element.tagName.toLowerCase()).toBe('svg')
    expect(wrapper.classes()).toContain('cursor-pointer')
  })

  it('lets a call site override the test id it renders by default', () => {
    // Attribute fallthrough from the call site takes precedence over the
    // component's own static attribute. This is what makes a hook declared
    // where the component is used immune to being clobbered from inside the
    // component, unlike the bound id above.
    const wrapper = mount(CalculumClose, {
      attrs: { 'data-testid': 'entity-card-close' },
    })

    expect(wrapper.attributes('data-testid')).toBe('entity-card-close')
  })
})
