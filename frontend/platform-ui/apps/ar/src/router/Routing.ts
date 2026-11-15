import { router } from '@/router'

export const route = (name: string, params?: any, query?: Record<string, string>) => {
  // Only include `params`/`query` when the caller actually passed them - an explicit
  // `query: undefined` in the pushed location still overrides whatever query the target would
  // otherwise carry, dropping it instead of leaving it alone.
  router.push({
    name,
    ...(params !== undefined && { params }),
    ...(query !== undefined && { query }),
  })
}
