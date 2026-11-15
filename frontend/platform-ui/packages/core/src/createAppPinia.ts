import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import SecureLS from 'secure-ls'

interface PiniaCleanupConfig {
  maxAgeMs?: number
  intervalMs?: number
}

interface PiniaConfig {
  storageSecret: string
  encryptionNamespace?: string
  debug?: boolean
  /** Keys that may still hold plain-JSON data from a pre-SecureLS fallback; removed once so SecureLS can own them. */
  legacyPlainJsonKeys?: string[]
  /** Periodically evict persisted keys older than maxAgeMs. Pass `true` for defaults (7 days / checked hourly). */
  cleanup?: boolean | PiniaCleanupConfig
  /** Expose the Pinia instance on globalThis under this key, for dev tooling (e.g. a memory monitor). */
  exposeOnGlobal?: string
}

const DEFAULT_CLEANUP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000

export function createAppPinia({
  storageSecret,
  encryptionNamespace = 'ada-pinia',
  debug = false,
  legacyPlainJsonKeys = [],
  cleanup = false,
  exposeOnGlobal,
}: PiniaConfig) {
  const ls = new SecureLS({
    encodingType: 'aes',
    isCompression: false,
    encryptionSecret: storageSecret || 'default-secret',
    encryptionNamespace,
  })

  // One-time migration: drop stale plain-JSON keys left by a pre-SecureLS fallback so SecureLS can own them.
  if (legacyPlainJsonKeys.length) {
    const migrationKey = `__${encryptionNamespace}_legacy_migration_v1__`
    if (!localStorage.getItem(migrationKey)) {
      try {
        for (const key of legacyPlainJsonKeys) {
          const raw = localStorage.getItem(key)
          if (!raw) continue
          try {
            JSON.parse(raw)
            // Parsed as plain JSON → written by the fallback, not SecureLS → safe to drop
            localStorage.removeItem(key)
          } catch {
            // Not plain JSON — SecureLS already owns it, leave it alone
          }
        }
      } catch { /* ignore */ }
      localStorage.setItem(migrationKey, '1')
    }
  }

  // Verify storage health on boot; clear if corrupted
  try {
    const testKey = '__ada_storage_test__'
    ls.set(testKey, 'ok')
    ls.get(testKey)
    ls.remove(testKey)
  } catch {
    if (debug) console.warn('[ada/core] Corrupted secure storage — clearing localStorage')
    localStorage.clear()
  }

  const secureStorage = {
    getItem(key: string) {
      try {
        return ls.get(key)
      } catch {
        try { ls.remove(key) } catch {}
        try { return localStorage.getItem(key) } catch { return null }
      }
    },
    setItem(key: string, value: any) {
      try {
        ls.set(key, value)
      } catch {
        try { localStorage.setItem(key, value) } catch {}
      }
    },
    removeItem(key: string) {
      try {
        ls.remove(key)
      } catch {
        try { localStorage.removeItem(key) } catch {}
      }
    },
  }

  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)

  if (exposeOnGlobal) {
    (globalThis as any)[exposeOnGlobal] = pinia
  }

  // Force-flush all persisted stores on page unload so in-flight $subscribe writes aren't lost.
  const GUARD_KEY = '__ADA_PINIA_BEFOREUNLOAD_REGISTERED__'
  if (!(globalThis as any)[GUARD_KEY]) {
    window.addEventListener('beforeunload', () => {
      const storeMap = (pinia as any)._s as Map<string, any> | undefined
      storeMap?.forEach(store => {
        if (typeof store.$persist === 'function') store.$persist()
      })
    })
    ;(globalThis as any)[GUARD_KEY] = true
  }

  // Periodically evict persisted keys whose payload timestamp is older than maxAgeMs.
  if (cleanup) {
    const { maxAgeMs = DEFAULT_CLEANUP_MAX_AGE_MS, intervalMs = DEFAULT_CLEANUP_INTERVAL_MS } =
      cleanup === true ? {} : cleanup
    const prefix = `${encryptionNamespace}_`
    const runCleanup = () => {
      try {
        for (const key of Object.keys(localStorage)) {
          if (!key.startsWith(prefix)) continue
          try {
            const item = localStorage.getItem(key)
            if (!item) continue
            const data = JSON.parse(item)
            if (data.timestamp && Date.now() - data.timestamp > maxAgeMs) {
              localStorage.removeItem(key)
              if (debug) console.log(`[ada/core] Cleaned old Pinia storage item: ${key}`)
            }
          } catch {
            localStorage.removeItem(key)
          }
        }
      } catch { /* ignore */ }
    }
    setInterval(runCleanup, intervalMs)
  }

  // Debug helpers for inspecting/testing/clearing specific persisted keys (dev tooling only).
  const debugStorage = (keys: string[]) => {
    if (!debug) return
    console.log('🔍 Debugging Pinia Storage...')
    for (const key of keys) {
      try {
        const data = ls.get(key)
        if (data) {
          console.log(`📦 ${key}: ${(JSON.stringify(data).length / 1024).toFixed(2)}KB`, data)
        } else {
          console.log(`❌ ${key}: Not found`)
        }
      } catch (error) {
        console.error(`❌ Error reading ${key}:`, error)
      }
    }
  }

  const clearStorage = (keys: string[]) => {
    for (const key of keys) {
      try {
        ls.remove(key)
      } catch (error) {
        console.error(`❌ Error clearing ${key}:`, error)
      }
    }
  }

  const testSecureStorage = () => {
    try {
      const testKey = 'test-secure-ls'
      const testData = { test: 'data', timestamp: Date.now() }
      ls.set(testKey, testData)
      const retrieved = ls.get(testKey)
      const ok = JSON.stringify(retrieved) === JSON.stringify(testData)
      ls.remove(testKey)
      return ok
    } catch (error) {
      console.error('❌ SecureLS test failed:', error)
      return false
    }
  }

  return { pinia, secureStorage, debugStorage, clearStorage, testSecureStorage }
}
