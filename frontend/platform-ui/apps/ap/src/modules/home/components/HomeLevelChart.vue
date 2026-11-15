<template>
<div class="d-flex flex-column level-chart-main mb-1">
  <div class="d-flex" :class="{ 'custom-baseline' : forPlanCard, 'level-color' : !forPlanCard }"><span class="span mr-1" :title="label" :class="{ 'custom-font-1': forPlanCard, 'text-gray-600 text-base font-semibold cursor-pointer' : sizeInfoButton, 'text-gray-500 text-sm font-normal' : !sizeInfoButton, 'show-ellipsis' : showEllipsis }" @click="() => $emit('action')">{{ label }}</span>
    <CalculumTooltipIcon class="mr-2" v-if="tooltip" :infoText="tooltip"></CalculumTooltipIcon><span class="break-line" v-if="showBreakline"></span><span class="text-sm font-semibold" :style="'color: '+levelColor+' !important;' " @click="() => $emit('action')" :class="{ 'custom-font-2': forPlanCard, 'cursor-pointer' : sizeInfoButton }">{{ $t('home.entityCard.rating.esgClassification.' + forLangLevel) }}         </span>
  </div>
  <div class="d-flex mt-1 mb-1 justify-content-between" :style="'width: '+widthContainer+' !important;' ">
    <div class="level" v-for="n in totalItems" :style="`--fill: ${n <= numberColor ? levelColor : noColor};`"></div>
  </div>
</div>
</template>
<script lang="ts">
import { defineComponent, ref, onMounted, reactive, toRefs } from 'vue'
import * as colorsGroups from '@/utils/ColorsGroups'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'

export default defineComponent({
  name: 'HomeLevelChart',
  components: {
    CalculumTooltipIcon
  },
  props: {
    forPlanCard: { type: Boolean, required: false },
    label: { type: String, required: true },
    level: { type: String, required: true },
    levelInverted: { type: Boolean, required: false, default: false },
    showInfoButton: { type: Boolean, required: false, default: false },
    sizeInfoButton: { type: Boolean, required: false, default: false },
    tooltip: { type: String, required: false },
    widthContainer: { type: String, required: false, default: '100%' }
  },
  emits: ['action', 'changeKeycharts'],
  setup(props, { emit }) {
    const levelColor = ref('')
    const numberColor = ref(0)
    const totalItems = ref(5)
    const forLangLevel = ref('cna')
    const noColor = ref(colorsGroups.noLevel)

    const data = reactive({
      showBreakline: false,
      showEllipsis: false
    })

    onMounted(() => {
      if (window.innerWidth <= 1560) {
        data.showBreakline = true
      }

      if (window.innerWidth <= 1242) {
        data.showEllipsis = true
      }

      if (props.level === 'Very Low') {
        numberColor.value = 1
        levelColor.value = props.levelInverted ? colorsGroups.veryHigh : colorsGroups.veryLow
        forLangLevel.value = 'c0'
      }

      if (props.level === 'Low') {
        numberColor.value = 2
        levelColor.value = props.levelInverted ? colorsGroups.high : colorsGroups.low
        forLangLevel.value = 'c1'
      }

      if (props.level === 'Medium') {
        numberColor.value = 3
        levelColor.value = colorsGroups.medium
        forLangLevel.value = 'c2'
      }

      if (props.level === 'High') {
        numberColor.value = 4
        levelColor.value = props.levelInverted ? colorsGroups.low : colorsGroups.high
        forLangLevel.value = 'c3'
      }

      if (props.level === 'Very High') {
        numberColor.value = 5
        levelColor.value = props.levelInverted ? colorsGroups.veryLow : colorsGroups.veryHigh
        forLangLevel.value = 'c4'
      }
    })

    window.onresize = () => {
      emit('changeKeycharts')
    }

    return {
      ...toRefs(data),
      levelColor,
      totalItems,
      numberColor,
      forLangLevel,
      noColor,
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.custom-font-1 {
  font-size: 1em;
}

.custom-font-2 {
  font-size: 1em;
}

.custom-baseline {
  align-items: baseline;
}

.show-ellipsis {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  max-width: 80%;
}

.break-line {
  width: 100%;
  display: block;
}

.level-color {
  flex-wrap: wrap;
  width: 100%;
  align-items: center;
}

.show-tooltip-15 {
  width: 15px;
  height: 15px;
  background-image: url('@/resources/assets/images/icons/iconInformation.svg') !important;
  background-size: 15px !important;
  display: inline-block !important;
  // margin-top: 0.3rem;
}

.show-tooltip-12 {
  width: 12px;
  height: 12px;
  background-image: url('@/resources/assets/images/icons/iconInformation.svg') !important;
  background-size: 12px !important;
  display: inline-block !important;
  // margin-top: 0.3rem;
}

.level {
  width: 19%;
  height: 10px;
  border-radius: 6px;
  background: var(--fill);
}
</style>