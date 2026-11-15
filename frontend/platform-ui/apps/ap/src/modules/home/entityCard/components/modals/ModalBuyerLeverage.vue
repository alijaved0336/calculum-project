<template>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('home.entityCard.buyerLeverageMateriality')" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="row mb-3">
      <div class="col">
        <p id="entityCard-modal-buyerLeverageMateriality"><span>{{ $t('home.entityCard.buyerLeverageMateriality') }}
            <CalculumTooltipIcon :infoText="$t('home.entityCard.buyerLeverageTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-3" :style="`color: ${entityCharacteristics.buyerLeverage.color}`">{{ entityCharacteristics.buyerLeverage.description }}</span></p>
        <LevelDashesChart :level="levelByGradeLevelText(entityCharacteristics.buyerLeverage.description)" :total-levels="3"></LevelDashesChart>
      </div>
    </div>
    <div class="row mb-2">
      <div class="col">
        <p id="entityCard-modal-supplierLeverageMateriality"><span>{{ $t('global.supplierLeverageMateriality') }}
            <CalculumTooltipIcon :infoText="$t('global.supplierLeverageTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-3" :style="`color: ${entityCharacteristics.supplierLeverage.color}`">{{ entityCharacteristics.supplierLeverage.description }}</span></p>
        <LevelDashesChart :level="levelByGradeLevelText(entityCharacteristics.supplierLeverage.description)" :total-levels="3"></LevelDashesChart>
      </div>
    </div>
  </template>
</CalculumModal>
</template>
  
<script lang="ts">
import { defineComponent } from 'vue'
import { fontIcons } from '@/resources/assets/assets'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import { LevelDashesChart } from '@ada/design-system'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import * as colorsGroups from '@/utils/ColorsGroups'

export default defineComponent({
  name: 'ModalBuyerLeverage',
  components: {
    CalculumTooltipIcon,
    LevelDashesChart,
    CalculumModal
  },
  props: {
    entityCharacteristics: { type: Object, required: true },
    levelColor: { type: String, required: false, default: colorsGroups.noLevel }
  },
  emits: ['close'],
  setup() {
    /**
     * Get level given grade level text
     */
    function levelByGradeLevelText(gradeLevelText: string): number {
      switch (gradeLevelText) {
        case 'Low':
          return 1
        case 'Medium':
          return 2
        case 'High':
          return 3
        default:
          return 0
      }
    }

    return {
      fontIcons,
      levelByGradeLevelText
    }
  }
})
</script>

<style lang="scss" scoped>
.icon-close {
  cursor: pointer;
  font-size: 40px;
  height: 18px;
  position: absolute;
  right: 0;
  right: 20px;
  top: 20px;
  width: 18px;
  z-index: 999;
}
</style>
  