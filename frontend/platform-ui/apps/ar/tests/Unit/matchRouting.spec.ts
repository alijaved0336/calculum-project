import { describe, it, expect, vi, afterEach } from 'vitest'
import { router } from '@/router'
import { route } from '@/router/Routing'
import * as MatchRouting from '@/modules/match/MatchRouting'

/**
 * The regression this pins: `MatchRouting.openMatch(...params: any)` spread into a 2-arg
 * `route(name, params)`, so only the first array element ever reached `router.push` and query
 * data had nowhere to go at all. Fixed by giving `route()` an explicit `query` parameter and
 * having `openMatch` build `{ fileId, versionId }` from it - this is what lets the Dashboard's
 * "open this file/version" action actually land MatchView on the right one.
 */
describe('router.route', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('pushes params and query when both are given', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    route('Match', { a: '1' }, { b: '2' })

    expect(push).toHaveBeenCalledWith({ name: 'Match', params: { a: '1' }, query: { b: '2' } })
  })

  it('pushes with no params/query when neither is given', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    route('Match')

    expect(push).toHaveBeenCalledWith({ name: 'Match', params: undefined, query: undefined })
  })
})

describe('MatchRouting.openMatch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates to Match with no query when called with no arguments (sidebar link, "back" from Customer Card)', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    MatchRouting.openMatch()

    expect(push).toHaveBeenCalledWith({ name: 'Match', params: undefined, query: undefined })
  })

  it('carries fileId and versionId as a query so MatchView can preselect them', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    MatchRouting.openMatch(69, 73)

    expect(push).toHaveBeenCalledWith({
      name: 'Match',
      params: undefined,
      query: { fileId: '69', versionId: '73' },
    })
  })
})

describe('MatchRouting.openVersionProgress', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates with versionId as a route param (FE-05a)', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    MatchRouting.openVersionProgress(73)

    expect(push).toHaveBeenCalledWith({
      name: 'VersionProgress',
      params: { versionId: '73' },
      query: undefined,
    })
  })
})

describe('MatchRouting.openVersionErrors', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates with versionId as a route param (UC-VAL-03)', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    MatchRouting.openVersionErrors(73)

    expect(push).toHaveBeenCalledWith({
      name: 'VersionErrors',
      params: { versionId: '73' },
      query: undefined,
    })
  })
})

describe('MatchRouting.backOrOpenMatch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    // Leave no router-shaped history state behind for the next test.
    globalThis.history.replaceState(null, '')
  })

  it('returns to the previous in-app entry when the router recorded one', () => {
    globalThis.history.replaceState({ back: '/match' }, '')
    const back = vi.spyOn(router, 'back').mockReturnValue(undefined)
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    MatchRouting.backOrOpenMatch('73')

    expect(back).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('falls back to Match scoped to the version on a direct load, which has no prior in-app entry', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    MatchRouting.backOrOpenMatch('73')

    expect(push).toHaveBeenCalledWith({
      name: 'Match',
      params: undefined,
      query: { versionId: '73' },
    })
  })

  it('drops a malformed segment rather than sending ?versionId=NaN', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    MatchRouting.backOrOpenMatch('abc')

    expect(push).toHaveBeenCalledWith({ name: 'Match', params: undefined, query: undefined })
  })
})

describe('MatchRouting.openCustomerCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates with versionId and buyerId as route params', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    MatchRouting.openCustomerCard(73, 36)

    expect(push).toHaveBeenCalledWith({
      name: 'CustomerCard',
      params: { versionId: '73', buyerId: '36' },
      query: undefined,
    })
  })
})

describe('MatchRouting.openSaleLineDetail', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates with versionId, buyerId and lineId as route params (UC-API-13)', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    MatchRouting.openSaleLineDetail(73, 36, 501)

    expect(push).toHaveBeenCalledWith({
      name: 'SaleLineDetail',
      params: { versionId: '73', buyerId: '36', lineId: '501' },
      query: undefined,
    })
  })
})
