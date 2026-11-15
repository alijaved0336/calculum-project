<template>
  <div class="card shadow-none h-100">
    <div class="card-body d-flex flex-column">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h6 class="wc-ptbc__title">{{ $t('home.workingCapital.paymentTermsByCountry.title') }}</h6>
          <p class="wc-ptbc__subtitle">{{ subtitle }}</p>
        </div>
        <div class="d-flex align-items-center wc-ptbc__legend">
          <div class="wc-ptbc__legend-item">
            <span class="wc-ptbc__legend-dot wc-ptbc__legend-dot--base"></span>
            <span>{{ $t('home.workingCapital.paymentTermsByCountry.ptLabel', { year: fromLabel }) }}</span>
          </div>
          <div class="wc-ptbc__legend-item">
            <span class="wc-ptbc__legend-dot wc-ptbc__legend-dot--increase"></span>
            <span>{{ $t('home.workingCapital.paymentTermsByCountry.increase') }}</span>
          </div>
        </div>
      </div>
      <template v-if="showSkeleton">
        <SkeletonRectangle size="full" />
      </template>
      <template v-else>
        <div class="wc-ptbc__list">
          <div v-for="item in rows" :key="item.country" class="wc-ptbc__row">
            <span class="wc-ptbc__country">{{ item.country }}</span>
            <div class="wc-ptbc__bar-wrap">
              <div class="wc-ptbc__bar wc-ptbc__bar--base" :style="{ width: item.basePct + '%' }"></div>
              <div class="wc-ptbc__bar wc-ptbc__bar--increase" :style="{ width: item.increasePct + '%' }"></div>
            </div>
            <div class="wc-ptbc__values">
              <span class="wc-ptbc__total">{{ item.total }}</span>
              <span class="wc-ptbc__change">+{{ item.increase }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import SkeletonRectangle from '@/modules/home/components/skeletons/SkeletonRectangle.vue'
import type { WorkingCapitalComparisonResult } from '../types'
import { formatDays } from '../utils/formatters'

export default defineComponent({
  name: 'PaymentTermsByCountryChart',
  components: { SkeletonRectangle },
  props: {
    result: {
      type: Object as PropType<WorkingCapitalComparisonResult>,
      required: true,
    },
    fromLabel:    { type: String, default: '' }, // month + year, e.g. "Dec 2022"
    toLabel:      { type: String, default: '' }, // month + year, e.g. "Dec 2023"
    showSkeleton: { type: Boolean, default: false },
  },
  setup(props) {
    const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    const subtitle = computed(() => {
      if (props.fromLabel && props.toLabel) {
        return t('home.workingCapital.paymentTermsByCountry.subtitleWithYears', { fromYear: props.fromLabel, toYear: props.toLabel })
      }
      return t('home.workingCapital.paymentTermsByCountry.subtitleDefault')
    })

    const rows = computed(() => {
      const items = props.result.paymentTermsByCountry
      const maxTotal = Math.max(...items.map(i => i.waptFrom + i.increase))
      const safeMax = maxTotal > 0 ? maxTotal : 1
      return items.map(item => ({
        country:     item.country,
        basePct:     (item.waptFrom / safeMax) * 100,
        increasePct: (item.increase / safeMax) * 100,
        // AC-05 — standard days-unit label; fixes the pre-existing inconsistency where
        // `increase` had no suffix at all while `total` had a bare "d".
        total:       formatDays(item.waptFrom + item.increase, t),
        increase:    formatDays(item.increase, t),
      }))
    })

    return { subtitle, rows }
  },
})
</script>

<style scoped lang="scss">
.wc-ptbc {
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

  &__legend {
    gap: 0.75rem;
    font-size: 0.75rem;
    color: #344054;
    flex-shrink: 0;
  }

  &__legend-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  &__legend-dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;

    &--base     { background: #5262eb; } // custom indigo
    &--increase { background: #15b79e; } // ColorsUtils.teal[500]
  }

  &__list {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 0.625rem;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__country {
    font-size: 0.875rem;
    color: #344054;
    min-width: 8rem;
    flex-shrink: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__bar-wrap {
    flex: 1;
    display: flex;
    height: 20px;
    background: #f2f4f7;
    border-radius: 3px;
    overflow: hidden;
    min-width: 0;
  }

  &__bar {
    height: 100%;
    transition: width 0.4s ease;

    &--base     { background: #5262eb; border-radius: 3px 0 0 3px; } // custom indigo
    &--increase { background: #15b79e; border-radius: 0 3px 3px 0; } // ColorsUtils.teal[500]
  }

  &__values {
    display: grid;
    grid-template-columns: 4.5rem 3.5rem;
    align-items: center;
    flex-shrink: 0;
  }

  &__total {
    font-size: 1.125rem;
    font-weight: 600;
    color: #101828;
    white-space: nowrap;
    text-align: right;
  }

  &__change {
    font-size: 1.125rem;
    font-weight: 600;
    color: #0e9384; // ColorsUtils.teal[600]
    white-space: nowrap;
    text-align: left;
    padding-left: 0.5rem;
  }
}
</style>
