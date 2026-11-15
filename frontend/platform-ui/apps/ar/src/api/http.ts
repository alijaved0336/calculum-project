/**
 * The AR app's HTTP client.
 *
 * One place that knows how this app talks to Ada.Ar.Api: the base URL, that the session cookie
 * must ride along, how query parameters are encoded, and what happens when the session is gone.
 *
 * `src/api/index.ts` still has its own inline `get`, and `src/modules/match/api/index.ts` is now
 * drifted apart into byte-identical duplicates of the same inline client). Folding `src/api/index.ts`
 * into this one is a separate change, so that the grid conversion and the transport swap fail
 * independently.
 */
import { authLogin } from '@ada/auth'
import { getBaseApi } from '@/utils/getBaseApi'

/** A query value of `undefined` or `null` is omitted rather than sent as the string "undefined". */
export type QueryValue = string | number | boolean | undefined | null
export type Query = Record<string, QueryValue>

/**
 * An HTTP failure carrying the status, so a caller can branch on it (404 as an empty state, 409
 * as a conflict) instead of matching on a message string.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body: string,
  ) {
    super(`AR API request failed (${status}) for ${path}`)
    this.name = 'HttpError'
  }

  /**
   * The caller is authenticated and lacks the module this route requires (UC-ENT-05).
   *
   * Worth a named check rather than `status === 403` at each call site, because the whole point
   * of the backend answering 403 instead of 401 is that the two need different treatment, and a
   * bare number invites someone to lump them together again.
   */
  get isForbidden(): boolean {
    return this.status === 403
  }

  /**
   * The body parsed as JSON, null when it is not JSON. Refusal details ride the body (UC-API-04's
   * 409 answers `{ error }`, UC-SET-03's 400 answers `{ errors: [] }`), so this owns the
   * tolerate-garbage half once and each call site keeps only its shape-specific field pick -
   * before it existed, every view hand-rolled its own try/parse/catch over `error.body`.
   */
  jsonBody<T>(): T | null {
    try {
      return JSON.parse(this.body) as T
    } catch {
      return null
    }
  }
}

/**
 * The session is gone and the browser is being sent to the identity provider.
 *
 * Thrown rather than left as a never-settling promise. A pending promise is fine for the one call
 * site that awaits it directly and is a trap for any caller that puts it in `Promise.all`: the
 * other members settle, the combinator never does, and the failure is a screen stuck on its
 * loading state with nothing in the console. Rejecting lets every caller settle.
 *
 * It is a separate type from `HttpError` because it is not a request failure. Nothing went wrong
 * with the request and there is no status worth branching on; the page is leaving. A view catches
 * it and does nothing, deliberately holding its loading state rather than rendering an error over
 * a document that is already navigating away.
 */
export class SessionExpiredError extends Error {
  constructor(readonly path: string) {
    super(`AR API request to ${path} found no session; redirecting to sign in`)
    this.name = 'SessionExpiredError'
  }
}

export function buildUrl(path: string, query?: Query): string {
  const base = `${getBaseApi()}${path}`
  if (!query) {
    return base
  }

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    // '' is dropped alongside undefined/null: an empty string filter value (a cleared search
    // box, a "no selection" dropdown reset to '' rather than undefined) must omit the param
    // rather than sending an explicit ?key= - the same reasoning fetchCompanies' own comment
    // gives for why an unrecognised role value fails the request instead of degrading to
    // unfiltered. 0 and false are real values and must not be dropped alongside it.
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value))
    }
  }

  const encoded = params.toString()
  return encoded ? `${base}?${encoded}` : base
}

/**
 * GETs JSON.
 *
 * **401 and 403 are different answers and must not be merged.** The backend distinguishes them
 * deliberately (UC-ENT-04, UC-ENT-05):
 *
 * - **401** means there is no usable session. No caller can recover from it, so it redirects to
 *   the identity provider rather than surfacing as an error every view has to special case, and
 *   rejects with `SessionExpiredError` so that awaiting callers and promise combinators alike
 *   settle. A view catches that type and holds its loading state; the page is navigating away.
 * - **403** means the caller is known and lacks the module this route requires. It is thrown, so
 *   the view can say so. Redirecting here would send someone to sign in again to fix a problem
 *   signing in cannot fix, and would hide the real cause behind a login loop — a user who has
 *   just authenticated being bounced back to authenticate is the most confusing outcome
 *   available.
 */
export async function get<T>(path: string, query?: Query, init?: RequestInit): Promise<T> {
  const url = buildUrl(path, query)
  const response = await fetch(url, { ...init, credentials: 'include' })

  return handleResponse<T>(response, path)
}

/**
 * PUTs a JSON body and returns the parsed JSON response, with `get`'s exact 401/403 handling
 * (`handleResponse`): a write endpoint's session can expire or lose the module just as a read's
 * can, and UC-ENT-05 draws the same 401-vs-403 line regardless of verb.
 *
 * A 400 (validation refusal, e.g. UC-SET-03 A1) is NOT special-cased here: it surfaces as an
 * `HttpError` like any other non-2xx status, and the caller reads `error.body` for the refusal
 * detail. A view that wants to show the refusal parses it there, same as it would for a 409.
 */
export async function putJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const url = buildUrl(path)
  const response = await fetch(url, {
    ...init,
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    body: JSON.stringify(body),
  })

  return handleResponse<T>(response, path)
}

/**
 * The 401/403/ok handling `get` and `putJson` share verbatim. Pulled out once both needed it,
 * rather than duplicated: a future divergence (a verb that should redirect on 401 but not throw
 * on 403, say) is then a real decision made at this one call site, not a drift nobody notices
 * between two copies.
 */
async function handleResponse<T>(response: Response, path: string): Promise<T> {
  if (response.status === 401) {
    // AWAITED, and that is the whole point of the try/catch. `authLogin` is an async function, so
    // an unawaited call can only ever reject its own promise: the catch below never ran, and a
    // failed redirect surfaced as an unhandled rejection while this function returned a promise
    // that resolved to nothing forever. A guard that cannot fire is worse than no guard, because
    // the comment explaining it stops the next reader from checking.
    //
    // Distinguished from the redirect working, because the two need opposite treatment. If the
    // redirect did not happen the page is NOT leaving, and a view holding its loading state would
    // spin against a session that is gone with nothing on screen saying so.
    try {
      await authLogin()
    } catch (cause) {
      throw new HttpError(
        401,
        path,
        `The session expired and the redirect to sign in failed: ${String(cause)}`,
      )
    }

    throw new SessionExpiredError(path)
  }

  if (!response.ok) {
    throw new HttpError(response.status, path, await response.text().catch(() => ''))
  }

  return (await response.json()) as T
}

/**
 * A `GET` that expects nothing back.
 *
 * **Separate from `get` for the reason `put` is separate from `post`**, and it bites in the same
 * place: `get` finishes with `response.json()` unconditionally, which throws on an empty body. The
 * session renewal (UC-ENT-08) answers `200` with no body on purpose — the new token is in the
 * cookie, and a response that also carried it would be a token the page can read — so calling `get`
 * would have failed on success.
 *
 * The 401 handling is deliberately identical: it means the same thing here as anywhere else, and it
 * is what UC-ENT-08 A5 asks for — a session that expired before the keep-alive got to it sends the
 * analyst to sign in rather than looping.
 */
export async function getNoContent(path: string, init?: RequestInit): Promise<void> {
  const url = buildUrl(path)
  const response = await fetch(url, { ...init, credentials: 'include' })

  if (response.status === 401) {
    try {
      await authLogin()
    } catch (cause) {
      throw new HttpError(
        401,
        path,
        `The session expired and the redirect to sign in failed: ${String(cause)}`,
      )
    }

    throw new SessionExpiredError(path)
  }

  if (!response.ok) {
    throw new HttpError(response.status, path, await response.text().catch(() => ''))
  }
}

export async function post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const url = buildUrl(path)
  const response = await fetch(url, {
    ...init,
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 401) {
    try {
      await authLogin()
    } catch (cause) {
      throw new HttpError(
        401,
        path,
        `The session expired and the redirect to sign in failed: ${String(cause)}`,
      )
    }

    throw new SessionExpiredError(path)
  }

  if (!response.ok) {
    throw new HttpError(response.status, path, await response.text().catch(() => ''))
  }

  return (await response.json()) as T
}

/**
 * A `POST` that expects nothing back - same reasoning as `getNoContent` vs `get`, for the verb
 * that has a request body. UC-UI-05's "mark this buyer as recently viewed" answers with no body
 * to parse, so `post` (which finishes with `response.json()` unconditionally) would fail on the
 * one outcome that must not fail.
 */
export async function postNoContent(path: string, body?: unknown, init?: RequestInit): Promise<void> {
  const url = buildUrl(path)
  const response = await fetch(url, {
    ...init,
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 401) {
    try {
      await authLogin()
    } catch (cause) {
      throw new HttpError(
        401,
        path,
        `The session expired and the redirect to sign in failed: ${String(cause)}`,
      )
    }

    throw new SessionExpiredError(path)
  }

  if (!response.ok) {
    throw new HttpError(response.status, path, await response.text().catch(() => ''))
  }
}

/**
 * `DELETE`s a resource and expects nothing back - same 401/403 handling as every other verb here.
 */
export async function del(path: string, init?: RequestInit): Promise<void> {
  const url = buildUrl(path)
  const response = await fetch(url, { ...init, method: 'DELETE', credentials: 'include' })

  if (response.status === 401) {
    try {
      await authLogin()
    } catch (cause) {
      throw new HttpError(
        401,
        path,
        `The session expired and the redirect to sign in failed: ${String(cause)}`,
      )
    }

    throw new SessionExpiredError(path)
  }

  if (!response.ok) {
    throw new HttpError(response.status, path, await response.text().catch(() => ''))
  }
}

/**
 * A `PUT` that expects nothing back.
 *
 * **Separate from `post` rather than a flag on it**, for two reasons that both bite at runtime.
 * `post` sets `method: 'POST'` after spreading `init`, so the method cannot be overridden by a
 * caller — and it finishes with `response.json()` unconditionally, which throws on the empty body a
 * `204` has. UC-ENT-19's switch is a `204`, so calling `post` would have failed on success, which
 * is the least helpful moment to fail.
 *
 * Everything else is deliberately identical, including the 401 handling: a refusal here means the
 * same thing it means anywhere else, and a second transport with its own idea of an expired session
 * is how one of them ends up not redirecting.
 */
export async function put(path: string, body?: unknown, init?: RequestInit): Promise<void> {
  const url = buildUrl(path)
  const response = await fetch(url, {
    ...init,
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 401) {
    try {
      await authLogin()
    } catch (cause) {
      throw new HttpError(
        401,
        path,
        `The session expired and the redirect to sign in failed: ${String(cause)}`,
      )
    }

    throw new SessionExpiredError(path)
  }

  if (!response.ok) {
    throw new HttpError(response.status, path, await response.text().catch(() => ''))
  }
}

/**
 * UC-API-01's keyset page shape: `items` plus a `nextCursor` to pass back as `after` for the
 * next page, null once there is no more to fetch.
 */
export interface KeysetPage<T> {
  items: T[]
  nextCursor: number | null
}

/**
 * Fetches every page of a UC-API-01 keyset-paginated endpoint through this client (so callers
 * keep `HttpError`/`SessionExpiredError` handling) and concatenates them, so a caller built
 * against the pre-pagination "one array" contract needs no changes. `buildQuery` receives the
 * cursor to fetch after (`undefined` for the first page).
 *
 * Accepts a bare array too: UC-API-01's `{ items, nextCursor }` shape ships per endpoint, not
 * all at once, so a caller cannot assume every list endpoint has been migrated yet. Assuming the
 * paginated shape unconditionally is a hard `TypeError` (`.flatMap is not a function` and
 * similar) on any endpoint still answering a bare array - found the hard way on `DashboardView`,
 * whose own `/api/sale-files` read did exactly that.
 */
export async function getAllPages<T>(
  path: string,
  buildQuery?: (after?: number) => Query | undefined,
): Promise<T[]> {
  const items: T[] = []
  let after: number | undefined

  for (;;) {
    // buildQuery is optional, but the cursor still has to reach the request somehow: a caller
    // that omits it against an endpoint answering a real, non-null nextCursor would otherwise
    // re-request page 1 forever (buildQuery?.(after) yields undefined every time), appending the
    // same items and never terminating - the exact failure mode the nextCursor == null check
    // below was meant to close.
    let query: Query | undefined
    if (buildQuery) {
      query = buildQuery(after)
    } else if (after === undefined) {
      query = undefined
    } else {
      query = { after }
    }
    const page = await get<KeysetPage<T> | T[]>(path, query)
    if (Array.isArray(page)) {
      items.push(...page)
      return items
    }
    items.push(...page.items)
    // Loose equality catches both `null` (the documented "no more pages" value) and a response
    // that omits nextCursor entirely (`undefined`) - either way there is nothing left to fetch.
    // A strict `=== null` check left `undefined` refetching page 1 forever.
    if (page.nextCursor == null) {
      return items
    }
    after = page.nextCursor
  }
}

/**
 * A request whose success body is not JSON (a file) or is one of several shapes (a 200 file or a
 * 202 job), so the caller gets the raw `Response` to branch on - with this client's 401/non-2xx
 * handling still applied (401 redirects and rejects with `SessionExpiredError`, anything else
 * non-2xx throws `HttpError`). The body of a failure is read into the error, so a 409/400/410
 * caller can still show the server's refusal text.
 */
export async function requestRaw(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(buildUrl(path), { ...init, credentials: 'include' })

  if (response.status === 401) {
    try {
      await authLogin()
    } catch (cause) {
      throw new HttpError(
        401,
        path,
        `The session expired and the redirect to sign in failed: ${String(cause)}`,
      )
    }

    throw new SessionExpiredError(path)
  }

  if (!response.ok) {
    throw new HttpError(response.status, path, await response.text().catch(() => ''))
  }

  return response
}
