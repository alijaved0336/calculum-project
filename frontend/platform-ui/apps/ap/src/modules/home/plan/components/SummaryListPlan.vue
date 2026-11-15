<template>
<GridSkeleton v-if="loading"></GridSkeleton>
<div class="card" v-else>
  <div class="card-body">
    <CalculumGrid :gridData="info" :gridColumns="columns" :girdCsvColumns="columns" :allowExportExcel="true" :selectable="false" :columnsLocked="true" :showTabsLevels="false" :csvFileName="'Plan_Summary_List'" :isExpanded="true" :nameTemplateChild="'detailSummaryPlanList'" :isSummaryListPlan="true" :isForParent="true" :rowColors="true" :gridHeight="gridHeight" v-if="!loading"></CalculumGrid>
  </div>
</div>
</template>

<script lang="ts">
import { summaryColumns } from "../data/columns";
import { toRefs, defineComponent, onMounted, reactive} from 'vue'
import { useHomeStore } from '@/stores/home'
import { usePlanStore } from '@/stores/plan'
import * as cacheGrid from '@/utils/dataGridClear'
import CalculumGrid from '@/modules/components/grid/CalculumGrid.vue'
import GridSkeleton from '@/modules/home/components/skeletons/GridSkeleton.vue'
import { useSpendFile } from "@/composables";

export default defineComponent({
  name: 'SummaryListPlan',
  components: { CalculumGrid, GridSkeleton },
  props: { },
  setup(){
    const store = useHomeStore()
    const homeStore = useHomeStore()
    const planStore = usePlanStore()

    const { spendFileVersionActiveIri } = useSpendFile();
    
    interface DataInterface {
      loading: boolean
      columns: Array<any>,
      info: Array<any>,
      gridHeight: string
    }

    const data = reactive<DataInterface>({
      loading: false,
      columns: getColumns(),
      info: [],
      gridHeight: 'auto'
    })


    function getColumns() {
      let resetColumns: any = []
              const gridCache = homeStore.getPlanSummaryList
      if (gridCache.length && (JSON.stringify(summaryColumns) !== JSON.stringify(gridCache))) {
        resetColumns = cacheGrid.clearCache(summaryColumns, gridCache)        
      } else {
        resetColumns = summaryColumns
      }
              homeStore.setPlanSummaryList(resetColumns)
      return resetColumns
    }

    onMounted(() => {
      getPlansbySpendfile()
      setGridHeight()
    })

    window.onresize = () => {
      setGridHeight()
    }
    
    function setGridHeight(){
      const getSubMain = document.getElementById('container-main-id')
      if (getSubMain) {
        data.gridHeight = (getSubMain.clientHeight - 115) + 'px'
      }
    }


    function getPlansbySpendfile() {
      data.loading = true
      const params = {
        spendFileVersion: spendFileVersionActiveIri.value,
          callbackSuccess: (callbackSuccessData: any) => {
            data.loading = false
            data.info = callbackSuccessData
          },
          callbackError: (callbackError: any) => {
            data.loading = false          
        }
      }     
      planStore.getPlansbySpendfile(params)
    }

    return {
      ...toRefs(data)
    }
  }

})
</script>

<style lang="scss" scoped>


.card-body {
 padding: 0px;
}
</style>