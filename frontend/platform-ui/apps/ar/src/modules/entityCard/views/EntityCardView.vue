<template>
<CalculumLayout :containerClass="'entity-card-section'" :containerId="'entity-card-header-menu'">
  <template v-slot:slotTop>
    <div class="d-flex align-items-center gap-2 py-2">
      <h4 class="mb-0">{{ card?.companyName ?? t('arEntityCard.title') }}</h4>
    </div>
  </template>

  <template v-slot:slotContent>
    <CalculumLoadingAr v-if="loading" modal />

    <NoDataAvailable
      v-else-if="notFound"
      :title="t('arEntityCard.notFound')"
    />

    <NoDataAvailable
      v-else-if="loadError"
      :title="t('arEntityCard.loadError')"
    />

    <div v-else-if="card">
      <div class="row g-3 mb-3">
        <div class="col-12">
          <ContentBox>
            <ContentBoxBody>
              <!-- G-479, closed by UC-API-12: creditLimit and parentName now ride on the card. -->
              <BigNumberThreeCols
                :title="card.companyName ?? undefined"
                :bigNumberTitle="t('arEntityCard.summary.salesVolume')"
                :bigNumberValue="formatMoneyCompact(card.volume, currenciesStore.selectedCurrencySymbol)"
                :numberLeftTitle="t('arEntityCard.summary.creditLimit')"
                :numberLeftValue="card.creditLimit === null ? notAvailable : formatMoneyCompact(card.creditLimit, currenciesStore.selectedCurrencySymbol)"
                :numberLeftTitleTooltip="card.creditLimit !== null ? creditLimitDisclaimer : undefined"
                :numberCenterTitle="t('arEntityCard.summary.creditRating')"
                :numberCenterValue="card.creditRating ?? notAvailable"
                :numberCenterTitleTooltip="card.creditRating !== null ? creditRatingDisclaimer : undefined"
                :numberRightTitle="t('arEntityCard.summary.parent')"
                :numberRightValue="card.parentName ?? notAvailable"
              />
            </ContentBoxBody>
          </ContentBox>
        </div>
      </div>

      <EntityCardTabBar :tabs="tabs" @select="onSelectTab" />

      <div class="tab-content mt-3">
        <EntityCardOpportunityTab
          v-if="selectedTab === 'opportunity' && numericVersionId !== undefined"
          :card="card"
          :versionId="numericVersionId"
        />
        <EntityCardCorporateTreeTab
          v-else-if="selectedTab === 'corporate-tree' && numericVersionId !== undefined && numericBuyerId !== undefined"
          :versionId="numericVersionId"
          :buyerId="numericBuyerId"
        />
        <EntityCardCompanyDetailsTab
          v-else-if="selectedTab === 'company-details'"
          :card="card"
        />
      </div>
    </div>
  </template>
</CalculumLayout>
</template>

<script setup lang="ts">
/**
 * UC-UI-06: the Entity Card shell and summary strip. Loads one buyer's card (UC-API-07) and
 * renders the at-a-glance strip plus the tab shell that UC-UI-07/08/09 fill in.
 *
 * Follows the Customer Card's own load pattern (`CustomerCardView.vue`): a load token against
 * overlapping requests, the malformed-route-segment guard, and 404-vs-other-error handling.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BigNumberThreeCols,
  CalculumLayout,
  CalculumLoadingAr,
  ContentBox,
  ContentBoxBody,
  NoDataAvailable,
} from '@ada/design-system'
import { fetchCustomerCard, type CustomerCardResponse } from '@/api'
import { HttpError } from '@/api/http'
import { useLoadToken } from '@/composables/useLoadToken'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { parsePositiveRouteId } from '@/modules/match/utils/routeId'
import { formatMoneyCompact } from '@/utils/moneyFormatting'
import { selectEntityCardTab } from '../EntityCardRouting'
import { buildEntityCardTabs, resolveEntityCardTab, type EntityCardTabId } from '../composables/useEntityCardTabs'
import EntityCardTabBar from '../components/EntityCardTabBar.vue'
import EntityCardOpportunityTab from '../components/tabs/EntityCardOpportunityTab.vue'
import EntityCardCorporateTreeTab from '../components/tabs/EntityCardCorporateTreeTab.vue'
import EntityCardCompanyDetailsTab from '../components/tabs/EntityCardCompanyDetailsTab.vue'

// props: true on the route maps :versionId/:buyerId/:tab directly here as strings, same
// convention as CustomerCardView.
const props = defineProps<{ versionId: string; buyerId: string; tab?: string }>()
const { t } = useI18n({ useScope: 'global' })

const loading = ref(true)
const notFound = ref(false)
const loadError = ref(false)
const card = ref<CustomerCardResponse | null>(null)

const notAvailable = computed(() => t('arMatch.progress.notAvailable'))

// UC-UI-21 FR-1/FR-2: the same disclaimers BuyerCreditRating/BuyerGrid carry, on the one other
// surface these two figures render on. AF-1: no value to show, no disclaimer to carry either.
const creditLimitDisclaimer = computed(() => t('arBuyers.table.tooltips.creditLimitDisclaimer'))
const creditRatingDisclaimer = computed(() => t('arBuyers.table.tooltips.creditRatingDisclaimer'))

// Derived from the same route props `load()` already validated, rather than a second pair of
// refs `load()` would have to keep in sync - `card` is only ever non-null once both parsed
// cleanly (see `load` below), and `load()` nulls `card` synchronously before re-parsing on any
// versionId/buyerId change, so these can never disagree with what's on screen.
const numericVersionId = computed(() => (card.value ? parsePositiveRouteId(props.versionId) : undefined))
const numericBuyerId = computed(() => (card.value ? parsePositiveRouteId(props.buyerId) : undefined))

const selectedTab = computed<EntityCardTabId>(() => resolveEntityCardTab(props.tab))
const tabs = computed(() =>
  buildEntityCardTabs(selectedTab.value, {
    opportunity: t('arEntityCard.tabs.opportunity'),
    'corporate-tree': t('arEntityCard.tabs.corporateTree'),
    'company-details': t('arEntityCard.tabs.companyDetails'),
  }),
)

function onSelectTab(tabId: EntityCardTabId) {
  if (numericVersionId.value === undefined || numericBuyerId.value === undefined) {
    return
  }
  selectEntityCardTab(numericVersionId.value, numericBuyerId.value, tabId)
}

// Guards against a slower response landing after a fresher one, exactly like the Customer Card:
// browser back/forward between two Entity Card entries in quick succession fires two overlapping
// fetches with no guarantee the one that started first also resolves first.
const { start, isStale } = useLoadToken()
const currenciesStore = useArCurrenciesStore()

async function load() {
  const token = start()
  loading.value = true
  notFound.value = false
  loadError.value = false
  card.value = null

  // A malformed route segment (Number('abc') is NaN) must not reach the API as /buyers/NaN -
  // that answers whatever a non-numeric segment happens to produce server-side, not the 404 this
  // card already renders as "not found".
  const versionId = parsePositiveRouteId(props.versionId)
  const buyerId = parsePositiveRouteId(props.buyerId)
  if (versionId === undefined || buyerId === undefined) {
    notFound.value = true
    loading.value = false
    return
  }

  try {
    const result = await fetchCustomerCard(versionId, buyerId, currenciesStore.currency)
    if (isStale(token)) {
      // A newer load() has started since this one; that request owns the screen now.
      return
    }
    card.value = result
  } catch (error) {
    if (isStale(token)) {
      return
    }
    if (error instanceof HttpError && error.status === 404) {
      notFound.value = true
    } else {
      loadError.value = true
    }
  } finally {
    if (!isStale(token)) {
      loading.value = false
    }
  }
}

onMounted(load)
// Deliberately NOT watching `tab`: switching tabs is a pure display change over the card already
// on screen, and reloading the card on every tab click would refetch data the click did not
// invalidate.
watch([() => props.versionId, () => props.buyerId], load)
</script>
