import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'

const context = reactive({ companyUuid: 'c-1', companyName: 'Novonesis' as string | null, saleFileVersionId: 73 as number | null })
vi.mock('@/stores/context', () => ({ useContextStore: () => context }))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError }),
}))

// Strategies and Client Standard go to the real APIs now (their `*_API_MOCKED` are false): these specs keep the mocks.
vi.mock('@/modules/setup/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/setup/api')>()
  const { mockSetupStrategiesApi } = await import('@/modules/setup/api/setupStrategies.mock')
  const { mockClientStandardApi } = await import('@/modules/setup/api/clientStandardGroups.mock')
  return { ...actual, setupApi: mockSetupStrategiesApi, clientStandardApi: mockClientStandardApi }
})

import { HttpError } from '@/api/http'
import { POLL_INTERVAL_MS } from '@/composables/useVersionStatusPoll'
import { clientStandardApi, setupApi } from '@/modules/setup/api'
import { resetClientStandardMock } from '@/modules/setup/api/clientStandardGroups.mock'
import { resetSetupStrategiesMock } from '@/modules/setup/api/setupStrategies.mock'
import { MAX_UNREAD_RETRIES } from '@/modules/setup/composables/useSetupLock'
import ClientStandardTab from '@/modules/setup/components/clientStandard/ClientStandardTab.vue'
import { mountInSetup, type SetupHost } from './setupTestHarness'

let host: SetupHost | null = null
const find = (selector: string) => host!.wrapper.find(selector)
const findAll = (selector: string) => host!.wrapper.findAll(selector)
const badges = () => findAll('[data-test="cs-badge"]').map((badge) => badge.text())
const saveButton = () => find('[data-test="section-save"]')
/** CustomDialog renders outside the tab (teleported to body). */
const inBody = (selector: string) => new DOMWrapper(document.body.querySelector(selector)!)
const bodyText = () => document.body.textContent ?? ''

async function mountTab(): Promise<void> {
  host = mountInSetup(ClientStandardTab)
  await vi.runAllTimersAsync()
  await flushPromises()
}

async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
}

/** AB#20760 (#20746), on the mocked Client Standard groups endpoint. */
describe('ClientStandardTab', () => {
  beforeEach(() => {
    toastSuccess.mockReset()
    toastError.mockReset()
    vi.useFakeTimers()
    setActivePinia(createPinia())
    resetClientStandardMock()
    resetSetupStrategiesMock()
  })

  afterEach(() => {
    host?.wrapper.unmount()
    host = null
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('lists the groups in priority order with their "CSG{n}, {days}D, {name}" badges (AC-01)', async () => {
    await mountTab()
    expect(badges()).toEqual(['CSG1, 45D, Strategic', 'CSG2, 30D, Small buyers'])
    expect(findAll('thead th').map((th) => th.text())[1]).toBe('Group')
  })

  it('adds "Group3" with 15 days and Low Limit (AC-02)', async () => {
    await mountTab()
    await find('[data-test="cs-add-group"]').trigger('click')
    expect(badges()[2]).toBe('CSG3, 15D, Group3')
    expect((findAll('[data-test="cs-behavior"]')[2].element as HTMLSelectElement).value).toBe('lowLimit')
  })

  it('shows the error bar and keeps Save disabled for an invalid name or days (AC-03)', async () => {
    await mountTab()
    await findAll('input[data-test="cs-days"]')[0].setValue('361')
    expect(host!.wrapper.text()).toContain('Please fix the errors before saving')
    expect(saveButton().attributes('disabled')).toBeDefined()
    await findAll('input[data-test="cs-days"]')[0].setValue('60')
    await findAll('input[data-test="cs-name"]')[0].setValue('')
    expect(host!.wrapper.text()).toContain('Please fix the errors before saving')
  })

  it('reorders by drag and renumbers the badges (AC-07)', async () => {
    await mountTab()
    const groups = findAll('[data-test="cs-group"]')
    await groups[1].trigger('dragstart')
    await groups[0].trigger('drop')
    expect(badges()).toEqual(['CSG1, 30D, Small buyers', 'CSG2, 45D, Strategic'])
  })

  it('deletes a group only after the confirmation (AC-08)', async () => {
    await mountTab()
    await findAll('[data-test="cs-delete"]')[0].trigger('click')
    expect(bodyText()).toContain('Are you sure you want to delete the selected group?')
    await inBody('[data-test="cs-delete-confirm"]').trigger('click')
    expect(badges()).toEqual(['CSG1, 30D, Small buyers'])
  })

  it('confirms before saving, sends the groups in priority order and locks Setup (AC-09)', async () => {
    await mountTab()
    const save = vi.spyOn(clientStandardApi, 'saveGroups')
    await findAll('input[data-test="cs-days"]')[0].setValue('60')
    await saveButton().trigger('click')
    expect(bodyText()).toContain('Groups without conditions do not affect the calculation')
    expect(save).not.toHaveBeenCalled()

    await inBody('[data-test="cs-save-confirm"]').trigger('click')
    await settle()
    expect(save.mock.calls[0][1].map((group) => [group.name, group.paymentTerms])).toEqual([['Strategic', 60], ['Small buyers', 30]])
    expect(host!.lock.locked.value).toBe(true)
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('Successfully saved!'))
  })

  it("routes the unsaved-changes prompt's Save through the same confirmation (AC-10)", async () => {
    await mountTab()
    const save = vi.spyOn(clientStandardApi, 'saveGroups')
    await findAll('input[data-test="cs-days"]')[0].setValue('60')
    const [section] = host!.sections.dirtyIn('client-standard')
    const answer = section.save()
    await flushPromises()
    expect(bodyText()).toContain('Groups without conditions do not affect the calculation')
    expect(save).not.toHaveBeenCalled()

    await inBody('[data-test="cs-save-confirm"]').trigger('click')
    await settle()
    await expect(answer).resolves.toBe(true)
    expect(save).toHaveBeenCalledOnce()
  })

  it('warns that the groups are not applied while Client Standard is off for the sale file (AC-12)', async () => {
    const actual = setupApi.fetchSetupStrategies.bind(setupApi)
    vi.spyOn(setupApi, 'fetchSetupStrategies').mockImplementation(async (versionId) => {
      const response = await actual(versionId)
      return { ...response, strategies: response.strategies.map((s) => (s.key === 'clientStandard' ? { ...s, allowed: false } : s)) }
    })
    await mountTab()
    expect(find('[data-test="cs-disabled-notice"]').text()).toContain('Client Standard is disabled for this sale file; groups are saved but not applied.')
  })

  it('ignores a late response for the company it switched away from', async () => {
    type GroupsResponse = Awaited<ReturnType<typeof clientStandardApi.fetchGroups>>
    let resolveFirst!: (value: GroupsResponse) => void
    vi.spyOn(clientStandardApi, 'fetchGroups')
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
    host = mountInSetup(ClientStandardTab)
    context.companyUuid = 'c-2'
    await settle()
    const current = badges()
    resolveFirst({ tabTitle: 'Stale', groups: [{ name: 'Stale', paymentTerms: 99, behavior: 'lowLimit', rules: [] }] } as unknown as GroupsResponse)
    await settle()
    expect(badges()).toEqual(current)
    expect(badges().join()).not.toContain('Stale')
    context.companyUuid = 'c-1'
  })

  it("keeps loading the new company when the previous one's request fails late", async () => {
    type GroupsResponse = Awaited<ReturnType<typeof clientStandardApi.fetchGroups>>
    let rejectFirst!: (reason: unknown) => void
    let resolveSecond!: (value: GroupsResponse) => void
    const actual = clientStandardApi.fetchGroups.bind(clientStandardApi)
    vi.spyOn(clientStandardApi, 'fetchGroups')
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectFirst = reject }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve }))
    host = mountInSetup(ClientStandardTab)
    context.companyUuid = 'c-2'
    await settle()
    rejectFirst(new HttpError(500, '/api/companies/c-1/client-standard-groups', ''))
    await settle()
    expect(find('[role="alert"]').exists()).toBe(false)
    expect(host!.wrapper.text()).toContain('…')
    expect(badges()).toEqual([])

    const fresh = actual('c-1')
    await settle()
    resolveSecond(await fresh)
    await settle()
    expect(badges()).toEqual(['CSG1, 45D, Strategic', 'CSG2, 30D, Small buyers'])
    context.companyUuid = 'c-1'
  })

  it('reloads the Condition Settings options on a sale file version switch', async () => {
    const options = vi.spyOn(clientStandardApi, 'fetchRuleOptions')
    await mountTab()
    expect(options).toHaveBeenLastCalledWith('c-1', 73)
    context.saleFileVersionId = 74
    await settle()
    expect(options).toHaveBeenLastCalledWith('c-1', 74)
    context.saleFileVersionId = 73
  })

  it('unfolds a group\'s conditions to edit or remove each one', async () => {
    await mountTab()
    await findAll('[data-test="cs-conditions-toggle"]')[0].trigger('click')
    expect(findAll('[data-test="cs-rule-chip"]')).toHaveLength(1)
    await find('[data-test="cs-rule-remove"]').trigger('click')
    expect(findAll('[data-test="cs-conditions-toggle"]')).toHaveLength(1)
    expect(host!.wrapper.text()).toContain('Without conditions this group does not affect any sale line.')
  })

  it('shows a condition whose number arrives as a string, as the API sends it (#20759)', async () => {
    await mountTab()
    await findAll('[data-test="cs-conditions-toggle"]')[1].trigger('click')
    expect(find('[data-test="cs-rule-chip"]').text()).toContain('100,000')
  })

  it('locks the tab while any sale file of the company calculates, and unlocks once a re-read says it finished (#20759)', async () => {
    const actual = clientStandardApi.fetchGroups.bind(clientStandardApi)
    const fetch = vi.spyOn(clientStandardApi, 'fetchGroups')
      .mockImplementation(async (companyUuid) => ({ ...(await actual(companyUuid)), isRecalculating: true }))
    host = mountInSetup(ClientStandardTab)
    await settle()
    await settle()
    const nameInput = () => findAll('input[data-test="cs-name"]')[0]
    expect(nameInput().attributes('disabled')).toBeDefined()

    fetch.mockImplementation(actual)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    await settle()
    await settle()
    expect(nameInput().attributes('disabled')).toBeUndefined()
  })

  it('keeps the tab locked through failed re-reads, and stops asking after a bounded number of them', async () => {
    const actual = clientStandardApi.fetchGroups.bind(clientStandardApi)
    const fetch = vi.spyOn(clientStandardApi, 'fetchGroups')
      .mockImplementationOnce(async (companyUuid) => ({ ...(await actual(companyUuid)), isRecalculating: true }))
      .mockRejectedValue(new HttpError(503, '/api/companies/c-1/client-standard-groups', ''))
    host = mountInSetup(ClientStandardTab)
    await settle()
    await settle()
    for (let i = 0; i < MAX_UNREAD_RETRIES + 2; i++) await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(fetch).toHaveBeenCalledTimes(1 + MAX_UNREAD_RETRIES)
    expect(findAll('input[data-test="cs-name"]')[0].attributes('disabled')).toBeDefined()
  })

  it('stops re-reading the company once the tab is gone, even with a re-read in flight', async () => {
    type GroupsResponse = Awaited<ReturnType<typeof clientStandardApi.fetchGroups>>
    const actual = clientStandardApi.fetchGroups.bind(clientStandardApi)
    let resolvePoll!: (value: GroupsResponse) => void
    const fetch = vi.spyOn(clientStandardApi, 'fetchGroups')
      .mockImplementationOnce(async (companyUuid) => ({ ...(await actual(companyUuid)), isRecalculating: true }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePoll = resolve }))
    host = mountInSetup(ClientStandardTab)
    await settle()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(fetch).toHaveBeenCalledTimes(2)

    host.wrapper.unmount()
    host = null
    const answer = actual('c-1')
    await settle()
    resolvePoll({ ...(await answer), isRecalculating: true })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  async function saveRefusedWith(status: number): Promise<void> {
    await mountTab()
    vi.spyOn(clientStandardApi, 'saveGroups').mockRejectedValueOnce(new HttpError(status, '/api/companies/c-1/client-standard-groups', '{"error":"refused"}'))
    await findAll('input[data-test="cs-days"]')[0].setValue('60')
    await saveButton().trigger('click')
    await inBody('[data-test="cs-save-confirm"]').trigger('click')
    await settle()
  }

  it('locks the tab when a save is refused because the company is calculating (409)', async () => {
    await saveRefusedWith(409)
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('The sale file is being recalculated. Try again when it finishes.'))
    expect(findAll('input[data-test="cs-name"]')[0].attributes('disabled')).toBeDefined()
  })

  it('reloads the stored groups when a save names a group deleted meanwhile (EF-5, 404)', async () => {
    await saveRefusedWith(404)
    await settle()
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('A group no longer exists.'))
    expect(badges()).toEqual(['CSG1, 45D, Strategic', 'CSG2, 30D, Small buyers'])
  })
})
