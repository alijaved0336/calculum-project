import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../Helpers/mountWithProviders'
import ManageDSOAction from '@/modules/components/grid/menuActions/ManageDSOAction.vue'

const DEFAULT_PROPS = { option: 'supplierDso' }

describe('ManageDSOAction', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mountWithProviders(ManageDSOAction, { props: DEFAULT_PROPS })
  })

  // ─── canSubmit guard ────────────────────────────────────────────────────────

  it('Save button is disabled when input is empty', () => {
    expect(wrapper.find('button.btn-primary').attributes('disabled')).toBeDefined()
  })

  it('Save button is disabled for decimal values', async () => {
    await wrapper.find('input[type="number"]').setValue('1.5')
    expect(wrapper.find('button.btn-primary').attributes('disabled')).toBeDefined()
  })

  it('Save button is disabled for negative values', async () => {
    await wrapper.find('input[type="number"]').setValue('-1')
    expect(wrapper.find('button.btn-primary').attributes('disabled')).toBeDefined()
  })

  it('Save button is enabled for a valid non-negative integer', async () => {
    await wrapper.find('input[type="number"]').setValue('30')
    expect(wrapper.find('button.btn-primary').attributes('disabled')).toBeUndefined()
  })

  // ─── submit() ──────────────────────────────────────────────────────────────

  it('submit() emits call-action with correct payload', async () => {
    await wrapper.find('input[type="number"]').setValue('30')
    await wrapper.find('button.btn-primary').trigger('click')

    const emissions = wrapper.emitted('call-action')
    expect(emissions).toHaveLength(1)
    const [key, isEmit, payload] = emissions![0] as [string, boolean, any]
    expect(key).toBe('supplierDso')
    expect(isEmit).toBe(true)
    expect(payload.param).toBe(30)
    expect(payload.removeGroup).toBe(false)
  })

  it('submit() does not emit when canSubmit is false (guard)', async () => {
    await wrapper.find('button.btn-primary').trigger('click')
    expect(wrapper.emitted('call-action')).toBeFalsy()
  })

  // ─── clear() ───────────────────────────────────────────────────────────────

  it('clear() emits call-action with param null and removeGroup: true', async () => {
    await wrapper.find('button.outline-secondary-btn').trigger('click')

    const emissions = wrapper.emitted('call-action')
    expect(emissions).toHaveLength(1)
    const [key, isEmit, payload] = emissions![0] as [string, boolean, any]
    expect(key).toBe('supplierDso')
    expect(isEmit).toBe(true)
    expect(payload.param).toBeNull()
    expect(payload.removeGroup).toBe(true)
  })

  it('clear() resets input to empty', async () => {
    const input = wrapper.find('input[type="number"]')
    await input.setValue('45')
    await wrapper.find('button.outline-secondary-btn').trigger('click')
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  // ─── initialDso prop ───────────────────────────────────────────────────────

  it('pre-fills input from initialDso when provided', async () => {
    const w = mountWithProviders(ManageDSOAction, { props: { ...DEFAULT_PROPS, initialDso: 60 } })
    await nextTick()
    const input = w.find('input[type="number"]').element as HTMLInputElement
    expect(input.value).toBe('60')
  })

  it('leaves input empty when initialDso is null', async () => {
    const w = mountWithProviders(ManageDSOAction, { props: { ...DEFAULT_PROPS, initialDso: null } })
    await nextTick()
    const input = w.find('input[type="number"]').element as HTMLInputElement
    expect(input.value).toBe('')
  })

  it('Save button is enabled immediately when pre-filled with a valid initialDso', async () => {
    const w = mountWithProviders(ManageDSOAction, { props: { ...DEFAULT_PROPS, initialDso: 45 } })
    await nextTick()
    expect(w.find('button.btn-primary').attributes('disabled')).toBeUndefined()
  })
})
