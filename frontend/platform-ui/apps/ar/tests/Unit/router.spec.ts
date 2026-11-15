import { describe, it, expect } from 'vitest'
import { router } from '@/router'

describe('AR router', () => {
  it('registers the Main route at "/"', () => {
    const main = router.getRoutes().find((route) => route.name === 'Main')

    expect(main).toBeDefined()
    expect(main?.path).toBe('/')
  })

  it('registers the Ar parent route at "/" and redirects to Opportunity', () => {
    const parent = router.getRoutes().find((route) => route.name === 'Ar')

    expect(parent).toBeDefined()
    expect(parent?.path).toBe('/')
    expect(parent?.redirect).toEqual({ name: 'Opportunity' })
  })

  it('no longer registers the Dashboard or BuyersPreview routes', () => {
    const names = router.getRoutes().map((route) => route.name)

    expect(names).not.toContain('Dashboard')
    expect(names).not.toContain('BuyersPreview')
  })

  it('registers the Match route as a child of the parent route', () => {
    const match = router.getRoutes().find((route) => route.name === 'Match')

    expect(match).toBeDefined()
    expect(match?.path).toBe('/match')
  })

  it('does not mark the Match route as public', () => {
    const match = router.getRoutes().find((route) => route.name === 'Match')

    expect(match?.meta?.public).toBeUndefined()
  })

  it('registers the Signout route as public', () => {
    const signout = router.getRoutes().find((route) => route.name === 'Signout')

    expect(signout).toBeDefined()
    expect(signout?.path).toBe('/signout')
    expect(signout?.meta?.public).toBe(true)
  })

  it('registers the VersionProgress route with the version param (FE-05a)', () => {
    const versionProgress = router.getRoutes().find((route) => route.name === 'VersionProgress')

    expect(versionProgress).toBeDefined()
    expect(versionProgress?.path).toBe('/match/versions/:versionId')
  })

  it('does not mark the VersionProgress route as public', () => {
    const versionProgress = router.getRoutes().find((route) => route.name === 'VersionProgress')

    expect(versionProgress?.meta?.public).toBeUndefined()
  })

  it('registers the CustomerCard route with the version and buyer params (FE-06)', () => {
    const customerCard = router.getRoutes().find((route) => route.name === 'CustomerCard')

    expect(customerCard).toBeDefined()
    expect(customerCard?.path).toBe('/match/versions/:versionId/buyers/:buyerId')
  })

  it('does not mark the CustomerCard route as public', () => {
    const customerCard = router.getRoutes().find((route) => route.name === 'CustomerCard')

    expect(customerCard?.meta?.public).toBeUndefined()
  })

  it('registers the Buyers route as a child of the parent route (UC-UI-05)', () => {
    const buyers = router.getRoutes().find((route) => route.name === 'Buyers')

    expect(buyers).toBeDefined()
    expect(buyers?.path).toBe('/buyers')
  })

  it('does not mark the Buyers route as public', () => {
    const buyers = router.getRoutes().find((route) => route.name === 'Buyers')

    expect(buyers?.meta?.public).toBeUndefined()
  })

  it('registers the EntityCard route with the version, buyer and optional tab params (UC-UI-06)', () => {
    const entityCard = router.getRoutes().find((route) => route.name === 'EntityCard')

    expect(entityCard).toBeDefined()
    expect(entityCard?.path).toBe('/entity-card/versions/:versionId/buyers/:buyerId/:tab?')
  })

  it('does not mark the EntityCard route as public', () => {
    const entityCard = router.getRoutes().find((route) => route.name === 'EntityCard')

    expect(entityCard?.meta?.public).toBeUndefined()
  })
})
