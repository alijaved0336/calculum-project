<template>
  <div class="card shadow-none wc-kpi-card" :class="{ 'wc-kpi-card--compact': reserveTitleLines }">
    <div
      class="card-body d-flex flex-column"
      :class="{ 'justify-content-between': !reserveTitleLines, 'wc-kpi-card--centered': centered }"
    >
      <span class="wc-kpi-card__title" :class="{ 'wc-kpi-card__title--fixed': reserveTitleLines }">{{ title }}</span>
      <div class="d-flex flex-column" :class="{ 'wc-kpi-card__content--fixed': reserveTitleLines }">
        <template v-if="showSkeleton">
          <SkeletonRectangle size="lg" width-percent-as-string="80%" />
          <SkeletonRectangle class="mt-2" size="sm" width-percent-as-string="60%" />
        </template>
        <template v-else>
          <Tooltip v-if="bigValueTooltip" :open-delay="100" anchor-element="target" position="bottom">
            <button type="button" class="wc-kpi-card__value" :title="bigValueTooltip">{{ bigValue }}</button>
          </Tooltip>
          <span v-else class="wc-kpi-card__value">{{ bigValue }}</span>
          <template v-for="line in normalizedSubLines" :key="line.text">
            <Tooltip v-if="line.tooltip" :open-delay="100" anchor-element="target" position="bottom">
              <button type="button" class="wc-kpi-card__sub" :title="line.tooltip">{{ line.text }}</button>
            </Tooltip>
            <span v-else class="wc-kpi-card__sub">{{ line.text }}</span>
          </template>
          <div v-if="progressPct !== undefined" class="wc-kpi-card__progress">
            <div class="wc-kpi-card__progress-bar" :style="{ width: clampedPct + '%' }"></div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import SkeletonRectangle from '@/modules/home/components/skeletons/SkeletonRectangle.vue'

type SubLine = string | { text: string; tooltip?: string }

export default defineComponent({
  name: 'WorkingCapitalKPICard',
  components: { SkeletonRectangle, Tooltip },
  props: {
    title: { type: String, required: true },
    bigValue: { type: String, default: '' },
    // AC-02 — exact value shown on hover/focus when bigValue is an abbreviated count.
    bigValueTooltip: { type: String, default: '' },
    subLines: { type: Array as PropType<SubLine[]>, default: () => [] },
    progressPct: { type: Number, default: undefined },
    showSkeleton: { type: Boolean, default: false },
    centered: { type: Boolean, default: false },
    // Export modal only (see WorkingCapitalExportPDF.vue): reserves fixed heights for
    // both the title and the value/sub-line/progress-bar block below it. Without this,
    // the 4 cards' real content heights differ slightly (e.g. a sub-line wrapping to 1
    // vs 2 lines, only 1 card having a progress bar), so the row stretches every card
    // to match the tallest one, leaving an uneven amount of blank space under the
    // shorter cards' content. Reserving both keeps every card's number aligned *and*
    // the leftover space underneath equal across all 4. Left false (current behavior)
    // on the live dashboard, which is wide enough that titles/sub-lines never wrap
    // this much.
    reserveTitleLines: { type: Boolean, default: false },
  },
  setup(props) {
    const clampedPct = computed(() =>
      Math.min(100, Math.max(0, props.progressPct ?? 0)),
    )
    const normalizedSubLines = computed(() =>
      props.subLines.map(line => (typeof line === 'string' ? { text: line, tooltip: '' } : line)),
    )
    return { clampedPct, normalizedSubLines }
  },
})
</script>

<style scoped lang="scss">
.wc-kpi-card {
  height: 100%;
  min-height: 11rem;

  // Export modal only — see the `reserveTitleLines` prop. &__title--fixed and
  // &__content--fixed below already make every card's natural content height equal
  // to each other; the 11rem floor above is tuned for the live dashboard's own
  // (unreserved) sizing and can end up taller than that shared natural height here,
  // showing as blank space under the content no matter how the inner blocks are
  // tuned. Drop the floor so this card's height just follows its (now-uniform)
  // content instead.
  &--compact {
    min-height: auto;

    .card-body {
      max-height: 150px;
    }
  }

  &__title {
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: #667085;
  }

  // Export modal only — see the `reserveTitleLines` prop. Reserves room for up to
  // 3 lines at this smaller size/line-height so every card's title box is the same
  // height regardless of how many lines its own text actually wraps to.
  &__title--fixed {
    display: block;
    font-size: 0.95rem;
    line-height: 1.25;
    min-height: 3.6rem;
  }

  // Companion to &__title--fixed: reserves just enough room for the tallest real
  // case among the 4 cards (a 2-line sub-line, OR a 1-line sub-line + progress bar —
  // whichever is taller) so the blank space left under shorter cards' content is the
  // same across all 4, sized tight to content rather than padded generously.
  &__content--fixed {
    min-height: 5.7rem;

    .wc-kpi-card__sub {
      line-height: 1.3;
    }
  }

  &--centered {
    align-items: center;
    text-align: center;
  }

  &__value {
    // Shared by the plain <span> (no tooltip) and the <button> (tooltip present)
    // variants above — this reset is a no-op for the span, and makes the button
    // look identical to it (focusable by default for WCAG 1.4.13, but purely a
    // hover/focus trigger with no click action).
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    font-family: inherit;
    cursor: default;
    font-size: 3rem;
    font-weight: 700;
    color: #101828;
    line-height: 1.1;
  }

  &__sub {
    // See .wc-kpi-card__value above — same shared span/button reset.
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    font-family: inherit;
    cursor: default;
    font-size: 0.75rem;
    color: #667085;
    margin-top: 0.25rem;
  }

  &__progress {
    margin-top: 0.75rem;
    height: 6px;
    background: #e4e7ec;
    border-radius: 3px;
    overflow: hidden;
  }

  &__progress-bar {
    height: 100%;
    background: #5262eb;
    border-radius: 3px;
    transition: width 0.4s ease;
  }
}
</style>
