<template>
<header class="user-topbar full-container">
    <div class="topbar-container">
        <div class="d-flex align-items-center row">
            <!--
              Mobile (<768px): logo, search and the hamburger toggle stay on one row - `display:
              contents` here keeps this wrapper invisible to the `.row`/`.col-md-*` grid at md+, so
              desktop layout is unaffected; the mobile media query below turns it into the actual
              flex row.
            -->
            <div class="navbar-top-row">
                <div class="col-md-2 col-lg-2 px-2 navbar-logo-col">
                    <a class="link--image ms-4" href="/"><img class="user-topbar-logo" :src="'https://cdn.prod.website-files.com/694baf030fd2cf0ad0d483b2/6968abe5e1d1065590d01e75_preloader-logo%402x.webp'" alt="Company Logo"/></a>
                </div>

                <div class="col-md-3 col-lg-3 navbar-search-col">
                    <label class="small dropdown-label text-capitalize navbar-search-label">{{ $t('button.search') }}</label>
                    <!--
                      The Enter handler sits on this wrapper, not on `<TextInput>` itself: the
                      real `<input>` Kendo renders is two component layers down (TextInput ->
                      Kendo's own Input), and a native `keydown` bubbles up through all of them
                      regardless of how each layer forwards its own component events - simpler and
                      more reliable than chaining `@keydown` through each wrapper's `emits`.
                    -->
                    <div class="buyer-search position-relative" @keydown.enter="onBuyerSearchSubmit">
                        <i class="fa-solid fa-magnifying-glass buyer-search-icon buyer-search-icon--start" aria-hidden="true"></i>
                        <TextInput
                            v-model="buyerSearch"
                            class="buyer-search-input"
                            :placeholder="$t('arMatch.navbar.buyerSearchPlaceholder')"
                        />
                        <button
                            v-if="buyerSearch"
                            type="button"
                            class="buyer-search-clear"
                            :aria-label="$t('arMatch.navbar.buyerSearchClear')"
                            @click="clearBuyerSearch"
                        >
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>

                <!--
                  Kept out of `.navbar-collapsible` and in the always-visible top row instead - on
                  mobile the account menu needs to stay reachable without opening the hamburger
                  panel first, right next to the toggle that opens it. `order` (below) is what
                  keeps it in its original rightmost desktop position despite moving here in the
                  DOM.
                -->
                <div class="col-md-2 col-lg-2 d-flex mt-1 user-menu px-4 navbar-usermenu-col">
                    <UserMenu />
                </div>

                <!-- Hidden at md+ (the options below render inline there); reveals the rest of the navbar on mobile. -->
                <button
                    type="button"
                    class="navbar-mobile-toggle"
                    :aria-expanded="isMobileMenuOpen"
                    :aria-label="$t('arMatch.navbar.toggleMenu')"
                    @click="toggleMobileMenu"
                >
                    <i class="fa-solid" :class="isMobileMenuOpen ? 'fa-xmark' : 'fa-bars'" aria-hidden="true"></i>
                </button>
            </div>

            <!--
              Mobile: collapsed behind the hamburger toggle above until opened, then stacks full
              width below the top row. Desktop: `display: contents` again, so these columns lay
              out exactly as before, directly against `.row`.
            -->
            <div class="navbar-collapsible" :class="{ 'is-open': isMobileMenuOpen }">
                <div class="col-md-2 col-lg-2 d-flex flex-column position-relative">
                    <!--
                      SearchableDropdown renders its own <label> internally (its `label` prop) -
                      using that instead of a separate external <label> here, since an external one
                      has nothing to associate `for`/`id` with (the component exposes no id prop for
                      its focusable elements) and static accessibility analysis correctly flags an
                      unassociated label every time.
                    -->
                    <!--
                      NOT v-model, deliberately (UC-ENT-19). Two-way binding would move the control the
                      instant it is clicked, before the server has agreed — and a refused switch would
                      then have to be undone by writing the old value back, which re-enters the same
                      handler. One-way, the control renders where the SESSION is: it moves when the
                      switch lands and simply never moves when it does not.
                    -->
                    <SearchableDropdown
                        :model-value="selectedCompany"
                        :label="$t('home.components.navbar.topMenu.company')"
                        :items="companies"
                        :disabled="isSwitchingCompany"
                        placeholder="Select company"
                        search-placeholder="Search company..."
                        @update:model-value="selectCompany"
                    />
                    <!--
                      Absolutely positioned so it never adds height to this column - this column and
                      the sale-file column next to it sit in an align-items-center row, so any extra
                      height here (whenever there's an error) would shift every other column's
                      vertical centering, including the sale-file dropdown next door.
                    -->
                    <span class="text-danger small company-error ms-3">{{ companyError ? $t(companyError) : '' }}</span>
                </div>

                <div class="col-md-2 col-lg-2 d-flex flex-column">
                    <!--
                      Was `topMenu.company` here too (copy-paste from AP's navbar, never corrected) -
                      this is the sale-file selector, not a second company picker.
                    -->
                    <!--
                      Not SearchableDropdown's own internal `label` prop here (unlike Company/
                      Currency next to it): AP's equivalent label carries the file's covered period
                      on its right half, right-aligned above the dropdown, and that component has
                      no slot for a second piece of content next to its label. `.label-topbar` is
                      the class already reserved for this exact AP-parity label (`_ap-parity.scss`),
                      so this is a relocation of the same single label, not a second one.
                    -->
                    <label class="label-topbar d-flex align-items-center justify-content-between">
                        <span>{{ $t('arMatch.navbar.saleFile') }}</span>
                        <span
                            v-if="spendFileDateRangeLabel"
                            class="text-truncate ms-1"
                            :title="spendFileDateRangeLabel"
                        >{{ spendFileDateRangeLabel }}</span>
                    </label>
                    <SearchableDropdown
                        v-model="selectedSpendFile"
                        :items="spendFiles"
                        placeholder="Select spendfile"
                        search-placeholder="Search spendfile..."
                    />
                </div>

                <div class="col-md-1 col-lg-1">
                    <SearchableDropdown
                        :model-value="selectedCurrency"
                        :label="$t('arMatch.navbar.currency')"
                        :items="currencies"
                        :most-used-values="mostUsedCurrencyCodes"
                        :most-used-label="$t('arMatch.navbar.mostUsedCurrencies')"
                        :all-label="$t('arMatch.navbar.allCurrencies')"
                        placeholder="Select currency"
                        search-placeholder="Search currency..."
                        @update:model-value="selectCurrency"
                    />
                </div>
            </div>
        </div>
    </div>
</header>



</template>

<script lang="ts">
import { defineComponent, onMounted, ref, computed, watch } from 'vue'
import { SearchableDropdown, TextInput } from '@ada/design-system'
import { useSession, authLogin } from '@ada/auth'
import { useLayoutStore } from '@/stores/layout'
import { useArCurrentUserStore } from '@/stores/arCurrentUser'
import { useContextStore } from '@/stores/context'
import { useCustomAttributesStore } from '@/stores/customAttributes'
import { fetchSaleFilesByCompany, type CompanySaleFileVersionDto, type SwitchableCompany } from '@/api'
import { useLoadToken } from '@/composables/useLoadToken'
import { useCompanyPicker } from '@/composables/useCompanyPicker'
import { useArCurrencies } from '@/composables/useArCurrencies'
import { toUSDate } from '@/utils/dateFormatting'
import * as BuyersRouting from '@/modules/buyers/BuyersRouting'
import UserMenu from '@/components/UserMenu.vue'

export default defineComponent({
    name: 'ARNabvar',
    components: { SearchableDropdown, TextInput, UserMenu },
    setup() {
        const layoutStore = useLayoutStore()
        const arCurrentUserStore = useArCurrentUserStore()
        const customAttributesStore = useCustomAttributesStore()
        // The dropdowns below drive this store, not arCurrentUserStore: this is the one every
        // real data view (DashboardView, CustomerCardView) actually reads. Wiring them to
        // arCurrentUserStore instead was the bug - selecting a company/file updated state
        // nothing else looked at, so nothing visibly changed and nothing was notified.
        const context = useContextStore()
        const { isAuthenticated, fetchSession, session } = useSession()

        const spendFiles = ref<CompanySaleFileVersionDto[]>([])

        const buyerSearch = ref('')
        function clearBuyerSearch(): void {
            buyerSearch.value = ''
            // Without this, clearing the input only reset the local ref: the store's
            // `buyersSearchQuery` (and BuyersView's card roster) kept showing the last searched
            // term until the analyst typed something new and pressed Enter again.
            context.submitBuyersSearch('')
        }

        /**
         * Enter in the navbar search always sends the analyst to /buyers, card view (UC-UI-05):
         * `submitBuyersSearch` is what BuyersView watches to (re)run the search, whether this is
         * a fresh navigation there or the analyst is already on the page and searching again -
         * `router.push` to the route it's already on is a no-op in Vue Router 4, so this same
         * call covers both cases without branching on the current route.
         *
         * An empty (or fully cleared) query still goes through this same path rather than being
         * skipped: pressing Enter after deleting the text is how an analyst re-runs the roster
         * unfiltered, same as clicking the clear button, and it must still reset the store even
         * when there is nothing left to trim.
         */
        function onBuyerSearchSubmit(): void {
            const query = buyerSearch.value.trim()

            context.setBuyersView('card')
            context.submitBuyersSearch(query)
            BuyersRouting.openBuyers()
        }

        const isMobileMenuOpen = ref(false)
        function toggleMobileMenu(): void {
            isMobileMenuOpen.value = !isMobileMenuOpen.value
        }

        // Local to this component: the dropdown's v-model needs a plain string, and the source
        // of truth for what that string MEANS (which file it resolves to) is `context`.
        const selectedSpendFile = ref('')

        // The company half is the composable's, because since UC-ENT-19 it is not local state at
        // all: the session owns which company is active, and selecting one is a request that can
        // be refused. `applyCompany` is what happens once the server has agreed.
        const picker = useCompanyPicker({ onSwitched: onCompanySwitched })

        // The currency picker is a display preference with its own catalog, unrelated to which
        // company/session is active - loaded independently of `picker` below rather than gated
        // behind it.
        const { currencies, selectedCurrency, loadCurrencies, mostUsedCurrencyCodes, selectCurrency: applyCurrencySelection } = useArCurrencies()

        /**
         * Gates the session-validated flag around the currency conversion request, the same
         * false-before/true-after-regardless shape `loadSpendFiles` and the `selectedSpendFile`
         * watcher below both already use for their own async step - closing it here as well stops
         * a module from reading `context`/a stale rate while a currency switch is still in flight.
         *
         * The `finally` is what makes this "regardless of whether the api responds well or badly":
         * `applyCurrencySelection` itself never throws (a failed conversion makes no store change
         * and resolves normally - see its own doc), but the gate still has to reopen through
         * whichever way this settles, not only the success path.
         */
        async function selectCurrency(code: string): Promise<void> {
            layoutStore.setSessionValidated(false)
            try {
                await applyCurrencySelection(code)
            } finally {
                layoutStore.setSessionValidated(true)
            }
        }

        const companyOptions = computed(() =>
            picker.companies.value.map((company) => ({ value: company.uuid, label: company.name })),
        )

        // Each row is one VERSION (`/sale-file-versions` is flat, not files-with-nested-versions -
        // see CompanySaleFileVersionDto), and the same file name reappears once per re-upload, so
        // the version number has to be in the label or the list reads as duplicate entries.
        const spendFileOptions = computed(() =>
            spendFiles.value.map((file) => ({
                value: file.uuid,
                label: `${file.saleFileName} (v${file.version})`,
            })),
        )

        // The period the selected sale file covers, shown above the dropdown exactly where AP
        // shows its own Spend File version's date range - empty (nothing rendered) whenever
        // either date is missing, same as no file/version being selected yet.
        const spendFileDateRangeLabel = computed(() => {
            if (!context.periodStartDate || !context.periodEndDate) return ''
            return `${toUSDate(context.periodStartDate)} - ${toUSDate(context.periodEndDate)}`
        })

        // Guards loadSpendFiles against a slower, stale response landing after a fresher one -
        // switching companies twice in quick succession gives no guarantee the first request's
        // response arrives first.
        const { start: startSpendFilesLoad, isStale: isSpendFilesLoadStale } = useLoadToken()

        // The endpoint already scopes `versions` to the given company (TEN-03), so there is no
        // client-side filtering to do here - unlike the old `fetchSaleFiles()` + filter-by-companyId
        // approach, every row this resolves to belongs to `companyUuid` already.
        async function loadSpendFiles(companyUuid: string) {
            const token = startSpendFilesLoad()
            const versions = companyUuid ? await fetchSaleFilesByCompany(companyUuid).catch(() => []) : []
            if (isSpendFilesLoadStale(token)) {
                // A newer company selection has started loading since this one; that call owns
                // spendFiles/selectedSpendFile now.
                return
            }

            spendFiles.value = versions

            const preselectedVersion = versions[0]
            const preselectedUuid = preselectedVersion?.uuid ?? ''
            if (preselectedUuid === selectedSpendFile.value) {
                // No-op assignment (the company has no versions, so preselectedUuid is '',
                // matching selectedSpendFile's own initial/prior value): watch(selectedSpendFile)
                // below never fires for an unchanged value, so it would never call clearFile()
                // and context would keep a stale saleFileId/saleFileVersionId from the previous
                // company. Clear it explicitly instead of relying on the watcher.
                context.clearFile()
            } else {
                selectedSpendFile.value = preselectedUuid
            }

            // Resolved directly from `preselectedVersion` (not read back from `context`) since
            // the watch(selectedSpendFile) below - which is what actually calls
            // context.setVersion - fires asynchronously and would not have run yet. Awaited
            // regardless of success/failure (see customAttributesStore.load's own doc) so every
            // module's "Custom Attributes" column state is ready before the screen renders.
            await customAttributesStore.load(preselectedVersion?.id ?? null)
            layoutStore.setSessionValidated(true)
        }

        /**
         * Everything that follows the session having moved. Called after the switch lands, and on
         * mount for the company the session is already in — the two need to leave the screen in
         * the same state, and doing that twice in two places is how they stop being the same.
         *
         * `id` is no longer carried: the switchable list is keyed by uuid, which is what the
         * session and every endpoint the views call speak. Nothing read `context.companyId`.
         */
        async function applyCompany(company: SwitchableCompany): Promise<void> {
            layoutStore.setSessionValidated(false)
            context.setCompany({ uuid: company.uuid, name: company.name })
            await loadSpendFiles(company.uuid)
        }

        /**
         * A switch the server has agreed to. The session's own per-company answers (the `roles`
         * the export permissions are derived from) were resolved for the company it just
         * left, and nothing reloads the page, so the session is read again BEFORE the screen
         * reloads for the new company - otherwise its grids keep offering (or hiding) Export Excel
         * by the previous company's rights until the next sign-in. The mount path needs none of
         * this: it reads the session itself right before `applyCompany`.
         *
         * A failed re-read keeps the user it had rather than signing anybody out: the switch itself
         * succeeded, the flags are a UI convenience, and the export routes enforce the real
         * permission (a 403 the export status line reports as such).
         */
        async function onCompanySwitched(company: SwitchableCompany): Promise<void> {
            if (await fetchSession()) {
                arCurrentUserStore.setUser(session.value)
            }
            await applyCompany(company)
        }

        watch(selectedSpendFile, async (uuid) => {
            const file = spendFiles.value.find((f) => f.uuid === uuid)
            if (file) {
                context.setSaleFile(file.saleFileId)
                context.setVersion(file.id, file.uuid)
                context.setPeriods(file.periodStartDate, file.periodEndDate)
            } else {
                context.clearFile()
            }

            // Covers a sale-file switch on its own (company unchanged) - the company-switch path
            // already awaits this same call directly in loadSpendFiles; customAttributesStore.load
            // no-ops here when it's for the same version, so this never doubles that request.
            // Gated behind setSessionValidated the same way loadSpendFiles gates the initial load,
            // so a module never renders against a custom-attribute schema mid-reload.
            layoutStore.setSessionValidated(false)
            await customAttributesStore.load(file?.id ?? null)
            layoutStore.setSessionValidated(true)
        })

        onMounted(async () => {
            // Fire-and-forget, and deliberately the FIRST thing this does: the currency catalog
            // needs no session/backend at all, so it must not sit behind (or be able to be broken
            // by) the auth/session-validated flow below - an early return on a failed session
            // check, or an exception fetchSession itself throws, must never be able to leave this
            // never called and the dropdown stuck empty.
            void loadCurrencies()

            // Reset on every mount so stale content never shows before this run's checks pass.
            layoutStore.setSessionValidated(false)

            const sessionOk = isAuthenticated.value || (await fetchSession())
            if (!sessionOk) {
                await authLogin()
                return
            }

            arCurrentUserStore.setUser(session.value)

            // Guarantees the gate opens on every path below, including a thrown error - it must
            // never stay false forever, which is what happened before this `try/finally`: neither
            // the "no active company" early return nor an error from `applyCompany` reached the
            // `setSessionValidated(true)` that used to sit only at the end of `loadSpendFiles`.
            try {
                // The SERVER decides which company is selected here (UC-ENT-19). This used to prefer
                // `context.companyUuid`, restored from localStorage, falling back to the first row --
                // which was right while a user had one receivables company and the two could not
                // disagree. With two they can, and the disagreement is silent: the control renders one
                // company while every request is scoped to another. The browser no longer keeps a
                // second opinion at all; `context.ts` stopped persisting it.
                await picker.load()

                const active = picker.companies.value.find(
                    (company) => company.uuid === picker.selected.value,
                )

                if (active === undefined) {
                    // No companies, the listing failed, or the session sits in a company that is no
                    // longer switchable -- the picker renders it selected and this leaves the screen
                    // with no company rather than quietly adopting a different one.
                    context.clear()
                    return
                }

                await applyCompany(active)
            } finally {
                layoutStore.setSessionValidated(true)
            }
        })

        return {
            buyerSearch,
            clearBuyerSearch,
            onBuyerSearchSubmit,
            isMobileMenuOpen,
            toggleMobileMenu,
            companies: companyOptions,
            spendFiles: spendFileOptions,
            currencies,
            selectedCurrency,
            mostUsedCurrencyCodes,
            selectCurrency,
            selectedCompany: picker.selected,
            selectCompany: picker.select,
            companyError: picker.error,
            // Disabled while a switch and its reload are in flight. The composable refuses an
            // overlapping selection anyway; this is what stops the user making one and wondering
            // why nothing happened.
            isSwitchingCompany: picker.isSwitching,
            selectedSpendFile,
            spendFileDateRangeLabel,
        }
    }
})
</script>

<style scoped>
/*
  Desktop only: Bootstrap 4's default gutter (15px padding each side of every `.col-md-*`, 30px
  between adjacent fields) reads as cramped now that Search/Company/Sales File all render as
  bordered controls rather than plain text - widened here rather than by raising
  `$grid-gutter-width` globally, which would also re-space every other `.row` in the app.
  `min-width: 768px` matches the `.col-md-*` breakpoint these columns already use, so this leaves
  the (separately tuned) mobile top row alone.

  Targets `.navbar-top-row`/`.navbar-collapsible`'s own direct children, not `.row > .col-*`:
  those two wrappers sit between `.row` and the actual columns in the DOM (their `display:
  contents` only removes their own box from rendering, not their place in the tree), so a
  selector anchored on `.row` needs to reach through them - as a direct-child combinator this
  stays scoped to exactly these known columns, rather than every "col-"-classed element at any
  depth inside them.
*/
@media (min-width: 768px) {
    .navbar-top-row > [class*="col-"],
    .navbar-collapsible > [class*="col-"] {
        padding-left: 1.25rem;
        padding-right: 1.25rem;
    }
}

.company-error {
    position: absolute;
    top: 100%;
    left: 0;
    white-space: nowrap;
}

.buyer-search {
    width: 100%;
}

.buyer-search-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: #6c757d;
    pointer-events: none;
    z-index: 1;
}

.buyer-search-icon--start {
    left: 0.75rem;
}

/*
  The Kendo Input this wraps renders as a bare native <input> (no wrapping span) when it has no
  `label`, so its class attribute lands directly on that <input> rather than on any element
  rendered by this component's own template - :deep() is what reaches across that boundary.

  Border/radius/hover match SearchableDropdown.vue's `.custom-searchable-dropdown` so the two
  navbar controls read as one family rather than two different input styles side by side.
*/
.buyer-search :deep(.buyer-search-input) {
    width: 100%;
    min-height: 38px;
    padding-left: 2.25rem;
    padding-right: 2.25rem;
    border: 1px solid #ced4da;
    border-radius: 8px;
    background: white;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.buyer-search:hover :deep(.buyer-search-input:not(:disabled)) {
    border-color: #000000;
}

.buyer-search-clear {
    position: absolute;
    top: 50%;
    right: 0.75rem;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    padding: 0;
    color: #6c757d;
    cursor: pointer;
}

.buyer-search-clear:hover {
    color: var(--color-gray-700, #455a64);
}

/*
  Desktop: both wrappers stay out of the box tree entirely, so `.row`'s direct `.col-md-*`
  children lay out exactly as if the wrappers weren't there. Only the mobile media query below
  turns them into real flex containers.
*/
.navbar-top-row,
.navbar-collapsible {
    display: contents;
}

.navbar-mobile-toggle {
    display: none;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 2.25rem;
    height: 2.25rem;
    margin-left: auto;
    border: none;
    background: none;
    color: #495057;
    font-size: 1.25rem;
    cursor: pointer;
}

/*
  The account menu now lives in `.navbar-top-row` (next to the hamburger toggle, always visible
  on mobile) rather than `.navbar-collapsible` - `order` is what still puts it back in its
  original rightmost desktop position, since flex items otherwise follow DOM order and this one
  now comes before the (still-`.navbar-collapsible`) company/sale-file/currency columns there.
*/
.navbar-usermenu-col {
    order: 10;
}

@media (max-width: 767.98px) {
    .navbar-top-row {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 0.75rem;
    }

    .navbar-logo-col {
        order: 1;
        flex: 0 0 auto;
        width: auto;
        max-width: none;
    }

    .navbar-search-col {
        order: 2;
        flex: 1 1 auto;
        width: auto;
        max-width: none;
        min-width: 0;
    }

    .navbar-search-label {
        display: none;
    }

    .navbar-usermenu-col {
        order: 3;
        flex: 0 0 auto;
        width: auto;
        max-width: none;
        margin-top: 0;
        padding: 0;
    }

    .navbar-mobile-toggle {
        order: 4;
        display: inline-flex;
    }

    .navbar-collapsible {
        display: none;
        width: 100%;
        flex-direction: column;
    }

    .navbar-collapsible.is-open {
        display: flex;
    }

    .navbar-collapsible > div {
        width: 100%;
        max-width: 100%;
        flex: 0 0 100%;
    }
}
</style>
