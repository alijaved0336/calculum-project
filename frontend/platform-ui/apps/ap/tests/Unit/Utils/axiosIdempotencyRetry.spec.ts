/**
 * A spurious 401 (session was actually still valid) makes the response interceptor
 * replay the failed request via axiosInstance(error.config). That replay re-enters the
 * request interceptor, which must NOT mint a new idempotency key — otherwise the backend
 * sees two different `idk` values for what is meant to be one deduplicated write, and a
 * write that already landed before the spurious 401 gets applied a second time.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('@/utils/authWarningState', () => ({
  authWarningState: {
    hasShown401Warning: false,
    isRedirecting: false,
    isSessionStillValid: vi.fn().mockResolvedValue(true),
    handleAuthError: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('axiosInstance — idempotency key on revalidate-and-retry', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('reuses the original idk when retrying a request after a spurious 401', async () => {
    const { default: axiosInstance } = await import('@/utils/axios')

    const capturedKeys: unknown[] = []
    let callCount = 0
    axiosInstance.defaults.adapter = vi.fn((config) => {
      callCount += 1
      capturedKeys.push(config.headers['idk'])
      if (callCount === 1) {
        return Promise.reject({ config, response: { status: 401 }, message: 'Unauthorized' })
      }
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
    })

    await axiosInstance.post('/api/suppliers/1', { name: 'Acme' })

    expect(callCount).toBe(2)
    expect(capturedKeys[0]).toBeTruthy()
    expect(capturedKeys[1]).toBe(capturedKeys[0])
  })
})
