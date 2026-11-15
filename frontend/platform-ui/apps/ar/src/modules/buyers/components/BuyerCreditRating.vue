<template>
<span v-if="rating" class="d-inline-flex align-items-center gap-1">
  <CustomBadge :text="rating" variant="info" />
  <!-- @click.stop: BuyerGrid's row itself opens the buyer on click (rowclick) - the tooltip
       trigger must not also fire that navigation, the same reasoning DashboardView.vue's own
       @click.stop already documents for interactive content inside a clickable row. -->
  <TooltipButton @click.stop :text="t('arBuyers.table.tooltips.creditRatingDisclaimer')" />
</span>
<span v-else>—</span>
</template>

<script setup lang="ts">
/**
 * The credit-rating cell/fact, identical in the grid and the card (UC-UI-05): a badge when
 * `CreditRating` has run for this buyer, an em-dash otherwise - matching every other "not
 * available" value on this screen and on the Customer Card it opens into. Pulled out once both
 * presentations needed the exact same three lines rather than kept as a second copy that could
 * drift (a differently-worded fallback in one of the two would be the kind of inconsistency
 * nobody notices until a support ticket compares screenshots).
 *
 * UC-UI-21 FR-1: every rating this renders carries a disclaimer that it is estimated from the
 * parent company's profile, not an independent assessment of the entity shown. AF-1: no rating
 * to show means no disclaimer either - there is nothing to caveat.
 */
import { CustomBadge, TooltipButton } from '@ada/design-system'
import { useI18n } from 'vue-i18n'

defineProps<{ rating: string | null }>()
const { t } = useI18n({ useScope: 'global' })
</script>
