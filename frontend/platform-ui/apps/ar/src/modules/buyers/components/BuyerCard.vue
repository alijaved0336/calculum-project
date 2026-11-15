<template>
<SupplierCard
  class="buyer-card"
  :name="buyer.name ?? notAvailable"
  :legal-name="buyer.originalName ?? ''"
  :logo-fallback="initialsOf(buyer.name)"
  :country-name="buyer.country ?? ''"
  :types="cardTypes"
  :sme-title="buyer.smeSource ?? undefined"
  :metrics="metrics"
  :parents-value="buyer.parentName ?? ''"
  :show-close="showClose"
  :flag-src="buyer.countryFlagUrl ?? ''"
  :logo-src="buyer.logoUrl ?? ''"
  @click="emit('open', buyer)"
  @close="emit('close', buyer.id)"
/>
</template>

<script setup lang="ts">
/**
 * The card half of UC-UI-05: one buyer per card, four per row (`BuyersView`'s own Bootstrap
 * `.row`/`col-3` layout), each one a click-through into the Customer Card - same destination the
 * grid row and `CompaniesTab.vue`'s buyer rows already open.
 *
 * Built on the design system's `SupplierCard` (its own doc maps AP's `EntityCardRecentSearchCompany`
 * onto its props) rather than a bespoke layout, so the buyer roster's card reads as the same family
 * as every other entity card in the platform. Two things that card shows have no AR counterpart to
 * paint, so they're left off here rather than faked:
 *  - "Buying Entities" (AP: which buyers bought from this supplier) - `BuyerCardRow` carries no such
 *    list; the reverse relationship AR would need does not exist on this endpoint.
 *  - The negotiation-status pill and the bottom-left role label - `SupplierCard` itself omits both
 *    deliberately (see its own `types.ts` mapping table), so there's no prop to feed them through
 *    even though `buyer.negotiationStatus`/`buyer.role` are both real data.
 * `country` has a dedicated `countryName` prop on `SupplierCard`, but that prop only ever surfaces
 * as the flag image's alt/title text - AR has no flag URL to pass as `flagSrc`, so with no visible
 * text of its own it would otherwise render nowhere. Folded into `metrics` instead, alongside spend
 * volume and sale line count, so it actually reaches the card.
 */
import { computed } from 'vue'
import { SupplierCard } from '@ada/design-system'
import type { SupplierCardType } from '@ada/design-system'
import type { BuyerCardRow } from '../types'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { formatMoneyCompact } from '@/utils/moneyFormatting'
import { initialsOf } from '../utils/initials'

const props = withDefaults(defineProps<{ buyer: BuyerCardRow; showClose?: boolean }>(), {
  showClose: false,
})
const emit = defineEmits<{ open: [buyer: BuyerCardRow]; close: [buyerId: number] }>()
const notAvailable = '—'

const currenciesStore = useArCurrenciesStore()

const cardTypes = computed<SupplierCardType[]>(() => {
  const types: SupplierCardType[] = []
  if (props.buyer.isSme) {
    types.push('sme')
  }
  if (props.buyer.role === 'Parent') {
    types.push('parent')
  }
  return types
})

// AB#20490: a buyer/parent's volume is a real, signed SUM across its sale lines - a credit note
// legitimately pulls it negative (see NineBoxSummaryTable's own comment on the same field), and
// AB#20367 already decided that belongs in the total, not hidden from it. This card just isn't the
// place to show a negative headline number: clamped to zero here only, not in formatCompact itself,
// which Match and Entity Card still call for the same field and must keep showing the real signed
// amount.
const displayVolume = computed(() => (
  props.buyer.volume === null ? null : Math.max(0, props.buyer.volume)
))

const metrics = computed(() => ({
  Country: props.buyer.country ?? notAvailable,
  'Sales Volume': formatMoneyCompact(displayVolume.value, currenciesStore.selectedCurrencySymbol),
  'Sales Lines': String(props.buyer.saleLineCount),
}))
</script>

<style scoped>
.buyer-card {
  height: 100%;
}
</style>
