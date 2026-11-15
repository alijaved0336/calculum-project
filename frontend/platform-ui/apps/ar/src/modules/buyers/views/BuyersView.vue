<template>
<CalculumLayout
  :containerClass="'buyers-section'"
  :containerId="'buyers-header-menu'"
  @load-more-entities="onLoadMore"
>
  <template #slotTop>
    <div class="row">
    <div class="col-12 d-flex align-items-center">
      <!-- AC-03: reorders both lists on this screen - the roster restarts from a fresh first page
           under the new `sort` (`resetAndLoadCardRows`) and the Recently Viewed shelf re-fetches
           under it too (`loadRecentBuyers`). Wrapper div, not a class on SearchableDropdown
           itself, since the component's own root already sets its own `width: 100%`. -->
      <div
        v-if="context.hasVersion && context.buyersView === 'card'"
        class="buyers-sort-wrapper ms-auto"
      >
        <SearchableDropdown
          v-model="cardSort"
          :items="sortOptions"
          :show-search="false"
          :placeholder="t('arBuyers.sort.label')"
        />
      </div>
    </div>
    </div>
  </template>

  <template #slotContent>
    <div class="sub-main-sections">
    <NoDataAvailable
      v-if="!context.hasVersion"
      :title="t('arBuyers.noVersion')"
    />

    <template v-else-if="context.buyersView === 'grid'">
      <CalculumLoadingAr v-if="loading" modal />

      <NoDataAvailable
        v-else-if="loadError"
        :title="t('arBuyers.errorLoad')"
      />

      <NoDataAvailable
        v-else-if="rows.length === 0"
        :title="t('arBuyers.empty')"
      />

      <BuyerGrid
        v-else
        :rows="rows"
        @open="openBuyer"
      />
    </template>

    <template v-else>
      <!-- Independent of cardLoading/cardLoadError/cardRows below: a fetch or an empty/search
           result on the paginated roster must not hide these shortcuts, since they come from
           their own endpoint and answer a different question ("what did I open recently"). -->
      <div v-if="recentBuyers.length > 0 && !context.buyersSearchQuery" class="recent-buyers-section mb-3">
        <button
          type="button"
          class="recent-buyers-toggle"
          :aria-expanded="!isRecentBuyersCollapsed"
          @click="isRecentBuyersCollapsed = !isRecentBuyersCollapsed"
        >
          <span class="recent-buyers-title">{{ t('arBuyers.recent.title') }}</span>
          <i
            class="fa-solid fa-chevron-down recent-buyers-toggle-icon"
            :class="{ 'recent-buyers-toggle-icon--collapsed': isRecentBuyersCollapsed }"
            aria-hidden="true"
          ></i>
        </button>

        <div v-show="!isRecentBuyersCollapsed" class="row">
          <div
            v-for="buyer in recentBuyers"
            :key="buyer.id"
            class="col-12 col-sm-6 col-md-4 col-lg-3 mb-3"
          >
            <BuyerCard
              :buyer="buyer"
              :show-close="true"
              @open="openBuyer"
              @close="removeRecentBuyer"
            />
          </div>
        </div>
      </div>

      <CalculumLoadingAr v-if="cardLoading" modal />

      <NoDataAvailable
        v-else-if="cardLoadError"
        :title="t('arBuyers.errorLoad')"
      />

      <NoDataAvailable
        v-else-if="cardRows.length === 0"
        :title="context.buyersSearchQuery ? t('arBuyers.emptySearch') : t('arBuyers.empty')"
      />

      <template v-else>
        <div class="cards-container">
          <p class="recent-buyers-title">{{ t('arBuyers.recent.all') }}</p>
          <div class="row">
            <div
              v-for="buyer in cardRows"
              :key="buyer.id"
              class="col-12 col-sm-6 col-md-4 col-lg-3 mb-3"
            >
              <BuyerCard
                :buyer="buyer"
                @open="openBuyer"
              />
            </div>
          </div>

        <button
          v-if="cardHasMore && !cardLoadingMore"
          type="button"
          class="load-more-hint"
          @click="loadMoreCardRows"
        >
          <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
          <span>{{ t('arBuyers.loadMoreHint') }}</span>
        </button>

        <p v-else-if="!cardLoadingMore" class="all-loaded-hint">
          <i class="fa-solid fa-check" aria-hidden="true"></i>
          <span>{{ t('arBuyers.allLoaded') }}</span>
        </p>
        </div>

        <CalculumLoadingAr v-if="cardLoadingMore" :modal="true"/>
      </template>
    </template>
    </div>
  </template>
</CalculumLayout>
</template>

<script setup lang="ts">
/**
 * UC-UI-05: the buyer roster, browsed as a dense grid or a visual card layout, either one
 * opening into the Customer Card - now backed by two independent data pipelines rather than one
 * shared list, because only the card view gained the navbar's search and infinite scroll.
 *
 * Grid reads the same `/companies` roster `CompaniesTab.vue` already fetches (UC-API-06 added its
 * credit-limit/rating/parent/payment-term columns to that same endpoint rather than a new one -
 * see `Ada.Ar.Api`'s `SaleFileVersionsController.GetCompanies`) and, like it, guards its `load()`
 * against a stale response with `useLoadToken` and re-runs it when the selected version changes.
 *
 * Card reads the dedicated, page-paginated `fetchBuyers` endpoint instead (see its own doc for
 * why it needs no client-side parent join), appending pages as the analyst scrolls near the
 * bottom of CalculumLayout's own scrollable container (its `load-more-entities` emit) - see the
 * design system's `.buyers-section` override (`_layout.scss`) for why that container actually
 * needs its own internal scroll to fire that emit, rather than the whole page scrolling instead.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CalculumLayout,
  CalculumLoadingAr,
  NoDataAvailable,
  SearchableDropdown,
} from '@ada/design-system'
import { fetchCompanies, type ParsedCompanyRow } from '@/api'
import { useContextStore } from '@/stores/context'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { useLoadToken } from '@/composables/useLoadToken'
import type { BuyerRosterRow, BuyerCardRow } from '../types'
import BuyerGrid from '../components/BuyerGrid.vue'
import BuyerCard from '../components/BuyerCard.vue'
import { fetchBuyers, type BuyersPage, type BuyersSortOption } from '../api/fetchBuyers'
import { fetchRecentBuyers, deleteRecentBuyer } from '../api/recentBuyers'
import { useOpenCustomerCard } from '../composables/useOpenCustomerCard'

const { t } = useI18n({ useScope: 'global' })
const context = useContextStore()
const { openCustomerCard } = useOpenCustomerCard()
const currenciesStore = useArCurrenciesStore()

// The grid/card toggle is hidden for now - the grid presentation isn't shown at all - so nothing
// in this view can set buyersView to 'grid' any more. Forced here too (not just "hide the toggle")
// because buyersView is persisted (see context.ts's own doc): a browser that switched to grid
// before this change would otherwise still open on it.
context.setBuyersView('card')

/**
 * AC-03's five sort options, now backed by `fetchBuyers`' own `sort` param. Defaults to
 * `nameAsc`. Changing it behaves exactly like a new navbar search (see `resetAndLoadCardRows`):
 * the roster restarts from its first page under the new order, keeping whatever search term is
 * already active - `resetAndLoadCardRows` reads `context.buyersSearchQuery` fresh regardless of
 * which of the two triggered it, so no separate "keep the search" logic is needed here.
 */
const cardSort = ref<BuyersSortOption>('nameAsc')

const sortOptions = computed(() => [
  { value: 'nameAsc', label: t('arBuyers.sort.nameAsc') },
  { value: 'nameDesc', label: t('arBuyers.sort.nameDesc') },
  { value: 'recently', label: t('arBuyers.sort.recentlyViewed') },
  { value: 'volumeAsc', label: t('arBuyers.sort.volumeAsc') },
  { value: 'volumeDesc', label: t('arBuyers.sort.volumeDesc') },
])

const loading = ref(true)
const loadError = ref(false)
const rows = ref<BuyerRosterRow[]>([])

/**
 * Resolves each `Counterparty` row's `ultimateParentId` against the roster's own `Parent` rows.
 *
 * A single unfiltered fetch rather than two role-filtered ones: the parent names this screen
 * needs live in the very rows a `role=Counterparty` filter would exclude, and a buyer roster
 * with a hundred buyers and a handful of distinct parents does not need two round trips to build
 * one lookup that small.
 */
function toBuyerRows(companies: ParsedCompanyRow[]): BuyerRosterRow[] {
  const nameById = new Map(companies.map((company) => [company.id, company.companyName]))

  return companies
    .filter((company) => company.role === 'Counterparty')
    .map((buyer) => ({
      ...buyer,
      // UC-API-06 A1: a buyer resolved to no parent is ordinary, not an error - `parentName`
      // stays null exactly when `ultimateParentId` is null, and the presentation layer renders
      // that as "not available" rather than treating a missing lookup as a bug.
      parentName: buyer.ultimateParentId === null ? null : (nameById.get(buyer.ultimateParentId) ?? null),
    }))
}

// Two overlapping fetches (mount, then a version change before the first resolves) give no
// guarantee the one that started first also resolves first - same guard CompaniesTab.vue and
// CustomerCardView.vue already apply to their own version-scoped loads.
const { start, isStale } = useLoadToken()

async function load(): Promise<void> {
  if (!context.saleFileVersionId) {
    // Supersede any in-flight request for the version just deselected - `start()` here, not
    // just the fields below, or that request's response lands after this branch runs and
    // repopulates `rows` with data belonging to a version the user is no longer looking at.
    start()
    rows.value = []
    loading.value = false
    return
  }

  const token = start()
  loading.value = true
  loadError.value = false

  try {
    const companies = await fetchCompanies(context.saleFileVersionId)
    if (isStale(token)) {
      return
    }
    rows.value = toBuyerRows(companies)
  } catch {
    if (isStale(token)) {
      return
    }
    loadError.value = true
  } finally {
    if (!isStale(token)) {
      loading.value = false
    }
  }
}

/**
 * Shared by both presentations' row-open events: the card view's `BuyerCard` emits its own full
 * `BuyerCardRow` (so its data can seed the modal - see below), while the grid's own row click
 * still only carries an id (`BuyerGrid`'s `BuyerRosterRow` isn't the same shape).
 */
function openBuyer(buyerOrId: BuyerCardRow | number): void {
  if (!context.saleFileVersionId) {
    return
  }
  const buyerId = typeof buyerOrId === 'number' ? buyerOrId : buyerOrId.id

  // `openCustomerCard` also records the "recently viewed" visit. Opens as a global modal (`CustomerCardModal.vue`, mounted at the app root) rather than
  // navigating - staying on /buyers is the point, since this same modal is meant to be reachable
  // from more than just this screen. `initialBuyer` (the row itself, not a trimmed-down copy) lets
  // its header show immediately rather than waiting on any of its tabs' own fetch - omitted for a
  // grid-opened row, which carries no such data to seed it with.
  openCustomerCard(context.saleFileVersionId, buyerId, {
    initialBuyer: typeof buyerOrId === 'number' ? undefined : buyerOrId,
  })
}

/**
 * The up-to-20 buyers this analyst most recently opened (its own endpoint, not a slice of
 * `cardRows`/`fetchBuyers` - which buyers are in this list is server-tracked visit history, not
 * anything derivable from the roster page). Loads eagerly alongside the other card-view pipeline
 * and is cleared, not merely left stale, once the version is deselected.
 *
 * Re-fetched, not re-sorted here, when `cardSort` changes (#20412): the endpoint takes AC-03's
 * own `sort`, so the shelf and the roster below it cannot drift apart on nulls, ties or collation
 * the way two separate orderings would.
 */
const recentBuyers = ref<BuyerCardRow[]>([])
// Purely a display preference for this mount - collapsing the shortcuts shelf doesn't need to
// survive a version change or a page reload the way the roster's own state does.
const isRecentBuyersCollapsed = ref(false)
const { start: startRecent, isStale: isRecentStale } = useLoadToken()

async function loadRecentBuyers(): Promise<void> {
  if (!context.saleFileVersionUuid) {
    startRecent()
    recentBuyers.value = []
    return
  }

  const token = startRecent()
  try {
    const response = await fetchRecentBuyers(
      context.saleFileVersionUuid, currenciesStore.currency, cardSort.value)
    if (isRecentStale(token)) {
      return
    }
    recentBuyers.value = response.items
  } catch (error) {
    if (isRecentStale(token)) {
      return
    }
    // No dedicated error UI: this is an auxiliary shortcut list, not the roster itself - a failed
    // fetch just leaves the section hidden (`recentBuyers` stays whatever it was, i.e. []) rather
    // than blocking the whole screen behind its own error state.
    console.warn('Loading recently viewed buyers failed.', error)
  }
}

/** The card's own close button - removes one buyer from the recently-viewed list. */
async function removeRecentBuyer(buyerId: number): Promise<void> {
  if (!context.saleFileVersionUuid) {
    return
  }
  try {
    await deleteRecentBuyer(context.saleFileVersionUuid, buyerId)
    recentBuyers.value = recentBuyers.value.filter((buyer) => buyer.id !== buyerId)
  } catch (error) {
    console.warn('Removing recently viewed buyer failed.', error)
  }
}

/**
 * UC-UI-05's card view: an independent, page-paginated pipeline from the grid's `rows` above -
 * its own `fetchBuyers` endpoint, its own loading/error state, and its own `useLoadToken` guard,
 * since the two presentations no longer share one data source (grid stays on `fetchCompanies`;
 * search and infinite scroll are card-only).
 *
 * Both pipelines load eagerly on mount/version-change regardless of which tab is active - same
 * as `rows` already did before this - so toggling the Grid/Card tab never fires a new request; it
 * only ever changes which already-loaded dataset is on screen.
 */
const PAGE_SIZE = 20

const cardRows = ref<BuyerCardRow[]>([])
const cardLoading = ref(true)
const cardLoadingMore = ref(false)
const cardLoadError = ref(false)
// The last page number a response actually answered (1-based) - the next request asks for
// `cardPage.value + 1`, not a locally-incremented counter, since a response's own `page` is not
// guaranteed to be the one requested.
const cardPage = ref(1)
const cardHasMore = ref(true)

const { start: startCard, isStale: isCardStale } = useLoadToken()

/** No `nextCursor` on this endpoint - a further page exists exactly when this page's own `page *
 * pageSize` hasn't yet reached `total` (every buyer matching the current filter, not just this
 * page). Reads the response's own `page`/`pageSize` rather than the request's, since the server
 * can clamp a requested page size to something else. */
function hasMoreAfter(page: BuyersPage): boolean {
  return page.page * page.pageSize < page.total
}

/** The initial page (or a fresh one after a version change or a new navbar search) - replaces
 * `cardRows` rather than appending to it. */
async function resetAndLoadCardRows(): Promise<void> {
  if (!context.saleFileVersionUuid) {
    startCard()
    cardRows.value = []
    cardHasMore.value = false
    cardLoading.value = false
    return
  }

  const token = startCard()
  cardLoading.value = true
  cardLoadError.value = false

  try {
    const page = await fetchBuyers(context.saleFileVersionUuid, {
      search: context.buyersSearchQuery || undefined,
      page: 1,
      pageSize: PAGE_SIZE,
      sort: cardSort.value,
      currencyRate: currenciesStore.currency,
    })
    if (isCardStale(token)) {
      return
    }
    cardRows.value = page.items
    cardPage.value = page.page
    cardHasMore.value = hasMoreAfter(page)
  } catch {
    if (isCardStale(token)) {
      return
    }
    cardLoadError.value = true
  } finally {
    if (!isCardStale(token)) {
      cardLoading.value = false
    }
  }
}

/** The next page, triggered by CalculumLayout's `load-more-entities` (scrolled near the bottom
 * of its container) - appends to `cardRows` rather than replacing it. */
async function loadMoreCardRows(): Promise<void> {
  if (!context.saleFileVersionUuid) {
    return
  }

  const token = startCard()
  cardLoadingMore.value = true

  try {
    const page = await fetchBuyers(context.saleFileVersionUuid, {
      search: context.buyersSearchQuery || undefined,
      page: cardPage.value + 1,
      pageSize: PAGE_SIZE,
      sort: cardSort.value,
      currencyRate: currenciesStore.currency,
    })
    if (isCardStale(token)) {
      return
    }
    cardRows.value = [...cardRows.value, ...page.items]
    cardPage.value = page.page
    cardHasMore.value = hasMoreAfter(page)
  } catch (error) {
    if (isCardStale(token)) {
      return
    }
    // Leaves `cardRows`/`cardHasMore` exactly as they were: scrolling again retries, rather than
    // a transient failure permanently cutting off a roster that was loading fine a moment ago.
    console.warn('Loading more buyers failed.', error)
  } finally {
    if (!isCardStale(token)) {
      cardLoadingMore.value = false
    }
  }
}

function onLoadMore(): void {
  if (context.buyersView !== 'card' || cardLoading.value || cardLoadingMore.value || !cardHasMore.value) {
    return
  }
  loadMoreCardRows()
}

onMounted(load)
onMounted(resetAndLoadCardRows)
onMounted(loadRecentBuyers)
watch(() => context.saleFileVersionId, load)
watch(() => context.saleFileVersionId, resetAndLoadCardRows)
watch(() => context.saleFileVersionId, loadRecentBuyers)
watch(() => context.buyersSearchNonce, resetAndLoadCardRows)
watch(cardSort, resetAndLoadCardRows)
watch(cardSort, loadRecentBuyers)
</script>
<style scoped>

.card-height {
  min-height: 215px;
}

.buyers-sort-wrapper {
  width: 250px;
  flex-shrink: 0;
}

.recent-buyers-section {
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed var(--color-gray-200, #e0e0e0);
}

.recent-buyers-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 0.5rem;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.recent-buyers-title {
  color: var(--color-gray-500, #78909c);
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: capitalize;
}

.recent-buyers-toggle-icon {
  color: var(--color-gray-500, #78909c);
  font-size: 0.75rem;
  transition: transform 0.15s ease;
}

.recent-buyers-toggle-icon--collapsed {
  transform: rotate(-90deg);
}

.load-more-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin: 0.5rem 0 1rem;
  padding: 0.5rem;
  border: none;
  background: none;
  color: var(--color-gray-500, #78909c);
  font-size: 0.8125rem;
  cursor: pointer;
}

.load-more-hint:hover {
  color: var(--color-primary-600, #1976d2);
}

.all-loaded-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin: 0.5rem 0 1rem;
  padding: 0.5rem;
  color: var(--color-gray-400, #b0bec5);
  font-size: 0.8125rem;
}

</style>

