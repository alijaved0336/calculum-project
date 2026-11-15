/**
 * The AR working context: which company the user is acting as, and which sale file version they
 * are looking at.
 *
 * There is a SINGLE active company per session, matching AP. Selecting a company therefore
 * invalidates the file and version beneath it: leaving a stale version id selected while the
 * company changes is how one tenant's screen ends up requesting another tenant's data. The backend
 * refuses it (TEN-03 filters every query by company, so the version simply is not found), but the
 * user sees an unexplained empty screen rather than a bug report.
 *
 * `MatchView` still keeps its own local refs. Moving it onto this store is a separate change.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface ArCompany {
  uuid: string
  name: string
}

/** UC-UI-05's roster presentation: a dense sortable grid, or a visual card layout. */
export type BuyersView = 'grid' | 'card'

export const useContextStore = defineStore(
  'ar-context',
  () => {
    const companyUuid = ref<string | null>(null)
    const companyName = ref<string | null>(null)
    const saleFileId = ref<number | null>(null)
    const saleFileVersionId = ref<number | null>(null)
    const saleFileVersionUuid = ref<string | null>(null)
    const periodEndDate = ref<string | null>(null)
    const periodStartDate = ref<string | null>(null)

    // UC-UI-05's Notes: "the presentation choice persists per user through the context store,
    // because an analyst who prefers one view prefers it every time." Grid by default - the
    // use case calls it out as "the least that can show it working" (UI-02's own reasoning),
    // and it is what a first-time user sees with nothing yet chosen.
    const buyersView = ref<BuyersView>('grid')

    // The navbar's buyer search (UC-UI-05): the term itself, plus a nonce bumped on every submit
    // so BuyersView's watcher fires even when the same term is searched twice in a row - a plain
    // `watch` on `buyersSearchQuery` alone would not, since Vue skips a watcher callback when the
    // watched value is unchanged, and "already on /buyers, just redo the request" (its whole
    // point) must not depend on the text having changed.
    const buyersSearchQuery = ref('')
    const buyersSearchNonce = ref(0)

    const hasCompany = computed(() => companyUuid.value !== null)
    const hasVersion = computed(() => saleFileVersionId.value !== null)

    function clearFile(): void {
      saleFileId.value = null
      saleFileVersionId.value = null
      saleFileVersionUuid.value = null
      // The period belongs to the FILE, not the company/session - left out of this reset it would
      // outlive the file it describes, including across `clear()` (sign-out, UC-ENT-09) where a
      // stale date from the previous tenant's file would otherwise still be readable.
      periodStartDate.value = null
      periodEndDate.value = null
    }

    function setCompany(company: ArCompany): void {
      if (companyUuid.value === company.uuid) {
        // Re-selecting the same company must not wipe the file the user is working on.
        return
      }

      companyUuid.value = company.uuid
      companyName.value = company.name
      clearFile()
    }

    function setSaleFile(id: number): void {
      if (saleFileId.value === id) {
        return
      }

      saleFileId.value = id
      saleFileVersionId.value = null
      saleFileVersionUuid.value = null
    }

    function setVersion(id: number, uuid: string): void {
      saleFileVersionId.value = id
      saleFileVersionUuid.value = uuid
    }

    function setPeriods(startDate: string | null,  endDate: string | null): void {
      periodStartDate.value = startDate
      periodEndDate.value = endDate      
    }

    function clear(): void {
      companyUuid.value = null
      companyName.value = null
      clearFile()
    }

    function setBuyersView(view: BuyersView): void {
      buyersView.value = view
    }

    /** Submits (or resubmits) the navbar's buyer search - always bumps the nonce, so a caller on
     * /buyers already gets its watcher re-fired even when the term itself did not change. */
    function submitBuyersSearch(query: string): void {
      buyersSearchQuery.value = query
      buyersSearchNonce.value += 1
    }

    return {
      //- Variables
      companyUuid,
      companyName,
      saleFileId,
      saleFileVersionId,
      saleFileVersionUuid,
      buyersView,
      buyersSearchQuery,
      buyersSearchNonce,
      hasCompany,
      hasVersion,
      periodStartDate,
      periodEndDate,
      //- Mutations
      setCompany,
      setSaleFile,
      setVersion,
      setBuyersView,
      submitBuyersSearch,
      clearFile,
      clear,
      setPeriods
    }
  },
  {
    /**
     * **Only `buyersView` is persisted — the company/file/version identity still is not, and
     * that must not regress (UC-ENT-19).**
     *
     * The company used to survive a reload, for a good reason: the browser was the only thing that
     * remembered one, and a refresh otherwise dropped the user back to "no company selected". The
     * file and version were deliberately left out, because the store only clears the file when the
     * company CHANGES and a reload is the one path where it does not — a restored company
     * short-circuits `setCompany` and a version id from a previous session survives into a new one.
     *
     * The server answers the question now. `/api/session/companies` reports the company the session
     * is scoped to and the picker preselects it, so a persisted copy is a second source for one
     * fact, and the only thing a second source can do is disagree. It could not while a user had
     * one receivables company; with two it can, and the disagreement is silent — the control
     * renders one company while every request is scoped to another.
     *
     * It also retires a disclosure this file used to carry: an AES-persisted company outlived the
     * session that created it, so signing out and back in as somebody else showed the previous
     * tenant's company name until the first request resolved. `clear()` on the sign-out path closed
     * that, and persisting nothing means there is no window left to close.
     *
     * `buyersView` carries none of that risk — it is a display preference, not tenant identity,
     * and `clear()` deliberately never touches it: signing out and back in as someone else must
     * not silently switch their roster from card to grid. `pick` is explicit rather than the
     * default (persist everything) so a field added to this store later starts UN-persisted,
     * matching the reasoning above, until a change deliberately opts it in the same way.
     *
     * Plain `localStorage`, not `@/services/pinia`'s AES-encrypted `secureStorage` every other
     * persisted AR/AP store uses: `buyersView` is the first thing this app persists that carries
     * no tenant or session data, so it does not need encrypting, and every other option here
     * (`useContextStore` is imported from the app's router, its guards, and most views) would
     * otherwise reach `services/pinia`'s `VITE_APP_STORAGE_SECRET` check on module load - turning
     * a display toggle into a hard dependency for every one of those callers, including this
     * store's own unit tests, which run with no such secret configured.
     *
     * `key: 'ar-context-prefs'`, deliberately NOT the store id (`'ar-context'`, this persist
     * config's own default key): the company this store used to AES-persist (see above) lived
     * under that same default key via `secureStorage`, and `secure-ls` does not namespace the
     * key it is given - a browser that still has that old ciphertext cached would have this
     * plain-JSON reader try to `JSON.parse` it. A distinct key sidesteps that collision rather
     * than relying on `secureStorage`'s own corrupted-storage recovery to paper over it.
     */
    persist: {
      storage: localStorage,
      key: 'ar-context-prefs',
      pick: ['buyersView'],
    },
  },
)
