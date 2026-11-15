<template>
  <div class="card shadow-none h-100">
    <div class="card-body d-flex flex-column">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h6 class="wc-ts__title">{{ $t('home.workingCapital.topSuppliers.title') }}</h6>
          <p class="wc-ts__subtitle">{{ $t('home.workingCapital.topSuppliers.subtitle') }}</p>
        </div>
        <span class="wc-ts__badge">Top {{ result.topSuppliers.length }} of {{ formattedImproved }}</span>
      </div>
      <template v-if="showSkeleton">
        <SkeletonRectangle size="full" />
      </template>
      <template v-else>
        <div class="wc-ts__table">
          <div class="wc-ts__header">
            <span class="wc-ts__col-rank">{{ $t('home.workingCapital.topSuppliers.colRank') }}</span>
            <span class="wc-ts__col-name">{{ $t('home.workingCapital.topSuppliers.colSupplier') }}</span>
            <span class="wc-ts__col-country">{{ $t('home.workingCapital.topSuppliers.colCountry') }}</span>
            <span class="wc-ts__col-cashflow">{{ $t('home.workingCapital.topSuppliers.colCashFlow') }}</span>
            <span class="wc-ts__col-terms">{{ $t('home.workingCapital.topSuppliers.colTerms') }}</span>
            <span class="wc-ts__col-ext">{{ $t('home.workingCapital.topSuppliers.colExt') }}</span>
          </div>
          <div
            v-for="(item, i) in result.topSuppliers"
            :key="item.supplier"
            class="wc-ts__row"
          >
            <span class="wc-ts__rank">{{ i + 1 }}</span>
            <span class="wc-ts__name">{{ item.supplier }}</span>
            <span class="wc-ts__country">{{ item.country }}</span>
            <span class="wc-ts__cashflow">{{ formatUSD(item.cashFlow) }}</span>
            <span class="wc-ts__terms">{{ item.termsFrom }} &rarr; {{ item.termsTo }}</span>
            <span class="wc-ts__ext">+{{ item.extension }}</span>
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
  name: 'TopSuppliersChart',
  components: { SkeletonRectangle },
  props: {
    result: {
      type: Object as PropType<WorkingCapitalComparisonResult>,
      required: true,
    },
    showSkeleton: { type: Boolean, default: false },
  },
  setup(props) {
    const formattedImproved = computed(() =>
      props.result.suppliersImproved.toLocaleString('en-US'),
    )

    return { formattedImproved, formatUSD }
  },
})
</script>

<style scoped lang="scss">
.wc-ts {
  &__title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #101828;
    margin-bottom: 0.125rem;
  }

  &__subtitle {
    font-size: 0.875rem;
    color: #667085;
    margin-bottom: 0.75rem;
  }

  &__badge {
    background: #f5f3ff;
    color: #6172F3;
    border: 1px solid #c7d7fe;
    border-radius: 12px;
    padding: 2px 10px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__table {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  &__header,
  &__row {
    display: grid;
    grid-template-columns: 24px 1fr 120px 110px 90px 46px;
    align-items: center;
    gap: 0 1.25rem;
  }

  &__header {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #667085;
    padding-bottom: 0.375rem;
    border-bottom: 1px solid #e4e7ec;
    margin-bottom: 0.25rem;
  }

  &__col-rank,
  &__col-cashflow,
  &__col-terms,
  &__col-ext {
    text-align: center;
  }

  &__row {
    font-size: 1.0625rem;
    color: #344054;
    padding: 0.5rem 0;

    & + & {
      border-top: 1px solid #f2f4f7;
    }
  }

  &__rank {
    color: #98a2b3;
    font-size: 1.0625rem;
    text-align: center;
  }

  &__name {
    font-weight: 500;
    color: #101828;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  &__country {
    color: #667085;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__cashflow {
    font-weight: 600;
    color: #101828;
    text-align: center;
    white-space: nowrap;
  }

  &__terms {
    color: #667085;
    white-space: nowrap;
    text-align: center;
  }

  &__ext {
    background: #ecfdf3;
    color: #027a48;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 0.875rem;
    font-weight: 600;
    text-align: center;
    white-space: nowrap;
  }
}
</style>
