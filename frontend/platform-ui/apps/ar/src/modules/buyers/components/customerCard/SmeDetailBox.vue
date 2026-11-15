<template>
<div :id="isSme ? 'sme-card-details-sme' : 'sme-card-details-not-sme'" class="row">
  <div class="col-12 mb-3">
    <div class="d-flex gap-3 align-items-start">
      <span class="sme-badge-icon">
        <SmeBadge v-if="isSme" />
        <SmeBadgeExcluded v-else />
      </span>
      <div class="d-flex flex-column">
        <span class="text-muted text-uppercase small">{{ t('home.entityCard.companyDetails.general.source') }}</span>
        <span class="fw-bold">{{ classificationCase.name }}</span>
        <span class="text-muted small mt-2">{{ classificationCase.description }}</span>
      </div>
    </div>
  </div>
  <div class="col-12">
    <SmeClassificationCase :description="classificationCase.description" :limits="classificationCase.limits" />
  </div>
</div>
</template>

<script setup lang="ts">
/**
 * Ported from apps/ap/src/modules/home/entityCard/components/details/SmeDetailBox.vue, rendering
 * off the SAME shared `home.entityCard.companyDetails.*` i18n keys AP's own copy reads - this file
 * lives in `@ada/design-system`'s locale bundle, which both AP and AR already load in full
 * (confirmed by this module's own `arCustomerCard.*` additions living in the exact same JSON
 * files), so reusing AP's own keys beats re-authoring a parallel `arCustomerCard.*` copy of the
 * same forty-country SME classification-criteria library. This does couple AR to a namespace AP
 * owns; a future rename/removal of `home.entityCard.companyDetails.sources.*` needs to account for
 * this reader too.
 *
 * Two deliberate differences from the AP original:
 * - `smeFeatureEnabled` (AP's `useSMEFeature` composable) is hardcoded to `true` - AR has no
 *   equivalent "SME feature" toggle to gate on yet, so the original's `v-else` ("SME data not
 *   enabled") branch is dropped entirely rather than carried over as permanently-dead code.
 * - Every `DetailBox` usage in the original (a label + an always-empty value, there purely for its
 *   layout) is replaced with a plain `<span>` - AR gets no `DetailBox` equivalent of its own as
 *   part of this change.
 *
 * Props are exactly `isSme`/`smeSource`, `BuyerCompanyDetailsResponse`'s own two SME fields - this
 * component holds no fetch of its own and reads nothing else off the API response. AP's own
 * "Show Details" button (opening a `CalculumModal` with the classification case's extended
 * `otherDescription`) is dropped entirely here, not just unwired - not asked for.
 *
 * The card's own title (AP's `smeTitleValue`) is NOT rendered here - `CustomerCardCompanyDetailsTab`
 * renders it as this card's own `ContentBox` header instead, so it stays a title of the card
 * (matching every other card on this tab), not a row inside this component's body.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SmeBadge from './icons/SmeBadge.vue'
import SmeBadgeExcluded from './icons/SmeBadgeExcluded.vue'
import SmeClassificationCase from './SmeClassificationCase.vue'

const props = defineProps<{
  isSme: boolean | null
  smeSource: string | null
}>()

// warnHtmlMessage: false, matching AP's own SmeDetailBox - `sources.<x>.cardDescription` values
// are occasionally HTML-flavored strings even though nothing here renders them via v-html, and
// vue-i18n warns on any HTML-looking content by default regardless.
const { t, tm } = useI18n({ useScope: 'global', warnHtmlMessage: false })

// Hardcoded per this component's own doc - AR has no SME feature-flag system yet.
const smeFeatureEnabled = true

const classificationCaseBaseKey = computed(() => {
  const useNotSmeDefault = smeFeatureEnabled && !props.isSme && (props.smeSource === null || props.smeSource === '')
  return useNotSmeDefault
    ? 'home.entityCard.companyDetails.sources.notSME'
    : `home.entityCard.companyDetails.sources.${props.smeSource || 'default'}`
})

const classificationCase = computed(() => {
  const baseKey = classificationCaseBaseKey.value
  const name = t(`${baseKey}.name`)
  const description = t(`${baseKey}.cardDescription`)
  const limits = tm(`${baseKey}.cardLimits`) as Array<{ label: string; value: string }> | undefined
  return {
    name: typeof name === 'string' ? name : '',
    description: typeof description === 'string' ? description : '',
    limits: Array.isArray(limits) ? limits : [],
  }
})

</script>

<style scoped>
/*
 * SmeBadge is a huge embedded raster (ported byte-for-byte from AP's own
 * resources/assets/images/icons/smeBadge.vue) whose <svg> carries its own explicit width/height
 * attributes - a plain CSS width/height on the wrapper is not enough to shrink it, since those
 * attributes still govern the SVG's own intrinsic size inside the wrapper. overflow: hidden on a
 * fixed-size wrapper, plus :deep() forcing the actual <svg> (one component layer down, past
 * SmeBadgeExcluded's own wrapping <span>) to fill that box, is what actually constrains it.
 */
.sme-badge-icon {
  display: inline-flex;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  overflow: hidden;
}

.sme-badge-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
