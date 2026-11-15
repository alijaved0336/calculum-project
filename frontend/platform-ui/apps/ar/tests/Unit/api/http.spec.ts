import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authLogin = vi.fn()
vi.mock('@ada/auth', () => ({ authLogin: () => authLogin() }))
vi.mock('@/utils/getBaseApi', () => ({ getBaseApi: () => 'http://api.test' }))

import {
  buildUrl,
  get,
  getAllPages,
  putJson,
  getNoContent,
  postNoContent,
  del,
  HttpError,
  SessionExpiredError,
} from '@/api/http'

describe('http.buildUrl', () => {
  it('returns the bare url when there is no query', () => {
    expect(buildUrl('/api/sale-files')).toBe('http://api.test/api/sale-files')
  })

  it('omits undefined and null values instead of sending them as strings', () => {
    // The bug this prevents: `?severity=undefined`, which the API reads as a real filter value
    // and answers with an empty list, looking like "no data" rather than a client bug.
    expect(buildUrl('/x', { page: 1, severity: undefined, code: null })).toBe(
      'http://api.test/x?page=1',
    )
  })

  it('keeps false and zero, which are real values', () => {
    expect(buildUrl('/x', { active: false, page: 0 })).toBe('http://api.test/x?active=false&page=0')
  })

  it('omits an empty string instead of sending it as an explicit filter', () => {
    // The bug this prevents: a cleared search box or "no selection" dropdown resetting to ''
    // rather than undefined would otherwise send ?search=, an explicit empty-string filter,
    // instead of no filter at all.
    expect(buildUrl('/x', { page: 1, search: '' })).toBe('http://api.test/x?page=1')
  })

  it('percent-encodes values', () => {
    expect(buildUrl('/x', { name: 'a&b c' })).toBe('http://api.test/x?name=a%26b+c')
  })

  it('drops the separator when every value was omitted', () => {
    expect(buildUrl('/x', { a: undefined })).toBe('http://api.test/x')
  })
})

describe('http.get', () => {
  beforeEach(() => {
    authLogin.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(response: Partial<Response>) {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
      ...response,
    })
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('sends the session cookie', async () => {
    const fetch = stubFetch({ json: async () => ({ total: 1 }) })

    await get('/api/sale-files')

    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/sale-files',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('returns the parsed body', async () => {
    stubFetch({ json: async () => ({ total: 7 }) })

    await expect(get<{ total: number }>('/x')).resolves.toEqual({ total: 7 })
  })

  it('redirects to the identity provider on 401', async () => {
    stubFetch({ ok: false, status: 401 })

    const error = await get('/x').catch((e: unknown) => e)

    expect(authLogin).toHaveBeenCalledOnce()
    expect(error).toBeInstanceOf(SessionExpiredError)
  })

  it('settles on 401 rather than hanging, so a combinator cannot stall', async () => {
    // The regression this pins: the 401 branch used to `return new Promise(() => {})`. Awaited
    // directly that is invisible, because the document is navigating away anyway. Inside
    // `Promise.all` it is a screen stuck on its spinner with nothing in the console, and nothing
    // stopped a future caller from writing that.
    stubFetch({ ok: false, status: 401 })

    const settled = await Promise.race([
      Promise.allSettled([get('/x'), get('/y')]).then(() => 'settled'),
      new Promise((resolve) => setTimeout(() => resolve('hung'), 50)),
    ])

    expect(settled).toBe('settled')
  })

  it('reports a failed redirect as an HttpError instead of losing it', async () => {
    // `authLogin` is async, so the old unawaited call could only ever reject its own promise: the
    // guard around it never fired and a broken redirect surfaced as an unhandled rejection while
    // the caller waited forever. This asserts the await, not just the catch.
    stubFetch({ ok: false, status: 401 })
    authLogin.mockRejectedValueOnce(new Error('navigation blocked'))

    const error = await get('/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).status).toBe(401)
    expect((error as HttpError).body).toContain('navigation blocked')
    // Not the redirect type: the page is NOT leaving, so a view must not sit on its spinner.
    expect(error).not.toBeInstanceOf(SessionExpiredError)
  })

  it('throws an HttpError carrying the status for other failures', async () => {
    stubFetch({ ok: false, status: 404, text: async () => 'not found' })

    const error = await get('/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).status).toBe(404)
    expect((error as HttpError).body).toBe('not found')
    expect(authLogin).not.toHaveBeenCalled()
  })

  it('throws on 403 and does NOT send the caller back to sign in', async () => {
    // UC-ENT-05. The backend answers 403 for a caller who is authenticated and lacks the module,
    // and 401 only when there is no usable session. Treating 403 like 401 would bounce a
    // signed-in user to the identity provider to fix something signing in cannot fix, and they
    // would land back on the same refusal — a login loop that hides the real cause.
    //
    // This is the assertion that stops the two being merged again, because merging them is the
    // natural thing to do to "handle auth errors in one place".
    stubFetch({ ok: false, status: 403, text: async () => '' })

    const error = await get('/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).status).toBe(403)
    expect((error as HttpError).isForbidden).toBe(true)
    expect(authLogin).not.toHaveBeenCalled()
  })

  it('does not mistake other failures for a refusal', async () => {
    stubFetch({ ok: false, status: 500, text: async () => '' })

    const error = await get('/x').catch((e: unknown) => e)

    expect((error as HttpError).isForbidden).toBe(false)
  })
})

/**
 * UC-SET-03's transport: a `PUT` that, unlike `put`, expects a real JSON body back (the saved
 * set, with each tier's default-vs-override state). `handleResponse` is shared with `get`, so
 * these tests focus on what `putJson` adds over it: the method, the JSON body and header, and
 * that the 401/403 handling still applies unchanged.
 */
describe('http.putJson', () => {
  beforeEach(() => {
    authLogin.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(response: Partial<Response>) {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
      ...response,
    })
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('sends the method, the session cookie, a JSON content type, and the serialized body', async () => {
    const fetch = stubFetch({ json: async () => ({ ok: true }) })

    await putJson('/api/companies/x/cash-flow-impact-limits', { limits: [{ tier: 'Low' }] })

    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/companies/x/cash-flow-impact-limits',
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ limits: [{ tier: 'Low' }] }),
      }),
    )
  })

  it('returns the parsed response body', async () => {
    stubFetch({ json: async () => ({ tier: 'Low', isDefault: false }) })

    await expect(putJson('/x', {})).resolves.toEqual({ tier: 'Low', isDefault: false })
  })

  it('redirects to the identity provider on 401, same as get', async () => {
    stubFetch({ ok: false, status: 401 })

    const error = await putJson('/x', {}).catch((e: unknown) => e)

    expect(authLogin).toHaveBeenCalledOnce()
    expect(error).toBeInstanceOf(SessionExpiredError)
  })

  it('throws on 403 rather than redirecting, same as get', async () => {
    stubFetch({ ok: false, status: 403, text: async () => '' })

    const error = await putJson('/x', {}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).isForbidden).toBe(true)
    expect(authLogin).not.toHaveBeenCalled()
  })

  it('throws an HttpError carrying the refusal body on a 400 (UC-SET-03 A1)', async () => {
    stubFetch({ ok: false, status: 400, text: async () => '{"errors":["not ascending"]}' })

    const error = await putJson('/x', {}).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).status).toBe(400)
    expect((error as HttpError).body).toBe('{"errors":["not ascending"]}')
  })
})

/**
 * UC-ENT-08's transport. It exists because the session renewal answers `200` with NO body, and
 * `get` finishes with `response.json()` unconditionally — so the one call that must not fail would
 * have failed precisely when it worked.
 */
describe('http.getNoContent', () => {
  beforeEach(() => {
    authLogin.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(response: Partial<Response>) {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      // The body a renewal actually returns, and the reason this function exists: parsing it throws.
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input')
      },
      text: async () => '',
      ...response,
    })
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('resolves on an empty 200 rather than trying to parse it', async () => {
    const fetch = stubFetch({})

    await expect(getNoContent('/api/session/refresh-token')).resolves.toBeUndefined()

    // With the cookie, or the server has no session to renew.
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/session/refresh-token',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('carries the status through, so a caller can tell a conflict from an outage', async () => {
    stubFetch({ ok: false, status: 409 })

    // 409 and 502 are both "try again" and mean different things — another renewal in flight versus
    // B2C refusing — and a caller that could not tell them apart could not back off differently.
    await expect(getNoContent('/api/session/refresh-token')).rejects.toMatchObject({ status: 409 })
  })

  it('sends the analyst to sign in when the session is already gone', async () => {
    stubFetch({ ok: false, status: 401 })

    // A5: the token expired before the keep-alive got to it. Same answer every other call gives,
    // deliberately — a second transport with its own idea of an expired session is how one of them
    // ends up not redirecting.
    await expect(getNoContent('/api/session/refresh-token')).rejects.toBeInstanceOf(
      SessionExpiredError,
    )
    expect(authLogin).toHaveBeenCalledTimes(1)
  })
})

/**
 * UC-UI-05's "mark buyer as recently viewed" transport: a `POST` that, unlike `post`, expects
 * nothing back. Same reasoning as `getNoContent` vs `get`, for the verb with a request body.
 */
describe('http.postNoContent', () => {
  beforeEach(() => {
    authLogin.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(response: Partial<Response>) {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input')
      },
      text: async () => '',
      ...response,
    })
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('sends the method, the session cookie, a JSON content type, and the serialized body', async () => {
    const fetch = stubFetch({})

    await postNoContent('/api/buyers/v-1/recent/42', { seen: true })

    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/buyers/v-1/recent/42',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ seen: true }),
      }),
    )
  })

  it('resolves on an empty response rather than trying to parse it', async () => {
    const fetch = stubFetch({})

    await expect(postNoContent('/api/buyers/v-1/recent/42')).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/buyers/v-1/recent/42',
      expect.objectContaining({ body: undefined }),
    )
  })

  it('redirects to the identity provider on 401, same as post', async () => {
    stubFetch({ ok: false, status: 401 })

    const error = await postNoContent('/x').catch((e: unknown) => e)

    expect(authLogin).toHaveBeenCalledOnce()
    expect(error).toBeInstanceOf(SessionExpiredError)
  })

  it('throws an HttpError carrying the status for other failures', async () => {
    stubFetch({ ok: false, status: 404, text: async () => 'not found' })

    const error = await postNoContent('/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).status).toBe(404)
    expect((error as HttpError).body).toBe('not found')
  })
})

/**
 * UC-UI-05's "remove recently viewed buyer" transport. Same 401/ok handling as every other verb.
 */
describe('http.del', () => {
  beforeEach(() => {
    authLogin.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(response: Partial<Response>) {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input')
      },
      text: async () => '',
      ...response,
    })
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('sends the DELETE method and the session cookie', async () => {
    const fetch = stubFetch({})

    await del('/api/buyers/v-1/recent/42')

    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/buyers/v-1/recent/42',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    )
  })

  it('resolves on an empty response rather than trying to parse it', async () => {
    stubFetch({})

    await expect(del('/api/buyers/v-1/recent/42')).resolves.toBeUndefined()
  })

  it('redirects to the identity provider on 401, same as every other verb', async () => {
    stubFetch({ ok: false, status: 401 })

    const error = await del('/x').catch((e: unknown) => e)

    expect(authLogin).toHaveBeenCalledOnce()
    expect(error).toBeInstanceOf(SessionExpiredError)
  })

  it('throws an HttpError carrying the status for other failures', async () => {
    stubFetch({ ok: false, status: 409, text: async () => 'conflict' })

    const error = await del('/x').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).status).toBe(409)
    expect((error as HttpError).body).toBe('conflict')
  })
})

/**
 * The regression this pins: `DashboardView`'s own `/api/sale-files` read assumed a bare array
 * unconditionally and crashed with `files.value.flatMap is not a function` the moment this
 * endpoint actually started answering UC-API-01's `{ items, nextCursor }` shape. `getAllPages`
 * is the fix, in the shared client so no other caller of a keyset-paginated endpoint can repeat
 * the same assumption.
 */
describe('http.getAllPages', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubJsonSequence(responses: unknown[]) {
    const fetch = vi.fn()
    for (const body of responses) {
      fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body })
    }
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('accepts a bare array (pre-UC-API-01 response shape) without throwing', async () => {
    const rows = [{ id: 1 }, { id: 2 }]
    stubJsonSequence([rows])

    await expect(getAllPages('/api/sale-files')).resolves.toEqual(rows)
  })

  it('walks every page of the { items, nextCursor } shape once it ships', async () => {
    const fetch = stubJsonSequence([
      { items: [{ id: 1 }], nextCursor: 5 },
      { items: [{ id: 2 }], nextCursor: null },
    ])

    await expect(
      getAllPages('/api/sale-files', (after) => (after !== undefined ? { after } : undefined)),
    ).resolves.toEqual([{ id: 1 }, { id: 2 }])
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[1][0]).toContain('after=5')
  })

  it('treats an omitted nextCursor as "no more pages" rather than refetching forever', async () => {
    stubJsonSequence([{ items: [{ id: 1 }] }])

    await expect(getAllPages('/api/sale-files')).resolves.toEqual([{ id: 1 }])
  })
})
