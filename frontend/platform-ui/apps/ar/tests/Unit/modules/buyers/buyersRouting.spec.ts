import { afterEach, describe, expect, it, vi } from 'vitest'
import { router } from '@/router'
import * as BuyersRouting from '@/modules/buyers/BuyersRouting'

describe('BuyersRouting.openBuyers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates to Buyers with no params or query - the version comes from the context store', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    BuyersRouting.openBuyers()

    expect(push).toHaveBeenCalledWith({ name: 'Buyers', params: undefined, query: undefined })
  })
})
