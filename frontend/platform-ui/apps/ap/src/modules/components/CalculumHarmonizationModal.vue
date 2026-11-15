<template>
<CalculumModal @close="$emit('close')" :size="'lg'" :showClose="true" :title="'Alert'">
  <template v-slot:modalContent>
    <p>{{ $t('home.entityCard.negotiation.changingHarmonizationLevel') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="userClickedCancel" style="z-index: 1; width: fit-content"> <span>{{$t('global.cancel')}}</span></button>
    <button class="btn btn-primary font-md" @click="userClickedYes" style="z-index: 1; width: fit-content"> <span>{{$t('global.yes')}}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { fontIcons } from '@/resources/assets/assets'
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
  name: 'CalculumHarmonizationModal',
  components: { CalculumModal },
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

    return {
      fontIcons,      
      userClickedClose,
      userClickedCancel,
      userClickedYes
    }
  }
})
</script>
