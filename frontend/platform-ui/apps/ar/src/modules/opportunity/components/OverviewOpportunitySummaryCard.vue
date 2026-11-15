<template>
  <ContentBox class="opportunity-summary-card">
    <template #header-title>
      <BodyText variant="sm" weight="semibold" as="h3">{{ t('arOpportunity.cards.opportunitySummaryTitle') }}</BodyText>
    </template>

    <template #header-controls>
      <!-- AB#20609: no receivables destination yet - see overviewSummaryFlags.ts. -->
      <CustomButton
        v-if="showScf"
        class="opportunity-summary-card__scf"
        :text="t('arOpportunity.cards.scfButton')"
        icon="external-link"
        icon-position="end"
        size="xxs"
      />
      <TooltipButton :text="t('arOpportunity.cards.opportunitySummaryTitle')" position="top">
        <template #content>
          <div v-for="section in tooltipSections" :key="section.title" class="opportunity-summary-card__tooltip-section">
            <BodyText variant="xs" weight="bold" as="h4">{{ section.title }}</BodyText>
            <BodyText variant="xs" as="p">{{ section.text }}</BodyText>
          </div>
        </template>
      </TooltipButton>
    </template>

    <ContentBoxBody is-transparent class="opportunity-summary-card__panels">
      <ContentBoxBody class="payment-terms">
        <BodyText variant="sm" weight="semibold" as="h4" class="payment-terms__title text-gray-400">
          {{ t('arOpportunity.cards.paymentTermsTitle') }}
        </BodyText>
        <div class="payment-terms__body">
          <div class="payment-terms__main">
            <DisplayText variant="lg" weight="semibold" class="payment-terms__contractual">{{ paymentTerms.contractual }}</DisplayText>
            <BodyText variant="sm" weight="medium" class="text-gray-400">{{ t('global.contractual') }}</BodyText>
            <BodyText v-if="paymentTerms.avgDaysPaid" variant="xs" class="summary-caption payment-terms__avg-days-paid text-gray-400">
              {{ t('arOpportunity.cards.avgDaysPaidCaption', { days: paymentTerms.avgDaysPaid }) }}
            </BodyText>
          </div>

          <span class="summary-divider" aria-hidden="true" />

          <div class="payment-terms__side">
            <div class="payment-terms__item">
              <DisplayText variant="md" weight="semibold" class="text-brand-500 payment-terms__opportunity ">{{ paymentTerms.opportunity }}</DisplayText>
              <BodyText variant="sm" weight="medium" class="text-gray-400">{{ t('global.opportunity') }}</BodyText>
              <BodyText v-if="paymentTerms.opportunityPaymentFloat" variant="xs" class="summary-caption payment-terms__float text-gray-400">
                {{ t('arOpportunity.cards.paymentFloatCaption', { days: paymentTerms.opportunityPaymentFloat }) }}
              </BodyText>
            </div>
            <div class="payment-terms__item">
              <DisplayText variant="sm" class="payment-terms__expected">{{ paymentTerms.expected }}</DisplayText>
              <BodyText variant="sm" weight="medium" class="text-gray-400">{{ t('global.expected') }}</BodyText>
              <BodyText v-if="paymentTerms.expectedPaymentFloat" variant="xs" class="summary-caption payment-terms__float text-gray-400">
                {{ t('arOpportunity.cards.paymentFloatCaption', { days: paymentTerms.expectedPaymentFloat }) }}
              </BodyText>
            </div>
          </div>
        </div>
      </ContentBoxBody>

      <ContentBoxBody class="summary-metrics">
        <template v-for="(metric, index) in metrics" :key="metric.id">
          <!-- A rule between two plain columns only: a highlighted column already has its own edge. -->
          <span
            v-if="index > 0 && !metric.highlighted && !metrics[index - 1].highlighted"
            class="summary-divider"
            aria-hidden="true"
          />
          <div
            class="summary-metric"
            :class="{ 'summary-metric--highlighted': metric.highlighted }"
            :data-metric="metric.id"
          >
            <BodyText variant="sm" weight="semibold" as="h4" class="text-gray-400">{{ metric.title }}</BodyText>
            <div class="summary-metric__value">
              <DisplayText variant="md" class="text-brand-500 summary-metric__opportunity">{{ metric.opportunity || NOT_AVAILABLE }}</DisplayText>
              <BodyText variant="sm" class="summary-caption text-gray-400">{{ t('global.opportunity') }}</BodyText>
            </div>
            <div class="summary-metric__value">
              <DisplayText variant="sm" class="summary-metric__expected">{{ metric.expected || NOT_AVAILABLE }}</DisplayText>
              <BodyText variant="sm" class="summary-caption text-gray-400">{{ t('global.expected') }}</BodyText>
            </div>
          </div>
        </template>
      </ContentBoxBody>
    </ContentBoxBody>
  </ContentBox>
</template>

<script setup lang="ts">
/**
 * AB#20609: the Overview's Opportunity Summary card - Payment Terms (Days) beside the money
 * columns, in one shell. Built from ContentBox/ContentBoxBody's own "transparent body" pattern
 * (see Storybook, Components/ContentBox) rather than new chrome. It only lays out what it is
 * handed; OpportunityOverview.vue formats every figure.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BodyText, ContentBox, ContentBoxBody, CustomButton, DisplayText, TooltipButton } from '@ada/design-system'
import type { OverviewSummaryMetric, OverviewSummaryPaymentTerms } from './overviewSummaryTypes'

/** What OpportunityExpectedValues, the component this card replaces, showed for an empty figure. */
const NOT_AVAILABLE = 'N/A'

const props = withDefaults(defineProps<{
  paymentTerms: OverviewSummaryPaymentTerms
  metrics: OverviewSummaryMetric[]
  showScf?: boolean
}>(), {
  showScf: false,
})

const { t } = useI18n()

/** One tooltip for the whole card, as the design has it: a paragraph per section, in card order. */
const tooltipSections = computed(() => [
  { title: t('arOpportunity.cards.paymentTermsTitle'), text: t('arOpportunity.cards.paymentTermsTooltip') },
  ...props.metrics.map((metric) => ({ title: metric.title, text: metric.tooltip })),
])
</script>

<style lang="scss" scoped>
.opportunity-summary-card__panels {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
  gap: 0.25rem;

  @media (max-width: 991.98px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.opportunity-summary-card__tooltip-section {
  max-width: 24rem;

  & + & {
    margin-top: 0.5rem;
  }
}

.summary-caption {
  color: var(--color-text-3);
}

.summary-divider {
  width: 1px;
  align-self: stretch;
  background: var(--border-color-default);
}

.payment-terms {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: var(--color-text-1);

  &__body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 1rem;
    flex: 1;
  }

  &__main,
  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  &__side {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
}

.summary-metrics {
  display: flex;
  gap: 0.5rem;
  color: var(--color-text-1);
}

.summary-metric {
  display: flex;
  flex: 1 1 0;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  text-align: center;
  border: 1px solid transparent;
  border-radius: var(--border-radius-2);

  &--highlighted {
    background: var(--bg-surface-subtle-1);
    border-color: var(--border-color-default);
  }

  &__value {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}

/* Each figure and its caption read as one piece, so the space BETWEEN pieces is what shows: the
   big numbers drop DisplayText/BodyText's own line-height and the caption sits right under them.
   Nested under the card's own classes to outrank those primitives' single-class rules. */
.payment-terms,
.summary-metric {
  .payment-terms__contractual,
  .payment-terms__opportunity,
  .payment-terms__expected,
  .summary-metric__opportunity,
  .summary-metric__expected {
    line-height: 1;
  }

  .summary-caption {
    line-height: 1.1;
    margin-top: 1px;
  }
}
</style>
