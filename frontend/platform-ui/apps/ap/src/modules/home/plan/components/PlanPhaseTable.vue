<template>
<div class="container-fluid">
  <div class="row">
    <div class="col-12">
      <div class="categorize-list-table">
        <div class="col-12">
          <PlanEditLists :planId="planId || ''" :phaseId="phaseId" :key="keyLists" :isRest="isRest" :noWidgetClass="true" :hasFinancing="hasFinancing" :hasHarmonization="hasHarmonization" @sendArraysWithData="sendArraysWithData"></PlanEditLists>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { reactive, toRefs, defineComponent } from 'vue'
import CalculumGrid from '@/modules/components/grid/CalculumGrid.vue'
import { CalculumLoading } from '@ada/design-system'
import PlanEditLists from "./PlanEditLists.vue";

export default defineComponent({
  name: 'PlanPhaseTable',
  components: {
    CalculumLoading,
    CalculumGrid,
    PlanEditLists
  },
  props: {
    includeWidgetClass: { type: Boolean, required: false, default: true },
    suppliers: { type: Array, required: true },
    suppliersList: { type: Array, required: true },
    parentsList: { type: Array, required: true },
    phaseId: { type: String, required: true },
    planId: { type: String, required: false },
    isRest: { type: Boolean, default: false },
    hasFinancing: { type: Boolean, required: false },
    hasHarmonization: { type: Boolean, required: false }
  },
  emits: ['send-arrays-with-data-to-phase'],
  setup(props: any, { emit }) {


    const data = reactive({
      loading: false,
      keyLists: new Date().getUTCMilliseconds()
    })

    function sendArraysWithData(newsItems: Array<any>, currentRemoved: Array<any>, withChanges: boolean, selected: Array<any>, levelOfGrid: number, filterForPatch: any, allSelected: any) {
      emit('send-arrays-with-data-to-phase', newsItems, currentRemoved, withChanges, selected, levelOfGrid, filterForPatch, allSelected)
    }

    return {
      ...toRefs(data),
      sendArraysWithData
    }
  }
})
</script>
