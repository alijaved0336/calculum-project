/**
 * Mock services for testing
 */

import { vi } from 'vitest'

/**
 * Mock Axios instance
 */
export function createMockAxios() {
  return {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    request: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: {
        use: vi.fn(),
        eject: vi.fn()
      },
      response: {
        use: vi.fn(),
        eject: vi.fn()
      }
    }
  }
}

/**
 * Mock Apollo Client
 */
export function createMockApolloClient() {
  return {
    query: vi.fn().mockResolvedValue({ data: {} }),
    mutate: vi.fn().mockResolvedValue({ data: {} }),
    subscribe: vi.fn().mockReturnValue({
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    }),
    watchQuery: vi.fn().mockReturnValue({
      subscribe: vi.fn(),
      refetch: vi.fn(),
      fetchMore: vi.fn()
    }),
    resetStore: vi.fn(),
    clearStore: vi.fn()
  }
}

/**
 * Mock Firebase
 */
export function createMockFirebase() {
  return {
    auth: vi.fn(() => ({
      currentUser: null,
      signInWithEmailAndPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChanged: vi.fn()
    })),
    database: vi.fn(() => ({
      ref: vi.fn(() => ({
        on: vi.fn(),
        off: vi.fn(),
        once: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        remove: vi.fn()
      }))
    })),
    storage: vi.fn(() => ({
      ref: vi.fn(() => ({
        put: vi.fn(),
        getDownloadURL: vi.fn()
      }))
    }))
  }
}

/**
 * Mock Vue Router
 */
export function createMockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    currentRoute: {
      value: {
        path: '/',
        name: 'home',
        params: {},
        query: {},
        meta: {}
      }
    },
    beforeEach: vi.fn(),
    afterEach: vi.fn()
  }
}

/**
 * Mock Pinia Store
 */
export function createMockStore(initialState: Record<string, any> = {}) {
  return {
    ...initialState,
    $patch: vi.fn(),
    $reset: vi.fn(),
    $subscribe: vi.fn(),
    $onAction: vi.fn()
  }
}

/**
 * Mock PostHog
 */
export function createMockPostHog() {
  return {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    isFeatureEnabled: vi.fn().mockReturnValue(false),
    onFeatureFlags: vi.fn(),
    getFeatureFlag: vi.fn()
  }
}

/**
 * Mock Toast Notification
 */
export function createMockToast() {
  return {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    clear: vi.fn()
  }
}

