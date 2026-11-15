<template>
  <div class="card shadow-none h-100">
    <div class="card-body d-flex flex-column">
      <h6 class="wc-cfbc__title">{{ $t('home.workingCapital.cashFlowByCountry.title') }}</h6>
      <p class="wc-cfbc__subtitle">{{ $t('home.workingCapital.cashFlowByCountry.subtitle', { count: result.cashFlowByCountry.length }) }}</p>
      <template v-if="showSkeleton">
        <SkeletonRectangle size="full" />
      </template>
      <template v-else>
        <div class="wc-cfbc__list">
          <div v-for="item in rows" :key="item.country" class="wc-cfbc__row">
            <span class="wc-cfbc__country">{{ item.country }}</span>
            <div class="wc-cfbc__bar-wrap">
              <div class="wc-cfbc__bar" :style="{ width: item.pct + '%' }"></div>
            </div>
            <span class="wc-cfbc__amount">{{ item.formattedAmount }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from 'vue'
import SkeletonRectangle from '@/modules/home/components/skeletons/SkeletonRectangle.vue'
import type { WorkingCapitalComparisonResult } from '../types'
import { formatUSD } from '../utils/formatters'

export default defineComponent({
  name: 'CashFlowByCountryChart',
  components: { SkeletonRectangle },
  props: {
    result: {
      type: Object as PropType<WorkingCapitalComparisonResult>,
      required: true,
    },
    showSkeleton: { type: Boolean, default: false },
  },
  setup(props) {
    const rows = computed(() => {
      const items = props.result.cashFlowByCountry
      const max = Math.max(...items.map(i => i.amount))
      const safeMax = max > 0 ? max : 1
      return items.map(item => ({
        country:         item.country,
        pct:             (item.amount / safeMax) * 100,
        formattedAmount: formatUSD(item.amount),
      }))
    })

    return { rows }
  },
})
</script>

<style scoped lang="scss">
.wc-cfbc {
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
    gap: 0.5rem;
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
    height: 20px;
    background: #f2f4f7;
    border-radius: 3px;
    overflow: hidden;
    min-width: 0;
  }

  &__bar {
    height: 100%;
    background: #5262eb;
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  &__amount {
    font-size: 1.125rem;
    font-weight: 600;
    color: #101828;
    min-width: 8.5rem;
    text-align: right;
    white-space: nowrap;
    flex-shrink: 0;
  }
}
</style>
