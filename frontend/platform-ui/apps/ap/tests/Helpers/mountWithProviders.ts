/**
 * Helper function to mount Vue components with all necessary providers
 * (Router, Pinia, i18n, etc.)
 */

import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, Router } from 'vue-router'
import { createI18n, I18n } from 'vue-i18n'
import { vi } from 'vitest'

interface MountOptions {
  props?: Record<string, any>
  slots?: Record<string, any>
  global?: {
    plugins?: any[]
    mocks?: Record<string, any>
    stubs?: Record<string, any>
    provide?: Record<string, any>
  }
  router?: Router
  i18n?: I18n
  shallow?: boolean
}

/**
 * Creates a test router with memory history
 */
export function createTestRouter(routes: any[] = []): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: routes.length > 0 ? routes : [
      { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
      { path: '/:pathMatch(.*)*', name: 'NotFound', component: { template: '<div>Not Found</div>' } }
    ]
  })
}

/**
 * Creates a test i18n instance
 */
export function createTestI18n(): I18n {
  return createI18n({
    legacy: false,
    locale: 'en',
    messages: {
      en: {},
      es: {}
    }
  })
}

/**
 * Mount a component with all providers (Router, Pinia, i18n)
 */
export function mountWithProviders(
  component: any,
  options: MountOptions = {}
): VueWrapper {
  const pinia = createPinia()
  setActivePinia(pinia)

  const router = options.router || createTestRouter()
  const i18n = options.i18n || createTestI18n()

  const defaultMocks = {
    $t: (key: string) => key,
    $tc: (key: string) => key,
    $te: () => true,
    $d: (date: Date) => date.toISOString()
  }

  const plugins = [pinia, router, i18n, ...(options.global?.plugins || [])]

  return mount(component, {
    props: options.props,
    slots: options.slots,
    global: {
      plugins,
      mocks: {
        ...defaultMocks,
        ...options.global?.mocks
      },
      stubs: options.global?.stubs || {},
      provide: options.global?.provide || {}
    },
    shallow: options.shallow || false
  })
}

/**
 * Mock Apollo Client for testing
 */
export function createMockApolloClient() {
  return {
    query: vi.fn().mockResolvedValue({ data: {} }),
    mutate: vi.fn().mockResolvedValue({ data: {} }),
    subscribe: vi.fn().mockReturnValue({
      subscribe: vi.fn()
    }),
    watchQuery: vi.fn().mockReturnValue({
      subscribe: vi.fn()
    })
  }
}

/**
 * Flush all pending promises
 */
export async function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/**
 * Wait for a specific amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

