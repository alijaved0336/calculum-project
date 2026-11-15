<template>
<CalculumModal :size="'md'" :showClose="true" @close="$emit('hide-modal')">
  <template v-slot:modalContent>
    <p v-html="$t('home.analyze.alertSpendInclude1') + nameActiveProgram + $t('home.analyze.alertSpendInclude2')" v-if="singleSpend"></p>
    <p v-html="spendsActive + $t('home.analyze.alertAllSpendsInclude')" v-else></p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn btn-primary font-md" @click="$emit('hide-modal')" style="z-index: 1; width: fit-content"> <span>{{ $t('button.ok') }}            </span></button>
  </template>
</CalculumModal>
</template>
    
<script lang="ts">
import { defineComponent } from 'vue'
import { fontIcons } from '@/resources/assets/assets'
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
  name: 'CalculumSpendsActiveModal',
  components: { CalculumModal },
  props: {
    withoutNavbar: { type: Boolean, required: false, default: false },
    nameActiveProgram: { type: String },
    singleSpend: { type: Boolean, required: true },
    spendsActive: { type: Number, required: true },
  },
  emits: ['hide-modal'],
  setup() {
    return {
      fontIcons
    }
  }
})
</script>