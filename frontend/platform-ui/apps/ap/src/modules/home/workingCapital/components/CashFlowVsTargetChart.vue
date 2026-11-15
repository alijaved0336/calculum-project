<template>
  <div class="card shadow-none h-100">
    <div class="card-body d-flex flex-column">
      <h6 class="wc-cfvt__title">{{ $t('home.workingCapital.cashFlowVsTarget.title') }}</h6>
      <p class="wc-cfvt__subtitle">{{ $t('home.workingCapital.cashFlowVsTarget.subtitle') }}</p>
      <template v-if="showSkeleton">
        <SkeletonRectangle size="full" />
      </template>
      <template v-else-if="showEmptyState">
        <div class="wc-cfvt__empty">{{ $t('home.workingCapital.cashFlowVsTarget.noData') }}</div>
      </template>
      <template v-else>
        <div class="wc-cfvt__body">
          <div class="wc-cfvt__hero">
            <Tooltip v-if="exactAchievedPct" :open-delay="100" anchor-element="target" position="bottom">
              <button type="button" class="wc-cfvt__pct" :title="exactAchievedPct">{{ result.targetAchievementPct }}%</button>
            </Tooltip>
            <span v-else class="wc-cfvt__pct">{{ result.targetAchievementPct }}%</span>
            <span class="wc-cfvt__pct-sub">{{ $t('home.workingCapital.cashFlowVsTarget.targetAchieved', { target: formattedTarget }) }}</span>
          </div>
          <div class="wc-cfvt__bars">
            <div class="wc-cfvt__bar-row">
              <div class="wc-cfvt__bar-meta">
                <span class="wc-cfvt__bar-label">{{ $t('home.workingCapital.cashFlowVsTarget.improvedCashFlow') }}</span>
                <Tooltip :open-delay="100" anchor-element="target" position="bottom">
                  <button type="button" class="wc-cfvt__bar-amount" :title="exactImproved">{{ formattedImproved }}</button>
                </Tooltip>
              </div>
              <div class="wc-cfvt__bar-track">
                <div class="wc-cfvt__bar-fill wc-cfvt__bar-fill--improved" :style="{ width: improvedBarPct + '%' }"></div>
              </div>
            </div>
            <div class="wc-cfvt__bar-row">
              <div class="wc-cfvt__bar-meta">
                <span class="wc-cfvt__bar-label">{{ $t('home.workingCapital.cashFlowVsTarget.targetCashFlow') }}</span>
                <Tooltip :open-delay="100" anchor-element="target" position="bottom">
                  <button type="button" class="wc-cfvt__bar-amount" :title="exactTarget">{{ formattedTarget }}</button>
                </Tooltip>
              </div>
              <div class="wc-cfvt__bar-track">
                <div class="wc-cfvt__bar-fill wc-cfvt__bar-fill--target" :style="{ width: targetBarPct + '%' }"></div>
              </div>
            </div>
            <div class="wc-cfvt__bar-row">
              <div class="wc-cfvt__bar-meta">
                <span class="wc-cfvt__bar-label">{{ $t('home.workingCapital.cashFlowVsTarget.improvedTargetCashFlow') }}</span>
                <Tooltip :open-delay="100" anchor-element="target" position="bottom">
                  <button type="button" class="wc-cfvt__bar-amount" :title="exactImprovedTarget">{{ formattedImprovedTarget }}</button>
                </Tooltip>
              </div>
              <div class="wc-cfvt__bar-track">
                <div class="wc-cfvt__bar-fill wc-cfvt__bar-fill--improved-target" :style="{ width: improvedTargetBarPct + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="wc-cfvt__remaining">
            <div class="wc-cfvt__remaining-meta">
              <span class="wc-cfvt__remaining-icon">&#9873;</span>
              <span class="wc-cfvt__remaining-label">{{ $t('home.workingCapital.cashFlowVsTarget.remainingToTarget') }}</span>
            </div>
            <Tooltip :open-delay="100" anchor-element="target" position="bottom">
              <button type="button" class="wc-cfvt__remaining-amount" :title="exactRemaining">{{ formattedRemaining }}</button>
            </Tooltip>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import SkeletonRectangle from '@/modules/home/components/skeletons/SkeletonRectangle.vue'
import type { WorkingCapitalComparisonResult } from '../types'
import { formatCashFlow, formatUSD, computeSafeMax } from '../utils/formatters'

export default defineComponent({
  name: 'CashFlowVsTargetChart',
  components: { SkeletonRectangle, Tooltip },
  props: {
    result: {
      type: Object as PropType<WorkingCapitalComparisonResult>,
      required: true,
    },
    showSkeleton: { type: Boolean, default: false },
  },
  setup(props) {
    // AC-04 — bars are sized proportionally to their real values (mirrors
    // WAPTImprovementChart's buildRows, which already scales its 3 bars this way).
    // No headroom here (unlike WAPTImprovementChart): the "Target Cash Flow" bar
    // must be able to reach a full 100% width so it stays the same 100%-of-target
    // baseline the hero percentage above (improved/target) is
    // computed against — a >1 headroom would cap the target bar below 100% and
    // make the two disagree visually.
    const safeMax = computed(() => computeSafeMax([
      props.result.totalImprovedCashFlow,
      props.result.targetCashFlow,
      props.result.improvedTargetCashFlow,
    ], 1))
    const improvedBarPct       = computed(() => (props.result.totalImprovedCashFlow   / safeMax.value) * 100)
    const targetBarPct         = computed(() => (props.result.targetCashFlow         / safeMax.value) * 100)
    const improvedTargetBarPct = computed(() => (props.result.improvedTargetCashFlow / safeMax.value) * 100)

    // EF-2 — an explicit empty state when all three bars are zero, instead of
    // rendering a hero/progress/bars block that would just show contradictory zeros.
    const showEmptyState = computed(() =>
      !props.result.totalImprovedCashFlow && !props.result.targetCashFlow && !props.result.improvedTargetCashFlow)

    const formattedImproved       = computed(() => formatCashFlow(props.result.totalImprovedCashFlow))
    const formattedTarget         = computed(() => formatCashFlow(props.result.targetCashFlow))
    const formattedImprovedTarget = computed(() => formatCashFlow(props.result.improvedTargetCashFlow))
    const formattedRemaining = computed(() => {
      const remaining = props.result.targetCashFlow - props.result.totalImprovedCashFlow
      return formatCashFlow(Math.max(0, remaining))
    })

    // Exact amounts on hover/focus — same abbreviated-vs-exact pattern already used
    // by the KPI cards (formatCashFlow abbreviates, formatUSD is the full-precision
    // counterpart, both currency-conversion-aware).
    const exactImproved       = computed(() => formatUSD(props.result.totalImprovedCashFlow))
    const exactTarget         = computed(() => formatUSD(props.result.targetCashFlow))
    const exactImprovedTarget = computed(() => formatUSD(props.result.improvedTargetCashFlow))
    const exactRemaining = computed(() => {
      const remaining = props.result.targetCashFlow - props.result.totalImprovedCashFlow
      return formatUSD(Math.max(0, remaining))
    })
    // Ratio of the same two raw amounts, so currency conversion cancels out —
    // no formatter needed, just more decimal precision than the backend's rounded %.
    const exactAchievedPct = computed(() => {
      const target = props.result.targetCashFlow
      return target > 0 ? `${((props.result.totalImprovedCashFlow / target) * 100).toFixed(1)}%` : ''
    })

    return {
      improvedBarPct,
      targetBarPct,
      improvedTargetBarPct,
      showEmptyState,
      formattedImproved,
      formattedTarget,
      formattedImprovedTarget,
      formattedRemaining,
      exactImproved,
      exactTarget,
      exactImprovedTarget,
      exactRemaining,
      exactAchievedPct,
    }
  },
})
</script>

<style scoped lang="scss">
.wc-cfvt {
  &__title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #101828;
    margin-bottom: 0.125rem;
  }

  &__subtitle {
    font-size: 0.875rem;
    color: #667085;
    margin-bottom: 1.25rem;
  }

  &__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  &__hero {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  &__pct {
    // Native <button> reset — focusable by default (so the Tooltip it wraps reveals
    // on keyboard focus too, per WCAG 1.4.13), but purely a hover/focus trigger with
    // no click action, so it must look identical to the plain text it replaces.
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    font-family: inherit;
    cursor: default;
    font-size: 4rem;
    font-weight: 700;
    color: #5262eb; // indigo[500]
    line-height: 1;
  }

  &__pct-sub {
    font-size: 1rem;
    color: #667085;
    align-self: flex-end;
    padding-bottom: 0.375rem;
  }

  &__bars {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 0.5rem;
  }

  &__bar-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__bar-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__bar-label {
    font-size: 1rem;
    color: #667085;
  }

  &__bar-amount {
    // Native <button> reset — see .wc-cfvt__pct above for why.
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    font-family: inherit;
    cursor: default;
    font-size: 1rem;
    font-weight: 600;
    color: #101828;
  }

  &__bar-track {
    height: 22px;
    background: #f2f4f7;
    border-radius: 4px;
    overflow: hidden;
  }

  &__bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;

    &--improved { background: #5262eb; } // blue[500]
    &--target   { background: #30374f; } // graycool[800]
    &--improved-target {
      background: transparent;
      border: 2px dashed #98a2b3; // gray[400] — mirrors WAPTImprovementChart's target bar
      box-sizing: border-box;
    }
  }

  &__empty {
    font-size: 0.875rem;
    color: #667085;
    padding: 2rem 0;
    text-align: center;
  }

  &__remaining {
    display: flex;
    align-items: center;
    // Same justify-content: space-between idiom as &__bar-meta above, rather than
    // margin-left: auto on the amount itself — that only works when the amount is a
    // direct flex child, which it no longer is once wrapped in <Tooltip>.
    justify-content: space-between;
    border-top: 1px solid #e4e7ec;
    padding-top: 0.75rem;
    margin-top: auto;
  }

  &__remaining-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__remaining-icon {
    color: #667085;
    font-size: 0.9375rem;
    line-height: 1;
  }

  &__remaining-label {
    font-size: 1rem;
    color: #667085;
  }

  &__remaining-amount {
    // Native <button> reset — see .wc-cfvt__pct above for why.
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    font-family: inherit;
    cursor: default;
    font-size: 1.25rem;
    font-weight: 700;
    color: #101828;
  }
}
</style>
