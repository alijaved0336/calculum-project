<template>
<CustomerCardTabSkeleton v-if="loading" :rows="skeletonRows" />

<NoDataAvailable
  v-else-if="notFound"
  :title="t('arCustomerCard.notFound')"
/>

<NoDataAvailable
  v-else-if="loadError"
  :title="t('arCustomerCard.loadError')"
/>

<div v-else-if="details" class="row g-3">
  <div class="col-12 col-xl-3 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base d-flex align-items-center gap-1">
          {{ t('arCustomerCard.ratingsAndMetrics.sections.companyCreditRating') }}
          <TooltipButton :text="companyCreditRatingTooltip" />
        </span>
      </template>
      <ContentBoxBody>
        <div class="row g-0 h-100">
          <div class="col-12 pe-md-3">
            <div class="d-flex gap-3">
              <div class="rating-grade-box flex-shrink-0">
                <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                  <DisplayText as="span" variant="sm" class="d-block text-gray-700 text-center mb-2" :title="valueTitle(companyCreditRating.grade)">{{ companyCreditRating.grade }}</DisplayText>
                </Tooltip>
              </div>
              <div class="d-flex flex-column justify-content-center gap-2">
                <div>
                  <div class="d-flex align-items-center gap-1 text-muted small">
                    {{ t('arCustomerCard.ratingsAndMetrics.fields.ratingDescription') }}
                    <TooltipButton :text="t('arCustomerCard.ratingsAndMetrics.tooltips.ratingDescription')" />
                  </div>                  
                  <!-- The description can run long: reuse TooltipButton's own popup class (global, kendo-tooltip.scss)
                       so the popup wraps at a readable width instead of one line off-screen. -->
                  <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'" tooltip-class-name="tooltip-button__popup">
                    <BodyText as="span" variant="lg" weight="semibold" class="rating-description-clamp text-gray-700" :title="companyCreditRating.ratingDescription">{{ companyCreditRating.ratingDescription }}</BodyText>
                  </Tooltip>
                </div>
                <div>
                  <div class="d-flex align-items-center gap-1 text-muted small">
                    {{ t('arCustomerCard.ratingsAndMetrics.fields.probabilityOfDefault') }}
                    <TooltipButton :text="t('arCustomerCard.ratingsAndMetrics.tooltips.probabilityOfDefault')" />
                  </div>
                  <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                    <BodyText as="span" variant="lg" weight="semibold" class="d-block text-gray-700" :title="valueTitle(companyCreditRating.probabilityOfDefault)">{{ companyCreditRating.probabilityOfDefault }}</BodyText>
                  </Tooltip>
                </div>
              </div>
            </div>            
            <div v-if="companyCreditRating.isEstimated" class="text-muted text-xs text-truncate mt-2">
              {{ t('home.entityCard.details.estimatedSource') }}
            </div>
          </div>       
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>
  <!-- Country Rating -->
  <div class="col-6 col-xl-3 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base d-flex align-items-center gap-1">
          {{ t('arCustomerCard.ratingsAndMetrics.sections.countryRating') }}
          <TooltipButton :text="t('arCustomerCard.ratingsAndMetrics.tooltips.countryRating')" />
        </span>
      </template>
      <ContentBoxBody class="d-flex flex-column h-100">
        <div class="d-flex align-items-center gap-2 mb-2">
          <img
            v-if="showCountryFlag"
            class="ar-country-flag"
            :src="countryRating.flagUrl ?? undefined"
            :alt="countryRating.countryName"
            :title="countryRating.countryName"
            loading="lazy"
            @error="onCountryFlagError"
          />
          <span class="text-muted small">{{ countryRating.countryName }}</span>
        </div>
        <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
          <DisplayText as="span" variant="sm" class="d-block text-gray-700 text-center mb-2" :title="valueTitle(countryRating.grade)">{{ countryRating.grade }}</DisplayText>
        </Tooltip>
        <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
          <div class="font-semibold text-xl text-center" :style="{ color: countryRating.riskColor }" :title="valueTitle(countryRating.ratingDescription)">{{ countryRating.ratingDescription }}</div>
        </Tooltip>
        <div v-if="countryRating.isEstimated" class="mt-auto pt-2">
          <div class="text-muted small">{{ t('arCustomerCard.ratingsAndMetrics.fields.source') }}</div>          
          <div class="text-muted small">{{ t('home.entityCard.details.estimatedSource') }}</div>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>
  <!-- Industry Risk -->
  <div class="col-6 col-xl-3 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base">{{ t('arCustomerCard.ratingsAndMetrics.sections.industryRisk') }}</span>
      </template>
      <ContentBoxBody class="d-flex flex-column h-100">
        <div class="fw-semibold small mb-2">{{ industryRisk.category }}</div>
        <div class="my-auto">
          <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
            <DisplayText as="span" variant="sm" class="d-block text-gray-700 text-center" :title="valueTitle(industryRisk.level)">{{ industryRisk.level }}</DisplayText>
          </Tooltip>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>
  <!-- Buyer Financial Metrics -->
  <div class="col-12 col-xl-3 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base d-flex align-items-center gap-1">
          {{ t('arCustomerCard.ratingsAndMetrics.sections.buyerFinancialMetrics') }}
          <TooltipButton :text="t('arCustomerCard.ratingsAndMetrics.tooltips.buyerFinancialMetrics')" />
        </span>
      </template>
      <ContentBoxBody>
        <div class="row rating-stat-box">
          <div class="col-6 rating-stat-box-content rating-stat-box-content-white">
            <div>
              <div class="text-muted small text-center">{{ t('arCustomerCard.ratingsAndMetrics.fields.dpoDays') }}</div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <DisplayText as="span" variant="sm" class="d-block text-gray-700 text-center" :title="valueTitle(buyerFinancialMetrics.dpoDays)">{{ buyerFinancialMetrics.dpoDays }}</DisplayText>
              </Tooltip>
            </div>
          </div>
          <div class="col-6 rating-stat-box-content">
            <div >
              <div class="text-muted small text-center">{{ t('arCustomerCard.ratingsAndMetrics.fields.revenueGrowth') }}</div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <DisplayText as="span" variant="sm" class="d-block text-gray-700 text-center" :title="valueTitle(buyerFinancialMetrics.revenueGrowthPercent)">{{ buyerFinancialMetrics.revenueGrowthPercent }}</DisplayText>
              </Tooltip>
            </div>
          </div>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>
  <!-- Exposure -->
  <div class="col-12 col-xl-4 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base d-flex align-items-center gap-1">
          {{ t('arCustomerCard.ratingsAndMetrics.sections.exposure') }}
          <TooltipButton :text="t('arCustomerCard.ratingsAndMetrics.tooltips.exposure')" />
        </span>
      </template>
      <ContentBoxBody>
        <div class="d-flex gap-3">
          <div class="exposure-main">
            <div class="row mx-0 rating-stat-box">
              <div class="col-6 rating-stat-box-content rating-stat-box-content-white">
                <div class="text-muted small text-center">{{ exposureItems[0].label }}</div>
                <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                  <DisplayText as="span" variant="sm" class="d-block text-gray-700 text-center" :title="exposureItems[0].title">{{ exposureItems[0].value }}</DisplayText>
                </Tooltip>
              </div>
              <div class="col-6 rating-stat-box-content">
                <div class="text-muted small text-center">{{ exposureItems[1].label }}</div>
                <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                  <DisplayText as="span" variant="sm" class="d-block text-gray-700 text-center" :title="exposureItems[1].title">{{ exposureItems[1].value }}</DisplayText>
                </Tooltip>
              </div>
            </div>
            <div class="row g-0 mt-1">
              <div class="col-6">
                <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                  <div class="text-muted small text-center" :title="exposureItems[0].parentTitle">{{ exposureItems[0].parentLabel }}</div>
                </Tooltip>
              </div>
              <div class="col-6">
                <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                  <div class="text-muted small text-center" :title="exposureItems[1].parentTitle">{{ exposureItems[1].parentLabel }}</div>
                </Tooltip>
              </div>
            </div>
          </div>
          <div class="exposure-ratio">
            <div class="row mx-0 rating-stat-box">
              <div class="col-12 rating-stat-box-content rating-stat-box-content-white">
                <div class="text-muted small text-center">{{ exposureItems[2].label }}</div>
                <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                  <DisplayText as="span" variant="sm" class="d-block text-gray-700 text-center" :title="valueTitle(exposureItems[2].value)">{{ exposureItems[2].value }}</DisplayText>
                </Tooltip>
              </div>
            </div>
            <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
              <div class="text-muted small mt-1 text-center" :title="exposureItems[2].parentTitle">{{ exposureItems[2].parentLabel }}</div>
            </Tooltip>
          </div>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <!-- Credit Limit -->
  <div class="col-12 col-xl-3 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base d-flex align-items-center gap-1">
          {{ t('arCustomerCard.ratingsAndMetrics.sections.creditLimit') }}
          <TooltipButton v-if="hasCreditLimit" :text="t('arBuyers.table.tooltips.creditLimitDisclaimer')" />
        </span>
      </template>
      <ContentBoxBody class="d-flex flex-column h-100">
        <div class="row mx-0 rating-stat-box">
          <div class="col-6 rating-stat-box-content rating-stat-box-content-white">
            <div>
              <div class="text-muted small">{{ t('arCustomerCard.ratingsAndMetrics.fields.limit') }}</div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <DisplayText as="span" variant="sm" class="d-block text-gray-700 text-center" :title="creditLimit.limitTitle">{{ creditLimit.limit }}</DisplayText>
              </Tooltip>
            </div>
          </div>
          <div class="col-6 rating-stat-box-content">
            <div>
              <div class="text-muted small">{{ t('arCustomerCard.ratingsAndMetrics.fields.percentUsed') }}</div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <DisplayText as="span" variant="sm" class="d-block text-gray-700 text-center" :title="valueTitle(creditLimit.percentUsed)">{{ creditLimit.percentUsed }}</DisplayText>
              </Tooltip>
            </div>
          </div>
        </div>
        <!-- <div class="text-muted small mt-auto pt-3">{{ t('arCustomerCard.ratingsAndMetrics.fields.source') }}: {{ creditLimit.source }}</div> -->
      </ContentBoxBody>
    </ContentBox>
  </div>

  <!-- Credit Limit vs Outstandings -->
  <div class="col-12 col-xl-5 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base d-flex align-items-center gap-1">
          {{ t('arCustomerCard.ratingsAndMetrics.sections.creditLimitVsOutstandings') }}
          <TooltipButton v-if="hasCreditLimit" :text="t('arBuyers.table.tooltips.creditLimitDisclaimer')" />
        </span>
      </template>
      <ContentBoxBody class="d-flex flex-column justify-content-center h-100">
        <div class="d-flex gap-4">
          <div class="d-flex flex-column gap-2 flex-grow-1">
            <RatingComparisonBar
              v-for="row in creditLimitVsOutstandingsBars"
              :key="row.label"
              :label="row.label"
              :display-value="row.value"
              :percent="row.percent"
              :variant="row.variant"
              :value-title="row.title"
            />
          </div>
          <!-- <div class="d-flex flex-column align-items-center justify-content-center flex-shrink-0 text-center rating-insurance">
            <div class="text-muted small mb-1">{{ t('arCustomerCard.ratingsAndMetrics.fields.creditInsurance') }}</div>
            <div class="fw-semibold">{{ NOT_BACKED }}</div>
          </div> -->
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <!-- Supplier Leverage -->
  <div class="col-12 col-xl-4 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base d-flex align-items-center gap-1">
          {{ t('arCustomerCard.ratingsAndMetrics.sections.supplierLeverage') }}
          <TooltipButton :text="t('arCustomerCard.ratingsAndMetrics.tooltips.supplierLeverage')" />
        </span>
      </template>
      <ContentBoxBody>
        <div class="row rating-stat-box">
          <div class="col-6 rating-stat-box-content rating-stat-box-content-white">
            <div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <DisplayText as="span" variant="sm" class="d-block text-gray-700 text-center" :title="valueTitle(supplierLeverage.level)">{{ supplierLeverage.level }}</DisplayText>
              </Tooltip>
            </div>
          </div>
          <div class="col-6 rating-stat-box-content">
            <div class="rating-market-share">
              <div class="text-muted small text-center">{{ t('arCustomerCard.ratingsAndMetrics.fields.marketShare') }}</div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <BodyText as="span" variant="lg" weight="semibold" class="d-block text-gray-700 text-center" :title="valueTitle(supplierLeverage.marketShare)">{{ supplierLeverage.marketShare }}</BodyText>
              </Tooltip>
            </div>

            <div class="rating-switching-cost">
              <div class="text-muted small text-center">{{ t('arCustomerCard.ratingsAndMetrics.fields.switchingCost') }}</div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <BodyText as="span" variant="lg" weight="semibold" class="d-block text-gray-700 text-center" :title="valueTitle(supplierLeverage.switchingCost)">{{ supplierLeverage.switchingCost }}</BodyText>
              </Tooltip>
            </div>
          </div>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <!-- Buyer Leverage -->
  <div class="col-12 col-xl-4 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base d-flex align-items-center gap-1">
          {{ t('arCustomerCard.ratingsAndMetrics.sections.buyerLeverage') }}
          <TooltipButton :text="t('arCustomerCard.ratingsAndMetrics.tooltips.buyerLeverage')" />
        </span>
      </template>
      <ContentBoxBody>
        <div class="row rating-stat-box">
          <div class="col-6 rating-stat-box-content rating-stat-box-content-white">
            <div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <DisplayText as="span" variant="sm" class="d-block text-gray-700 text-center" :title="valueTitle(buyerLeverage.level)">{{ buyerLeverage.level }}</DisplayText>
              </Tooltip>
            </div>
          </div>
          <div class="col-6 rating-stat-box-content">
            <div>
              <div class="text-muted small text-center">{{ t('arCustomerCard.ratingsAndMetrics.fields.percentOfTotalSales') }}</div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <BodyText as="span" variant="lg" weight="semibold" class="d-block text-gray-700 text-center" :title="valueTitle(buyerLeverage.percentOfTotalSales)">{{ buyerLeverage.percentOfTotalSales }}</BodyText>
              </Tooltip>
            </div>
          </div>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <!-- Buyer Financing Rate -->

  <div class="col-12 col-xl-4 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="mb-1 font-bold text-base d-flex align-items-center gap-1">
          {{ t('arCustomerCard.ratingsAndMetrics.sections.buyerFinancingRate') }}
          <TooltipButton :text="t('arCustomerCard.ratingsAndMetrics.tooltips.buyerFinancingRate')" />
        </span>
      </template>
      <ContentBoxBody>
        <div class="row rating-stat-box">
          <div class="col-6 rating-stat-box-content rating-stat-box-content-white">
            <div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <DisplayText as="span" variant="sm" class="d-block text-gray-700 text-center" :title="valueTitle(buyerFinancingRate.rate)">{{ buyerFinancingRate.rate }}</DisplayText>
              </Tooltip>
            </div>
          </div>
          <div class="col-6 rating-stat-box-content">
            <div>
              <div class="text-muted small text-center">{{  t('arCustomerCard.ratingsAndMetrics.fields.baseRate') }}</div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <BodyText as="span" variant="lg" weight="semibold" class="d-block text-gray-700 text-center" :title="valueTitle(buyerFinancingRate.baseRate)">{{ buyerFinancingRate.baseRate }}</BodyText>
              </Tooltip>
            </div>

            <div>
              <div class="text-muted small text-center">{{ t('arCustomerCard.ratingsAndMetrics.fields.costOfDebt') }}</div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <BodyText as="span" variant="lg" weight="semibold" class="d-block text-gray-700 text-center" :title="valueTitle(buyerFinancingRate.costOfDebt)">{{ buyerFinancingRate.costOfDebt }}</BodyText>
              </Tooltip>
            </div>
          </div>
        </div>

      </ContentBoxBody>
    </ContentBox>
  </div>
</div>
</template>

<script setup lang="ts">
/**
 * CustomerCardView's Ratings & Metrics tab. Fetches `BuyerRatingsMetricsResponse` (the "Buyer Card
 * API, endpoint 2 of 4" - Company Credit Rating, Country Rating, Data Depth, Financial Metrics),
 * same loading/notFound/loadError shape as the other three tabs now, via `useBuyerRatingsMetrics`
 * (uuid-scoped, same as `useBuyerCompanyDetails`).
 *
 * That one response backs only PART of this tab's own reference-design mock, though. Two distinct
 * "no value" states read differently on purpose: `orNotAvailable` ("—") is for a real, backed
 * field that happens to be `null` for this particular buyer; `NOT_BACKED` ("-") is for a field (or
 * a whole card) this endpoint simply does not carry yet, regardless of buyer. What's real vs not:
 *   - Company Credit Rating, Country Rating, and Buyer Financial Metrics (DPO/Revenue Growth) map
 *     cleanly onto real fields and are wired for real.
 *   - Credit Rating Comparison has been pulled from the layout (commented out, not deleted) -
 *     "Similar Buyers"/"Total Sales" had no peer/portfolio comparison to back them at all, only
 *     "Company" (the real credit rating) was ever real.
 *   - Industry Risk: `industryRating` (root) IS real and wired for real (category/level/level
 *     description/color) - only "Source" reads `NOT_BACKED`, since unlike `countryRating` this
 *     object carries no source field of its own. `industryRiskScore`/`industryRiskFlag` are a
 *     SEPARATE, still-unbacked placeholder pair the backend reserved before `industryRating`
 *     existed - not read here, do not confuse the two. `industryRating.industryInfo`'s free-text
 *     commentary has no card yet, same situation as `countryRating.countryInfo`/`.countryAmBestInfo`.
 *   - Credit Limit and Credit Limit vs Outstandings: `creditLimitOutsanding.limitMax`/`.outstanding`/
 *     `.outstandingWithPastDue`/`.usage` ARE real and wired for real, including each bar's own fill
 *     (`value / limitMax`, clamped) - only "Source" and the Credit Insurance badge read
 *     `NOT_BACKED`, since this response has no source or insurance field.
 *   - Exposure: `exposure.totalSales`/`.outstanding`/`.outstandingToSalesRatio` ARE real and wired
 *     for real, each with its own `parent*` counterpart as its "Parent" line.
 *   - Supplier Leverage / Buyer Leverage: `supplierLeverageLevel`/`buyerLeverage` (root) ARE real
 *     and wired for real, and so, since UC-UI-26, are the Supplier Leverage card's Market Share and
 *     Switching Cost slots (`marketShareLevel`/`switchingCostLevel`) - each renders the backend's
 *     own Low/Medium/High band, never a re-banded figure (G-746) and never the raw
 *     `supplierLeverage` fraction the two slots showed before that fix. `buyerLeverage.level`
 *     renders `buyerLeverageLevel` (root), same band contract as `supplierLeverageLevel`.
 *   - Buyer Financing Rate: `financialMetrics.fundingCosts.entity.value`/`.baseRate`/`.finalSpread`
 *     ARE real and wired for real - the big rate, "Base Rate" and "Cost of Debt (Credit Spread)".
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { BodyText, ContentBox, ContentBoxBody, DisplayText, NoDataAvailable, Tooltip, TooltipButton } from '@ada/design-system'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { formatMoneyCompact, formatMoneyTooltip } from '@/utils/moneyFormatting'
import { withDisclaimer } from '@/utils/disclaimers'
import { useBuyerRatingsMetrics } from '../../composables/useBuyerRatingsMetrics'
import RatingComparisonBar from './bars/RatingComparisonBar.vue'
import CustomerCardTabSkeleton, { type CustomerCardSkeletonCard } from './CustomerCardTabSkeleton.vue'

const props = defineProps<{ versionId: string; buyerId: string }>()
const { t } = useI18n({ useScope: 'global' })
const currenciesStore = useArCurrenciesStore()

const { loading, notFound, loadError, details } = useBuyerRatingsMetrics(() => props.buyerId)

const skeletonRows: CustomerCardSkeletonCard[][] = [
  [{ col: 'col-12 col-xl-5', lines: 4 }, { col: 'col-6 col-xl-2', lines: 3 }, { col: 'col-6 col-xl-2', lines: 3 }, { col: 'col-12 col-xl-3', lines: 2 }],
  [{ col: 'col-12 col-xl-4', lines: 3 }, { col: 'col-12 col-xl-3', lines: 2 }, { col: 'col-12 col-xl-5', lines: 3 }],
  [{ col: 'col-12 col-xl-4', lines: 2 }, { col: 'col-12 col-xl-4', lines: 2 }, { col: 'col-12 col-xl-4', lines: 2 }],
]

/** A field with no backend value at all (a section this endpoint doesn't cover yet, or one of its
 * pieces the endpoint doesn't carry) - distinct from `orNotAvailable`'s "—", which is for a real,
 * backed field that happens to be `null` for this particular buyer. */
const NOT_BACKED = '-'

const orNotAvailable = (value: string | null | undefined): string => value ?? t('arCustomerCard.notAvailable')

const formatPercent = (fraction: number | null | undefined, decimals = 2): string =>
  fraction === null || fraction === undefined ? t('arCustomerCard.notAvailable') : `${(fraction * 100).toFixed(decimals)}%`

/** Hover tooltip for a non-money value - the value as shown, or none for an empty / not-available
 * placeholder (Kendo's `Tooltip` only opens on a non-empty `title`). */
const valueTitle = (value: string | null | undefined): string | undefined =>
  !value || value === NOT_BACKED || value === t('arCustomerCard.notAvailable') ? undefined : value

/** Hover tooltip for a compact money value - the full figure, or none when there's no value
 * (Kendo's `Tooltip` only opens on a non-empty `title`). */
const moneyTitle = (value: number | null | undefined): string | undefined =>
  value === null || value === undefined ? undefined : formatMoneyTooltip(value, currenciesStore.selectedCurrencySymbol)

const sourceLabel = (source: string | null | undefined): string => {
  if (source === 'internal' || source === 'external') {
    return t(`arCustomerCard.ratingsAndMetrics.sources.${source}`)
  }
  return orNotAvailable(source)
}

/** AP's own `EntityCardTextArc.vue` shows an "Estimated" note under `source` whenever
 * `isInternalOverride || source?.toLowerCase() === 'internal'` - AR has no equivalent to
 * `isInternalOverride` (a Super Admin manual override this app doesn't have), so only the
 * `source === 'internal'` half of that check applies here. */
const isInternalSource = (source: string | null | undefined): boolean => source?.toLowerCase() === 'internal'

const companyCreditRating = computed(() => {
  const d = details.value
  return {
    grade: orNotAvailable(d?.creditScore?.rating),
    // The level of the company's own credit_score_reference row, the one its grade comes from -
    // never the country's band: a CCC+ buyer in an AA+ country read "Very Strong Credit Rating" (AB#21151).
    ratingDescription: orNotAvailable(d?.creditScore?.level),
    probabilityOfDefault: formatPercent(d?.probabilityOfDefault),
    source: sourceLabel(d?.creditScore?.source),
    isEstimated: isInternalSource(d?.creditScore?.source),
  }
})

// UC-UI-21 FR-1/AF-1: appended to the existing "how it's derived" tooltip rather than replacing
// it, and only when there is a real rating to caveat.
const companyCreditRatingTooltip = computed(() =>
  withDisclaimer(
    t('arCustomerCard.ratingsAndMetrics.tooltips.companyCreditRating'),
    t('arBuyers.table.tooltips.creditRatingDisclaimer'),
    details.value?.creditScore?.rating != null,
  ),
)

const countryRating = computed(() => {
  const c = details.value?.countryRating
  return {
    countryName: orNotAvailable(c?.countryName),
    grade: orNotAvailable(c?.spRating ?? c?.moodysRating ?? c?.fitchRating),
    ratingDescription: orNotAvailable(c?.creditScoreBand?.description),
    source: sourceLabel(c?.source),
    isEstimated: isInternalSource(c?.source),
    riskColor: c?.creditScoreBand?.color ?? 'var(--status-success)',
    flagUrl: c?.flagUrl ?? null,
  }
})

/** Same `showFlag`/`onFlagError` pattern `@ada/design-system`'s own `SupplierCard` uses for its
 * own flag image (`supplier-card/Index.vue`) - a flag that 404s hides itself rather than showing
 * a broken-image icon, and resets back to "try again" the moment a fresher `flagUrl` comes in. */
const brokenCountryFlag = ref(false)
watch(
  () => countryRating.value.flagUrl,
  () => {
    brokenCountryFlag.value = false
  },
)
const showCountryFlag = computed(() => Boolean(countryRating.value.flagUrl) && !brokenCountryFlag.value)
function onCountryFlagError(): void {
  brokenCountryFlag.value = true
}

const buyerFinancialMetrics = computed(() => {
  const m = details.value?.financialMetrics
  return {
    dpoDays: m?.dsoStrategy?.terms != null ? String(m.dsoStrategy.terms) : t('arCustomerCard.notAvailable'),
    revenueGrowthPercent: m?.revenueGrowth != null ? `${m.revenueGrowth}%` : t('arCustomerCard.notAvailable'),
  }
})

// --- Everything below reads NOT_BACKED for any piece `BuyerRatingsMetricsResponse` doesn't carry
// - see this component's own doc for which is which. ---

/** `industryRating` (root) IS real and wired for real - `source` still reads `NOT_BACKED`, since
 * unlike `countryRating`/`creditScoreSource` this object carries no source field of its own. */
const industryRisk = computed(() => {
  const i = details.value?.industryRating
  return {
    category: orNotAvailable(i?.industryName),
    level: orNotAvailable(i?.assessmentBand?.description),
    levelDescription: orNotAvailable(i?.atradiusScore),
    source: NOT_BACKED,
    levelColor: i?.assessmentBand?.color ?? 'var(--status-success)',
  }
})

/** All three stats and their "Parent" lines come from `exposure`. Outstandings reads
 * `exposure.outstanding` (past dues included), not `creditLimitOutsanding.outstanding`, so it
 * squares with `outstandingToSalesRatio`. */
const exposureItems = computed(() => {
  const e = details.value?.exposure
  const symbol = currenciesStore.selectedCurrencySymbol
  const parentLabel = (value: string): string => `${t('arCustomerCard.ratingsAndMetrics.fields.parent')}: ${value}`
  const parentTitle = (value: number | null | undefined): string | undefined => {
    const full = moneyTitle(value)
    return full === undefined ? undefined : parentLabel(full)
  }
  return [
    { label: t('arCustomerCard.ratingsAndMetrics.fields.totalSales'), value: formatMoneyCompact(e?.totalSales ?? null, symbol), title: moneyTitle(e?.totalSales), parentLabel: parentLabel(formatMoneyCompact(e?.parentTotalSales ?? null, symbol)), parentTitle: parentTitle(e?.parentTotalSales) },
    { label: t('arCustomerCard.ratingsAndMetrics.fields.outstandings'), value: formatMoneyCompact(e?.outstanding ?? null, symbol), title: moneyTitle(e?.outstanding), parentLabel: parentLabel(formatMoneyCompact(e?.parentOutstanding ?? null, symbol)), parentTitle: parentTitle(e?.parentOutstanding) },
    { label: t('arCustomerCard.ratingsAndMetrics.fields.percentOfOutstandingsSales'), value: formatPercent(e?.outstandingToSalesRatio), parentLabel: parentLabel(formatPercent(e?.parentOutstandingToSalesRatio)), parentTitle: e?.parentOutstandingToSalesRatio == null ? undefined : parentLabel(formatPercent(e.parentOutstandingToSalesRatio)) },
  ]
})

/** `creditLimitOutsanding.limitMax`/`.outstanding`/`.outstandingWithPastDue`/`.usage` ARE real,
 * wired for real - "Source" stays `NOT_BACKED`: this response has no source field for this card
 * the way `creditScore.source`/`countryRating.source` back the other two rating cards. */
const creditLimit = computed(() => {
  const c = details.value?.creditLimitOutsanding
  return {
    limit: formatMoneyCompact(c?.limitMax ?? null, currenciesStore.selectedCurrencySymbol),
    limitTitle: moneyTitle(c?.limitMax),
    percentUsed: formatPercent(c?.usage),
    source: NOT_BACKED,
  }
})

// UC-UI-21 FR-2/AF-1: this card had no tooltip at all before this story - no explanation to
// preserve, so the disclaimer is the whole of it, and only when there is a real limit to caveat.
const hasCreditLimit = computed(() => details.value?.creditLimitOutsanding?.limitMax != null)

/** Each bar's fill is relative to `limitMax` (the ceiling) - 100% for the limit itself, and
 * `value / limitMax` (clamped to 100) for the two outstanding figures. `0` (an empty bar) whenever
 * `limitMax` is missing, since there is then nothing to measure either figure against. */
const creditLimitVsOutstandingsBars = computed<Array<{ label: string; value: string; title: string | undefined; percent: number; variant: 'primary' | 'secondary' | 'tertiary' }>>(() => {
  const c = details.value?.creditLimitOutsanding
  const max = c?.limitMax ?? null
  const outstanding = details.value?.exposure?.outstanding ?? null
  const ratioToLimit = (value: number | null | undefined): number => {
    if (value == null || max == null || max <= 0) {
      return 0
    }
    return Math.min(100, (value / max) * 100)
  }

  // `max == null ? 0 : 100`, not `max != null ? 100 : 0` (PR 14881 review, SonarQube
  // typescript:S7735 "Unexpected negated condition"): same value either way, only the condition's
  // own polarity changed, to the non-negated form the rule expects.
  return [
    { label: t('arCustomerCard.ratingsAndMetrics.sections.creditLimit'), value: formatMoneyCompact(max, currenciesStore.selectedCurrencySymbol), title: moneyTitle(max), percent: max == null ? 0 : 100, variant: 'primary' },
    // `exposure.outstanding` (past dues included) - same figure as the Exposure card's own
    // Outstandings; `creditLimitOutsanding.outstanding` excludes past dues.
    { label: t('arCustomerCard.ratingsAndMetrics.fields.outstandings'), value: formatMoneyCompact(outstanding, currenciesStore.selectedCurrencySymbol), title: moneyTitle(outstanding), percent: ratioToLimit(outstanding), variant: 'secondary' },
    { label: t('arCustomerCard.ratingsAndMetrics.fields.outstandingsWithoutPastDues'), value: formatMoneyCompact(c?.outstandingWithPastDue ?? null, currenciesStore.selectedCurrencySymbol), title: moneyTitle(c?.outstandingWithPastDue), percent: ratioToLimit(c?.outstandingWithPastDue), variant: 'tertiary' },
  ]
})

/** UC-UI-26: Market Share and Switching Cost render only the backend's own Low/Medium/High band
 * (`marketShareLevel`/`switchingCostLevel`) - never a re-banded 0-100 figure (G-746), and never
 * `formatPercent(supplierLeverage)`'s raw fraction, which is what these two slots showed before
 * this fix (mislabelled as "Market Share" and "Category Criticality Factor" - the latter had no
 * backend bucket at all and is retired). The headline `level` stays `supplierLeverageLevel`,
 * unchanged. */
const supplierLeverage = computed(() => ({
  level: details.value?.supplierLeverageLevel ?? NOT_BACKED,
  marketShare: details.value?.marketShareLevel ?? NOT_BACKED,
  switchingCost: details.value?.switchingCostLevel ?? NOT_BACKED,
}))

const buyerLeverage = computed(() => ({
  level: details.value?.buyerLeverageLevel ?? NOT_BACKED,
  percentOfTotalSales: formatPercent(details.value?.buyerLeverage),
}))

/** `financialMetrics.fundingCosts.entity` - the combined rate (`value`) with its base-rate and
 * credit-spread (`finalSpread`) components, all 0-1 fractions. */
const buyerFinancingRate = computed(() => {
  const f = details.value?.financialMetrics?.fundingCosts?.entity
  return {
    rate: formatPercent(f?.value),
    baseRate: formatPercent(f?.baseRate),
    costOfDebt: formatPercent(f?.finalSpread),
  }
})
</script>

<style scoped>
.rating-grade-box {
  width: 96px;
  height: 96px;
  border-radius: var(--border-radius-2);
  background: var(--bg-surface-subtle-1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rating-description-clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.rating-grade-box__value {
  font-size: 1.5rem;
  font-weight: 700;
}

.rating-big-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
}

.rating-stat-box {
  background: var(--bg-surface-subtle-1);
  border-radius: var(--border-radius-2);
  padding: 0.5rem 0.5rem;
  height: 150px;
}

.rating-stat-box-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-2);
}

.rating-stat-box-content-white {
  background: #ffffff;
}

/* Flex instead of a nested Bootstrap row: the row's negative gutters pushed the stat boxes past
   the ContentBox padding. Same 2:1 split as the old col-8/col-4. */
.exposure-main {
  flex: 2 1 0;
  min-width: 0;
}

.exposure-ratio {
  flex: 1 1 0;
  min-width: 0;
}

.rating-insurance {
  min-width: 96px;
}

@media (min-width: 768px) {
  .rating-split-right {
    border-left: 1px solid var(--border-color-default);
  }
}
</style>
