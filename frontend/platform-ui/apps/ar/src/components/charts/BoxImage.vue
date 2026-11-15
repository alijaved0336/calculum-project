<template>
<component :is="selectedIcon" v-if="selectedIcon" :title="toolTipText"></component>
</template>

<script setup lang="ts">
/**
 * Ported from apps/ap/src/modules/home/entityCard/components/BoxImage.vue at commit d004458f63
 * (UC-UI-00 / AB#19226).
 *
 * Kept all four AP box types (financing/scf9Box/vcard/cashFlow) rather than trimming to whatever
 * subset AR's own nine-box turns out to need — that's a domain decision for OPP-17 (the box-scoring
 * calc) and UI-04 (the consuming story), not this port. See ../nine-box-icons/PROVENANCE.md for
 * the icon assets this dispatches to.
 *
 * Adapted: AP's version was 36 near-identical `v-if` template lines (9 icons × 4 box types) each
 * gating on a `boxType`/`boxId` string-literal pair. Collapsed to a lookup table + one dynamic
 * `<component>` — same box→icon mapping (including AP's own `cashFlow` → `blue-Financing-box-*`
 * naming, preserved as-is), just without repeating the same `:title="toolTipText"` binding 36 times.
 */
import { type Component, computed } from 'vue'
import redCFbox01 from './nine-box-icons/red-CF-box-01.vue'
import redCFbox02 from './nine-box-icons/red-CF-box-02.vue'
import redCFbox03 from './nine-box-icons/red-CF-box-03.vue'
import redCFbox04 from './nine-box-icons/red-CF-box-04.vue'
import redCFbox05 from './nine-box-icons/red-CF-box-05.vue'
import redCFbox06 from './nine-box-icons/red-CF-box-06.vue'
import redCFbox07 from './nine-box-icons/red-CF-box-07.vue'
import redCFbox08 from './nine-box-icons/red-CF-box-08.vue'
import redCFbox09 from './nine-box-icons/red-CF-box-09.vue'

import blueFinancingbox01 from './nine-box-icons/blue-Financing-box-01.vue'
import blueFinancingbox02 from './nine-box-icons/blue-Financing-box-02.vue'
import blueFinancingbox03 from './nine-box-icons/blue-Financing-box-03.vue'
import blueFinancingbox04 from './nine-box-icons/blue-Financing-box-04.vue'
import blueFinancingbox05 from './nine-box-icons/blue-Financing-box-05.vue'
import blueFinancingbox06 from './nine-box-icons/blue-Financing-box-06.vue'
import blueFinancingbox07 from './nine-box-icons/blue-Financing-box-07.vue'
import blueFinancingbox08 from './nine-box-icons/blue-Financing-box-08.vue'
import blueFinancingbox09 from './nine-box-icons/blue-Financing-box-09.vue'

import vcardbox01 from './nine-box-icons/vcard-box01.vue'
import vcardbox02 from './nine-box-icons/vcard-box02.vue'
import vcardbox03 from './nine-box-icons/vcard-box03.vue'
import vcardbox04 from './nine-box-icons/vcard-box04.vue'
import vcardbox05 from './nine-box-icons/vcard-box05.vue'
import vcardbox06 from './nine-box-icons/vcard-box06.vue'
import vcardbox07 from './nine-box-icons/vcard-box07.vue'
import vcardbox08 from './nine-box-icons/vcard-box08.vue'
import vcardbox09 from './nine-box-icons/vcard-box09.vue'

type BoxType = 'financing' | 'scf9Box' | 'cashFlow' | 'vcard'

const props = defineProps<{
  boxType: BoxType
  boxId: string
  toolTipText: string
}>()

// AP dispatches 'financing' and 'scf9Box' to the same red-CF icon set — preserved as-is.
const redCF: Component[] = [redCFbox01, redCFbox02, redCFbox03, redCFbox04, redCFbox05, redCFbox06, redCFbox07, redCFbox08, redCFbox09]
const blueFinancing: Component[] = [blueFinancingbox01, blueFinancingbox02, blueFinancingbox03, blueFinancingbox04, blueFinancingbox05, blueFinancingbox06, blueFinancingbox07, blueFinancingbox08, blueFinancingbox09]
const vcard: Component[] = [vcardbox01, vcardbox02, vcardbox03, vcardbox04, vcardbox05, vcardbox06, vcardbox07, vcardbox08, vcardbox09]

const iconsByType: Record<BoxType, Component[]> = {
  financing: redCF,
  scf9Box: redCF,
  cashFlow: blueFinancing,
  vcard,
}

const selectedIcon = computed<Component | undefined>(() => {
  const id = Number(props.boxId)
  return Number.isInteger(id) && id >= 1 && id <= 9 ? iconsByType[props.boxType][id - 1] : undefined
})
</script>
