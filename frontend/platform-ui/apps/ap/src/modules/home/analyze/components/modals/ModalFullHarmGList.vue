<template>
<CalculumModal @close="$emit('close')" :showClose="true" :size="'md'" :title="$t('global.termHarmonization')">
  <template v-slot:modalContent>
    <CalculumGrid :gridData="gridDataComputed" :gridColumns="gridColumns" :allowExportExcel="false" :hideColumnSelector="true" :childrenColumns="false" :showToolbar="false" :selectable="false"></CalculumGrid>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" v-if="isAdminUser" @click="$emit('go-to-program-edit-tab', 'harmonization')" style="z-index: 1; width: fit-content"> <span>{{$t('button.edit')}} </span></button>
    <button class="btn btn-primary font-md" @click="$emit('close')" style="z-index: 1; width: fit-content"> <span>{{$t('button.cancel')}}</span></button>
  </template>
</CalculumModal>
</template>
  
<script lang="ts">
import {
  defineComponent,
  computed
} from "vue";
import { getRainbowPillClasses } from '@/utils'
import { HarmonizationGroup } from '../../types';
import { modalFullHarmGListGridColumns as gridColumns } from "../../data/columns";
import CalculumGrid from '@/modules/components/grid/CalculumGrid.vue';
import CalculumModal from '@/modules/components/CalculumModal.vue'
import type { PropType } from 'vue'

export default defineComponent({
  name: "ModalFullHarmGList",
  components: {
    CalculumModal,
    CalculumGrid
  },
  props: {
    data: { type: Array as PropType<Partial<HarmonizationGroup>[]>, required: false, default: () => [] },
      isAdminUser: { type: Boolean, required: false, default: false },
    },
  emits: ["close", "go-to-program-edit-tab"],
  setup(props) {
    const gridDataComputed = computed(() => {
      return props.data.map((item, index) => {
        return {
          pillLabel: item.name,
          paymentTermsWithoutCashDiscountDays: item.paymentTermsWithoutCashDiscountDays,
          classes: getRainbowPillClasses(index),
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

  