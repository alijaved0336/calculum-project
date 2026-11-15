<template>
<CalculumModal :size="'md'" :showClose="true" :title="'Alert'" @close="$emit('hide-modal')">
  <template v-slot:modalContent><span>{{ $t('home.entityCard.negotiation.changingTargetPaymentTerms') }}</span></template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="$emit('hide-modal')" style="z-index: 1; width: fit-content"> <span>{{ $t('global.cancel') }}            </span></button>
    <button class="btn btn-primary font-md" @click="$emit('save-target')" style="z-index: 1; width: fit-content"> <span>{{ $t('global.yes') }}            </span></button>
  </template>
</CalculumModal>
</template>
    
<script lang="ts">
import { defineComponent } from 'vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
  name: 'CalculumSetTargetEditProgram',
  components: { CalculumModal },
  props: {
    withoutNavbar: { type: Boolean, required: false, default: false },
  },
  emits: ['hide-modal','save-target'],
  setup() {

    return {      
      
    }
  }
})
</script>