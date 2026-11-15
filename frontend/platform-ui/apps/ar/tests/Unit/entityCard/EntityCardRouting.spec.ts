import { describe, it, expect, vi, afterEach } from 'vitest'
import { router } from '@/router'
import * as EntityCardRouting from '@/modules/entityCard/EntityCardRouting'

describe('EntityCardRouting.openEntityCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates with versionId and buyerId as route params and no tab segment by default', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    EntityCardRouting.openEntityCard(73, 36)

    expect(push).toHaveBeenCalledWith({
      name: 'EntityCard',
      params: { versionId: '73', buyerId: '36', tab: undefined },
      query: undefined,
    })
  })

  it('carries the tab as a route param when one is given, for a deep link to a specific tab', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    EntityCardRouting.openEntityCard(73, 36, 'corporate-tree')

    expect(push).toHaveBeenCalledWith({
      name: 'EntityCard',
      params: { versionId: '73', buyerId: '36', tab: 'corporate-tree' },
      query: undefined,
    })
  })
})

describe('EntityCardRouting.selectEntityCardTab', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('replaces rather than pushes, so switching tabs does not pile up back-button history', () => {
    const replace = vi.spyOn(router, 'replace').mockResolvedValue(undefined)

    EntityCardRouting.selectEntityCardTab(73, 36, 'company-details')

    expect(replace).toHaveBeenCalledWith({
      name: 'EntityCard',
      params: { versionId: '73', buyerId: '36', tab: 'company-details' },
    })
  })
})
