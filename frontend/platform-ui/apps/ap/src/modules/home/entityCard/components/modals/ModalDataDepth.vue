<template>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('home.entityCard.rating.dataDepth')" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="row mb-3">
      <div class="col-12">
        <p class="mb-2 font-semibold"> <span>{{ $t('global.overall') + ': '}}</span><span :style="`color: ` + levelColorByLevel(overallDataDepth.level)">{{ dataDepth.overallDataDepth.description }}</span></p>
        <LevelDashesChart :level="overallDataDepth.level" :totalLevels="3"></LevelDashesChart>
      </div>
    </div>
    <div class="row mb-3">
      <div class="col-12">
        <p class="mb-2 font-semibold"> <span>{{ $t('home.entityCard.rating.generalInfo') + ': '}}</span><span :style="`color: ` + levelColorByLevel(generalInfoDataDepth.level)">{{ dataDepth.generalInfoDataDepth.description }}</span></p>
        <LevelDashesChart :level="generalInfoDataDepth.level" :totalLevels="3"></LevelDashesChart>
      </div>
    </div>
    <div class="row mb-3">
      <div class="col-12">
        <p class="mb-2 font-semibold"> <span>{{ $t('global.paymentTerms') + ': '}}</span><span :style="`color: ` + levelColorByLevel(paymentTermsDataDepth.level)">{{ dataDepth.paymentTermsDataDepth.description }}</span></p>
        <LevelDashesChart :level="paymentTermsDataDepth.level" :totalLevels="3"></LevelDashesChart>
      </div>
    </div>
    <div class="row mb-3">
      <div class="col-12">
        <p class="mb-2 font-semibold"> <span>{{ $t('home.entityCard.rating.financialMetrics') + ': '}}</span><span :style="`color: ` + levelColorByLevel(financialMetricsDataDepth.level)">{{ dataDepth.financialMetricsDataDepth.description }}</span></p>
        <LevelDashesChart :level="financialMetricsDataDepth.level" :totalLevels="3"></LevelDashesChart>
      </div>
    </div>
  </template>
</CalculumModal>
</template>
                  
<script lang="ts">
import { defineComponent, reactive, toRefs } from 'vue';
import { fontIcons } from "@/resources/assets/assets";
import * as colorsGroups from "@/utils/ColorsGroups";
import CalculumModal from '@/modules/components/CalculumModal.vue'
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import { LevelDashesChart } from "@ada/design-system";

export default defineComponent({
  name: "ModalDataDepth",
  components: {
    CalculumModal,
    CalculumTooltipIcon,
    LevelDashesChart
  },
  emits: ['close'],
  props: {
    dataDepth: { type: Object, required: true }
  },
  setup(props) {
    interface ModalDataDepth {
      overallDataDepth: {
        level: number
      },
      generalInfoDataDepth: {
        level: number
      },
      paymentTermsDataDepth: {
        level: number
      },
      financialMetricsDataDepth: {
        level: number
      }
    }

    const data = reactive<ModalDataDepth>({
      overallDataDepth: {
        level: levelByGradeLevelText(props.dataDepth.overallDataDepth.description)
      },
      generalInfoDataDepth: {
        level: levelByGradeLevelText(props.dataDepth.generalInfoDataDepth.description)
      },
      paymentTermsDataDepth: {
        level: levelByGradeLevelText(props.dataDepth.paymentTermsDataDepth.description)
      },
      financialMetricsDataDepth: {
        level: levelByGradeLevelText(props.dataDepth.financialMetricsDataDepth.description)
      }
    })

    /**
     * Get level given grade level text
     */
    function levelByGradeLevelText(gradeLevelText: string) {
      if (!gradeLevelText) return 0;

      switch (gradeLevelText) {
        case 'Limited':
          return 1
        case 'Adequate':
          return 2
        case 'Substantial':
          return 3
        default:
          return 0
      }
    }

    /**
     * Get the color of the level based on the level number
     * 
     * ? - Move to global utils file
     */
    function levelColorByLevel(level: number) {
      // Three levels
      switch (level) {
        // Level 1 of 3
        case 1:
          return colorsGroups.low
        case 2:
          return colorsGroups.medium
        case 3:
          return colorsGroups.high
        default:
          return colorsGroups.noLevel
      }
    }

    return {
      ...toRefs(data),
      fontIcons,
      levelByGradeLevelText,
      levelColorByLevel
    }
  }
});
</script>
<style lang="scss" scoped></style>
  