import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

const context = reactive<{ companyUuid: string | null; hasCompany: boolean }>({
  companyUuid: null,
  hasCompany: false,
})
vi.mock('@/stores/context', () => ({ useContextStore: () => context }))

const fetchMatchSettings = vi.fn()
const saveMatchSettings = vi.fn()
vi.mock('@/modules/setup/api/matchSettings', () => ({
  fetchMatchSettings: (...args: unknown[]) => fetchMatchSettings(...args),
  saveMatchSettings: (...args: unknown[]) => saveMatchSettings(...args),
}))

import { ToggleSwitch } from '@ada/design-system'
import { HttpError } from '@/api/http'
import SetupMatchSettings from '@/modules/setup/components/SetupMatchSettings.vue'

function selectCompany(uuid: string | null): void {
  context.companyUuid = uuid
  context.hasCompany = uuid !== null
}

let mounted: VueWrapper[] = []

/** `ToggleSwitch` needs `ResizeObserver`, unavailable under jsdom here (no vitest setupFiles
 * polyfill) — stubbed, so this file tests
 * SetupMatchSettings' own load/save wiring, not Kendo's internals. */
function mountComponent(): VueWrapper {
  const wrapper = mount(SetupMatchSettings, { global: { stubs: { ToggleSwitch: true } } })
  mounted.push(wrapper)
  return wrapper
}

describe('SetupMatchSettings', () => {
  beforeEach(() => {
    fetchMatchSettings.mockReset()
    saveMatchSettings.mockReset()
    selectCompany(null)
  })

  afterEach(() => {
    for (const wrapper of mounted) {
      wrapper.unmount()
    }
    mounted = []
  })

  it('asks for a company before fetching anything', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('Select a company')
    expect(fetchMatchSettings).not.toHaveBeenCalled()
  })

  it('reads the settings for the selected company', async () => {
    selectCompany('company-1')
    fetchMatchSettings.mockResolvedValue({
      companyUuid: 'company-1',
      isConfigured: true,
      settings: { ocrConfidenceThreshold: 0.75, autoMatch: false },
    })

    const wrapper = mountComponent()
    await flushPromises()

    expect(fetchMatchSettings).toHaveBeenCalledWith('company-1')
    // 0.75 fraction shown as a 75% whole number.
    expect((wrapper.find('#ocr-confidence-threshold').element as HTMLInputElement).value).toBe('75')
  })

  it('falls back to defaults when the company has never configured settings (isConfigured: false)', async () => {
    selectCompany('company-1')
    fetchMatchSettings.mockResolvedValue({ companyUuid: 'company-1', isConfigured: false, settings: null })

    const wrapper = mountComponent()
    await flushPromises()

    expect((wrapper.find('#ocr-confidence-threshold').element as HTMLInputElement).value).toBe('90')
    expect(wrapper.text()).not.toContain('could not be loaded')
  })

  it('saves the edited fraction and toggle for the selected company', async () => {
    selectCompany('company-1')
    fetchMatchSettings.mockResolvedValue({
      companyUuid: 'company-1',
      isConfigured: true,
      settings: { ocrConfidenceThreshold: 0.9, autoMatch: true },
    })
    saveMatchSettings.mockResolvedValue({
      companyUuid: 'company-1',
      isConfigured: true,
      settings: { ocrConfidenceThreshold: 0.5, autoMatch: true },
    })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('#ocr-confidence-threshold').setValue(50)
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(saveMatchSettings).toHaveBeenCalledWith('company-1', { ocrConfidenceThreshold: 0.5, autoMatch: true })
  })

  it('shows the refusal message from a 400', async () => {
    selectCompany('company-1')
    fetchMatchSettings.mockResolvedValue({
      companyUuid: 'company-1',
      isConfigured: true,
      settings: { ocrConfidenceThreshold: 0.9, autoMatch: true },
    })
    saveMatchSettings.mockRejectedValue(
      new HttpError(400, '/x', JSON.stringify({ errors: ['Settings must be a JSON object.'] })),
    )

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Settings must be a JSON object.')
  })

  it('reloads on a 409 (someone else saved first) rather than leaving a stale form', async () => {
    selectCompany('company-1')
    fetchMatchSettings
      .mockResolvedValueOnce({
        companyUuid: 'company-1',
        isConfigured: true,
        settings: { ocrConfidenceThreshold: 0.9, autoMatch: true },
      })
      .mockResolvedValueOnce({
        companyUuid: 'company-1',
        isConfigured: true,
        settings: { ocrConfidenceThreshold: 0.3, autoMatch: false },
      })
    saveMatchSettings.mockRejectedValue(new HttpError(409, '/x', ''))

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Someone else just saved')
    expect(fetchMatchSettings).toHaveBeenCalledTimes(2)
    expect((wrapper.find('#ocr-confidence-threshold').element as HTMLInputElement).value).toBe('30')
  })

  it('shows a load failure rather than silently defaulting the form', async () => {
    selectCompany('company-1')
    fetchMatchSettings.mockRejectedValue(new HttpError(500, '/x', ''))

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('could not be loaded')
  })

  it('keeps Save disabled after a failed load', async () => {
    selectCompany('company-1')
    fetchMatchSettings.mockRejectedValue(new HttpError(500, '/x', ''))

    const wrapper = mountComponent()
    await flushPromises()

    expect((wrapper.find('button').element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(saveMatchSettings).not.toHaveBeenCalled()
  })

  it('sends the loaded fraction untouched when only the toggle is changed', async () => {
    selectCompany('company-1')
    fetchMatchSettings.mockResolvedValue({
      companyUuid: 'company-1',
      isConfigured: true,
      // More precision than the 76% the percent field would round it to.
      settings: { ocrConfidenceThreshold: 0.755, autoMatch: true },
    })
    saveMatchSettings.mockResolvedValue({
      companyUuid: 'company-1',
      isConfigured: true,
      settings: { ocrConfidenceThreshold: 0.755, autoMatch: false },
    })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.findComponent(ToggleSwitch).vm.$emit('update:modelValue', false)
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(saveMatchSettings).toHaveBeenCalledWith('company-1', { ocrConfidenceThreshold: 0.755, autoMatch: false })
  })

  it('refuses to save an out-of-range percent instead of silently clamping it', async () => {
    selectCompany('company-1')
    fetchMatchSettings.mockResolvedValue({
      companyUuid: 'company-1',
      isConfigured: true,
      settings: { ocrConfidenceThreshold: 0.9, autoMatch: true },
    })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('#ocr-confidence-threshold').setValue(150)
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(saveMatchSettings).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Enter a whole number between 0 and 100')
  })

  it('refuses to save when the percent field is left empty', async () => {
    selectCompany('company-1')
    fetchMatchSettings.mockResolvedValue({
      companyUuid: 'company-1',
      isConfigured: true,
      settings: { ocrConfidenceThreshold: 0.9, autoMatch: true },
    })

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('#ocr-confidence-threshold').setValue('')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(saveMatchSettings).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Enter a whole number between 0 and 100')
  })

  it('discards a stale save that resolves after a newer company switch already applied', async () => {
    selectCompany('company-1')
    fetchMatchSettings.mockResolvedValue({
      companyUuid: 'company-1',
      isConfigured: true,
      settings: { ocrConfidenceThreshold: 0.9, autoMatch: true },
    })

    const wrapper = mountComponent()
    await flushPromises()

    let resolveSave: ((value: unknown) => void) | undefined
    saveMatchSettings.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve
        }),
    )

    await wrapper.find('#ocr-confidence-threshold').setValue(50)
    await wrapper.find('button').trigger('click')
    await flushPromises() // company-1's save is issued and still pending

    fetchMatchSettings.mockResolvedValue({
      companyUuid: 'company-2',
      isConfigured: true,
      settings: { ocrConfidenceThreshold: 0.2, autoMatch: false },
    })
    selectCompany('company-2')
    await flushPromises() // company-2's load already applied

    resolveSave?.({ companyUuid: 'company-1', isConfigured: true, settings: { ocrConfidenceThreshold: 0.5, autoMatch: true } })
    await flushPromises()

    // Still company-2's freshly loaded value on screen, not overwritten by the stale company-1 save.
    expect((wrapper.find('#ocr-confidence-threshold').element as HTMLInputElement).value).toBe('20')
  })

  it('reloads for the newly selected company on a company switch', async () => {
    selectCompany('company-1')
    fetchMatchSettings.mockResolvedValue({
      companyUuid: 'company-1',
      isConfigured: true,
      settings: { ocrConfidenceThreshold: 0.9, autoMatch: true },
    })

    mountComponent()
    await flushPromises()

    fetchMatchSettings.mockResolvedValue({
      companyUuid: 'company-2',
      isConfigured: true,
      settings: { ocrConfidenceThreshold: 0.2, autoMatch: false },
    })
    selectCompany('company-2')
    await flushPromises()

    expect(fetchMatchSettings).toHaveBeenLastCalledWith('company-2')
  })

  it('discards a stale load that resolves after a newer company switch already applied', async () => {
    selectCompany('company-1')

    let resolveFirst: ((value: unknown) => void) | undefined
    let resolveSecond: ((value: unknown) => void) | undefined

    fetchMatchSettings
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          }),
      )

    const wrapper = mountComponent()
    await flushPromises()

    selectCompany('company-2')
    await flushPromises()

    expect(fetchMatchSettings).toHaveBeenCalledTimes(2)

    resolveSecond?.({ companyUuid: 'company-2', isConfigured: true, settings: { ocrConfidenceThreshold: 0.2, autoMatch: false } })
    await flushPromises()
    resolveFirst?.({ companyUuid: 'company-1', isConfigured: true, settings: { ocrConfidenceThreshold: 0.9, autoMatch: true } })
    await flushPromises()

    expect((wrapper.find('#ocr-confidence-threshold').element as HTMLInputElement).value).toBe('20')
  })
})
