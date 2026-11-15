import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { HttpError, SessionExpiredError } from '@/api/http'

/**
 * The Dashboard grid's Actions column: Recalculate and Resync.
 *
 * <p><b>These two actions, and not the rest of the view.</b> The screen's load path (the company
 * catalogue, the 403-vs-error split, the empty states) is covered by its own e2e; what is worth
 * pinning at unit level is the pair of triggers, because they are the only place on this screen
 * where a click starts queued work whose effect appears somewhere else minutes later. Getting the
 * ENABLE rules or the mutual exclusion wrong is silent: the button still renders.</p>
 *
 * <p>The two actions are deliberately NOT interchangeable and the tests say so: a recalculation
 * re-runs the calculation, a resync only re-projects what the calculation already produced, and
 * they are offered from different sets of statuses.</p>
 */

const get = vi.fn()
const getAllPages = vi.fn()
vi.mock('@/api/http', async () => {
  const actual = await vi.importActual<typeof import('@/api/http')>('@/api/http')
  return {
    ...actual,
    get: (...args: unknown[]) => get(...args),
    getAllPages: (...args: unknown[]) => getAllPages(...args),
  }
})

const recalculateVersion = vi.fn()
const resyncOpportunity = vi.fn()
vi.mock('@/api', () => ({
  recalculateVersion: (...args: unknown[]) => recalculateVersion(...args),
  resyncOpportunity: (...args: unknown[]) => resyncOpportunity(...args),
}))

vi.mock('@ada/auth', () => ({ useSession: () => ({ session: { value: { email: 'a@b.test' } } }) }))

vi.mock('@/stores/context', () => ({
  useContextStore: () => ({ setCompany: vi.fn(), clear: vi.fn() }),
}))

vi.mock('@/modules/match/MatchRouting', () => ({
  openMatch: vi.fn(),
  openVersionProgress: vi.fn(),
}))

/**
 * The design-system stubs. CustomButton keeps `disabled` a real attribute rather than a prop it
 * swallows: every assertion below about an action being unavailable reads it off the DOM, which is
 * also where a user reads it.
 */
vi.mock('@ada/design-system', () => ({
  BodyText: { template: '<p><slot /></p>' },
  CalculumLayout: { template: '<div><slot name="slotTop" /><slot name="slotContent" /></div>' },
  CalculumLoadingAr: { template: '<div class="loading" />' },
  ContentBox: { template: '<div><slot name="header-title" /><slot name="header-controls" /><slot /></div>' },
  ContentBoxBody: { template: '<div><slot /></div>' },
  CustomBadge: { props: ['text'], template: '<span class="badge">{{ text }}</span>' },
  CustomButton: {
    props: ['text', 'variant', 'disabled'],
    template: '<button :disabled="disabled" @click="$emit(\'click\', $event)">{{ text }}</button>',
  },
  DisplayText: { template: '<h1><slot /></h1>' },
  NoDataAvailable: { props: ['title', 'message'], template: '<div class="no-data">{{ title }}</div>' },
}))

// The real Kendo grid needs no stubbing for the cell templates to render, but it does need a
// deterministic row order: the component sorts by `version` descending, so a fixture with one
// version per file keeps row index and fixture index aligned.
const messages = {
  en: {
    arDashboard: {
      title: 'Sales files',
      refresh: 'Refresh',
      empty: 'No files',
      emptyHint: '',
      periodTo: 'to',
      noCompany: '',
      noCompanyHint: '',
      forbidden: '',
      forbiddenHint: '',
      errorLoad: '',
      recalculate: 'Recalculate',
      recalculating: 'Recalculating…',
      recalculateHint: 'Re-run',
      recalculateUnavailable: 'Not while processing',
      recalculateQueued: 'Version {version} queued for a recalculation.',
      recalculateRefused: 'Cannot recalculate right now.',
      recalculateForbidden: 'No access.',
      recalculateMissing: 'Gone. Reloaded.',
      recalculateFailed: 'Answered {status}.',
      recalculateUnreachable: 'Unreachable.',
      resync: 'Resync',
      resyncing: 'Resyncing…',
      resyncHint: '',
      resyncOnlyReady: '',
      resyncQueued: 'Version {version} queued for a resync.',
      resyncRefused: '',
      resyncForbidden: '',
      resyncMissing: '',
      resyncFailed: '',
      resyncUnreachable: '',
      table: {
        file: 'File', version: 'Version', status: 'Status',
        period: 'Period', imported: 'Imported', actions: 'Actions',
      },
    },
    arMatch: {
      progress: { open: '', notAvailable: 'n/a' },
      status: { ready: 'Ready', errorCalculating: 'Calculation failed', calculating: 'Calculating' },
    },
  },
}

// Loaded once, outside any test: the cold import of the view (and the real Kendo grid behind it)
// is ~1.5s alone and well past the 10s testTimeout when turbo runs AP's suite alongside, which
// used to time out whichever tests were waiting on it rather than anything they assert.
let DashboardView: typeof import('@/modules/dashboard/views/DashboardView.vue').default
beforeAll(async () => {
  DashboardView = (await import('@/modules/dashboard/views/DashboardView.vue')).default
}, 60_000)

async function mountView(versions: Array<{ id: number; version: number; status: string }>) {
  get.mockResolvedValue({ total: 1, companies: [{ id: 43, uuid: 'u-43', name: 'TestingSergio' }] })
  getAllPages.mockResolvedValue(
    versions.map((v, index) => ({
      id: 100 + index,
      name: `file-${index}.xlsx`,
      versions: [{
        id: v.id,
        version: v.version,
        status: v.status,
        periodStartDate: null,
        periodEndDate: null,
        importedLineCount: 10,
      }],
    })),
  )

  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages })
  const wrapper = mount(DashboardView, { global: { plugins: [i18n] } } as never)
  await flushPromises()
  return wrapper
}

/** Every button whose label is one of the two action labels, in DOM order. */
function actionButtons(wrapper: Awaited<ReturnType<typeof mountView>>, label: RegExp) {
  return wrapper.findAll('button').filter((button) => label.test(button.text()))
}

beforeEach(() => {
  vi.clearAllMocks()
  recalculateVersion.mockResolvedValue({ saleFileVersionId: 1, status: 'recalculateClaimed' })
  resyncOpportunity.mockResolvedValue({ saleFileVersionId: 1 })
})

describe('the Actions column', () => {
  it('offers a recalculation on ready and on a failed calculation, and refuses one mid-flight', async () => {
    const wrapper = await mountView([
      { id: 1, version: 3, status: 'ready' },
      { id: 2, version: 2, status: 'errorCalculating' },
      { id: 3, version: 1, status: 'calculating' },
    ])

    const buttons = actionButtons(wrapper, /^Recalculate$/)
    expect(buttons).toHaveLength(3)

    // Sorted by version descending, so the order is ready, errorCalculating, calculating.
    // `errorCalculating` is enabled deliberately: a failed calculation is precisely the thing
    // worth re-running, which is why this reuses canRecalculate rather than the resync's
    // ready-only predicate.
    expect(buttons[0].attributes('disabled')).toBeUndefined()
    expect(buttons[1].attributes('disabled')).toBeUndefined()
    expect(buttons[2].attributes('disabled')).toBeDefined()
  })

  it('offers a resync only on ready, which is narrower than recalculation', async () => {
    const wrapper = await mountView([
      { id: 1, version: 2, status: 'ready' },
      { id: 2, version: 1, status: 'errorCalculating' },
    ])

    const resync = actionButtons(wrapper, /^Resync$/)
    expect(resync[0].attributes('disabled')).toBeUndefined()

    // The same row that CAN be recalculated cannot be resynced: a version that never finished
    // calculating has no output to project. The two predicates are not interchangeable.
    expect(resync[1].attributes('disabled')).toBeDefined()
    expect(actionButtons(wrapper, /^Recalculate$/)[1].attributes('disabled')).toBeUndefined()
  })

  it('claims the clicked version and reports it as queued', async () => {
    const wrapper = await mountView([{ id: 34, version: 1, status: 'ready' }])

    await actionButtons(wrapper, /^Recalculate$/)[0].trigger('click')
    await flushPromises()

    expect(recalculateVersion).toHaveBeenCalledWith(34)
    expect(wrapper.text()).toContain('Version 1 queued for a recalculation.')
  })

  it('reloads the list after a claim, because the claim moves the status this grid shows', async () => {
    const wrapper = await mountView([{ id: 34, version: 1, status: 'ready' }])
    expect(get).toHaveBeenCalledTimes(1)

    await actionButtons(wrapper, /^Recalculate$/)[0].trigger('click')
    await flushPromises()

    // The distinction from a resync, which does NOT reload: leaving the row on `ready` beside a
    // notice saying the work was queued would put the screen at odds with itself.
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('does not reload after a resync, which moves no status', async () => {
    const wrapper = await mountView([{ id: 34, version: 1, status: 'ready' }])
    expect(get).toHaveBeenCalledTimes(1)

    await actionButtons(wrapper, /^Resync$/)[0].trigger('click')
    await flushPromises()

    expect(resyncOpportunity).toHaveBeenCalledWith(34)
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('disables every action on every row while one is in flight, across both kinds', async () => {
    let release: () => void = () => {}
    recalculateVersion.mockReturnValue(new Promise<void>((resolve) => { release = () => resolve() }))

    const wrapper = await mountView([
      { id: 1, version: 2, status: 'ready' },
      { id: 2, version: 1, status: 'ready' },
    ])

    await actionButtons(wrapper, /^Recalculat/)[0].trigger('click')
    await flushPromises()

    // The working row labels itself; every other action is merely disabled. One notice area is
    // shared by both kinds, so a resync must not run alongside a recalculation and race it for
    // that slot — hence the OTHER kind is disabled too, on every row.
    const working = actionButtons(wrapper, /^Recalculating…$/)
    expect(working).toHaveLength(1)

    for (const button of [...actionButtons(wrapper, /^Recalculate$/), ...actionButtons(wrapper, /^Resync$/)]) {
      expect(button.attributes('disabled')).toBeDefined()
    }

    release()
    await flushPromises()

    // Released afterwards, so a second attempt is possible once the first has landed.
    expect(actionButtons(wrapper, /^Recalculate$/)[0].attributes('disabled')).toBeUndefined()
  })

  it('shows the server refusal on a 409 and reloads to show where the version stands', async () => {
    const wrapper = await mountView([{ id: 34, version: 1, status: 'ready' }])
    recalculateVersion.mockRejectedValue(
      new HttpError(409, 'Conflict', JSON.stringify({ error: 'Status holds this version.' })),
    )

    await actionButtons(wrapper, /^Recalculate$/)[0].trigger('click')
    await flushPromises()

    // The server's own sentence, not a generic one: it names which status is holding the version.
    expect(wrapper.text()).toContain('Status holds this version.')
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('falls back to its own refusal when a 409 carries no readable body', async () => {
    const wrapper = await mountView([{ id: 34, version: 1, status: 'ready' }])
    recalculateVersion.mockRejectedValue(new HttpError(409, 'Conflict', 'not json'))

    await actionButtons(wrapper, /^Recalculate$/)[0].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Cannot recalculate right now.')
  })

  it('reports a transport failure rather than blinking silently', async () => {
    const wrapper = await mountView([{ id: 34, version: 1, status: 'ready' }])
    recalculateVersion.mockRejectedValue(new TypeError('Failed to fetch'))

    await actionButtons(wrapper, /^Recalculate$/)[0].trigger('click')
    await flushPromises()

    // Without this branch the button just blinked disabled and re-enabled with no feedback.
    expect(wrapper.text()).toContain('Unreachable.')
    expect(actionButtons(wrapper, /^Recalculate$/)[0].attributes('disabled')).toBeUndefined()
  })

  it('renders nothing for an expired session, which is navigating to sign-in', async () => {
    const wrapper = await mountView([{ id: 34, version: 1, status: 'ready' }])
    recalculateVersion.mockRejectedValue(new SessionExpiredError('/api/sale-file-versions/34/recalculate'))

    await actionButtons(wrapper, /^Recalculate$/)[0].trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Unreachable.')
    expect(wrapper.text()).not.toContain('queued')
  })
})
