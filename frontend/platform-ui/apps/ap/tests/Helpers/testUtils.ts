/**
 * Common test utilities
 */

import { nextTick } from 'vue'
import { vi } from 'vitest'

/**
 * Flush all pending promises and Vue updates
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

/**
 * Wait for a specific amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  { timeout = 1000, interval = 50 } = {}
): Promise<void> {
  const startTime = Date.now()

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition')
    }
    await wait(interval)
  }
}

/**
 * Wait until an element is visible
 */
export async function waitForElement(
  getElement: () => HTMLElement | null,
  { timeout = 1000 } = {}
): Promise<HTMLElement> {
  const startTime = Date.now()

  while (true) {
    const element = getElement()
    if (element) {
      return element
    }

    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for element')
    }

    await wait(50)
  }
}

/**
 * Mock console methods
 */
export function mockConsole() {
  const originalConsole = { ...console }

  return {
    mock: () => {
      console.log = vi.fn()
      console.warn = vi.fn()
      console.error = vi.fn()
      console.info = vi.fn()
      console.debug = vi.fn()
    },
    restore: () => {
      console.log = originalConsole.log
      console.warn = originalConsole.warn
      console.error = originalConsole.error
      console.info = originalConsole.info
      console.debug = originalConsole.debug
    }
  }
}

/**
 * Create a deferred promise for testing async operations
 */
export function createDeferred<T = any>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: any) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

/**
 * Mock Date.now() for testing time-dependent code
 */
export function mockDateNow(timestamp: number) {
  const original = Date.now
  Date.now = vi.fn(() => timestamp)

  return {
    restore: () => {
      Date.now = original
    }
  }
}

/**
 * Trigger a DOM event on an element
 */
export function triggerEvent(element: HTMLElement, eventType: string, options = {}) {
  const event = new Event(eventType, { bubbles: true, cancelable: true, ...options })
  element.dispatchEvent(event)
}

/**
 * Get text content from an element, normalized
 */
export function getTextContent(element: HTMLElement | null): string {
  if (!element) return ''
  return element.textContent?.trim().replace(/\s+/g, ' ') || ''
}

