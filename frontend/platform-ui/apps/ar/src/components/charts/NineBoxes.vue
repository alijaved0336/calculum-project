<template>
<td class="text-center custom-font-weight">
  <Skeleton class="skeletons-bg" v-if="programInrecalculation" :shape="'text'" :style="{ width: '100%', height: '25px' }"></Skeleton>
  <Tooltip :open-delay="50" :anchor-element="'target'" :position="'bottom'" v-else>
    <div class="d-flex align-items-center gap-2 w-75 mx-auto" v-if="boxNumber === '0' || boxNumber === 'null' || boxNumber === 'undefined'"><span class="w-100">-</span></div>
    <div class="d-flex align-items-center box-badges gap-2 w-75 mx-auto" v-else :title="boxTitle">
      <BoxImage :boxType="typeOf9Boxes" :boxId="boxNumber" :title="boxTitle" :tool-tip-text="boxTitle"></BoxImage><span>{{ boxText }}</span>
    </div>
  </Tooltip>
</td>
</template>

<script setup lang="ts">
/**
 * Ported from apps/ap/src/modules/components/grid/columns/NineBoxes.vue at commit d004458f63
 * (UC-UI-00 / AB#19226).
 *
 * Adapted: rewritten from the Options API to <script setup> (AR's convention throughout, e.g.
 * CompaniesTab.vue), and the four box-type switch functions collapsed into a single lookup
 * table each, which is the same behavior with the four parallel switch statements AP had
 * de-duplicated into one. The `dataItem` field each box type reads
 * (financialBox/scfBox/box/vCardBox) is unchanged from AP pending OPP-17/UI-04 defining AR's own
 * nine-box data shape. AP's separate `boxTitle`/`boxTooltip` computeds were byte-identical for
 * three of the four box types, so this port kept only one and passes it to both the tooltip
 * title and BoxImage's tooltip text.
 *
 * Found by code review, not kept: for the fourth type (`vcard`), AP's `getBoxTooltip()` reads the
 * `global.boxes.cashFlow` label key instead of `global.boxes.vcard` — a copy-paste bug in the
 * source being ported. The merged computed here uses `vcard`'s own key uniformly instead of
 * reproducing that bug, since `vcard` isn't wired to real AR data yet either way.
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Skeleton } from '@progress/kendo-vue-indicators'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import BoxImage from './BoxImage.vue'

type BoxType = 'financing' | 'scf9Box' | 'cashFlow' | 'vcard'

const props = withDefaults(
  defineProps<{
    dataItem: Record<string, unknown>
    typeOf9Boxes: BoxType
    programInrecalculation?: boolean
  }>(),
  { programInrecalculation: false },
)

const { t } = useI18n({ useScope: 'global' })

const boxField: Record<BoxType, string> = {
  financing: 'financialBox',
  scf9Box: 'scfBox',
  cashFlow: 'box',
  vcard: 'vCardBox',
}

const boxLabelKey: Record<BoxType, string> = {
  financing: 'global.boxes.financing',
  scf9Box: 'global.boxes.scf9Box',
  cashFlow: 'global.boxes.cashFlow',
  vcard: 'global.boxes.vcard',
}

const rawBoxValue = computed(() => props.dataItem[boxField[props.typeOf9Boxes]])
const boxNumber = computed(() => String(rawBoxValue.value))
const boxTitle = computed(() => `${t(boxLabelKey[props.typeOf9Boxes])} ${boxNumber.value}`)
const boxText = computed(() => `${t('global.box')} ${rawBoxValue.value}`)
</script>
