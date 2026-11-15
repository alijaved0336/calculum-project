import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { VueWrapper } from '@vue/test-utils'
import { mountWithProviders } from '../Helpers/mountWithProviders'
import ManageRevenueGrowthAction from '@/modules/components/grid/menuActions/ManageRevenueGrowthAction.vue'

describe('ManageRevenueGrowthAction', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mountWithProviders(ManageRevenueGrowthAction)
  })

  // ─── canSubmit guard ────────────────────────────────────────────────────────

  it('Save button is disabled when both inputs are empty', () => {
    const saveBtn = wrapper.find('button.btn-primary')
    expect(saveBtn.attributes('disabled')).toBeDefined()
  })

  it('Save button stays disabled when only revenueY is filled', async () => {
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[0].setValue('1200')
    const saveBtn = wrapper.find('button.btn-primary')
    expect(saveBtn.attributes('disabled')).toBeDefined()
  })

  it('Save button stays disabled when only revenueY1 is filled', async () => {
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[1].setValue('1000')
    const saveBtn = wrapper.find('button.btn-primary')
    expect(saveBtn.attributes('disabled')).toBeDefined()
  })

  it('Save button is enabled when both inputs contain valid non-negative numbers', async () => {
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[0].setValue('1200')
    await inputs[1].setValue('1000')
    const saveBtn = wrapper.find('button.btn-primary')
    expect(saveBtn.attributes('disabled')).toBeUndefined()
  })

  // ─── submit() ──────────────────────────────────────────────────────────────

  it('submit() emits exactly one call-action with key supplierRevenueGrowth and correct payload', async () => {
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[0].setValue('1200')
    await inputs[1].setValue('1000')

    await wrapper.find('button.btn-primary').trigger('click')

    const emissions = wrapper.emitted('call-action')
    expect(emissions).toHaveLength(1)
    const [key, isEmit, payload] = emissions![0] as [string, boolean, any]
    expect(key).toBe('supplierRevenueGrowth')
    expect(isEmit).toBe(true)
    expect(payload.paramY).toBe(1200)
    expect(payload.paramY1).toBe(1000)
    expect(payload.removeGroup).toBe(false)
  })

  it('submit() does not emit when canSubmit is false (guard)', async () => {
    await wrapper.find('button.btn-primary').trigger('click')
    expect(wrapper.emitted('call-action')).toBeFalsy()
  })

  // ─── clear() ───────────────────────────────────────────────────────────────

  it('clear() emits call-action with null payloads and removeGroup: true', async () => {
    await wrapper.find('button.outline-secondary-btn').trigger('click')

    const emissions = wrapper.emitted('call-action')
    expect(emissions).toHaveLength(1)
    const [key, isEmit, payload] = emissions![0] as [string, boolean, any]
    expect(key).toBe('supplierRevenueGrowth')
    expect(isEmit).toBe(true)
    expect(payload.paramY).toBeNull()
    expect(payload.paramY1).toBeNull()
    expect(payload.removeGroup).toBe(true)
  })

  it('clear() resets inputs to empty after firing', async () => {
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[0].setValue('500')
    await inputs[1].setValue('400')

    await wrapper.find('button.outline-secondary-btn').trigger('click')

    expect((inputs[0].element as HTMLInputElement).value).toBe('')
    expect((inputs[1].element as HTMLInputElement).value).toBe('')
  })

  // ─── initialRevenueY / initialRevenueYMinus1 props ────────────────────────

  it('pre-fills both inputs from initialRevenueY and initialRevenueYMinus1 when provided', async () => {
    const w = mountWithProviders(ManageRevenueGrowthAction, {
      props: { initialRevenueY: 1200, initialRevenueYMinus1: 1000 }
    })
    await nextTick()
    const inputs = w.findAll('input[type="number"]')
    expect((inputs[0].element as HTMLInputElement).value).toBe('1200')
    expect((inputs[1].element as HTMLInputElement).value).toBe('1000')
  })

  it('Save button is enabled immediately when pre-filled with valid initial values', async () => {
    const w = mountWithProviders(ManageRevenueGrowthAction, {
      props: { initialRevenueY: 1200, initialRevenueYMinus1: 1000 }
    })
    await nextTick()
    expect(w.find('button.btn-primary').attributes('disabled')).toBeUndefined()
  })

  it('leaves inputs empty when initial props are null', async () => {
    const w = mountWithProviders(ManageRevenueGrowthAction, {
      props: { initialRevenueY: null, initialRevenueYMinus1: null }
    })
    await nextTick()
    const inputs = w.findAll('input[type="number"]')
    expect((inputs[0].element as HTMLInputElement).value).toBe('')
    expect((inputs[1].element as HTMLInputElement).value).toBe('')
  })

  // ─── emission order (race-condition guard) ─────────────────────────────────

  it('submit then clear produces emissions in order: submit first, clear second', async () => {
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[0].setValue('1200')
    await inputs[1].setValue('1000')

    await wrapper.find('button.btn-primary').trigger('click')
    await wrapper.find('button.outline-secondary-btn').trigger('click')

    const emissions = wrapper.emitted('call-action') as [string, boolean, any][]
    expect(emissions).toHaveLength(2)

    const [, , firstPayload] = emissions[0]
    expect(firstPayload.removeGroup).toBe(false)   // submit

    const [, , secondPayload] = emissions[1]
    expect(secondPayload.removeGroup).toBe(true)   // clear
    expect(secondPayload.paramY).toBeNull()
    expect(secondPayload.paramY1).toBeNull()
  })
})
