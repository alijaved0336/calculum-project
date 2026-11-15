<template>
  <ContentBox class="sales-entities-card">
    <template #header-title>
      <BodyText variant="sm" weight="semibold" as="h3">{{ t('arOpportunity.cards.salesTitle') }}</BodyText>
    </template>

    <template #header-controls>
      <!-- AB#20321's period, moved here by AB#20609 - a caption, a step below the card title. -->
      <BodyText v-if="period" variant="xs" class="sales-entities-card__period">
        {{ t('arOpportunity.cards.periodLabel', { range: period }) }}
      </BodyText>
      <TooltipButton :text="t('arOpportunity.cards.salesTooltip')" position="top" />
    </template>

    <ContentBoxBody is-transparent class="sales-entities-card__tiles">
      <ContentBoxBody class="sales-tile sales-tile--wide" data-tile="salesVolume">
        <BodyText variant="sm" weight="medium" class="text-gray-400">{{ t('arOpportunity.cards.salesVolume') }}</BodyText>
        <div class="sales-tile__value-row">
          <DisplayText variant="sm" class="sales-tile__value">{{ salesVolume }}</DisplayText>
          <CustomBadge
            v-if="salesVolumeTrend"
            class="sales-tile__trend"
            :text="salesVolumeTrend.text"
            :variant="salesVolumeTrend.direction === 'up' ? 'success' : 'danger'"
            :dot="false"
          />
        </div>
      </ContentBoxBody>
      <ContentBoxBody v-for="tile in countTiles" :key="tile.id" class="sales-tile" :data-tile="tile.id">
        <BodyText variant="sm" weight="medium" class="sales-tile__title text-gray-400">{{ tile.title }}</BodyText>
        <DisplayText variant="sm" class="sales-tile__value">{{ tile.value }}</DisplayText>
      </ContentBoxBody>
    </ContentBoxBody>
  </ContentBox>
</template>

<script setup lang="ts">
/**
 * AB#20609: the Overview's Sales & Entities card, as tiles - ContentBox's "transparent body"
 * pattern (Storybook, Components/ContentBox). Receivables terms throughout: Sales, Buyers, Sales
 * Lines. Every figure arrives formatted from OpportunityOverview.vue.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { BodyText, ContentBox, ContentBoxBody, CustomBadge, DisplayText, TooltipButton } from '@ada/design-system'
import type { OverviewSummaryTrend } from './overviewSummaryTypes'

const props = withDefaults(defineProps<{
  /** The version's period, already formatted - no caption when empty. */
  period: string
  salesVolume: string
  salesVolumeTrend?: OverviewSummaryTrend | null
  parents: string
  buyers: string
  salesLines: string
}>(), {
  salesVolumeTrend: null,
})

const { t } = useI18n()

const countTiles = computed(() => [
  { id: 'parents', title: t('global.ultimateParents'), value: props.parents },
  { id: 'buyers', title: t('arOpportunity.cards.buyers'), value: props.buyers },
  { id: 'salesLines', title: t('arOpportunity.cards.salesLines'), value: props.salesLines },
])
</script>

<style lang="scss" scoped>
.sales-entities-card__period {
  color: var(--color-text-3);
  white-space: nowrap;
}

.sales-entities-card__tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.25rem;
}

.sales-tile {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: var(--color-text-1);

  &--wide {
    grid-column: 1 / -1;
  }

  &__title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__value-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
}
</style>
