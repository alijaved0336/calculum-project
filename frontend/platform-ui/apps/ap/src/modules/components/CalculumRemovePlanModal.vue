<template>
<CalculumModal @close="$emit('close')" :size="'sm'" :showClose="true" :title="'Remove plan'">
  <template v-slot:modalContent>
    <p>{{ textToShow }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="userClickedCancel" style="z-index: 1; width: fit-content"> <span>{{$t('global.cancel')}}</span></button>
    <button class="btn btn-primary font-md" @click="userClickedYes" style="z-index: 1; width: fit-content"> <span>{{'Remove'}}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { fontIcons } from '@/resources/assets/assets'
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
  name: 'CalculumMoveBetweenModal',
  components: { CalculumModal, },
  props: { data: { type: Object, required: true } },
  emits: ['close', 'approve'],
  setup(props, { emit }) {
    function userClickedClose() {
      emit('close')
    }
    function userClickedCancel() {
      emit('close')
    }
    function userClickedYes() {
      emit('approve')
    }
    const textToShow=computed(()=>{
      return `"Are you sure you want to remove ${props.data.entityName} from ${props.data.planName}-${props.data.phaseName}?"`
    })
    return {
      fontIcons,
      userClickedClose,
      userClickedCancel,
      userClickedYes,
      textToShow
    }
  }
})
</script>
