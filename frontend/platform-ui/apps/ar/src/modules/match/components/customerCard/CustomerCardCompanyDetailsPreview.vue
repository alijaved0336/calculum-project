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
  <div class="col-12 col-xl-6">
    <ContentBox>
      <template v-slot:header-title>
        <h5 class="mb-0">{{ t('arCustomerCard.sections.identity') }}</h5>
      </template>
      <ContentBoxBody>
        <dl class="row mb-0">
          <template v-for="field in identityFields" :key="field.label">
            <dt class="col-6 text-muted">{{ field.label }}</dt>
            <dd class="col-6 text-end">{{ field.value }}</dd>
          </template>
        </dl>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <div class="col-12 col-xl-6">
    <ContentBox>
      <template v-slot:header-title>
        <h5 class="mb-0">{{ t('arCustomerCard.sections.size') }}</h5>
      </template>
      <ContentBoxBody>
        <dl class="row mb-0">
          <template v-for="field in sizeFields" :key="field.label">
            <dt class="col-6 text-muted">{{ field.label }}</dt>
            <dd class="col-6 text-end">{{ field.value }}</dd>
          </template>
        </dl>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <div class="col-12 col-xl-6">
    <ContentBox>
      <template v-slot:header-title>
        <h5 class="mb-0">{{ t('arCustomerCard.sections.volumeTerms') }}</h5>
      </template>
      <ContentBoxBody>
        <dl class="row mb-0">
          <template v-for="field in volumeTermsFields" :key="field.label">
            <dt class="col-6 text-muted">{{ field.label }}</dt>
            <dd class="col-6 text-end">{{ field.value }}</dd>
          </template>
        </dl>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <div class="col-12 col-xl-6">
    <ContentBox>
      <template v-slot:header-title>
        <h5 class="mb-0">{{ t('arCustomerCard.sections.dpo') }}</h5>
      </template>
      <ContentBoxBody>
        <dl class="row mb-0">
          <template v-for="field in dpoFields" :key="field.label">
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
 * CustomerCardViewPreview's Company Details content - unchanged content (identity/size/volume-terms/DPO
 * field groups), fetching its own `CustomerCardResponse` (see `useCustomerCard`'s own doc for
 * why this is a composable call per tab rather than a prop from a parent-owned fetch).
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalculumLoadingAr, ContentBox, ContentBoxBody, NoDataAvailable } from '@ada/design-system'
import { formatNumber } from '@/modules/match/utils/format'
import { useCustomerCard } from '@/modules/buyers/composables/useCustomerCard'

const props = defineProps<{ versionId: string; buyerId: string }>()
const { t } = useI18n({ useScope: 'global' })

const { loading, notFound, loadError, card } = useCustomerCard(
  () => props.versionId,
  () => props.buyerId,
)

const yesNo = (value: boolean | null | undefined): string =>
  value === null || value === undefined
    ? t('arCustomerCard.notAvailable')
    : t(`arCustomerCard.yesNo.${value}`)

const orNotAvailable = (value: string | null | undefined): string =>
  value ?? t('arCustomerCard.notAvailable')

const identityFields = computed(() => {
  if (!card.value) {
    return []
  }
  const c = card.value
  return [
    { label: t('arCustomerCard.fields.resolution'), value: orNotAvailable(c.resolution) },
    { label: t('arCustomerCard.fields.lifecycle'), value: orNotAvailable(c.lifecycle) },
    { label: t('arMatch.table.country'), value: orNotAvailable(c.country) },
    { label: t('arMatch.table.industry'), value: orNotAvailable(c.industry) },
    { label: t('arCustomerCard.fields.legalForm'), value: orNotAvailable(c.legalForm) },
    { label: t('arCustomerCard.fields.isPublic'), value: yesNo(c.isPublic) },
    { label: t('arCustomerCard.fields.internalId'), value: orNotAvailable(c.internalId) },
  ]
})

const sizeFields = computed(() => {
  if (!card.value) {
    return []
  }
  const c = card.value
  return [
    // formatNumber already renders null distinctly from a real 0 ("—" vs "0"), same as every
    // other numeric field on this card — a truthiness check here would collapse a genuine 0
    // into "not available", indistinguishable from null.
    { label: t('arCustomerCard.fields.companySize'), value: formatNumber(c.companySizeId) },
    { label: t('arCustomerCard.fields.estimatedCompanySize'), value: yesNo(c.estimatedCompanySize) },
    { label: t('arCustomerCard.fields.isCompanySizeFromParent'), value: yesNo(c.isCompanySizeFromParent) },
    { label: t('arMatch.table.revenue'), value: formatNumber(c.annualRevenue) },
    { label: t('arCustomerCard.fields.annualRevenueIsEstimated'), value: yesNo(c.annualRevenueIsEstimated) },
    { label: t('arCustomerCard.fields.employeesCount'), value: formatNumber(c.employeesCount) },
  ]
})

const volumeTermsFields = computed(() => {
  if (!card.value) {
    return []
  }
  const c = card.value
  return [
    { label: t('arCustomerCard.fields.volume'), value: formatNumber(c.volume) },
    { label: t('arCustomerCard.fields.actualPaymentTermsAvg'), value: formatNumber(c.actualPaymentTermsAvg) },
    { label: t('arCustomerCard.fields.contractualPaymentTermsWithCashDiscountsAvg'), value: formatNumber(c.contractualPaymentTermsWithCashDiscountsAvg) },
    { label: t('arCustomerCard.fields.contractualPaymentTermsWithoutCashDiscountsAvg'), value: formatNumber(c.contractualPaymentTermsWithoutCashDiscountsAvg) },
  ]
})

const dpoFields = computed(() => {
  if (!card.value) {
    return []
  }
  const c = card.value
  return [
    // Null DPO is shown as "—", distinct and never confused with a real zero: UC-API-02's
    // explicit requirement, since formatNumber already treats null and 0 differently.
    { label: t('arCustomerCard.fields.dpo'), value: formatNumber(c.dpo) },
    { label: t('arCustomerCard.fields.dpoSource'), value: orNotAvailable(c.dpoSource) },
    { label: t('arCustomerCard.fields.dpoStrategy'), value: formatNumber(c.dpoStrategy) },
    { label: t('arCustomerCard.fields.dpoStrategyByParent'), value: yesNo(c.dpoStrategyByParent) },
    { label: t('arCustomerCard.fields.dpoReference'), value: formatNumber(c.dpoReference) },
  ]
})
</script>
