import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchCustomAttributes, type CustomAttributeDefinition } from '@/api'
import { useLoadToken } from '@/composables/useLoadToken'

/**
 * The tenant's custom-attribute schema (title/dataType/hasData per ordinal) for the active sale
 * file version. Loaded once by Navbar.vue - which awaits it before setting
 * layoutStore.setSessionValidated(true), so LayoutView never routes into a module before this
 * has had a chance to resolve - and reloaded whenever the active company or sale file changes.
 * Any module that needs this (e.g. Match's "Custom Attributes" column group) reads this store
 * instead of calling the API itself, so the same fetch isn't repeated per module.
 */
export const useCustomAttributesStore = defineStore('ar-custom-attributes', () => {
  const definitions = ref<CustomAttributeDefinition[]>([])
  const loading = ref(false)
  const loadedVersionId = ref<number | null>(null)

  // Guards against a stale response landing after a fresher one - see `load()`'s own doc for why
  // that matters here specifically.
  const { start, isStale } = useLoadToken()
  // The in-flight request for `loadedVersionId`, if any. A duplicate `load()` call for the same
  // version awaits THIS instead of resolving immediately: Navbar.vue can call `load()` for the
  // same version from two places in the same tick (the explicit await in loadSpendFiles, and the
  // selectedSpendFile watcher its own preselection triggers) - resolving the second call
  // immediately let it open layoutStore's session-validated gate before the real fetch the first
  // call kicked off had actually landed.
  let pendingLoad: Promise<boolean> | null = null

  /**
   * Resolves true/false for "did the fetch succeed" rather than throwing - Navbar's
   * loadSpendFiles awaits this before letting the session-validated gate open, and one bad
   * response from this endpoint should not be able to strand the whole app on the loading screen.
   */
  async function load(versionId: number | null): Promise<boolean> {
    if (versionId === loadedVersionId.value) {
      return pendingLoad ?? true
    }

    const token = start()
    loadedVersionId.value = versionId

    if (versionId === null) {
      pendingLoad = null
      definitions.value = []
      return true
    }

    loading.value = true

    const request = (async (): Promise<boolean> => {
      try {
        const result = await fetchCustomAttributes(versionId)

        if (isStale(token)) {
          // A newer call has since taken over; that call owns `definitions`/`loading` now.
          return false
        }

        definitions.value = result
        return true
      } catch {
        if (isStale(token)) {
          return false
        }

        definitions.value = []
        return false
      } finally {
        if (!isStale(token)) {
          loading.value = false
          pendingLoad = null
        }
      }
    })()

    pendingLoad = request
    return request
  }

  /**
   * Sign-out (UC-ENT-09): the tenant's own schema must not still be readable if the same browser
   * signs in as somebody else. Bumps the load token too, so a request already in flight cannot
   * land afterwards and repopulate `definitions` out from under the sign-out.
   */
  function clear(): void {
    start()
    definitions.value = []
    loading.value = false
    loadedVersionId.value = null
    pendingLoad = null
  }

  return { definitions, loading, loadedVersionId, load, clear }
})
