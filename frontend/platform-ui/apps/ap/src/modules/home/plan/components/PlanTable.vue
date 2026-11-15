<template>
<div class="row">
  <div class="col-12">
    <Lists :key="keyLists" :plan-id="planId" :phase-id="phaseId" :target-program="targetProgram"  :program-inrecalculating="programInrecalculating" :has-financing="hasFinancing" :has-harmonization="hasHarmonization"></Lists>
  </div>
</div>
</template>

<script lang="ts">
import { reactive, toRefs, defineComponent, watch } from 'vue'
import PlanLists from "../components/PlanLists.vue";

export default defineComponent({
  name: 'PlanTable',
  components: {    
    Lists: PlanLists
  },
  props: {
    planId: { type: String, required: true },
    phaseId: { type: String, required: true },
    targetProgram: { type: String, required: true },
    programInrecalculating: { type: Boolean, required: false },
    hasFinancing: { type: Boolean, required: false },
    hasHarmonization: { type: Boolean, required: false },
  },
  setup(props) {
    interface DataTable {
      keyLists: number
    }

    const data = reactive<DataTable>({
      keyLists: new Date().getUTCMilliseconds()
    })

    watch(props, () => {
      if (import.meta.env.DEV) console.log("** watch change phase")
      data.keyLists++
    })
    
    return {
      ...toRefs(data),
    }
  }
})
</script>