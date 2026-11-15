<template>
<div class="row g-3">
  <div class="col-12 col-xl-6">
    <ContentBox>
      <template v-slot:header-title>
        <h5 class="mb-0">{{ t('arEntityCard.companyDetails.sections.profile') }}</h5>
      </template>
      <ContentBoxBody>
        <dl class="row mb-0">
          <template v-for="field in profileFields" :key="field.label">
            <dt class="col-6 text-muted">{{ field.label }}</dt>
            <dd class="col-6 text-end">{{ field.value }}<TooltipButton v-if="field.tooltip" :text="field.tooltip" /></dd>
          </template>
        </dl>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <div class="col-12 col-xl-6">
    <ContentBox>
      <template v-slot:header-title>
        <h5 class="mb-0">{{ t('arEntityCard.companyDetails.sections.ratingsAndMetrics') }}</h5>
      </template>
      <ContentBoxBody>
        <h6 class="text-muted text-uppercase small mt-1">{{ t('arEntityCard.companyDetails.sections.creditRating') }}</h6>
        <dl class="row mb-3">
          <dt class="col-6 text-muted">{{ t('arEntityCard.companyDetails.fields.creditRating') }}</dt>
          <dd class="col-6 text-end"><BuyerCreditRating :rating="card.creditRating" /></dd>

          <dt class="col-6 text-muted">{{ t('arEntityCard.companyDetails.fields.creditScore') }}</dt>
          <dd class="col-6 text-end">{{ numberOrNotAvailable(card.creditScore) }}</dd>

          <dt class="col-6 text-muted">{{ t('arEntityCard.companyDetails.fields.creditScoreSource') }}</dt>
          <dd class="col-6 text-end">{{ orNotAvailable(card.creditScoreSource) }}</dd>
        </dl>

        <!-- UC-UI-09 basic flow step 2 also asks for industry risk. Nothing in UC-API-07's card,
             or anywhere else the front end reads, carries an industry-risk rating for a buyer -
             checked CustomerCardResponse, ParsedCompanyRow (the Buyers roster DTO) and
             CreditScoreReference's mapped columns (band, PoD, safety score - none of them
             industry-scoped). Rendered as a named "not available" row rather than omitted
             outright or invented, the same treatment G-479 established for this card's own
             summary strip before creditLimit/parentName were wired through. -->
        <h6 class="text-muted text-uppercase small mt-1">{{ t('arEntityCard.companyDetails.sections.industryRisk') }}</h6>
        <dl class="row mb-3">
          <dt class="col-6 text-muted">{{ t('arEntityCard.companyDetails.fields.industryRisk') }}</dt>
          <dd class="col-6 text-end">{{ notAvailable }}</dd>
        </dl>

        <!-- Buyer/supplier leverage (UC-DSO-09) is computed and stored on
             ParsedCompanyEnrichment.BuyerLeverage/SupplierLeverage, but BuyerCardRow/
             EfBuyerCardStore never projects either column onto the single-buyer card this tab
             reads, so CustomerCardResponse carries neither today. Not the same gap G-376 already
             tracks: that row is about the unrelated debt/equity "leverage" AP's legacy tab shows,
             which G-369 gave its own caller and stays separately absent from AR. (ar-mvp-plan.md
             and uc-e11-opportunity-screens.md both cite this as "G-375" - that id is a different,
             unrelated gap-ledger row; G-369 is the one that actually matches their description.) -->
        <h6 class="text-muted text-uppercase small mt-1">{{ t('arEntityCard.companyDetails.sections.leverage') }}</h6>
        <dl class="row mb-0">
          <dt class="col-6 text-muted">{{ t('arEntityCard.companyDetails.fields.buyerLeverage') }}</dt>
          <dd class="col-6 text-end">{{ notAvailable }}</dd>

          <dt class="col-6 text-muted">{{ t('arEntityCard.companyDetails.fields.supplierLeverage') }}</dt>
          <dd class="col-6 text-end">{{ notAvailable }}</dd>
        </dl>
      </ContentBoxBody>
    </ContentBox>
  </div>
</div>
</template>

<script setup lang="ts">
/**
 * UC-UI-09: the Entity Card's Company Details tab - the buyer's profile, credit ratings,
 * industry risk and leverage in one tab. Company Details and Ratings/Metrics were separate tabs
 * in the source product; the scope document combines them into one here, so this component
 * renders both groups rather than being split the way AP's two screens are.
 *
 * Takes the whole card rather than one prop per field (unlike EntityCardOpportunityTab, which
 * only ever needed two): this tab surfaces most of CustomerCardResponse's profile and rating
 * fields, and EntityCardView has already loaded and validated it - a long prop list here would
 * just be the same object taken apart and reassembled by its caller.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ContentBox, ContentBoxBody, TooltipButton } from '@ada/design-system'
import type { CustomerCardResponse } from '@/api'
import { formatNumber } from '@/modules/match/utils/format'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { formatMoney } from '@/utils/moneyFormatting'
import BuyerCreditRating from '@/modules/buyers/components/BuyerCreditRating.vue'

type ProfileField = { label: string; value: string; tooltip?: string }

const props = defineProps<{ card: CustomerCardResponse }>()
const { t } = useI18n({ useScope: 'global' })
const currenciesStore = useArCurrenciesStore()

const notAvailable = computed(() => t('arMatch.progress.notAvailable'))

const orNotAvailable = (value: string | null): string => value ?? notAvailable.value

const yesNo = (value: boolean | null): string =>
  value === null ? notAvailable.value : t(`arEntityCard.companyDetails.yesNo.${value}`)

// formatNumber's own null fallback is "—", a different absent-value marker from the translated
// "Not available" every other field on this tab (and the summary strip's own creditLimit/parent)
// already use - two markers for the same state read as two different states. Substitutes the
// shared marker for null while keeping formatNumber's real-number formatting untouched, rather
// than duplicating the number formatting logic here.
const numberOrNotAvailable = (value: number | null): string =>
  value === null ? notAvailable.value : formatNumber(value)

/** The money counterpart of `numberOrNotAvailable` above, for the two fields on this tab that are
 * dollar amounts (creditLimit, annualRevenue) rather than a plain count/id (UC-UI-23) - the
 * shared marker is still what a null renders as, never a symbol glued onto it. */
const moneyOrNotAvailable = (value: number | null): string =>
  value === null ? notAvailable.value : formatMoney(value, currenciesStore.selectedCurrencySymbol)

const profileFields = computed<ProfileField[]>(() => {
  const c = props.card
  return [
    { label: t('arEntityCard.companyDetails.fields.country'), value: orNotAvailable(c.country) },
    { label: t('arEntityCard.companyDetails.fields.industry'), value: orNotAvailable(c.industry) },
    { label: t('arEntityCard.companyDetails.fields.legalForm'), value: orNotAvailable(c.legalForm) },
    { label: t('arEntityCard.companyDetails.fields.isPublic'), value: yesNo(c.isPublic) },
    { label: t('arEntityCard.companyDetails.fields.internalId'), value: orNotAvailable(c.internalId) },
    { label: t('arEntityCard.companyDetails.fields.parent'), value: orNotAvailable(c.parentName) },
    // numberOrNotAvailable renders null distinctly from a real 0 ("Not available" vs "0") - a
    // truthiness check here would collapse a genuine 0 (e.g. an actually-zero credit limit) into
    // "not available". UC-UI-21 FR-2/AF-1: a disclaimer rides along whenever there is a real
    // limit to caveat; null (nothing to caveat) carries none.
    {
      label: t('arEntityCard.companyDetails.fields.creditLimit'),
      value: moneyOrNotAvailable(c.creditLimit),
      tooltip: c.creditLimit === null ? undefined : t('arBuyers.table.tooltips.creditLimitDisclaimer'),
    },
    // companySizeId is a band's raw id (public.company_size), not a magnitude - shown as the bare
    // number rather than a resolved label because CompanySize (Ada.Ar.Domain.Catalog) carries no
    // name/label column and nothing exposes one to the front end, the same gap CustomerCardView's
    // own companySize row already has (match/views/CustomerCardView.vue). A real fix needs either
    // a name column ported from the monolith's public.company_size or a synthesized label from its
    // AnnualRevenueLimit/NumberEmployeesLimit bounds - a backend decision, not made here.
    { label: t('arEntityCard.companyDetails.fields.companySize'), value: numberOrNotAvailable(c.companySizeId) },
    { label: t('arEntityCard.companyDetails.fields.estimatedCompanySize'), value: yesNo(c.estimatedCompanySize) },
    { label: t('arEntityCard.companyDetails.fields.isCompanySizeFromParent'), value: yesNo(c.isCompanySizeFromParent) },
    { label: t('arEntityCard.companyDetails.fields.annualRevenue'), value: moneyOrNotAvailable(c.annualRevenue) },
    { label: t('arEntityCard.companyDetails.fields.annualRevenueIsEstimated'), value: yesNo(c.annualRevenueIsEstimated) },
    { label: t('arEntityCard.companyDetails.fields.employeesCount'), value: numberOrNotAvailable(c.employeesCount) },
  ]
})
</script>
