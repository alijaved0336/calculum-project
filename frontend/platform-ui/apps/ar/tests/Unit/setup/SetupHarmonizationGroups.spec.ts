import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

const context = reactive({ companyUuid: 'c-1', companyName: 'Novonesis' as string | null, saleFileVersionId: 73 as number | null })
vi.mock('@/stores/context', () => ({ useContextStore: () => context }))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError }),
}))

// Strategies and harmonization go to the real API now: these specs keep their mocks.
vi.mock('@/modules/setup/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/setup/api')>()
  const { mockSetupStrategiesApi } = await import('@/modules/setup/api/setupStrategies.mock')
  const { mockHarmonizationApi } = await import('@/modules/setup/api/harmonization.mock')
  return { ...actual, setupApi: mockSetupStrategiesApi, harmonizationApi: mockHarmonizationApi }
})

import { harmonizationApi } from '@/modules/setup/api'
import { resetHarmonizationMock } from '@/modules/setup/api/harmonization.mock'
import { resetSetupStrategiesMock } from '@/modules/setup/api/setupStrategies.mock'
import SetupHarmonizationGroups from '@/modules/setup/components/SetupHarmonizationGroups.vue'
import { mountInSetup, type SetupHost } from './setupTestHarness'

let host: SetupHost | null = null
const find = (selector: string) => host!.wrapper.find(selector)
const findAll = (selector: string) => host!.wrapper.findAll(selector)
const pills = () => findAll('.harmonization__pill').map((pill) => pill.text())
const saveButton = () => find('[data-test="section-save"]')
/** CustomDialog renders outside the section (teleported to body). */
const inBody = (selector: string) => {
  const element = document.body.querySelector(selector)
  return element ? new DOMWrapper(element) : null
}
const bodyText = () => document.body.textContent ?? ''

async function mountSection(): Promise<void> {
  host = mountInSetup(SetupHarmonizationGroups)
  await vi.runAllTimersAsync()
  await flushPromises()
}

async function setDays(index: number, value: string): Promise<void> {
  const input = findAll('input[data-test="harmonization-days"]')[index]
  await input.setValue(value)
  await input.trigger('change')
  await flushPromises()
}

async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
}

/** AB#20733 (#20718), on the mocked harmonization endpoint. */
describe('SetupHarmonizationGroups', () => {
  beforeEach(() => {
    toastSuccess.mockReset()
    toastError.mockReset()
    vi.useFakeTimers()
    resetHarmonizationMock()
    resetSetupStrategiesMock()
  })

  afterEach(() => {
    host?.wrapper.unmount()
    host = null
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('opens with the 16 default groups, named "H{n}, {days}D" in ascending order (AC-01/03)', async () => {
    await mountSection()
    expect(pills()).toHaveLength(16)
    expect(pills().slice(0, 3)).toEqual(['H1, 0D', 'H2, 7D', 'H3, 14D'])
    expect(pills()[15]).toBe('H16, 180D')
  })

  it('re-sorts and renames the rows when a term changes', async () => {
    await mountSection()
    await setDays(0, '200')
    expect(pills()[0]).toBe('H1, 7D')
    expect(pills()[15]).toBe('H16, 200D')
  })

  it('rejects out-of-range and duplicate terms beside the row, and keeps Save disabled (AC-04)', async () => {
    await mountSection()
    await setDays(0, '400')
    expect(host!.wrapper.text()).toContain('Enter a number between 0-365.')
    expect(saveButton().attributes('disabled')).toBeDefined()
    await setDays(15, '7')
    expect(host!.wrapper.text()).toContain('This term is already a harmonization group.')
  })

  it('adds an empty row, and Save stays disabled until it has a value', async () => {
    await mountSection()
    await find('[data-test="harmonization-add"]').trigger('click')
    expect(pills()).toHaveLength(17)
    expect(pills()[16]).toBe('H17')
    expect(saveButton().attributes('disabled')).toBeDefined()
  })

  it('stops "+ Add group" at 100 groups, with the limit message', async () => {
    await mountSection()
    for (let i = 16; i < 100; i += 1) {
      await find('[data-test="harmonization-add"]').trigger('click')
    }
    expect(pills()).toHaveLength(100)
    expect(find('[data-test="harmonization-add"]').attributes('disabled')).toBeDefined()
    expect(find('[data-test="harmonization-limit"]').text()).toBe('A company can have at most 100 harmonization groups.')
  })

  it('asks before saving, then sends the sorted groups and locks Setup (UC step 16, AC-10)', async () => {
    await mountSection()
    const save = vi.spyOn(harmonizationApi, 'saveHarmonization')
    await setDays(0, '3')
    await saveButton().trigger('click')
    expect(bodyText()).toContain("Saving recalculates the company's sale files. Continue?")
    expect(save).not.toHaveBeenCalled()

    await inBody('[data-test="harmonization-save-confirm"]')!.trigger('click')
    await settle()
    expect(save).toHaveBeenCalledOnce()
    expect(save.mock.calls[0][2].groups.slice(0, 2)).toEqual([{ days: 3 }, { days: 7 }])
    expect(host!.lock.locked.value).toBe(true)
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('Harmonization saved. Recalculating…'))
  })

  it('turning it off asks first: Cancel keeps it on, Delete saves it off with no groups (AC-08)', async () => {
    await mountSection()
    const save = vi.spyOn(harmonizationApi, 'saveHarmonization')
    await find('[data-test="harmonization-switch"]').trigger('click')
    await flushPromises()
    expect(bodyText()).toContain('Turning off Term Harmonization deletes all 16 harmonization groups')

    const cancel = [...document.body.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Cancel' && !button.closest('[data-test="harmonization-actions"]'))!
    await new DOMWrapper(cancel).trigger('click')
    await flushPromises()
    expect(find('[data-test="harmonization-config"]').exists()).toBe(true)
    expect(save).not.toHaveBeenCalled()

    await find('[data-test="harmonization-switch"]').trigger('click')
    await flushPromises()
    await inBody('[data-test="harmonization-off-confirm"]')!.trigger('click')
    await settle()
    expect(save).toHaveBeenCalledWith('c-1', 73, { enabled: false, roundOn: 'Nearest', groups: [] })
  })

  it('shows the refusal when the open sale file version is being recalculated (409)', async () => {
    const { HttpError } = await import('@/api/http')
    await mountSection()
    vi.spyOn(harmonizationApi, 'saveHarmonization').mockRejectedValueOnce(new HttpError(409, '/x', '{}'))
    await setDays(0, '3')
    await saveButton().trigger('click')
    await inBody('[data-test="harmonization-save-confirm"]')!.trigger('click')
    await flushPromises()
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('The sale file is being recalculated. Try again when it finishes.'))
  })
  it('reads the section for the version Setup is open on, and reloads it on a version switch', async () => {
    const fetch = vi.spyOn(harmonizationApi, 'fetchHarmonization')
    await mountSection()
    expect(fetch).toHaveBeenLastCalledWith('c-1', 73)

    context.saleFileVersionId = 74
    await settle()
    expect(fetch).toHaveBeenLastCalledWith('c-1', 74)
    context.saleFileVersionId = 73
  })

  it("ignores a late response for the company it switched away from", async () => {
    const state = (days: number) => ({ enabled: true, roundOn: 'Nearest' as const, groups: [{ id: 1, days }], defaultGroups: [days], isRecalculating: false })
    let resolveFirst!: (value: ReturnType<typeof state>) => void
    vi.spyOn(harmonizationApi, 'fetchHarmonization')
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockResolvedValueOnce(state(30))
    host = mountInSetup(SetupHarmonizationGroups)
    context.companyUuid = 'c-2'
    await settle()
    resolveFirst(state(99))
    await settle()
    expect(pills().join()).toContain('30D')
    expect(pills().join()).not.toContain('99D')
    context.companyUuid = 'c-1'
  })

  it('locks the section while the open version is recalculating (isRecalculating)', async () => {
    vi.spyOn(harmonizationApi, 'fetchHarmonization').mockResolvedValue({
      enabled: true,
      roundOn: 'Nearest',
      groups: [{ id: 1, days: 30 }],
      defaultGroups: [30],
      isRecalculating: true,
    })
    await mountSection()
    expect(find('[data-test="harmonization-add"]').attributes('disabled')).toBeDefined()
  })
})

/** The real client (#20732): the version Setup is open on travels as `saleFileVersionId` on both verbs. */
describe('realHarmonizationApi', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends saleFileVersionId on GET and PUT, and omits it with no version', async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    const { realHarmonizationApi } = await import('@/modules/setup/api/harmonization')

    await realHarmonizationApi.fetchHarmonization('c-1', 73)
    await realHarmonizationApi.saveHarmonization('c-1', 73, { enabled: false, roundOn: 'Nearest', groups: [] })
    await realHarmonizationApi.fetchHarmonization('c-1', null)

    const urls = fetchMock.mock.calls.map(([url]) => String(url))
    expect(urls[0]).toMatch(/\/api\/companies\/c-1\/harmonization\?saleFileVersionId=73$/)
    expect(urls[1]).toMatch(/\/api\/companies\/c-1\/harmonization\?saleFileVersionId=73$/)
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PUT' })
    expect(urls[2]).toMatch(/\/api\/companies\/c-1\/harmonization$/)
  })
})
