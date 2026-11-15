<template>
<CalculumModal :size="'md'" :showClose="true" :title="$t('global.peerGroupStandardEdition')" @close="$emit('hide-modal')">
  <template v-slot:modalContent>
    <div class="form-group">
      <label for="peerGroup">
        <input class="form-control" id="peerGroup" type="number" name="peerGroup" :placeholder="$t('global.peerGroupStandardD')" v-model="peerGroup" @click="peerGroup === 0 ? peerGroup = null : peerGroup = peerGroup" @blur="peerGroup === null ? peerGroup = 0 : peerGroup = peerGroup" @keyup="checkValue"/><span>{{ $t('global.peerGroupStandardD') }}    </span>
      </label>
    </div>
    <div class="form-group">
      <label for="thirdQuartile">
        <input class="form-control" id="thirdQuartile" type="number" name="thirdQuartile" :placeholder="$t('global.third_quartile')" v-model="thirdQuartile" @click="thirdQuartile === 0 ? thirdQuartile = null : thirdQuartile = thirdQuartile" @blur="thirdQuartile === null ? thirdQuartile = 0 : thirdQuartile = thirdQuartile" @keyup="checkValue"/><span>{{ $t('global.third_quartile') }}    </span>
      </label>
    </div>
    <div class="form-group">
      <label for="maxValue">
        <input class="form-control" id="maxValue" type="number" name="maxValue" :placeholder="$t('global.maxValueD')" v-model="maxValue" @click="maxValue === 0 ? maxValue = null : maxValue = maxValue" @blur="maxValue === null ? maxValue = 0 : maxValue = maxValue" @keyup="checkValue"/><span>{{ $t('global.maxValueD') }}    </span>
      </label>
    </div>
    <div class="form-group">
      <label for="numberOfOccurrences">
        <input class="form-control" id="target" type="number" name="numberOfOccurrences" :placeholder="$t('global.numberOfOccurrences')" v-model="numberOfOccurrences" @click="numberOfOccurrences === 0 ? numberOfOccurrences = null : numberOfOccurrences = numberOfOccurrences" @blur="numberOfOccurrences === null ? numberOfOccurrences = 0 : numberOfOccurrences = numberOfOccurrences" @keyup="checkValue"/><span>{{ $t('global.numberOfOccurrences') }}    </span>
      </label>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="$emit('hide-modal')" style="z-index: 1; width: fit-content"> <span>{{ $t('global.cancel') }}</span></button>
    <button class="btn outline-secondary-btn font-md" @click="$emit('save-data',null,null,null,null)" style="z-index: 1; width: fit-content"> <span>{{ $t('global.clear') }}                        </span></button>
    <button class="btn btn-primary font-md" @click="sendData" style="z-index: 1; width: fit-content" :disabled="disabledSave"> <span>{{ $t('button.save') }}</span></button>
  </template>
</CalculumModal>
</template>
    
<script lang="ts">
import { defineComponent, toRefs, reactive } from 'vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { useToast } from 'vue-toastification'
import { translate } from '@/utils/translation'

export default defineComponent({
  name: 'CalculumSetPeerGroupStandard',
  components: { CalculumModal },
  props: {
    withoutNavbar: { type: Boolean, required: false, default: false },
  },
  emits: ['hide-modal','save-data'],
  setup(props, { emit }) {
    const toast = useToast()
    interface DataInterface {
      peerGroup: number | null,
      thirdQuartile: number | null,
      maxValue: number | null,
      numberOfOccurrences: number| null
      disabledSave: boolean
    }

    const data = reactive<DataInterface>({
      peerGroup: null,
      thirdQuartile: null,
      maxValue: null,
      numberOfOccurrences: null,
      disabledSave: true
    })

    function checkValue(){
      data.peerGroup = Number(data.peerGroup)
      data.thirdQuartile = Number(data.thirdQuartile)
      data.maxValue = Number(data.maxValue)
      data.numberOfOccurrences = Number(data.numberOfOccurrences)
      
      if (
          data.peerGroup < 0 || data.peerGroup > 360 ||  
          data.thirdQuartile < 0 || data.thirdQuartile > 360 ||
          data.maxValue < 0 || data.maxValue > 360
        ) {
        data.disabledSave = true
        toast.error(translate.t('global.validationPeerGorupSupplier'));
        
      } else {
        data.disabledSave = false
      }

      if (data.numberOfOccurrences < 0){
        data.disabledSave = true
        toast.error(translate.t('global.numberOfOccurrencesValidation'));
        
      } else {
        data.disabledSave = false
      }    
    }

    function sendData() {
      if (data.maxValue && data.peerGroup && data.thirdQuartile && 
        (
          data.maxValue > data.peerGroup && data.maxValue > data.thirdQuartile 
          && data.thirdQuartile > data.peerGroup
        )
      ) {
        emit('save-data',data.peerGroup, data.thirdQuartile, data.maxValue, data.numberOfOccurrences)        
      } else {
        toast.error(translate.t('global.maxValidationPeerGroup'));
              
      }      
    }



    return {
      ...toRefs(data),
      checkValue,
      sendData
      
    }
  }
})
</script>