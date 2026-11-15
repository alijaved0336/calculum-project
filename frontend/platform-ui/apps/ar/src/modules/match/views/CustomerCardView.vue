<template>
<CalculumLayout :container-class="'customer-card-section'" :container-id="'customer-card-header-menu'" :show-footer="false">
  <template v-slot:slotTop>
    <CustomerCardHeader v-if="headerCard" :card="headerCard" />

    <CustomTabs
      :model-value="activeTab"
      appearance="underline"
      :contained="false"
      :items="tabs"
      @update:model-value="onTabChange"
    />
  </template>

  <template #slotContent>
    <keep-alive>
      <component
        :is="tabComponents[activeTab]"
        :version-id="props.versionId"
        :buyer-id="props.buyerId"
        :sales-lines="props.initialBuyer?.salesLines ?? requestedNode?.salesLines"
        :role="props.initialBuyer?.role ?? requestedNode?.role"
        :parent-id="props.initialBuyer?.parentId ?? requestedNode?.companyDetails?.parentId ?? null"
      />
    </keep-alive>
  </template>
</CalculumLayout>
</template>

<script setup lang="ts">
/**
 * UC-UI-06's shell: the buyer-identity header, the tab bar, and whichever tab is active. The header
 * now carries its own Company Details fetch as a fallback for when no caller seeded it (UC-UI-26
 * FR3, see below); beyond that the shell makes no fetch and holds no loading/not-found/error state
 * of its own.
 * `CustomerCardOpportunityTab`/`CustomerCardCorporateTreeTab`/`CustomerCardCompanyDetailsTab` each
 * fetch their own `CustomerCardResponse` independently (`useCustomerCard`) and render their own
 * loading/not-found/error state, but none of them render the header anymore - it lives here
 * instead, fed by `initialBuyer` rather than any tab's own fetch, so it shows immediately rather
 * than waiting on whichever tab happens to be active. `CustomerCardRatingNMetrics` is the odd one
 * out - it fetches nothing yet (see its own doc), pending a real endpoint.
 *
 * `initialBuyer` is optional and comes from whatever the caller already had on hand
 * (`BuyersView.vue`'s `BuyerCard` passes its own roster row through
 * `customerCardModal.open(..., { initialBuyer })`). The header is now fed by `initialBuyer` when a
 * caller has one and otherwise by this view's own Company Details fetch, so it renders on every
 * entry path - including direct route navigation, a refresh, or a shared link, none of which have a
 * caller to seed it (UC-UI-26 FR3). That fetch duplicates the Company Details tab's own request
 * only on the direct-URL path, and only if that tab is opened.
 */
import { computed, ref, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalculumLayout, CustomTabs } from '@ada/design-system'
import type { TabItem } from '@ada/design-system'
import type { CustomerCardHeaderIdentity, CustomerCardIdentity } from '@/stores/customerCardModal'
import { useBuyerCompanyDetails } from '@/modules/buyers/composables/useBuyerCompanyDetails'
import { useBuyerCorporateTree } from '@/modules/buyers/composables/useBuyerCorporateTree'
import { toHeaderIdentity } from '@/modules/buyers/components/customerCard/headerIdentity'
import CustomerCardHeader from '@/modules/buyers/components/customerCard/CustomerCardHeader.vue'
import CustomerCardOpportunityTab from '@/modules/buyers/components/customerCard/CustomerCardOpportunityTab.vue'
import CustomerCardCorporateTreeTab from '@/modules/buyers/components/customerCard/CustomerCardCorporateTreeTab.vue'
import CustomerCardCompanyDetailsTab from '@/modules/buyers/components/customerCard/CustomerCardCompanyDetailsTab.vue'
import CustomerCardRatingNMetrics from '@/modules/buyers/components/customerCard/CustomerCardRatingNMetrics.vue'

// props: true on the route maps :versionId/:buyerId directly here as strings.
const props = defineProps<{ versionId: string; buyerId: string; initialBuyer?: CustomerCardIdentity }>()
const { t } = useI18n({ useScope: 'global' })

// UC-UI-26 FR3: a direct URL, a refresh or a shared link has no roster row to seed the header
// with, so the view fetches the identity itself - only then, never alongside a seed.
const { details: fallbackDetails } = useBuyerCompanyDetails(() => props.buyerId, () => !props.initialBuyer)
const headerCard = computed<CustomerCardHeaderIdentity | null>(() =>
  props.initialBuyer ?? (fallbackDetails.value ? toHeaderIdentity(fallbackDetails.value) : null),
)

// The Opportunity tab's "Buyer / Sale Line N" strip reads `salesLines`, which only a roster row
// (`BuyersView`) or a corporate-tree node seeds - always as an array, possibly empty. A grid's
// entity cell (`useEntityLogoCustomerCard`) or a direct URL seeds none (`undefined`), so the
// requested buyer's own node is fetched from the corporate tree instead: no endpoint answers a
// single buyer's roster row, and that node carries the very same sale-line DTO the roster does.
const { tree: fallbackTree } = useBuyerCorporateTree(
  () => props.buyerId,
  () => props.initialBuyer?.salesLines === undefined,
)
const requestedNode = computed(() => fallbackTree.value?.nodes.find((node) => node.isRequestedBuyer) ?? null)

/**
 * Mirrors `apps/ar/src/modules/entityCard`'s own tab order (Opportunity/Corporate Tree/Company
 * Details) for the same three-tab layout on this screen - built with `CustomTabs` here rather
 * than reusing that module's `EntityCardTabBar`/tab components directly, so the two now diverge
 * rather than share one implementation. Corporate Tree renders the same tree visualization as
 * that module's own tab (`CustomerCardCorporateTreeTab`'s own doc explains what is and isn't
 * shared between the two), not a second, independent implementation.
 */
type CustomerCardTab = 'opportunity' | 'corporate-tree' | 'company-details' | 'ratings-metrics'
const activeTab = ref<CustomerCardTab>('opportunity')

const tabs = computed<TabItem[]>(() => [
  { id: 'opportunity', label: t('arCustomerCard.tabs.opportunity') },
  { id: 'corporate-tree', label: t('arCustomerCard.tabs.corporateTree') },
  { id: 'company-details', label: t('arCustomerCard.tabs.companyDetails') },
  { id: 'ratings-metrics', label: t('arCustomerCard.tabs.ratingsAndMetrics') },
])

function onTabChange(id: string): void {
  activeTab.value = id as CustomerCardTab
}

/** What `<component :is>` renders for each tab id, all four taking the same
 * `:version-id`/`:buyer-id`/`:sales-lines` props (`CustomerCardRatingNMetrics` ignores its own
 * `version-id`/`buyer-id` for now - see its own doc) and fetching independently off them.
 * `sales-lines` comes from `initialBuyer` when its caller seeded one (roster row or corporate-tree
 * node), otherwise from `requestedNode` above - only `CustomerCardOpportunityTab` reads it today. */
const tabComponents: Record<CustomerCardTab, Component> = {
  opportunity: CustomerCardOpportunityTab,
  'corporate-tree': CustomerCardCorporateTreeTab,
  'company-details': CustomerCardCompanyDetailsTab,
  'ratings-metrics': CustomerCardRatingNMetrics,
}

// A new buyer starts back on Opportunity - carrying over whatever tab happened to be open on the
// previous one would be a leftover from that buyer, not a choice made about this one. This is the
// one thing left for the view itself to own now that each tab fetches independently.
watch([() => props.versionId, () => props.buyerId], () => {
  activeTab.value = 'opportunity'
})
</script>