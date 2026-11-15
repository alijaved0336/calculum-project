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
  <!-- AB#20657: while the figures a Target save/clear queued recalculate, until the tab refetches. -->
  <CalculumLoadingAr v-if="awaitingRefresh" modal data-testid="target-refresh-loading" />

  <!-- Sale line tabs - only present when this buyer has `salesLines` (see this component's own
       prop doc for where they come from); one tab per line, no line content behind it yet. -->
  <div v-if="salesLineTabs.length > 0" class="col-12 sale-line-tabs">
    <CustomTabs
      :items="salesLineTabs"
      :model-value="activeSalesLineTab"
      appearance="underline"
      :contained="false"
      @update:model-value="onSalesLineTabChange"
    />
  </div>

  <!-- Top metrics strip - each group is its own ContentBox, matching CustomerCardRatingNMetrics's
       own card pattern (white ContentBoxBody, 1px border, no filled background) rather than a
       flat divider-separated bar. -->
  <div class="col-12 col-xl-2 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <ContentBoxBody>
        <div class="d-flex align-items-center gap-1 text-muted  small mb-1">
          {{ t('arCustomerCard.opportunity.topBar.salesVolume') }}
          <TooltipButton :text="t('arCustomerCard.opportunity.topBar.salesVolumeTooltip')" />
        </div>
        <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
          <DisplayText as="span" variant="md" class="d-block text-gray-700 text-truncate" :title="valueTitle(topBar.salesVolumeTooltip)">{{ topBar.salesVolume }}</DisplayText>
        </Tooltip>
        <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
          <div v-if="parentId !== null" class="text-muted text-xs text-truncate" :title="valueTitle(topBar.salesVolumeParentTooltip,t('arCustomerCard.opportunity.topBar.parent'))">
            {{ t('arCustomerCard.opportunity.topBar.parent') }} {{ topBar.salesVolumeParent }}
          </div>
        </Tooltip>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <div class="col-12 col-xl-3 d-flex flex-column">
    <ContentBox :isTransparent="true" class="flex-grow-1">
      <ContentBoxBody >
        <div class="d-flex gap-4">
          <div class="opportunity-equal-col">
            <div class="d-flex align-items-center gap-1 text-muted  small mb-1">
              {{ t('arCustomerCard.opportunity.topBar.salesMateriality') }}
              <TooltipButton :text="t('arCustomerCard.opportunity.topBar.salesMaterialityTooltip')" />
            </div>
            <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
              <DisplayText as="span" variant="md" class="d-block text-gray-700 text-truncate" :title="valueTitle(topBar.salesMateriality)">{{ topBar.salesMateriality }}</DisplayText>
            </Tooltip>
          </div>
          <div class="opportunity-highlight-box opportunity-equal-col">
            <div class="d-flex align-items-center gap-1 text-muted  small mb-1">
              {{ t('arCustomerCard.opportunity.topBar.supplierEntities') }}
              <TooltipButton :text="t('arCustomerCard.opportunity.topBar.supplierEntitiesTooltip')" />
            </div>
            <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
              <BodyText as="span" variant="lg" weight="semibold" class="d-block text-gray-700 text-truncate" :title="valueTitle(topBar.supplierEntity)">{{ topBar.supplierEntity }}</BodyText>
            </Tooltip>
          </div>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <div class="col-12 col-xl-1 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <ContentBoxBody>
        <div class="d-flex align-items-center gap-1 text-muted  small mb-1">
          {{ t('arCustomerCard.opportunity.topBar.invoiceCurrency') }}
          <TooltipButton :text="t('arCustomerCard.opportunity.topBar.invoiceCurrencyTooltip')" />
        </div>
        <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
          <DisplayText as="span" variant="md" class="d-block text-gray-700 text-truncate" :title="valueTitle(topBar.invoiceCurrency)">{{ topBar.invoiceCurrency }}</DisplayText>
        </Tooltip>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <div class="col-12 col-xl-4 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <ContentBoxBody>
        <div class="d-flex gap-4">
          <div class="opportunity-equal-col">
            <div class="d-flex align-items-center gap-1 text-muted  small mb-1">
              {{ t('arCustomerCard.opportunity.topBar.creditLimit') }}
              <TooltipButton :text="creditLimitTooltip" />
            </div>
            <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
              <DisplayText as="span" variant="md" class="d-block text-gray-700 text-truncate" :title="valueTitle(topBar.creditLimitTooltip)">{{ topBar.creditLimit }}</DisplayText>
            </Tooltip>
            <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
              <div v-if="parentId !== null" class="text-muted text-xs text-truncate" :title="valueTitle(topBar.creditLimitParentTooltip,t('arCustomerCard.opportunity.topBar.parent'))">
                {{ t('arCustomerCard.opportunity.topBar.parent') }} {{ topBar.creditLimitParent }}
              </div>
            </Tooltip>
          </div>
          <div class="opportunity-equal-col">
            <div class="text-muted  small mb-1">{{ t('arCustomerCard.opportunity.topBar.creditInsurance') }}</div>
            <div class="d-flex align-items-center gap-1">
              <span v-if="topBar.isInsured" class="opportunity-insured-dot">✓</span>
              <Tooltip class="opportunity-truncate-host" :open-delay="50" :anchor-element="'target'" :position="'top'">
                <BodyText as="span" variant="lg" weight="semibold" class="d-block text-gray-700 text-truncate" :title="valueTitle(topBar.insuredLabel)">{{ topBar.insuredLabel }}</BodyText>
              </Tooltip>
            </div>
          </div>
          <div class="opportunity-highlight-box opportunity-equal-col">
            <div class="d-flex align-items-center gap-1 text-muted  small mb-1">
              {{ t('arCustomerCard.opportunity.topBar.creditRating') }}
              <TooltipButton v-if="topBar.hasCreditRating" :text="t('arBuyers.table.tooltips.creditRatingDisclaimer')" />
            </div>
            <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
              <DisplayText as="span" variant="md" class="d-block text-gray-700 text-truncate" :title="valueTitle(topBar.creditRating)">{{ topBar.creditRating }}</DisplayText>
            </Tooltip>
          </div>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <div class="col-12 col-xl-2 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <ContentBoxBody>
        <div class="d-flex align-items-center gap-1 text-muted  small mb-1">
          {{ t('arCustomerCard.opportunity.topBar.parentOrganization') }}
          <TooltipButton :text="t('arCustomerCard.opportunity.topBar.parentOrganizationTooltip')" />
        </div>
        <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
          <DisplayText as="span" variant="sm" class="d-block text-gray-700 text-truncate" :title="valueTitle(topBar.parentOrganization)">{{ topBar.parentOrganization }}</DisplayText>



        </Tooltip>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <!-- Payment Terms -->
  <div class="col-12 col-xl-3 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <div class="d-flex align-items-center gap-1">
          <span class="font-bold text-base">{{ t('arCustomerCard.opportunity.paymentTerms.title') }}</span>
          <TooltipButton :text="t('arCustomerCard.opportunity.paymentTerms.titleTooltip')" />
        </div>
      </template>
      <ContentBoxBody class="d-flex align-items-center justify-content-center">
        <div class="d-flex align-items-center gap-2 w-100">
          <!-- Contractual column: plain, no highlight -->
          <div class="d-flex flex-column gap-3 flex-grow-1 text-center">
            <div class="opportunity-term-plain-col">
              <div class="d-flex align-items-center justify-content-center gap-1 text-muted small">
                {{ t('arCustomerCard.opportunity.paymentTerms.contractual') }}
                <TooltipButton :text="t('arCustomerCard.opportunity.paymentTerms.contractualTooltip')" />
              </div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <DisplayText as="span" variant="md" class="d-block text-gray-700" :title="valueTitle(paymentTerms.contractual)">{{ paymentTerms.contractual }}</DisplayText>
              </Tooltip>
              <div class="text-muted text-xs">{{ t('arCustomerCard.opportunity.paymentTerms.pastDues') }}: {{ paymentTerms.contractualPastDues }}</div>
            </div>
            <div>
              <div class="d-flex align-items-center justify-content-center gap-1 text-muted small">
                {{ t('arCustomerCard.opportunity.paymentTerms.outstandings') }}
                <TooltipButton :text="t('arCustomerCard.opportunity.paymentTerms.outstandingsTooltip')" />
              </div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <DisplayText as="span" variant="md" class="d-block text-gray-700" :title="valueTitle(paymentTerms.outstandingsContractualTooltip)">{{ paymentTerms.outstandingsContractual }}</DisplayText>
              </Tooltip>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <div class="text-muted text-xs" :title="valueTitle(paymentTerms.outstandingsContractualPastDuesTooltip, `${t('arCustomerCard.opportunity.paymentTerms.pastDues')}:`)">{{ t('arCustomerCard.opportunity.paymentTerms.pastDues') }}: {{ paymentTerms.outstandingsContractualPastDues }}</div>
              </Tooltip>
            </div>
          </div>

          <div class="opportunity-arrow">→</div>

          <!-- Opportunity column: one highlighted box spanning both stat rows -->
          <div class="d-flex flex-column gap-3 flex-grow-1 text-center">
            <div class="opportunity-term-plain-col">
              <div class="d-flex align-items-center justify-content-center gap-1 small ">
                {{ t('arCustomerCard.opportunity.paymentTerms.opportunityTarget') }}
                <TooltipButton :text="t('arCustomerCard.opportunity.paymentTerms.opportunityTooltip')" />
              </div>
              <div class="d-flex align-items-center justify-content-center gap-1">
                <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                  <DisplayText as="span" variant="md" class="d-block text-brand-500" data-testid="opportunity-target-value" :title="valueTitle(paymentTerms.opportunity)">{{ paymentTerms.opportunity }}</DisplayText>
                </Tooltip>
                <!-- AB#20657 FR-01: opens the Target modal. Disabled while the version recalculates
                     (FR-10) - a save then would be refused anyway. -->
                <CustomButton
                  :text="paymentTerms.hasTarget
                    ? t('arCustomerCard.opportunity.paymentTerms.editTarget')
                    : t('arCustomerCard.opportunity.paymentTerms.addTarget')"
                  icon="edit"
                  variant="plain"
                  size="xxs"
                  :show-label="false"
                  :disabled="!canEditTarget"
                  data-testid="target-edit"
                  @click="targetModalOpen = true"
                />
              </div>
              <CustomBadge
                v-if="paymentTerms.hasTarget"
                :text="t('arCustomerCard.opportunity.paymentTerms.targetBadge')"
                variant="info"
                :dot="false"
                data-testid="target-badge"
              />
              <div class="text-xs ">{{ t('arCustomerCard.opportunity.paymentTerms.pastDues') }}: {{ paymentTerms.opportunityPastDues }}</div>
              <BodyText
                v-if="targetNotice"
                as="div"
                variant="sm"
                class="text-xs"
                :class="targetNotice.tone === 'success' ? 'text-success' : 'text-muted'"
                data-testid="target-notice"
              >
                {{ t(targetNotice.key) }}
              </BodyText>
            </div>
            <div>
              <div class="d-flex align-items-center justify-content-center gap-1 small">
                {{ t('arCustomerCard.opportunity.paymentTerms.outstandings') }}
                <TooltipButton :text="t('arCustomerCard.opportunity.paymentTerms.outstandingsTooltip')" />
              </div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <DisplayText as="span" variant="md" class="d-block text-gray-700" :title="valueTitle(paymentTerms.outstandingsOpportunityTooltip)">{{ paymentTerms.outstandingsOpportunity }}</DisplayText>
              </Tooltip>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <div class="text-xs" :title="valueTitle(paymentTerms.outstandingsOpportunityPastDuesTooltip, `${t('arCustomerCard.opportunity.paymentTerms.pastDues')}:`)">{{ t('arCustomerCard.opportunity.paymentTerms.pastDues') }}: {{ paymentTerms.outstandingsOpportunityPastDues }}</div>
              </Tooltip>
            </div>
          </div>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <!-- Supplier Impact -->
  <div class="col-12 col-xl-3 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <div class="d-flex align-items-center gap-1">
          <span class="font-bold text-base">{{ t('arCustomerCard.opportunity.supplierImpact.title') }}</span>
          <TooltipButton :text="t('arCustomerCard.opportunity.supplierImpact.titleTooltip')" />
        </div>
      </template>
      <ContentBoxBody class="d-flex align-items-center justify-content-center">
        <!-- Top-aligned, not centred: Economic Impact has no sub-line under its value, so centring
             would drop its title and value below Cash Flow's. -->
        <div class="d-flex align-items-start gap-2 w-100">
          <!-- Cash Flow column -->
          <div class="d-flex flex-column gap-3 flex-grow-1 text-center">
            <div>
              <div class="d-flex align-items-center justify-content-center gap-1 text-muted small">
                {{ t('arCustomerCard.opportunity.supplierImpact.cashFlow') }}
                <TooltipButton :text="t('arCustomerCard.opportunity.supplierImpact.cashFlowTooltip')" />
              </div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <DisplayText as="span" variant="md" class="d-block text-gray-700" :title="valueTitle(supplierImpact.cashFlowTooltip)">{{ supplierImpact.cashFlow }}</DisplayText>
              </Tooltip>
              <div v-if="supplierImpact.cashFlowOfSales != null" class="text-muted text-xs">{{ `${supplierImpact.cashFlowOfSales}% ${t('arCustomerCard.opportunity.supplierImpact.ofSales')}` }}</div>
            </div>           
          </div>

          <div class="opportunity-arrow align-self-center">→</div>

          <!-- Economic Impact column -->
          <div class="d-flex flex-column gap-3 flex-grow-1 text-center">
            <div>
              <div class="d-flex align-items-center justify-content-center gap-1 text-muted small">
                {{ t('arCustomerCard.opportunity.supplierImpact.economicImpact') }}
                <TooltipButton :text="t('arCustomerCard.opportunity.supplierImpact.economicImpactTooltip')" />
              </div>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
                <DisplayText as="span" variant="md" class="d-block text-gray-700" :title="valueTitle(supplierImpact.economicImpactTooltip)">{{ supplierImpact.economicImpact }}</DisplayText>
              </Tooltip>
            </div>
          </div>
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <!-- Opportunity Assessment (radar/spider chart intentionally omitted) -->
  <div class="col-12 col-xl-6 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="font-bold text-base">{{ t('arCustomerCard.opportunity.assessment.title') }}</span>
      </template>
      <ContentBoxBody>
        <div class="row g-3">
          <!-- Priority: big standalone value + bare LevelBar, no inline label -->
          <div class="col-12 col-md-6">
            <div class="d-flex align-items-center gap-1 text-muted small mb-1">
              {{ t('arCustomerCard.opportunity.assessment.priority') }}
              <TooltipButton :text="t('arCustomerCard.opportunity.assessment.priorityTooltip')" />
            </div>
            <template v-if="assessment.priority">
              <DisplayText as="span" variant="md" class="d-block text-gray-700 mb-2">{{ assessment.priority.label }}</DisplayText>
              <LevelBar :level="assessment.priority.level" label="" />
            </template>
            <div v-else class="text-muted">{{ t('arCustomerCard.opportunity.assessment.missingData') }}</div>
          </div>

          <!-- Probability of Success / Cash Flow Impact, boxed -->
          <div class="col-12 col-md-6">
            <div class="opportunity-highlight-box d-flex flex-column gap-2">
              <div class="opportunity-assessment-row d-flex align-items-center gap-3">
                <div class="d-flex align-items-center gap-1 text-muted small opportunity-assessment-row__label">
                  {{ t('arCustomerCard.opportunity.assessment.probabilityOfSuccess') }}
                  <TooltipButton :text="t('arCustomerCard.opportunity.assessment.probabilityOfSuccessTooltip')" />
                </div>                
                <div class="d-flex align-items-center gap-2 flex-grow-1">
                  <div class="font-bold opportunity-assessment-row__value">{{ assessment.probabilityOfSuccess?.label ?? 'N/A' }}</div>
                  <LevelBar class="flex-grow-1" :level="assessment.probabilityOfSuccess?.level ?? null" label="" />
                </div>
              </div>
              <div class="opportunity-assessment-row d-flex align-items-center gap-3">
                <div class="d-flex align-items-center gap-1 text-muted small opportunity-assessment-row__label">
                  {{ t('arCustomerCard.opportunity.assessment.cashFlowImpact') }}
                  <TooltipButton :text="t('arCustomerCard.opportunity.assessment.cashFlowImpactTooltip')" />
                </div>
                <div class="d-flex align-items-center gap-2 flex-grow-1">
                  <div class="font-bold opportunity-assessment-row__value">{{ assessment.cashFlowImpact?.label ?? 'N/A' }}</div>
                  <LevelBar class="flex-grow-1" :level="assessment.cashFlowImpact?.level ?? null" label="" />
                </div>
              </div>
            </div>
          </div>
        </div>

        </ContentBoxBody>
        

        <!-- Terms Decrease, Supplier Leverage, Buyer Leverage, Economic Profit Impact, Number of
             Insights - each real, each its own LevelBar row when its tier resolves. -->
        <template v-for="row in assessmentDetailRows" :key="row.key">
          <ContentBoxBody>
          <div class="opportunity-assessment-row opportunity-assessment-row--divided d-flex align-items-center">
            <div class="d-flex align-items-center gap-1 text-muted small opportunity-assessment-row__label">
              {{ row.label }}
              <TooltipButton :text="row.tooltip" />
            </div>
            
            <div class="d-flex align-items-center gap-2 flex-grow-1">
              <div class="font-bold opportunity-assessment-row__value">{{ row.value?.label ?? 'N/A' }}</div>
              <LevelBar class="flex-grow-1" :level="row.value?.level ?? null" label="" />
            </div>
          </div>
          </ContentBoxBody>
        </template>
        
      
    </ContentBox>
  </div>

  <!-- Payment Term Benchmarks -->
  <div class="col-12 col-xl-7 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-slot:header-title>
        <span class="font-bold text-base">{{ t('arCustomerCard.opportunity.benchmarks.title') }}</span>
      </template>
      <ContentBoxBody>
        <!-- Every bar with a panel and a real term opens its drill-down in the card beside this
             one (DSO opens Contractual's); an N/A bar stays display-only. -->
        <div
          v-for="bar in strategiesBars"
          :key="bar.key"
          class="opportunity-benchmark-bar mb-2"
          :class="{
            'opportunity-benchmark-bar--clickable': bar.clickable,
            'opportunity-benchmark-bar--selected': bar.key === selectedBarKey,
          }"
          :role="bar.clickable ? 'button' : undefined"
          :tabindex="bar.clickable ? 0 : undefined"
          :aria-pressed="bar.clickable ? bar.key === selectedBarKey : undefined"
          @click="toggleBar(bar)"
          @keydown.enter="toggleBar(bar)"
        >
          <BarsWrapper
            :main-value="bar.mainValue"
            :contractual-value="bar.contractualValue"
            :extra-value="bar.extraValue"
            :title="bar.title"
            :type="bar.type"
            :strategy-key="bar.key"
          />
        </div>
      </ContentBoxBody>
    </ContentBox>
  </div>

  <!-- Strategy drill-down for the selected benchmark bar - Contractual's by default. -->
  <div class="col-12 col-xl-5 d-flex flex-column">
    <ContentBox class="flex-grow-1">
      <template v-if="selectedPanel" v-slot:header-title>
        <div class="opportunity-detail-header d-flex align-items-center gap-2">
          <button
            type="button"
            class="opportunity-detail-back"
            :aria-label="t('global.back')"
            @click="selectedBarKey = DEFAULT_BAR_KEY"
          >
            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
          </button>
          <span class="font-bold text-base">{{ selectedPanel.title }}</span>
          <TooltipButton v-if="selectedPanel.tooltip" :text="selectedPanel.tooltip" />
        </div>
      </template>
      <ContentBoxBody>
        <CustomerCardStrategyDetail v-if="selectedPanel" :panel="selectedPanel.panel" />
      </ContentBoxBody>
    </ContentBox>
  </div>

  <!-- Sale lines grid: a Parent row's own family rollup, or a Counterparty's own lines while the
       leading "Buyer" tab is active (see showOpportunityListBuyers's own doc for the exact rule per
       role). Hidden rather than unmounted-and-remounted on every tab flip would also work, but a
       v-if keeps a stale buyer's rows from flashing before this component's own watchers refetch. -->
  <div v-if="showOpportunityListBuyers" class="col-12">
    <OpportunityListBuyers
      :key="linesGridKey"
      :version-uuid="contextStore.saleFileVersionUuid"
      :buyer-id="buyerId"
      :role="role"
    />
  </div>

  <ModalTargetPaymentTerms
    v-if="targetModalOpen && contextStore.saleFileVersionUuid && partyId !== undefined"
    :version-uuid="contextStore.saleFileVersionUuid"
    :party-id="partyId"
    :role="role ?? details.role"
    :active-sale-line-id="activeSaleLineId"
    :initial-target="details.paymentTerms.targetPaymentTerms ?? null"
    @close="targetModalOpen = false"
    @saved="onTargetSaved"
  />
</div>
</template>

<script setup lang="ts">
/**
 * CustomerCardView's Opportunity tab. Fetches `BuyerOpportunityResponse` (`useBuyerOpportunity`,
 * `/api/buyers/{versionUuid}/{buyerId}/opportunity`) with the same loading/notFound/loadError
 * shape the other three tabs use. This intentionally does NOT render the "telaraña" (radar/spider)
 * chart the mockup shows inside the "Probability of Success" card - every row of that card is laid
 * out as a `LevelBar` row instead (`toLevelRow`); Priority falls back to a "Missing Data"
 * placeholder (no bar) when its own tier is null or unrecognized, every other row instead renders
 * an empty `LevelBar` labeled "N/A".
 *
 * Not everything the layout shows is backed by this endpoint yet - see `NOT_BACKED` below for
 * which pieces read "-" (endpoint doesn't carry the field at all) instead of a real value:
 *   - Top metrics strip: header.* backs every figure, including Sales Materiality.
 *   - Payment Terms: paymentTerms.currentTerm/recommendedTerm/outstanding/projectedOutstanding are
 *     real - so are both sides' "Past dues": pastDueDays/pastDueOutstanding on the contractual
 *     side, projectedPastDueDays/projectedPastDueOutstanding on the opportunity side (AB#21137).
 *   - Supplier Impact: cashFlowImpact/economicProfitImpact are real, and so is the "of Sales" share
 *     under Cash Flow (cashFlowImpactPercentOfSales, hidden when null).
 *   - Probability of Success: every row is real (`probabilityOfSuccess.*`) - Priority,
 *     Probability of Success (`probabilityTier`), Cash Flow Impact, Terms Decrease, Supplier
 *     Leverage, Buyer Leverage, Economic Profit Impact and Number of Insights
 *     (`insightsTier`). `probabilityScore` and `insightsCount` (raw numbers) have no display of their own.
 *   - Payment Term Benchmarks: `terms[]` (Contractual/Current/Proposed) then one bar per
 *     `strategies[]` entry (see `strategiesBars`) - an entry the backend left out has no bar, one
 *     with `terms: null` renders "N/A".
 *   - Strategy drill-down (the card beside the benchmarks): Contractual's by default; clicking a bar
 *     with a real term and something to show renders its panel (`buildBenchmarkPanel` - one band per
 *     `extra` member, plus the entry's own `infoCards` once the backend sends them; DSO shares
 *     Contractual's).
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BarsWrapper,
  BodyText,
  CalculumLoadingAr,
  DisplayText,
  ContentBox,
  ContentBoxBody,
  CustomBadge,
  CustomButton,
  CustomTabs,
  LevelBar,
  NoDataAvailable,
  Tooltip,
  TooltipButton,
} from '@ada/design-system'
import type { LevelBarLevel, TabItem } from '@ada/design-system'
import type { BuyerCorporateTreeSalesLineDto, OpportunityStrategyKey, OpportunityTermKey, PartyRole } from '@/api'
import { formatMoneyCompact, formatMoneyTooltip } from '@/utils/moneyFormatting'
import { withDisclaimer } from '@/utils/disclaimers'
import { useContextStore } from '@/stores/context'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import { useVersionStatusPoll } from '@/composables/useVersionStatusPoll'
import { isActiveStatus } from '@/modules/match/utils/versionStatus'
import { parsePositiveRouteId } from '@/modules/match/utils/routeId'
import { useBuyerOpportunity } from '../../composables/useBuyerOpportunity'
import ModalTargetPaymentTerms from './ModalTargetPaymentTerms.vue'
import CustomerCardTabSkeleton, { type CustomerCardSkeletonCard } from './CustomerCardTabSkeleton.vue'
import OpportunityListBuyers from './OpportunityListBuyers.vue'
import CustomerCardStrategyDetail from './CustomerCardStrategyDetail.vue'
import {
  buildBenchmarkPanel,
  type BenchmarkEntry,
  type BenchmarkPanel,
  type BenchmarkPanelKey,
} from './opportunityStrategyDetail'

const props = defineProps<{
  versionId: string
  buyerId: string
  /** `CustomerCardView`'s `initialBuyer.salesLines` (a `BuyersView` roster row or a corporate-tree
   * node), or - when its caller seeded none (a grid's entity cell, direct route navigation) - the
   * requested buyer's own corporate-tree node's, fetched by the view. `undefined` only while that
   * fallback is still loading. Not read by this endpoint's own fetch. */
  salesLines?: BuyerCorporateTreeSalesLineDto[]
  /** `CustomerCardView`'s own `initialBuyer?.role` - same optionality as `salesLines` above (absent
   * whenever no caller seeded `initialBuyer` at all, e.g. direct route navigation). Not read by
   * this endpoint's own fetch (`details.value.role` already carries the real one once it loads). */
  role?: PartyRole,
  parentId: string | null
}>()
const { t } = useI18n({ useScope: 'global' })
const contextStore = useContextStore()
const currenciesStore = useArCurrenciesStore()

/** One tab per `salesLines` entry - `saleLineId` is the tab id, the label is just this line's
 * 1-based position in the array ("Sale Line 1", "Sale Line 2", ...), same `{ n }` interpolation
 * convention `CustomerCardCorporateTreeTab`'s own "Spend {n}" label already uses. No content
 * behind a tab yet - only the tab strip itself was asked for.
 *
 * `role` gates the whole strip: `Parent` never shows it, `Counterparty` (with at least one sales
 * line on hand) gets an extra leading "Buyer" tab (id = `buyerId`) ahead of the per-line ones -
 * any other role (e.g. `Self`, or `role` simply absent) falls through to the plain per-line list. */
const salesLineTabs = computed<TabItem[]>(() => {
  if (props.role === 'Parent') {
    return []
  }
  const lines = props.salesLines ?? []
  const tabs = lines.map((line, index) => ({
    id: String(line.saleLineId),
    label: t('arCustomerCard.opportunity.saleLineTab', { n: index + 1 }),
  }))
  if (props.role === 'Counterparty' && lines.length > 0) {
    tabs.unshift({ id: props.buyerId, label: t('arCustomerCard.opportunity.buyerTab') })
  }
  return tabs
})
const activeSalesLineTab = ref('')
watch(
  salesLineTabs,
  (tabs) => {
    if (!tabs.some((tab) => tab.id === activeSalesLineTab.value)) {
      activeSalesLineTab.value = tabs[0]?.id ?? ''
    }
  },
  { immediate: true },
)
function onSalesLineTabChange(id: string): void {
  activeSalesLineTab.value = id
}

/** Whether `activeSalesLineTab` is sitting on `salesLineTabs`' own leading tab (position 0) — the
 * "Buyer" tab for a Counterparty with lines (see `salesLineTabs`'s own doc), or simply the first
 * per-line tab when there is no leading "Buyer" one. An empty `salesLineTabs` (no corporate-tree
 * seed at all, e.g. direct route navigation) counts as position 0 too: there is no OTHER tab a
 * Counterparty could be sitting on in that case, so the grid still shows rather than hiding behind
 * a tab strip that was never rendered. */
const isFirstSalesLineTabActive = computed(() =>
  salesLineTabs.value.length === 0 || salesLineTabs.value[0]?.id === activeSalesLineTab.value)

/** OpportunityListBuyers's own visibility rule (CustomerCardOpportunityTab decides WHEN, the grid
 * itself only ever asks "whose lines" — see that component's own doc):
 * - `Parent`: always — a family's rolled-up lines have no "which tab" question to ask.
 * - `Counterparty`: only while the leading "Buyer" tab is active — a specific "Sale Line N" tab
 *   is its own line, not this buyer's whole set, and has no content behind it yet (see this file's
 *   own header doc on what a sale-line tab does and does not back today).
 * - Any other role (or none at all): never. */
const showOpportunityListBuyers = computed(() => {
  if (props.role === 'Parent') return true
  if (props.role === 'Counterparty') return isFirstSalesLineTabActive.value
  return false
})

/** The sale line id the fetch below sends as `level=SaleLine&saleLineId={n}` - `undefined` (both
 * params omitted, `get`'s own query builder drops them) whenever the active tab is the leading
 * "Buyer" tab (`id === buyerId`, never a real sale line) or no tab is selected at all. */
const activeSaleLineId = computed<number | undefined>(() => {
  const id = activeSalesLineTab.value
  if (!id || id === props.buyerId) {
    return undefined
  }
  const parsed = Number(id)
  return Number.isFinite(parsed) ? parsed : undefined
})

const { loading, notFound, loadError, details, reload } = useBuyerOpportunity(() => props.buyerId, () => activeSaleLineId.value, () => props.role)

/** AB#20657: the Target modal's party - the same id the opportunity fetch itself parses. */
const partyId = computed(() => parsePositiveRouteId(props.buyerId))

/** AB#20657 FR-10: the version's own calculation status, watched for as long as the tab is open so
 * the pencil is disabled while a Recalculate runs. */
const versionStatus = useVersionStatusPoll()
const isRecalculating = computed(() => isActiveStatus(versionStatus.status.value?.status ?? null))

/**
 * How long the tab waits after a Target save/clear answers before refetching. The endpoint answers
 * as soon as the Target is written and recalculates the figures in the background, so an
 * immediate refetch still reads the old ones.
 */
const TARGET_REFRESH_DELAY_MS = 2500

const targetModalOpen = ref(false)
/** Set from a save until the delayed refetch has landed - the CalculumLoadingAr's whole lifetime. */
const awaitingRefresh = ref(false)
/** Bumped after a Target refresh so the lines grid refetches too: the silent reload keeps the tab
 * mounted, so nothing else would make it ask again. */
const linesGridKey = ref(0)
const targetNotice = ref<{ key: string; tone: 'muted' | 'success' } | null>(null)
let refreshTimer: ReturnType<typeof setTimeout> | undefined

const canEditTarget = computed(() =>
  !isRecalculating.value && !awaitingRefresh.value && contextStore.saleFileVersionId !== null)

onMounted(() => {
  if (contextStore.saleFileVersionId !== null) {
    versionStatus.start(contextStore.saleFileVersionId)
  }
})
onBeforeUnmount(() => {
  versionStatus.stop()
  clearTimeout(refreshTimer)
})

/** The save/clear answered OK: wait for the background recalculation, then refetch the tab so
 * every figure - Opportunity/Target, Supplier Impact, tiers, the lines grid - is the new one. */
function onTargetSaved({ cleared }: { cleared: boolean }): void {
  targetModalOpen.value = false
  awaitingRefresh.value = true
  targetNotice.value = {
    key: cleared ? 'arCustomerCard.opportunity.target.cleared' : 'arCustomerCard.opportunity.target.saved',
    tone: 'muted',
  }
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    void refreshAfterTarget()
  }, TARGET_REFRESH_DELAY_MS)
}

/** Refetches silently - the current figures stay up, no skeleton - with the CalculumLoadingAr still
 * showing, and only drops the loading once the new figures are in, so what is on screen the moment
 * it goes away is the recalculated data. */
async function refreshAfterTarget(): Promise<void> {
  await reload({ silent: true })
  linesGridKey.value++
  awaitingRefresh.value = false
  targetNotice.value = { key: 'arCustomerCard.opportunity.target.updated', tone: 'success' }
}

const skeletonRows: CustomerCardSkeletonCard[][] = [
  [{ col: 'col-12 col-xl-2', lines: 2 }, { col: 'col-12 col-xl-3', lines: 2 }, { col: 'col-12 col-xl-1', lines: 1 }, { col: 'col-12 col-xl-4', lines: 2 }, { col: 'col-12 col-xl-2', lines: 2 }],
  [{ col: 'col-12 col-xl-3', lines: 4 }, { col: 'col-12 col-xl-3', lines: 4 }, { col: 'col-12 col-xl-6', lines: 6 }],
  [{ col: 'col-12 col-xl-7', lines: 8 }, { col: 'col-12 col-xl-5', lines: 6 }],
]

/** A field with no backend value at all (a piece this endpoint doesn't cover yet) - see this
 * component's own doc for which is which. */
const NOT_BACKED = '-'

const orNotBacked = (value: number | string | null | undefined): number | string =>
  value === null || value === undefined ? NOT_BACKED : value

/** `cashFlowImpact`/`economicProfitImpact` are shown with an explicit sign (matching the
 * mockup's "+$30.0k") ahead of the currency symbol - `Math.abs` first and re-attaching the sign
 * to the whole symbol-prefixed string, rather than letting a negative value's own leading "-"
 * land between the symbol and the digits ("$-30.0k"). */
const formatSigned = (
  value: number | null | undefined,
  format: (magnitude: number, symbol: string) => string = formatMoneyCompact,
): string => {
  if (value === null || value === undefined) {
    return NOT_BACKED
  }
  const magnitude = format(Math.abs(value), currenciesStore.selectedCurrencySymbol)
  if (value > 0) return `+${magnitude}`
  if (value < 0) return `-${magnitude}`
  return magnitude
}

/** Hover `title` for a truncated header value - Kendo's `Tooltip` only opens on a non-empty
 * `title`, so a not-backed placeholder (or an empty value) returns `undefined` and shows none.
 * `prefix` covers the "Parent {value}" lines, whose visible text carries its own label. */
function valueTitle(value: number | string | null | undefined, prefix?: string): string | undefined {
  if (value === null || value === undefined || value === '' || value === NOT_BACKED) {
    return undefined
  }
  return prefix ? `${prefix} ${value}` : String(value)
}

const topBar = computed(() => {
  const h = details.value?.header
  const insuredFraction = h?.creditInsured != null ? Number(h.creditInsured) : null
  const isInsured = insuredFraction !== null && !Number.isNaN(insuredFraction) && insuredFraction > 0
  const symbol = currenciesStore.selectedCurrencySymbol
  return {
    salesVolume: formatMoneyCompact(h?.totalSales ?? null, symbol),
    salesVolumeParent: formatMoneyCompact(h?.parentTotalSales ?? null, symbol),
    // Money values show compact on the card and the full figure in their hover tooltip.
    salesVolumeTooltip: formatMoneyTooltip(h?.totalSales ?? null, symbol),
    salesVolumeParentTooltip: formatMoneyTooltip(h?.parentTotalSales ?? null, symbol),
    salesMateriality: h?.salesMateriality ?? NOT_BACKED,
    supplierEntity: h?.supplierEntities ?? NOT_BACKED,
    invoiceCurrency: h?.currencyCode ?? NOT_BACKED,
    creditLimit: formatMoneyCompact(h?.creditLimit ?? null, symbol),
    creditLimitParent: formatMoneyCompact(h?.parentUploadedCreditLimit ?? null, symbol),
    creditLimitTooltip: formatMoneyTooltip(h?.creditLimit ?? null, symbol),
    creditLimitParentTooltip: formatMoneyTooltip(h?.parentUploadedCreditLimit ?? null, symbol),
    isInsured,
    insuredLabel: isInsured ? t('arCustomerCard.opportunity.topBar.insured') : NOT_BACKED,
    creditRating: h?.creditRating ?? NOT_BACKED,
    hasCreditRating: h?.creditRating != null,
    parentOrganization: h?.parentName ?? NOT_BACKED,
  }
})

// UC-UI-21 FR-1/FR-2: appended to the existing explanatory tooltip rather than replacing it -
// this is still the buyer's/parent's credit limit explanation, with the disclaimer added only
// when there is a real limit to caveat (AF-1). The explanatory half always shows, matching this
// tooltip's existing behavior before this story.
// UC-UI-21 FR-2: gated on EITHER figure this one tooltip covers - the box beside it renders both
// the buyer's own creditLimit and the parent's creditLimitParent, and a real parent limit with no
// buyer limit still needs the caveat.
const creditLimitTooltip = computed(() => {
  const h = details.value?.header
  const hasLimit = h?.creditLimit != null || h?.parentUploadedCreditLimit != null
  return withDisclaimer(
    t('arCustomerCard.opportunity.topBar.creditLimitTooltip'),
    t('arBuyers.table.tooltips.creditLimitDisclaimer'),
    hasLimit,
  )
})

const paymentTerms = computed(() => {
  const p = details.value?.paymentTerms
  return {
    contractual: orNotBacked(p?.currentTerm),
    // pastDueDays/pastDueOutstanding are the buyer's own actual, current situation.
    contractualPastDues: orNotBacked(p?.pastDueDays),
    // AB#20657: already the coalesced Opportunity/Target - the backend applies a line's target over
    // its strategy winner before rolling up `recommendedTerm`.
    opportunity: orNotBacked(p?.recommendedTerm),
    hasTarget: p?.hasTarget === true,
    // AB#21137: the opportunity side's past due follows Past Due ON/OFF - the contractual side's
    // with it on, 0 with it off. A 0 is a real figure, so only null reads "-".
    opportunityPastDues: orNotBacked(p?.projectedPastDueDays),
    outstandingsContractual: formatMoneyCompact(p?.outstanding ?? null, currenciesStore.selectedCurrencySymbol),
    outstandingsContractualPastDues: p?.pastDueOutstanding != null
      ? formatMoneyCompact(p.pastDueOutstanding, currenciesStore.selectedCurrencySymbol)
      : NOT_BACKED,
    outstandingsOpportunity: formatMoneyCompact(p?.projectedOutstanding ?? null, currenciesStore.selectedCurrencySymbol),
    outstandingsOpportunityPastDues: p?.projectedPastDueOutstanding != null
      ? formatMoneyCompact(p.projectedPastDueOutstanding, currenciesStore.selectedCurrencySymbol)
      : NOT_BACKED,
    outstandingsContractualTooltip: formatMoneyTooltip(p?.outstanding ?? null, currenciesStore.selectedCurrencySymbol),
    outstandingsContractualPastDuesTooltip: p?.pastDueOutstanding != null
      ? formatMoneyTooltip(p.pastDueOutstanding, currenciesStore.selectedCurrencySymbol)
      : NOT_BACKED,
    outstandingsOpportunityTooltip: formatMoneyTooltip(p?.projectedOutstanding ?? null, currenciesStore.selectedCurrencySymbol),
    outstandingsOpportunityPastDuesTooltip: p?.projectedPastDueOutstanding != null
      ? formatMoneyTooltip(p.projectedPastDueOutstanding, currenciesStore.selectedCurrencySymbol)
      : NOT_BACKED,
  }
})

const supplierImpact = computed(() => {
  const s = details.value?.supplierImpact
  return {
    cashFlow: formatSigned(s?.cashFlowImpact ?? null),
    cashFlowOfSales: s?.cashFlowImpactPercentOfSales ?? null,
    economicImpact: formatSigned(s?.economicProfitImpact ?? null),
    cashFlowTooltip: formatSigned(s?.cashFlowImpact ?? null, formatMoneyTooltip),
    economicImpactTooltip: formatSigned(s?.economicProfitImpact ?? null, formatMoneyTooltip),
  }
})

/** Shape the "Probability of Success" card's level rows share - `level` is what `LevelBar` itself
 * accepts (lowercase), `label` is the row's own value text (the tier itself, e.g. "Low"). An unrecognized or null tier resolves to `null` here; only Priority
 * turns that into a "Missing Data" placeholder (no bar) - every other row still renders its
 * `LevelBar`, just empty and labeled "N/A". */
interface AssessmentLevelRow {
  level: LevelBarLevel
  label: string
}

function toLevelRow(tier: string | null | undefined): AssessmentLevelRow | null {
  const normalized = tier?.trim().toLowerCase()
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return { level: normalized, label: tier as string }
  }
  return null
}

/** Priority/Probability of Success/Cash Flow Impact - the three rows pinned near the top of the
 * card (Priority standalone, the other two boxed together). `probabilityOfSuccess` reads off
 * `probabilityTier` - `probabilityScore` (a raw number) has no row of its own today. */
const assessment = computed(() => {
  const a = details.value?.probabilityOfSuccess
  return {
    priority: toLevelRow(a?.priority),
    probabilityOfSuccess: toLevelRow(a?.probabilityTier),
    cashFlowImpact: toLevelRow(a?.cashFlowImpactTier),
  }
})

interface AssessmentDetailRow {
  key: string
  label: string
  tooltip: string
  value: AssessmentLevelRow | null
}

/** The five full-width rows below the boxed pair, each real (any may still read null for a given
 * buyer - its `LevelBar` then renders empty, labeled "N/A", same as Probability of Success/Cash
 * Flow Impact above). Number of Insights shows its tier (`insightsTier`) like every other row -
 * `insightsCount` (a raw number) has no display of its own. */
const assessmentDetailRows = computed<AssessmentDetailRow[]>(() => {
  const a = details.value?.probabilityOfSuccess
  return [
    {
      key: 'termsDecrease',
      label: t('arCustomerCard.opportunity.assessment.termsDecrease'),
      tooltip: t('arCustomerCard.opportunity.assessment.termsDecreaseTooltip'),
      value: toLevelRow(a?.termsDecreaseTier),
    },
    {
      key: 'supplierLeverage',
      label: t('arCustomerCard.opportunity.assessment.supplierLeverage'),
      tooltip: t('arCustomerCard.opportunity.assessment.supplierLeverageTooltip'),
      value: toLevelRow(a?.supplierLeverage),
    },
    {
      key: 'buyerLeverage',
      label: t('arCustomerCard.opportunity.assessment.buyerLeverage'),
      tooltip: t('arCustomerCard.opportunity.assessment.buyerLeverageTooltip'),
      value: toLevelRow(a?.buyerLeverage),
    },
    {
      key: 'economicProfitImpact',
      label: t('arCustomerCard.opportunity.assessment.economicProfitImpact'),
      tooltip: t('arCustomerCard.opportunity.assessment.economicProfitImpactTooltip'),
      value: toLevelRow(a?.economicProfitImpactTier),
    },
    {
      key: 'numberOfInsights',
      label: t('arCustomerCard.opportunity.assessment.numberOfInsights'),
      tooltip: t('arCustomerCard.opportunity.assessment.numberOfInsightsTooltip'),
      value: toLevelRow(a?.insightsTier),
    },
  ]
})

/** Shape `BarsWrapper` itself expects - `mainValue`/`contractualValue`/`extraValue` are all
 * `number | undefined` (never `null`), so every row below must share this exact shape rather than
 * letting TS infer a narrower one per row. */
interface StrategiesBar {
  key: OpportunityTermKey | OpportunityStrategyKey
  title: string
  mainValue: number | undefined
  contractualValue: number | undefined
  extraValue: number | undefined
  type: string
  tooltip: string | undefined
  /** The right-hand panel this bar opens; null for a bar the story defines no panel for. */
  panel: BenchmarkPanel | null
  /** Clickable only with a real term and a panel that has something to show - an N/A bar (EF-1)
   * or one with neither bands nor cards never opens an empty panel. */
  clickable: boolean
}

interface BarConfig {
  titleKey: string
  type: string
  tooltipKey?: string
  panelKey?: BenchmarkPanelKey
}

/** The work item's bars, in its order - `terms[]` first, then the strategies. `DaysOutstanding` is
 * deliberately absent: Avg. Days Paid (DSO) is `currentTerms`, and a second bar for the same figure
 * would duplicate it. Buyer Standard reads either grain's key (a Parent-role buyer only gets the
 * parent-grain `BuyerStandardStrategyOnParents`). */
const STORY_BARS: { source: 'terms' | 'strategies'; key: StrategiesBar['key']; config: BarConfig }[] = [
  { source: 'terms', key: 'contractualTerms', config: { titleKey: 'contractualTerms', type: 'contractual', tooltipKey: 'contractualTerms', panelKey: 'contractual' } },
  // AF-1: DSO opens Contractual's own panel, as ADA does.
  { source: 'terms', key: 'currentTerms', config: { titleKey: 'currentTerms', type: 'actual', tooltipKey: 'currentTerms', panelKey: 'contractual' } },
  { source: 'terms', key: 'proposedTerms', config: { titleKey: 'proposedTerms', type: 'opportunity', tooltipKey: 'proposedTerms', panelKey: 'opportunity' } },
  // AB#20657: only sent while the party carries a Target.
  { source: 'terms', key: 'targetTerms', config: { titleKey: 'targetTerms', type: 'opportunity', tooltipKey: 'targetTerms', panelKey: 'target' } },
  { source: 'strategies', key: 'BuyersRegulatory', config: { titleKey: 'regulatoryTerms', type: 'expected', tooltipKey: 'regulatoryTerms', panelKey: 'regulatory' } },
  { source: 'strategies', key: 'CounterPartyStandard2', config: { titleKey: 'buyerStandard', type: 'expected', tooltipKey: 'buyerStandard', panelKey: 'buyerStandard' } },
  { source: 'strategies', key: 'BuyerStandardStrategyOnParents', config: { titleKey: 'buyerStandard', type: 'expected', tooltipKey: 'buyerStandard', panelKey: 'buyerStandard' } },
  { source: 'strategies', key: 'PeerGroupStandard2', config: { titleKey: 'peerGroupStandard', type: 'expected', tooltipKey: 'peerGroupStandard', panelKey: 'peerGroupStandard' } },
  { source: 'strategies', key: 'CreditLimitMax', config: { titleKey: 'creditLimitMax', type: 'expected', tooltipKey: 'creditLimitMax', panelKey: 'creditLimitMax' } },
  // No `extra` - like Harmonization, it opens only once the backend sends infoCards for it.
  { source: 'strategies', key: 'BuyerPolicy', config: { titleKey: 'buyerPolicy', type: 'expected', tooltipKey: 'buyerPolicy', panelKey: 'buyerPolicy' } },
  { source: 'strategies', key: 'IndustryRegionGroup', config: { titleKey: 'industryRegionStandard', type: 'expected', tooltipKey: 'industryRegionStandard', panelKey: 'industryRegionStandard' } },
  { source: 'strategies', key: 'BuyerOrParentMin', config: { titleKey: 'parentBuyerMin', type: 'expected', tooltipKey: 'parentBuyerMin', panelKey: 'parentBuyerMin' } },
  // No `extra` - its panel is its own infoCards alone, and it stays non-clickable without them.
  { source: 'strategies', key: 'Harmonization', config: { titleKey: 'harmonization', type: 'expected', tooltipKey: 'harmonization', panelKey: 'harmonization' } },
]

/** Strategies never drawn as a bar, even when sent. `DaysOutstanding` would duplicate Avg. Days
 * Paid (DSO) (`currentTerms`); Pay on Terms and Client Standard are not part of the chart. */
const HIDDEN_STRATEGIES = new Set<OpportunityStrategyKey>(['DaysOutstanding', 'PaymentOnTerms', 'ClientStandard'])

/** `contentEntry` is what the panel is built from - the bar's own entry, except for a bar sharing
 * Contractual's panel (DSO, AF-1), which renders Contractual's. */
function toBar(
  entry: BenchmarkEntry & { key: StrategiesBar['key'] },
  config: BarConfig | undefined,
  contentEntry: BenchmarkEntry = entry,
): StrategiesBar {
  const panel = config?.panelKey ? buildBenchmarkPanel(config.panelKey, contentEntry) : null
  const hasContent = !!panel && (panel.bands.length > 0 || panel.cards.length > 0)
  return {
    key: entry.key,
    title: config ? t(`arCustomerCard.opportunity.benchmarks.${config.titleKey}`) : entry.key,
    mainValue: entry.terms ?? undefined,
    // BarsComponent's own contractual marker - only the Contractual bar carries one.
    contractualValue: config?.type === 'contractual' ? entry.terms ?? undefined : undefined,
    extraValue: undefined,
    type: config?.type ?? 'expected',
    tooltip: config?.tooltipKey ? t(`arCustomerCard.opportunity.benchmarks.tooltips.${config.tooltipKey}`) : undefined,
    panel,
    clickable: hasContent && entry.terms != null,
  }
}

/** Only the entries the response actually carries, in the story's order, then any other strategy
 * (except `HIDDEN_STRATEGIES`) in the backend's own order - titled with its raw key, no panel. Any
 * entry sent with `terms: null` renders "N/A" and is not clickable. */
const strategiesBars = computed<StrategiesBar[]>(() => {
  const terms = details.value?.terms ?? []
  const strategies = details.value?.strategies ?? []
  const contractual = terms.find((term) => term.key === 'contractualTerms')
  const storyBars = STORY_BARS.flatMap(({ source, key, config }) => {
    const entry = source === 'terms'
      ? terms.find((term) => term.key === key)
      : strategies.find((strategy) => strategy.key === key)
    if (!entry) return []
    const contentEntry = config.panelKey === 'contractual' ? contractual ?? entry : entry
    return [toBar(entry, config, contentEntry)]
  })
  const storyKeys = new Set<string>(STORY_BARS.map((bar) => bar.key))
  const otherBars = strategies
    .filter((strategy) => !storyKeys.has(strategy.key) && !HIDDEN_STRATEGIES.has(strategy.key))
    .map((strategy) => toBar(strategy, undefined))
  return [...storyBars, ...otherBars]
})

/** The drill-down that is open whenever no other bar is: Contractual's. */
const DEFAULT_BAR_KEY: StrategiesBar['key'] = 'contractualTerms'

/** The bar whose drill-down is open. Back to the default whenever the response itself changes
 * (buyer or sale-line tab switch), so a stale strategy never lingers beside another buyer's bars. */
const selectedBarKey = ref<StrategiesBar['key']>(DEFAULT_BAR_KEY)
watch(details, () => {
  selectedBarKey.value = DEFAULT_BAR_KEY
})

/** The open panel, titled after the bar that was clicked. Only a clickable bar's - so the default
 * Contractual one stays closed too while it has nothing to show. */
const selectedPanel = computed(() => {
  const bar = strategiesBars.value.find((candidate) => candidate.key === selectedBarKey.value)
  if (!bar?.clickable || !bar.panel) return null
  return { title: bar.title, tooltip: bar.tooltip, panel: bar.panel }
})

/** Opens a bar's drill-down, or falls back to the default one when that bar is already open. */
function toggleBar(bar: StrategiesBar): void {
  if (!bar.clickable) return
  selectedBarKey.value = selectedBarKey.value === bar.key ? DEFAULT_BAR_KEY : bar.key
}
</script>

<style scoped>
.opportunity-highlight-box {
  background: var(--bg-surface-subtle-1);
  border-radius: var(--border-radius-2);
  padding: 0.5rem 0.75rem;
}

/* Equal-width siblings in a flex row: basis 0 splits the row evenly regardless of each item's
   content width; min-width 0 lets a long value truncate (text-truncate + title tooltip) instead of
   widening its column. */
.opportunity-equal-col {
  flex: 1 1 0;
  min-width: 0;
}

/* A highlight box beside plain columns in the top strip: pull its vertical padding back out with a
   matching negative margin, so its label sits on the same line as its siblings' and the grey
   background bleeds into ContentBoxBody's own padding instead of pushing the content down. */
.opportunity-highlight-box.opportunity-equal-col {
  margin-block: -0.5rem;
}

/* Kendo's Tooltip wrapper div as a flex item next to the insured dot - needs its own min-width 0
   for the label inside it to truncate rather than overflow. */
.opportunity-truncate-host {
  min-width: 0;
}

.opportunity-insured-dot {
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 50%;
  background: var(--accent, #4f46e5);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  flex-shrink: 0;
}

.opportunity-term-highlight-col {
  width: 80%;
  margin: 0 auto;
  background: #17dfa1;
  border-radius: var(--border-radius-2);
  padding: 0.75rem;
  color: #fff;
  justify-content: center;
}

/* Contractual's top stat, opposite the green box: the same vertical padding, so both columns are
   equally tall and their title / value / past-dues rows (and the Outstandings rows below) line up. */
.opportunity-term-plain-col {
  padding-block: 0.75rem;
}

.opportunity-term-highlight-col__label {
  color: #fff;
  opacity: 0.85;
}

.opportunity-term-highlight-col :deep(.tooltip-button__icon) {
  color: #fff;
}

.opportunity-arrow {
  color: var(--neutral-400, #adb5bd);
  font-size: 1.25rem;
  flex-shrink: 0;
}

.opportunity-detail-back {
  border: 0;
  background: transparent;
  padding: 0.25rem;
  color: var(--color-text-2, #475467);
  cursor: pointer;
  line-height: 1;
}

.opportunity-benchmark-bar {
  border-radius: var(--border-radius-2);
  border-left: 3px solid transparent;
  padding: 0 0.25rem;
}

.opportunity-benchmark-bar--clickable {
  cursor: pointer;
}

.opportunity-benchmark-bar--clickable:hover {
  background: var(--bg-surface-subtle-1);
}

/* Stronger than hover, so the open bar still reads as selected under the pointer. */
.opportunity-benchmark-bar--selected,
.opportunity-benchmark-bar--selected:hover {
  background: var(--bg-surface-subtle-2);
  border-left-color: var(--accent, #4f46e5);
}

.opportunity-assessment-row__label {
  flex: 0 0 auto;
  width: 12rem;
}

.opportunity-assessment-row__value {
  flex: 0 0 auto;
  width: 4.5rem;
  text-align: right;
}

.opportunity-assessment-row--divided + .opportunity-assessment-row--divided {
  border-top: 1px solid var(--border-color-default);
}
</style>
