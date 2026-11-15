import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

import { fetchSwitchableCompanies, switchActiveCompany } from '@/api'

/**
 * UC-ENT-19's two endpoints, as this application calls them.
 *
 * The picker used to bind to `GET /api/companies`, which is scoped to the session's own company and
 * answers at most one row by construction — which is why a user entitled to two saw one and their
 * second company was unreachable rather than badly rendered.
 */
describe('api: the switchable companies and the switch itself', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(response: { ok?: boolean; status?: number; body?: unknown }) {
    const fetch = vi.fn().mockResolvedValue({
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.body,
      text: async () => JSON.stringify(response.body ?? ''),
    })
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('reads the switchable companies from the session, not from the company catalogue', async () => {
    const fetch = stubFetch({
      body: {
        companies: [
          { uuid: 'company-a', name: 'Contoso Manufacturing' },
          { uuid: 'company-b', name: 'Northwind Trading' },
        ],
        activeCompanyUuid: 'company-b',
      },
    })

    const answer = await fetchSwitchableCompanies()

    expect(fetch.mock.calls[0][0]).toContain('/api/session/companies')
    expect(answer.companies.map((company) => company.uuid)).toEqual(['company-a', 'company-b'])

    // The server says which one the session is in. The picker preselects THIS rather than whatever
    // the browser remembered, which is the only way the two cannot disagree.
    expect(answer.activeCompanyUuid).toBe('company-b')
  })

  it('switches with a PUT and tolerates the empty body a 204 has', async () => {
    const fetch = stubFetch({ status: 204, body: undefined })

    // Not `post`: the endpoint is idempotent — every picker sends its current selection on mount —
    // and it answers 204, so a helper that unconditionally parses JSON would throw on success.
    await expect(switchActiveCompany('company-b')).resolves.toBeUndefined()

    const [url, init] = fetch.mock.calls[0]
    expect(url).toContain('/api/session/active-company')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ companyUuid: 'company-b' })
  })

  it('raises the refusal rather than swallowing it, so the picker can put itself back', async () => {
    stubFetch({ ok: false, status: 403, body: { error: 'not yours' } })

    // A 403 means the company lost MODULE_AR, or the caller was disabled at it, between the list
    // being drawn and the click. The caller has to know: the alternative is a dropdown showing a
    // company the session is not in.
    await expect(switchActiveCompany('company-b')).rejects.toMatchObject({ status: 403 })
  })
})
