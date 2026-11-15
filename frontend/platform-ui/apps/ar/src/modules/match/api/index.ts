/**
 * Re-exports the AR API client. This module used to carry its own copy of the client — see
 * handling in `src/api/http.ts` uses, or the next endpoint added) would silently not reach this
 * one unless someone remembered to apply it twice. One client, one place to fix it.
 */
export * from '@/api'
