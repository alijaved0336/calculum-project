import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

import {
  fetchBuyerCorporateTree,
  fetchBuyerLine,
  fetchBuyerLines,
  fetchBuyerRatingsMetrics,
  fetchCorporateTree,
  fetchOpportunityWaterfallBuckets,
  fetchSaleFiles,
  fetchVersionStatus,
  recalculateVersion,
  resyncOpportunity,
} from '@/api'
import { HttpError } from '@/api/http'

/**
 * `getAllPages` drives every list endpoint (`fetchSaleFiles`, `fetchNoMatches`, `fetchErrors`,
 * `fetchCompanies`). UC-API-01's `{ items, nextCursor }` response shape ships in a separate
 * backend PR from this one, so for as long as the two are deployed out of order these same
 * endpoints still answer with a bare array. Both shapes must work.
 */
describe('api.getAllPages (via fetchSaleFiles)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(responses: unknown[]) {
    const fetch = vi.fn();
    for (const body of responses) {
      fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body })
    }
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('accepts a bare array (pre-UC-API-01 response shape) without throwing', async () => {
    const rows = [{ id: 1 }, { id: 2 }]
    stubFetch([rows])

    await expect(fetchSaleFiles()).resolves.toEqual(rows)
  })

  it('walks every page of the { items, nextCursor } shape once it ships', async () => {
    const fetch = stubFetch([
      { items: [{ id: 1 }], nextCursor: 5 },
      { items: [{ id: 2 }], nextCursor: null },
    ])

    await expect(fetchSaleFiles()).resolves.toEqual([{ id: 1 }, { id: 2 }])
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[1][0]).toContain('after=5')
  })

  it('treats an omitted nextCursor as "no more pages" rather than refetching forever', async () => {
    stubFetch([{ items: [{ id: 1 }] }])

    await expect(fetchSaleFiles()).resolves.toEqual([{ id: 1 }])
  })
})

/** UC-API-04: the status read UC-FE-05a polls, and the recalculation claim beside it. */
describe('api.fetchVersionStatus / recalculateVersion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the status from the version\'s own status route', async () => {
    const body = { saleFileVersionId: 73, status: 'calculating', isError: false }
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body })
    vi.stubGlobal('fetch', fetch)

    await expect(fetchVersionStatus(73)).resolves.toEqual(body)
    expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/sale-file-versions/73/status')
  })

  it('POSTs the recalculation claim and resolves the 202 body', async () => {
    const body = { saleFileVersionId: 73, status: 'recalculateClaimed' }
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 202, json: async () => body })
    vi.stubGlobal('fetch', fetch)

    await expect(recalculateVersion(73)).resolves.toEqual(body)
    expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/sale-file-versions/73/recalculate')
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST' })
  })

  it('surfaces a 409 refusal as an HttpError carrying the body, for the caller to read the detail from', async () => {
    const refusal = '{"error":"Status \'calculating\' does not allow recalculation."}'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409, text: async () => refusal }))

    const outcome = recalculateVersion(73)
    await expect(outcome).rejects.toBeInstanceOf(HttpError)
    await expect(outcome).rejects.toMatchObject({ status: 409, body: refusal })
  })
})

/**
 * The Opportunity resync the dashboard's per-row button calls. The projections it rebuilds are
 * read by the Opportunity grids, so a stale one shows figures the calculation has already moved
 * past.
 */
describe('api.resyncOpportunity', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs to the version-scoped resync route and resolves the 202 body', async () => {
    const body = { enqueuedVersionIds: [73] }
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 202, json: async () => body })
    vi.stubGlobal('fetch', fetch)

    await expect(resyncOpportunity(73)).resolves.toEqual(body)
    // The version goes in the PATH, not a body: the tenant-wide resync is the same route without
    // it, so a missing id would rebuild every version this tenant has rather than failing.
    expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/opportunity/resync/73')
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST' })
  })

  it('surfaces a 409 refusal as an HttpError carrying the body, for the caller to read the detail from', async () => {
    const refusal = '{"error":"Status \'calculating\' does not allow a resync."}'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409, text: async () => refusal }))

    const outcome = resyncOpportunity(73)
    await expect(outcome).rejects.toBeInstanceOf(HttpError)
    await expect(outcome).rejects.toMatchObject({ status: 409, body: refusal })
  })
})

/** UC-API-08: the corporate tree around one buyer (the Entity Card's Corporate Tree tab). */
describe('api.fetchCorporateTree', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the tree from the buyer-scoped corporate-tree route', async () => {
    const body = {
      buyerId: 10,
      nodes: [{ id: 10, companyName: 'Acme', role: 'Self', resolution: 'Enriched', isRequestedBuyer: true }],
      edges: [],
      cycles: [],
      partial: false,
      truncated: false,
    }
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body })
    vi.stubGlobal('fetch', fetch)

    await expect(fetchCorporateTree(73, 10)).resolves.toEqual(body)
    expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/sale-file-versions/73/buyers/10/corporate-tree?currencyRate=1')
  })

  it('sends a non-default currencyRate through to the route', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch)

    await fetchCorporateTree(73, 10, 0.85)
    expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/sale-file-versions/73/buyers/10/corporate-tree?currencyRate=0.85')
  })
})

/** UC-API-08's buyer-scoped counterpart: the Customer Card's own Corporate Tree tab, read off the
 * active version's uuid rather than a numeric sale-file-version id. */
describe('api.fetchBuyerCorporateTree', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the tree from the uuid-scoped buyers corporate-tree route', async () => {
    const body = {
      buyerId: 10,
      nodes: [
        {
          id: 10,
          companyName: 'Acme',
          role: 'Self',
          resolution: 'Enriched',
          isRequestedBuyer: true,
          volume: 10939.184982,
          paymentTerms: 60,
          paymentTermsOpportunity: null,
          cashFlow: 0,
          country: 'CHE',
          salesLines: [],
          salesLinesTruncated: false,
        },
      ],
      edges: [],
      cycles: [],
      partial: false,
      truncated: false,
    }
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body })
    vi.stubGlobal('fetch', fetch)

    const versionUuid = '1653c234-9318-4707-a6c3-33f4b427126c'
    await expect(fetchBuyerCorporateTree(versionUuid, 10)).resolves.toEqual(body)
    expect(fetch.mock.calls[0][0]).toBe(`http://api.test/api/buyers/${versionUuid}/10/corporate-tree?currencyRate=1`)
  })

  it('sends a non-default currencyRate through to the route', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch)

    const versionUuid = '1653c234-9318-4707-a6c3-33f4b427126c'
    await fetchBuyerCorporateTree(versionUuid, 10, 0.85)
    expect(fetch.mock.calls[0][0]).toBe(`http://api.test/api/buyers/${versionUuid}/10/corporate-tree?currencyRate=0.85`)
  })
})

describe('api.fetchBuyerRatingsMetrics', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the metrics from the uuid-scoped ratings-metrics route, defaulting currencyRate to 1', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch)

    const versionUuid = '1653c234-9318-4707-a6c3-33f4b427126c'
    await fetchBuyerRatingsMetrics(versionUuid, 10)
    expect(fetch.mock.calls[0][0]).toBe(`http://api.test/api/buyers/${versionUuid}/10/ratings-metrics?currencyRate=1`)
  })

  it('sends a non-default currencyRate through to the route', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetch)

    const versionUuid = '1653c234-9318-4707-a6c3-33f4b427126c'
    await fetchBuyerRatingsMetrics(versionUuid, 10, 0.85)
    expect(fetch.mock.calls[0][0]).toBe(`http://api.test/api/buyers/${versionUuid}/10/ratings-metrics?currencyRate=0.85`)
  })
})

/**
 * UC-API-13: one buyer's own sale lines, paged - the list the provisional strategy panel drills
 * into.
 */
describe('api.fetchBuyerLines', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds the buyer-scoped lines path with page and pageSize', async () => {
    const body = { total: 1, page: 2, pageSize: 25, lines: [] }
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body })
    vi.stubGlobal('fetch', fetch)

    await expect(fetchBuyerLines(73, 10, 2, 25)).resolves.toEqual(body)
    expect(fetch.mock.calls[0][0]).toBe(
      'http://api.test/api/sale-file-versions/73/buyers/10/lines?page=2&pageSize=25',
    )
  })

  it('surfaces a buyer not in this version as a 404 HttpError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => '' }))

    const outcome = fetchBuyerLines(73, 999, 1, 50)
    await expect(outcome).rejects.toBeInstanceOf(HttpError)
    await expect(outcome).rejects.toMatchObject({ status: 404 })
  })
})

/**
 * UC-API-13: one line with everything it carries and what each strategy produced for it - the
 * deepest of the three provisional surfaces the strategy panel can drill into.
 */
describe('api.fetchBuyerLine', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the line from the buyer-scoped line-detail route', async () => {
    const body = {
      line: { id: 5, saleFileVersionId: 73, buyerId: 10 },
      strategyResults: [{ strategy: 'peer_group_standard_2_0', proposedTerm: 45 }],
    }
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body })
    vi.stubGlobal('fetch', fetch)

    await expect(fetchBuyerLine(73, 10, 5)).resolves.toEqual(body)
    expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/sale-file-versions/73/buyers/10/lines/5?currencyRate=1')
  })

  it('surfaces a line not found as a 404 HttpError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => '' }))

    const outcome = fetchBuyerLine(73, 10, 999)
    await expect(outcome).rejects.toBeInstanceOf(HttpError)
    await expect(outcome).rejects.toMatchObject({ status: 404 })
  })
})

/**
 * UC-UI-03: the waterfall's own bars, one point per bucket the portfolio's buyers landed in
 * (UC-OPP-13). Reads the Opportunity Overview's existing dimension/measure chart endpoint
 * (`dimension: "waterfallBucket"`, `measure: "cashFlowOpportunity"`) rather than a
 * purpose-built waterfall endpoint - see G-481 for why no such endpoint exists yet.
 */
describe('api.fetchOpportunityWaterfallBuckets', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs the chart request scoped to the version and returns its points', async () => {
    const body = {
      saleFileVersionId: 73,
      status: 'ready',
      measure: 'cashFlowOpportunity',
      dimension: 'waterfallBucket',
      points: [
        { name: '0-30', value: 1200 },
        { name: '31-60', value: 400 },
      ],
    }
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body })
    vi.stubGlobal('fetch', fetch)

    await expect(fetchOpportunityWaterfallBuckets('11111111-1111-1111-1111-111111111111')).resolves.toEqual(body)

    expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/opportunity-overview/chart')
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      filters: { targetSaleFileVersionUuid: '11111111-1111-1111-1111-111111111111' },
      measure: 'cashFlowOpportunity',
      dimension: 'waterfallBucket',
    })
  })
})
