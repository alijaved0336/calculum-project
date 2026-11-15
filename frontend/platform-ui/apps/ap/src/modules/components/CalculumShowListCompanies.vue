<template>
<CalculumModal @close="closeModal" :size="'xlg'" :showClose="true" :title="$t('home.compare.addCompaniesToChart')">
  <template v-slot:modalContent>
    <ListPeers :comparePeersList="comparePeersList" @validate-arrays="setButtonStatus" @send-selected-items="getSelectedItems" @resetPeers="$emit('reset-peers')"></ListPeers>
  </template>
  <template v-slot:modalButtons>
    <button class="btn btn-primary font-md" type="button" style="z-index: 1; width: fit-content" :disabled="buttonStatus" @click="$emit('add-all-companies', listDataCompanies)"> <span>{{ $t('button.update') }}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, computed, toRefs, reactive, watch } from 'vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import ListPeers from '@/modules/home/compare/components/ListPeers.vue'

export default defineComponent({
  name: 'CalculumShowListCompanies',
  components: {
    CalculumModal, ListPeers
  },
  props: {
    comparePeersList: { type: Array, required: true },
  },  
  emits: ['close', 'add-all-companies','reset-peers'],
  setup(props, { emit }) {
    interface ShowListCompanies {
      listDataCompanies: Array<any>,
      buttonStatus: boolean
    }

    const showListCompanies = reactive<ShowListCompanies>({
      listDataCompanies: [],
      buttonStatus: true
    })
   
    function closeModal() {
      emit('close')
    }

    function setButtonStatus(status: boolean) {
      showListCompanies.buttonStatus = status
    }

    function getSelectedItems(items: any) {
      showListCompanies.listDataCompanies = items      
    }


    return {
      ...toRefs(showListCompanies),
      closeModal,
      setButtonStatus,
      getSelectedItems
    }
  },
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

// ? - Use utility classes
.custom-padding-input {
  padding-left: 30px !important;
}

.custom-icon-search {
  position: relative;
  left: 30px !important;
}

.icon-close {
  width: 11.27px;
  height: 11.24px;
}

// ? - Use utility classes
.grid-title {
  font-style: normal;
  font-weight: 600;
  font-size: 16px;
}

// ? - Use utility classes
.warning-icon,
.warning-box {
  color: $color-warning;
}

// ? - Use utility classes
.warning-box {
  width: 100%;
  background-color: $color-warning-50;
  padding: 12px 16px 12px 16px;
}
</style>
