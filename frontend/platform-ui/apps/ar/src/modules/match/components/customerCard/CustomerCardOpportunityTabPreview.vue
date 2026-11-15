<template>
<CalculumLoadingAr v-if="loading" modal />

<NoDataAvailable
  v-else-if="notFound"
  :title="t('arCustomerCard.notFound')"
/>

<NoDataAvailable
  v-else-if="loadError"
  :title="t('arCustomerCard.loadError')"
/>

<div v-else-if="card" class="row g-3">
  
  <div class="col-12">
    <CustomerCardCompanyDetailsPreview :version-id="props.versionId" :buyer-id="props.buyerId" />
  </div>
  
  
  <div class="col-12">
    <StrategyResultsPanel
      :strategy-breakdown="card.strategyBreakdown"
      :winning-strategy="card.winningStrategy"
    />
  </div>

  <div class="col-12">
    <BuyerLinesGrid :version-id="card.saleFileVersionId" :buyer-id="card.id" />
  </div>

  <div class="col-12 col-xl-6">
    <ContentBox>
      <template v-slot:header-title>
        <h5 class="mb-0">{{ t('arCustomerCard.sections.brandingScore') }}</h5>
      </template>
      <ContentBoxBody>
        <dl class="row mb-0">
          <template v-for="field in brandingScoreFields" :key="field.label">
            <dt class="col-6 text-muted">{{ field.label }}</dt>
            <dd class="col-6 text-end">{{ field.value }}</dd>
          </template>
        </dl>
      </ContentBoxBody>
    </ContentBox>
  </div>
</div>
</template>

<script setup lang="ts">
/**
 * CustomerCardViewPreview's Opportunity tab - fetches its own `CustomerCardResponse` (see
 * `useCustomerCard`'s own doc for why this is a composable call per tab rather than a prop from a
 * parent-owned fetch), so it carries its own loading/not-found/error state exactly as a
 * stand-alone view would.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalculumLoadingAr, ContentBox, ContentBoxBody, NoDataAvailable } from '@ada/design-system'
import { formatNumber } from '@/modules/match/utils/format'
import { useCustomerCard } from '@/modules/buyers/composables/useCustomerCard'
import StrategyResultsPanel from './StrategyResultsPanelPreview.vue'
import BuyerLinesGrid from '@/modules/buyers/components/customerCard/BuyerLinesGrid.vue'
import CustomerCardCompanyDetailsPreview from './CustomerCardCompanyDetailsPreview.vue'

const props = defineProps<{ versionId: string; buyerId: string }>()
const { t } = useI18n({ useScope: 'global' })

const { loading, notFound, loadError, card } = useCustomerCard(
  () => props.versionId,
  () => props.buyerId,
)

const orNotAvailable = (value: string | null | undefined): string =>
  value ?? t('arCustomerCard.notAvailable')

const brandingScoreFields = computed(() => {
  if (!card.value) return []
  const c = card.value
  return [
    // Null is shown as "—", distinct from a real value: brandLevel/brandPaymentTermsFactor are
    // null exactly when step 4 (branding score) never ran for this party, same absence rule as
    // every other calculation-output field on this card.
    { label: t('arCustomerCard.fields.brandLevel'), value: orNotAvailable(c.brandLevel) },
    { label: t('arCustomerCard.fields.brandPaymentTermsFactor'), value: formatNumber(c.brandPaymentTermsFactor) },
  ]
})
</script>
