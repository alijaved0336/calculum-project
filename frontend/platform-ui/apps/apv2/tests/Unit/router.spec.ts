import { describe, it, expect } from 'vitest'
import { router } from '@/router'

describe('DB router', () => {
  it('registers the Main route at "/"', () => {
    const main = router.getRoutes().find((route) => route.name === 'Main')
    expect(main).toBeDefined()
    expect(main?.path).toBe('/')
  })

  it('registers the Apv2 parent route at "/" and redirects to Home', () => {
    const parent = router.getRoutes().find((route) => route.name === 'Apv2')
    expect(parent).toBeDefined()
    expect(parent?.path).toBe('/')
    expect(parent?.redirect).toEqual({ name: 'Home' })
  })

  it('registers the Home route as a child of the parent route', () => {
    const home = router.getRoutes().find((route) => route.name === 'Home')
    expect(home).toBeDefined()
    expect(home?.path).toBe('/home')
  })

  it('registers the Signout route as public', () => {
    const signout = router.getRoutes().find((route) => route.name === 'Signout')
    expect(signout).toBeDefined()
    expect(signout?.path).toBe('/signout')
    expect(signout?.meta?.public).toBe(true)
  })

  it('does not mark the Home route as public', () => {
    const home = router.getRoutes().find((route) => route.name === 'Home')
    expect(home?.meta?.public).toBeUndefined()
  })
})
