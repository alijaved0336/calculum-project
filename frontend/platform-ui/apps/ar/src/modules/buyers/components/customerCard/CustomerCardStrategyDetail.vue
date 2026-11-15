<template>
  <div class="strategy-detail">
    <ContentBoxBody v-for="band in panel.bands" :key="band.titleKey" class="strategy-detail__card mb-3">
      <BarsWrapper
        :main-value="band.terms ?? undefined"
        :title="t(`arCustomerCard.opportunity.benchmarks.extra.${band.titleKey}`)"
        type="expected"
        :strategy-key="band.titleKey"
      />
      <div v-if="band.badges.length" class="d-flex flex-wrap gap-2 mt-2">
        <span
          v-for="badge in band.badges"
          :key="badge.key"
          class="strategy-detail__badge"
          :class="{ 'strategy-detail__badge--active': badge.active }"
        >
          <i v-if="badge.active" class="fa-solid fa-circle-check" aria-hidden="true"></i>
          <span class="strategy-detail__badge-label">
            {{ t(`arCustomerCard.opportunity.benchmarks.details.${badge.key}`) }}
          </span>
          <span class="font-bold">{{ badge.value ?? NOT_BACKED }}</span>
        </span>
      </div>
    </ContentBoxBody>

    <!-- Four cards per row when there are more than three, otherwise three. Title stays on top;
         the value fills the rest of the card, centered both ways. -->
    <div v-if="panel.cards.length" class="strategy-detail__cards row g-2">
      <div
        v-for="card in panel.cards"
        :key="card.key"
        class="strategy-detail__metric d-flex flex-column"
        :class="cardColClass"
      >
        <ContentBoxBody class="strategy-detail__metric-body d-flex flex-column text-center">
          <div class="text-gray-700 text-sm">{{ t(`arCustomerCard.opportunity.benchmarks.cards.${card.key}`) }}</div>
          <div class="flex-grow-1 d-flex align-items-center justify-content-center">
            <!-- Kendo's tooltip reads the value's own `title` - the full text behind the ellipsis. -->
            <Tooltip class="strategy-detail__metric-tooltip" :open-delay="50" :anchor-element="'target'" :position="'top'">
              <div
                class="strategy-detail__metric-value text-center text-gray-700 text-capitalize font-bold"
                :class="card.format === 'text' ? 'text-xl' : 'text-2xl'"
                :title="formatCard(card)"
              >{{ formatCard(card) }}</div>
            </Tooltip>
          </div>
        </ContentBoxBody>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The Opportunity tab's benchmark drill-down (the right-hand card beside Payment Term Benchmarks):
 * the clicked bar's bands (a term bar with its figure badges, highest first, the one
 * `calculationMethod` picked shown as active) and its metric cards. What each panel contains is
 * `buildBenchmarkPanel`'s call (`opportunityStrategyDetail.ts`); this component only renders it.
 * The panel's title, "?" and back chevron live in the host `ContentBox`'s `header-title` slot
 * (`CustomerCardOpportunityTab`), not here.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BarsWrapper, ContentBoxBody, Tooltip } from '@ada/design-system'
import { formatMoneyCompact, prependMoneySymbol } from '@/utils/moneyFormatting'
import { useArCurrenciesStore } from '@/stores/arCurrencies'
import type { BenchmarkPanel, PanelCard } from './opportunityStrategyDetail'

const props = defineProps<{
  panel: BenchmarkPanel
}>()
const { t } = useI18n({ useScope: 'global' })
const currenciesStore = useArCurrenciesStore()

const NOT_BACKED = '-'

/** Four cards per row once there are more than three, three per row otherwise. */
const cardColClass = computed(() => (props.panel.cards.length > 3 ? 'col-3' : 'col-4'))

function signed(value: number, magnitude: string): string {
  if (value > 0) return `+${magnitude}`
  if (value < 0) return `-${magnitude}`
  return magnitude
}

/** An infoCard the backend sent without a value. */
const NO_VALUE = 'N/A'

/**
 * A card's money amount, always with one decimal like the abbreviated ones ("2.8k"). From 1,000 up
 * that is `formatMoneyCompact` as-is; under 1,000 Intl's compact notation drops the decimals (366.98
 * reads "367"), so the plain amount keeps one ("367.0") instead. Kept local to the cards rather than
 * changing `formatMoneyCompact`, which every other screen shares.
 */
function formatCardMoney(amount: number, symbol: string): string {
  if (Math.abs(amount) < 1000) {
    return prependMoneySymbol(amount.toFixed(1), symbol)
  }
  return formatMoneyCompact(amount, symbol)
}

function formatCard({ value, format }: PanelCard): string {
  if (value == null || value === '') return NO_VALUE
  if (typeof value === 'string') return value
  const symbol = currenciesStore.selectedCurrencySymbol
  switch (format) {
    case 'signedMoney':
      return signed(value, formatCardMoney(Math.abs(value), symbol))
    case 'money':
      return formatCardMoney(value, symbol)
    case 'percent':
      return `${value.toFixed(2)}%`
    default:
      return String(value)
  }
}
</script>

<style scoped>
.strategy-detail__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-surface-subtle-1, #f2f4f7);
  font-size: 1rem;
  color: var(--neutral-700, #344054);
}

.strategy-detail__badge-label {
  color: var(--neutral-500, #667085);
}

.strategy-detail__badge--active {
  background: var(--neutral-500, #667085);
  color: #fff;
}

.strategy-detail__badge--active .strategy-detail__badge-label {
  color: #fff;
}

/* Title at the top, the value below it with room around both - the same breathing space as the
   app's other title/value cards - and the value centered in whatever height is left. */
.strategy-detail__metric-body {
  gap: 1rem;
  padding: 0.75rem 0.75rem 1rem;
}

/* Kendo's Tooltip wrapper sits between the flex container and the value - without min-width 0 it
   would size to the unclamped text and push the card wider instead of letting the value clamp. */
.strategy-detail__metric-tooltip {
  min-width: 0;
  max-width: 100%;
}

/* A long text value (e.g. Main Industry) stops at two lines with an ellipsis; the full text shows
   in the Kendo tooltip on hover. */
.strategy-detail__metric-value {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}

</style>
