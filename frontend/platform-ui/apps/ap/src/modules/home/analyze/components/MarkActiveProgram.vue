<template>
<CalculumModal :size="'lg'" :showClose="true" :title=" $t('home.analyze.alertDeactivateProgram')" v-if="showModal" @close="showModal = false">
  <template v-slot:modalButtons>
    <button class="btn btn-primary font-md" @click="yesConfirmchange" style="z-index: 1; width: fit-content"><span>{{ $t('home.overview.yes') }}        </span></button>
    <button class="btn btn-clear font-md active" @click="closeModal" style="z-index: 1; width: fit-content"><span>{{ $t('global.no') }}</span></button>
  </template>
</CalculumModal>
<Tooltip :open-delay="100" :anchor-element="'target'" position="bottom">
  <div class="d-flex without-hover" v-if="!showLabel && status && fromProgram"><span class="program-status" :class="{ 'active' : status }" :title="$t('home.analyze.activeProgram')">     </span></div>
  <div class="d-flex cursor-pointer without-hover" v-if="!showLabel && status && !fromProgram"><span class="program-status cursor-pointer" :class="{ 'active' : status }" @click="changeStatus" :title="$t('home.analyze.activeProgram')">     </span></div>
  <div class="d-flex cursor-pointer with-hover" v-if="showLabel" @click="changeStatus"><span class="program-status cursor-pointer" :class="{ 'active' : status }">   </span><span class="label-status ml-2 cursor-pointer" v-if="!status" :title="$t('home.analyze.activateProgram')">{{ $t('home.analyze.activateProgram') }}</span><span class="label-status ml-2 cursor-pointer" v-if="status" :title="$t('home.analyze.deactivateProgram')">{{ $t('home.analyze.deactivateProgram') }}  </span></div>
</Tooltip>
</template>
  
<script lang="ts">
import { defineComponent, toRefs, reactive } from 'vue'
import { fontIcons } from '@/resources/assets/assets'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
  name: 'MarkActiveProgram',
  components: { Tooltip, CalculumModal },
  props: {
    status: { type: Boolean, default: false },
    showLabel: { type: Boolean, default: false },
    fromProgram: { type: Boolean, default: false },
  },
  emits: ['change-status'],
  setup(props, { emit }) {

    interface MarkProgramInterface {
      showModal: boolean,
    }

    const markProgram = reactive<MarkProgramInterface>({
      showModal: false
    })

    function changeStatus() {
      if (props.status) {
        markProgram.showModal = true
      } else {
        emit('change-status', !props.status)
      }
    }

    function closeModal() {
      markProgram.showModal = false
    }

    function yesConfirmchange() {
      markProgram.showModal = false
      emit('change-status', !props.status)
    }

    return {
      ...toRefs(markProgram),
      changeStatus,
      fontIcons,
      closeModal,
      yesConfirmchange
    }
  }
})
</script>
<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.with-hover {
  &:hover {
    .label-status {
      color: $color-red !important;
      font-size: 16px;
    }

    .program-status {
      background-image: url('@/resources/assets/images/icons/active-icon-red.svg') !important;
      background-size: 18px 18px;
    }
  }
}

.program-status {
  float: left;
  width: 18px;
  height: 18px;
  background-image: url('@/resources/assets/images/icons/active-badge-icon.svg');
  background-size: 18px 18px;

  &.active {
    background-image: url('@/resources/assets/images/icons/active-icon-blue.svg') !important;
    background-size: 18px 18px;
  }
}

.label-status {
  color: #000000;
  font-size: 16px;
}
</style>
  