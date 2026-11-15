<template>
  <div>
    <h6 class="mb-2">{{ t('arEntityCard.opportunity.benchmarks.title') }}</h6>
    <p v-if="points.length === 0" class="text-muted mb-0">
      {{ t('arEntityCard.opportunity.benchmarks.empty') }}
    </p>
    <RadarChart v-else :points="points" />
  </div>
</template>

<script setup lang="ts">
/** AC-03: one radar axis per confirmed strategy's proposed term (AC-05: a still-pending strategy
 * is simply absent, not zeroed - see deriveRadarPoints). */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import RadarChart from '@/components/charts/RadarChart.vue'
import { deriveRadarPoints } from './radarData'
import type { BuyerCardStrategyResultDto } from '@/api'

const props = defineProps<{ strategyBreakdown: BuyerCardStrategyResultDto[] }>()

const { t } = useI18n({ useScope: 'global' })

const points = computed(() => deriveRadarPoints(props.strategyBreakdown))
</script>
