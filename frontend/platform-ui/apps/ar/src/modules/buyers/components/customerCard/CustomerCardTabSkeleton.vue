<template>
<div class="row g-3">
  <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="col-12">
    <div class="row g-3">
      <div v-for="(card, cardIndex) in row" :key="cardIndex" :class="[card.col ?? 'col-12', 'd-flex flex-column']">
        <ContentBox class="flex-grow-1">
          <ContentBoxBody>
            <Skeleton
              v-if="card.title !== false"
              class="mb-3"
              :shape="'rectangle'"
              :style="{ width: '40%', height: '12px', borderRadius: '4px' }"
            />
            <Skeleton
              v-for="line in card.lines ?? 3"
              :key="line"
              class="mb-2"
              :shape="'rectangle'"
              :style="{
                width: line === (card.lines ?? 3) ? '60%' : '100%',
                height: card.lineHeight ?? '16px',
                borderRadius: '4px',
              }"
            />
          </ContentBoxBody>
        </ContentBox>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
/**
 * A generic Kendo-`Skeleton`-based placeholder for `CustomerCardView`'s tab components
 * (`CustomerCardOpportunityTab`/`CustomerCardCorporateTreeTab`/`CustomerCardCompanyDetailsTab`),
 * shown in place of `CalculumLoadingAr` while each tab's own fetch (`useCustomerCard` /
 * `useBuyerCompanyDetails`) is in flight. `CalculumLoadingAr modal` blocked the whole screen behind a
 * dimmed overlay; this instead reserves the same `ContentBox` grid shape the real content will
 * render into, so the layout does not jump once the response lands.
 *
 * Declarative rather than tab-specific: each caller describes its own layout as `rows` (rows of
 * cards, each card a Bootstrap column class plus how many placeholder lines it draws) instead of
 * this component hard-coding any one tab's shape.
 */
import { ContentBox, ContentBoxBody, Skeleton } from '@ada/design-system'

export interface CustomerCardSkeletonCard {
  /** Bootstrap column class for this card - defaults to `col-12`. */
  col?: string
  /** Placeholder lines this card's body draws - defaults to 3. */
  lines?: number
  /** CSS height for each placeholder line - defaults to `16px`. */
  lineHeight?: string
  /** Set to `false` to skip the card's own title-bar placeholder line. */
  title?: boolean
}

defineProps<{ rows: CustomerCardSkeletonCard[][] }>()
</script>
