<template>
<CalculumModal @close="$emit('close')" :showClose="true" :size="'lg'" :title="$t('global.financing')">
  <template v-slot:modalContent>
    <CalculumGrid :gridData="gridDataComputed" :gridColumns="gridColumns" :allowExportExcel="false" :hideColumnSelector="true" :childrenColumns="false" :showToolbar="false" :selectable="false"></CalculumGrid>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" v-if="isAdminUser" @click="$emit('go-to-program-edit-tab', 'financing')" style="z-index: 1; width: fit-content"> <span>{{$t('button.edit')}} </span></button>
    <button class="btn btn-primary font-md" @click="$emit('close')" style="z-index: 1; width: fit-content"> <span>{{$t('button.cancel')}}</span></button>
  </template>
</CalculumModal>
</template>
  
<script lang="ts">
import { defineComponent, computed } from "vue";
import { FinancingGroup } from '../../types';
import { getRainbowPillClasses } from '@/utils'
import { modalFullFinancingGListGridColumns as gridColumns } from "../../data/columns";
import CalculumGrid from '@/modules/components/grid/CalculumGrid.vue';
import CalculumModal from '@/modules/components/CalculumModal.vue'
import type { PropType } from 'vue'

export default defineComponent({
  name: "ModalFullFinancingGList",
  components: {
    CalculumModal,
    CalculumGrid
  },
  props: {
    data: { type: Array as PropType<Partial<FinancingGroup>[]>, required: false, default: () => [] },      
    isAdminUser: { type: Boolean, required: false, default: false },
    },
  emits: ["close", "go-to-program-edit-tab"],
  setup(props) {
    const gridDataComputed = computed(() => {
      return props.data.map((item, index) => {
        return {
          baseRate: item.baseRate, // "3"
          classes: getRainbowPillClasses(index),
          fundingSpread: item.fundingSpread, // "3"
          name: item.financingName, // "FinG1"
          pillLabel: item.name, // "F1, 6.00 %, 1 %"
          auto: item.isAutoBaseRate ? 'Yes' : 'No'
        }
      })
    });

    return {
      gridColumns,
      gridDataComputed
    };
  }
});
</script>

  