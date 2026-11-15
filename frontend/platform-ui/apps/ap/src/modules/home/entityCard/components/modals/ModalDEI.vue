<template>
<CalculumModal :size="'sm'" :showClose="true" :title="$t('home.entityCard.rating.dei')" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="row mb-2">
      <div class="col-12">
        <div class="d-flex">
          <p class="mb-0 mr-6">{{ $t('home.entityCard.rating.deiModalMainText') }}</p>
          <div class="d-flex flex-column justify-content-center">
            <p class="mb-0 text-xs text-gray-400">{{ $t('global.poweredBy') }}</p>
            <DenominatorLogo class="w-36"></DenominatorLogo>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-12 d-flex justify-content-end"><a href="/documents/dei_example.pdf" target="_blank">{{  $t('global.sampleReport') }}
          <PdfIcon class="h-4 w-4 ml-3"></PdfIcon></a></div>
    </div>
  </template>
</CalculumModal>
</template>
  
<script lang="ts">
import { fontIcons, images } from '@/resources/assets/assets'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import DenominatorLogo from '@/resources/assets/images/DenominatorLogo.vue'
import PdfIcon from '@/resources/assets/images/icons/PdfIcon.vue'
import NewTabIcon from '@/resources/assets/images/icons/NewTabIcon.vue'

export default {
  name: 'ModalDEI',
  components: {
    CalculumModal,
    DenominatorLogo,
    PdfIcon,
    NewTabIcon
  },
  props: {
  },
  setup() {
    return {
      images,
      fontIcons
    }
  }
}
</script>
<style lang="scss" scoped></style>