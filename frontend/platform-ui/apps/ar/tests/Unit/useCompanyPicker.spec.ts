import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchSwitchableCompanies = vi.fn()
const switchActiveCompany = vi.fn()

vi.mock('@/api', () => ({
  fetchSwitchableCompanies: (...args: unknown[]) => fetchSwitchableCompanies(...args),
  switchActiveCompany: (...args: unknown[]) => switchActiveCompany(...args),
}))

import { useCompanyPicker } from '@/composables/useCompanyPicker'

/**
 * UC-ENT-19's front-end half, as a composable rather than as logic inside `Navbar.vue`.
 *
 * The behaviour worth testing is a small state machine — load, select, refuse, revert — and
 * reaching it through a mounted navbar would mean a router, a Pinia store, an i18n instance and
 * three Kendo components, none of which have an opinion about any of it.
 */
/** Lets every pending microtask and timer callback run, so an in-flight step can be observed
 * mid-way rather than only at its end. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('useCompanyPicker', () => {
  beforeEach(() => {
    fetchSwitchableCompanies.mockReset()
    switchActiveCompany.mockReset()
  })

  const twoCompanies = {
    companies: [
      { uuid: 'contoso', name: 'Contoso Manufacturing' },
      { uuid: 'northwind', name: 'Northwind Trading' },
    ],
    activeCompanyUuid: 'northwind',
  }

  it('preselects the company the SERVER says the session is in', async () => {
    fetchSwitchableCompanies.mockResolvedValue(twoCompanies)
    const picker = useCompanyPicker({ onSwitched: vi.fn() })

    await picker.load()

    // Not the first row, and not whatever the browser remembered. Those could not disagree while a
    // user had one receivables company; with two they can, and the disagreement is invisible.
    expect(picker.selected.value).toBe('northwind')
    expect(picker.companies.value).toHaveLength(2)
  })

  it('moves the session before it lets anything reload', async () => {
    fetchSwitchableCompanies.mockResolvedValue(twoCompanies)
    const order: string[] = []
    switchActiveCompany.mockImplementation(async () => {
      order.push('switch')
    })
    const onSwitched = vi.fn(async () => {
      order.push('reload')
    })

    const picker = useCompanyPicker({ onSwitched })
    await picker.load()
    await picker.select('contoso')

    // The order is the requirement. Reloading first races a session the server has not moved yet,
    // so the screens would refill with the OLD company's data and look like the switch failed.
    expect(order).toEqual(['switch', 'reload'])
    expect(onSwitched).toHaveBeenCalledWith({ uuid: 'contoso', name: 'Contoso Manufacturing' })
    expect(picker.selected.value).toBe('contoso')
  })

  it('puts the dropdown back where it was when the server refuses', async () => {
    fetchSwitchableCompanies.mockResolvedValue(twoCompanies)
    switchActiveCompany.mockRejectedValue({ status: 403 })
    const onSwitched = vi.fn()

    const picker = useCompanyPicker({ onSwitched })
    await picker.load()
    await picker.select('contoso')

    // A 403 means the company lost MODULE_AR, or the caller was disabled at it, between the list
    // being drawn and the click. Leaving the dropdown on it would be the control asserting a scope
    // the session does not have.
    expect(picker.selected.value).toBe('northwind')
    expect(picker.error.value).not.toBeNull()

    // And nothing reloads: the session never moved, so the data on screen is still the right data.
    expect(onSwitched).not.toHaveBeenCalled()
  })

  it('clears a previous refusal once a switch succeeds', async () => {
    fetchSwitchableCompanies.mockResolvedValue(twoCompanies)
    switchActiveCompany.mockRejectedValueOnce({ status: 409 }).mockResolvedValueOnce(undefined)

    const picker = useCompanyPicker({ onSwitched: vi.fn() })
    await picker.load()

    await picker.select('contoso')
    expect(picker.error.value).not.toBeNull()

    // 409 is the retryable one — the session was being written to — so the second attempt is the
    // normal case rather than an odd one, and the message from the first must not outlive it.
    await picker.select('contoso')
    expect(picker.error.value).toBeNull()
    expect(picker.selected.value).toBe('contoso')
  })

  it('refuses a second selection while the first is still in flight', async () => {
    // THREE companies, and the third is what makes this a test. Written with two first, and it
    // passed against a composable with no guard at all: the second selection named the company
    // still showing in the control, so the no-op check swallowed it and the assertion below was
    // satisfied by the wrong mechanism entirely.
    fetchSwitchableCompanies.mockResolvedValue({
      companies: [...twoCompanies.companies, { uuid: 'fabrikam', name: 'Fabrikam Receivables' }],
      activeCompanyUuid: 'northwind',
    })

    let releaseFirst: (() => void) | undefined
    switchActiveCompany
      .mockImplementationOnce(() => new Promise<void>((resolve) => { releaseFirst = resolve }))
      .mockResolvedValue(undefined)

    const onSwitched = vi.fn()
    const picker = useCompanyPicker({ onSwitched })
    await picker.load()

    // Two clicks before the first answer comes back — a slow network and an impatient user, which
    // is the ordinary case rather than an exotic one.
    const first = picker.select('contoso')
    const second = picker.select('fabrikam')

    releaseFirst?.()
    await Promise.all([first, second])

    // One request, not two. Overlapping switches are worse than they look: the second captures the
    // previous company before the first has landed, so a refusal reverts to a company nobody was
    // in; whichever response resolves last wins on the client, which can disagree with the order
    // the server applied; and the first reload runs against a session the second has already
    // moved — refilling the screen from a company the session has left, which is the exact failure
    // this composable reorders its calls to prevent.
    expect(switchActiveCompany).toHaveBeenCalledTimes(1)
    expect(switchActiveCompany).toHaveBeenCalledWith('contoso')
    expect(picker.selected.value).toBe('contoso')
    expect(onSwitched).toHaveBeenCalledTimes(1)
  })

  it('stays closed while the reload that follows the switch is still running', async () => {
    fetchSwitchableCompanies.mockResolvedValue({
      companies: [...twoCompanies.companies, { uuid: 'fabrikam', name: 'Fabrikam Receivables' }],
      activeCompanyUuid: 'northwind',
    })
    switchActiveCompany.mockResolvedValue(undefined)

    let releaseReload: (() => void) | undefined
    const onSwitched = vi.fn(() => new Promise<void>((resolve) => { releaseReload = resolve }))

    const picker = useCompanyPicker({ onSwitched })
    await picker.load()

    const first = picker.select('contoso')
    await flush()

    // The switch has landed and the reload has not. Guarding only the request leaves this window
    // open, and it is the widest of the three: a reload fetches several endpoints while a PUT is
    // one round trip. A selection accepted here moves the session under a reload that is still
    // filling the screen for the company it just left.
    //
    // NOT awaited: an unguarded composable answers this one with a second reload that never
    // resolves in this test, so awaiting it would report the defect as a ten-second timeout rather
    // than as the extra request it is.
    void picker.select('fabrikam')
    await flush()

    expect(switchActiveCompany).toHaveBeenCalledTimes(1)

    releaseReload?.()
    await first
    expect(picker.selected.value).toBe('contoso')
  })

  it('reports that a switch is in flight so the control can be disabled', async () => {
    fetchSwitchableCompanies.mockResolvedValue(twoCompanies)

    let release: (() => void) | undefined
    switchActiveCompany.mockImplementation(() => new Promise<void>((resolve) => { release = resolve }))

    const picker = useCompanyPicker({ onSwitched: vi.fn() })
    await picker.load()

    const switching = picker.select('contoso')
    expect(picker.isSwitching.value).toBe(true)

    release?.()
    await switching
    expect(picker.isSwitching.value).toBe(false)
  })

  it('does not call the server when the selection has not changed', async () => {
    fetchSwitchableCompanies.mockResolvedValue(twoCompanies)
    const picker = useCompanyPicker({ onSwitched: vi.fn() })

    await picker.load()
    await picker.select('northwind')

    // The dropdown re-emits its current value on mount and on re-render. The endpoint answers this
    // harmlessly, but a request per render is still a request per render.
    expect(switchActiveCompany).not.toHaveBeenCalled()
  })

  it('reports an empty picker rather than pretending a company is selected', async () => {
    fetchSwitchableCompanies.mockResolvedValue({ companies: [], activeCompanyUuid: null })
    const picker = useCompanyPicker({ onSwitched: vi.fn() })

    await picker.load()

    expect(picker.companies.value).toEqual([])
    expect(picker.selected.value).toBe('')
  })

  it('survives a listing that fails without leaving a stale list on screen', async () => {
    fetchSwitchableCompanies.mockRejectedValue(new Error('network'))
    const picker = useCompanyPicker({ onSwitched: vi.fn() })

    await picker.load()

    expect(picker.companies.value).toEqual([])
    expect(picker.error.value).not.toBeNull()
  })
})
