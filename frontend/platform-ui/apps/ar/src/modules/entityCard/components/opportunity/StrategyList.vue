<template>
  <div>
    <h6 class="mb-2">{{ t('arEntityCard.opportunity.strategyList.title') }}</h6>
    <ul class="list-unstyled mb-0">
      <li
        v-for="row in rows"
        :key="row.strategy"
        class="d-flex align-items-start gap-2 py-1"
      >
        <CustomBadge
          v-if="row.isWinner"
          :text="t('arEntityCard.opportunity.strategyList.winner')"
          variant="success"
        />
        <span class="fw-semibold">{{ humanizePascalCase(row.strategy) }}</span>
        <span>{{ formatDays(row.proposedTerm, t) }}</span>
        <span v-if="row.applicabilityReason" class="text-muted text-xs">{{ row.applicabilityReason }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/** UC-UI-07's basic flow: every strategy evaluated, the winner marked, each loser given its
 * reason - AP's four ADO #18923 panels cover the Benchmarks radar but not this full list. */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CustomBadge } from '@ada/design-system'
import { humanizePascalCase } from './humanize'
import { formatDays } from './format'
import { deriveStrategyRows } from './strategyRows'
import type { BuyerCardStrategyResultDto } from '@/api'

const props = defineProps<{
  strategyBreakdown: BuyerCardStrategyResultDto[]
  winningStrategy: string | null
}>()

const { t } = useI18n({ useScope: 'global' })

const rows = computed(() => deriveStrategyRows(props.strategyBreakdown, props.winningStrategy))
</script>
