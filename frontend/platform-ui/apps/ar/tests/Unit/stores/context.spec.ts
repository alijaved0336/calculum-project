import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useContextStore } from '@/stores/context'

const contoso = { id: 1, uuid: '11111111-1111-4111-8111-111111111111', name: 'Contoso' }
const fabrikam = { id: 2, uuid: '22222222-2222-4222-8222-222222222222', name: 'Fabrikam' }

describe('the AR context store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with nothing selected', () => {
    const context = useContextStore()

    expect(context.hasCompany).toBe(false)
    expect(context.hasVersion).toBe(false)
  })

  it('keeps the company identity needed to call the API', () => {
    const context = useContextStore()

    context.setCompany(contoso)

    expect(context.companyUuid).toBe(contoso.uuid)
    expect(context.companyName).toBe('Contoso')
    expect(context.hasCompany).toBe(true)
  })

  it('drops the file and version when the company changes', () => {
    // The cross-tenant guard: a version id left over from the previous company would be sent
    // with the new company's requests.
    const context = useContextStore()
    context.setCompany(contoso)
    context.setSaleFile(10)
    context.setVersion(100)

    context.setCompany(fabrikam)

    expect(context.saleFileId).toBeNull()
    expect(context.saleFileVersionId).toBeNull()
  })

  it('keeps the selection when the same company is selected again', () => {
    const context = useContextStore()
    context.setCompany(contoso)
    context.setSaleFile(10)
    context.setVersion(100)

    context.setCompany({ ...contoso })

    expect(context.saleFileId).toBe(10)
    expect(context.saleFileVersionId).toBe(100)
  })

  it('drops the version when the file changes', () => {
    const context = useContextStore()
    context.setCompany(contoso)
    context.setSaleFile(10)
    context.setVersion(100)

    context.setSaleFile(11)

    expect(context.saleFileVersionId).toBeNull()
  })

  it('keeps the version when the same file is selected again', () => {
    const context = useContextStore()
    context.setSaleFile(10)
    context.setVersion(100)

    context.setSaleFile(10)

    expect(context.saleFileVersionId).toBe(100)
  })

  it('defaults the buyers roster to the grid presentation', () => {
    const context = useContextStore()

    expect(context.buyersView).toBe('grid')
  })

  it('switches the buyers roster presentation (UC-UI-05)', () => {
    const context = useContextStore()

    context.setBuyersView('card')

    expect(context.buyersView).toBe('card')
  })

  it('does not reset the buyers view preference on sign out', () => {
    // A display preference is not tenant identity: switching companies or signing out must not
    // silently flip an analyst's chosen roster view back to the default.
    const context = useContextStore()
    context.setBuyersView('card')

    context.clear()

    expect(context.buyersView).toBe('card')
  })

  it('clears everything on sign out', () => {
    const context = useContextStore()
    context.setCompany(contoso)
    context.setSaleFile(10)
    context.setVersion(100)

    context.clear()

    expect(context.companyUuid).toBeNull()
    expect(context.saleFileId).toBeNull()
    expect(context.saleFileVersionId).toBeNull()
  })

  it('persists only the buyers view preference, because the session owns the company now (UC-ENT-19)', () => {
    // The company used to persist, and that was right while the browser was the only thing that
    // remembered one: a refresh would otherwise drop the user back to "no company selected".
    //
    // The server answers that question now. `/api/session/companies` reports the company the
    // session is scoped to, and the picker preselects it, so a persisted copy is a second source
    // for one fact -- and the only thing a second source can do is disagree. It could not while a
    // user had one receivables company; with two it can, and the disagreement is invisible: the
    // control renders company B while every request is scoped to A.
    //
    // `buyersView` (UC-UI-05) is not that kind of fact -- it is a per-user display preference with
    // no tenant identity in it -- so this guard checks the `pick` list names it and NOTHING else,
    // rather than checking persistence is absent outright.
    //
    // Asserted against the store definition rather than by simulating a reload, for the reason the
    // list was asserted that way before: what must not regress is the configuration.
    expect(persistedFields()).toEqual(['buyersView'])
  })
})

/**
 * The `persist.pick` list in the store source, or null when there is no `persist` configured at
 * all.
 *
 * Read out of the file rather than off the store factory: Pinia does not expose the option in a
 * stable way, and a test that silently found nothing would pass for the wrong reason -- which is
 * exactly the failure the previous version of this helper was written to avoid, in the opposite
 * direction. A regex over the whole file (rather than a per-line scan) because the `pick` array
 * lives on its own line inside a multi-line `persist: {...}` block, one property below `persist:`
 * itself -- a line-oriented `startsWith('persist:')` scan the way the old, `persist:`-line-only
 * version of this helper worked would find the block opens but never see what it picks.
 */
function persistedFields(): string[] | null {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const source: string = require('fs').readFileSync(
    require('path').resolve(__dirname, '../../../src/stores/context.ts'),
    'utf8',
  )

  if (!/^\s*persist:\s*\{/m.test(source)) {
    return null
  }

  const pick = source.match(/pick:\s*\[([^\]]*)\]/)
  if (!pick) {
    return []
  }

  return pick[1]
    .split(',')
    .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ''))
    .filter((entry) => entry.length > 0)
}

/**
 * The company context used to be AES-persisted, so it outlived the session that created it.
 *
 * Nothing called `clear()` when it was written: the store was new, `SignoutView` predated it, and
 * the only consumer set a company and never unset one. So signing out and signing back in on the
 * same browser left the previous tenant's company name on screen until `/api/companies` resolved.
 * Between two users at different clients that is a disclosure, not a cosmetic lag.
 *
 * Source-read rather than mounted, because `SignoutView` navigates away on mount and the assertion
 * is about the call existing at all, which is exactly what was missing.
 */
describe('clearing the company context', () => {
  const read = (relative: string): string =>
    require('fs').readFileSync(require('path').resolve(__dirname, relative), 'utf8')

  it('is cleared by the sign-out path', () => {
    const signout = read('../../../src/views/SignoutView.vue')

    expect(signout).toContain('useContextStore')
    expect(signout).toMatch(/useContextStore\(\)\.clear\(\)|context\.clear\(\)/)
  })

  it('is cleared when the session resolves to no company', () => {
    // The other half of the same hole: a user whose session resolves to nothing still had the
    // previous company in the store while the screen said no company was available.
    const dashboard = read('../../../src/modules/dashboard/views/DashboardView.vue')

    expect(dashboard).toContain('context.clear()')
  })

  it('resets every field, not only the file selection', () => {
    const store = useContextStore()
    store.setCompany({ uuid: 'u-7', name: 'Contoso' })
    store.setSaleFile(3)
    store.setVersion(42)

    store.clear()

    expect(store.companyUuid).toBeNull()
    expect(store.companyName).toBeNull()
    expect(store.saleFileId).toBeNull()
    expect(store.saleFileVersionId).toBeNull()
    expect(store.hasCompany).toBe(false)
  })
})
