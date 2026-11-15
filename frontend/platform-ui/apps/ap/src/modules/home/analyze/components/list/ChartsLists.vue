<template>
<GridSkeleton v-if="!showLists">   </GridSkeleton>
<ListsByChartsValue :selectedProgramId="selectedProgramId" :programInrecalculation="programInrecalculation" :keyLists="keyLists" :hasFinancing="hasFinancingComputed" :hasHarmonization="hasHarmonizationComputed" :itemSelectedInCharts="itemSelectedInCharts" :vcardEnabled="vcardEnabled" v-if="showLists"></ListsByChartsValue>
</template>

<script lang='ts'>
import { defineComponent, reactive, toRefs, computed, onMounted, watch } from 'vue'

import { AnalyzeProgramList, Program, ItemSelectedInCharts } from '@/modules/home/analyze/types/index'
import { NumberUtils } from '@/utils'
import { useI18n } from 'vue-i18n'
import * as Routing from '@/services/router/Routing'
import ListsByChartsValue from './ListsByChartsValue.vue'
import GridSkeleton from '@/modules/home/components/skeletons/GridSkeleton.vue'
import type { PropType } from 'vue';

export default defineComponent({
  name: 'ChartsLists',
  components: {
    ListsByChartsValue,
    GridSkeleton
  },
  props: {
    selectedProgramId: { type: String, required: true },
    programData: { type: Object as PropType<Program>, required: true },
    inRecalculation: { type: Boolean, required: true, default: false },
    itemSelectedInCharts: { type: Object as PropType<ItemSelectedInCharts>, required: true, default: () => ({ valueSelected: '', groupSelected: '', selectedChart: '' }) },
    vcardEnabled: { type: Boolean, required: false, default: false }
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    
    const analyzeProgramList = reactive<AnalyzeProgramList>({
      gridHeight: 'auto',
      hasFinancing: false,
      hasHarmonization: false,
      keyLists: NumberUtils.getRandomInt(),
      loading: true,
      programInrecalculation: true,
      showLists: false,
      showLoading: true
    })
    /**
     * Get program data from API
     */
     function getProgram() {
        analyzeProgramList.programInrecalculation = props.inRecalculation
        analyzeProgramList.hasFinancing = props.programData.externalFinancingEnabled
        analyzeProgramList.hasHarmonization =  props.programData.termHarmonizationEnabled
        analyzeProgramList.keyLists++
        analyzeProgramList.showLists = true
        }


    const hasFinancingComputed = computed(() => {
      return analyzeProgramList.hasFinancing
    })


    const hasHarmonizationComputed = computed(() => {
      return analyzeProgramList.hasHarmonization
    })

    /**
     * On Mounted
     */
    function getInitProgramAPI() {
      setGridHeight()
      getProgram()      
    }

    setTimeout(() => {
        analyzeProgramList.showLoading = false        
      }, 1000 ); 

    onMounted(() => {
      getInitProgramAPI()
    })

    function setGridHeight() {
      const getSubMain = document.getElementById('container-main-id')
      if (getSubMain) {
        analyzeProgramList.gridHeight = (getSubMain.clientHeight - 115) + 'px'
      }
    }

    watch(() => props.inRecalculation, () => {
      analyzeProgramList.programInrecalculation = props.inRecalculation      
    }, { deep: true })

    
    return {
      ...toRefs(analyzeProgramList),
      hasFinancingComputed,
      hasHarmonizationComputed,
      Routing
    }
  }
})
</script>