<template>
<CalculumModal :size="'md'" :showClose="true" :title="$t('global.supplierStandardEdition')" @close="$emit('hide-modal')">
  <template v-slot:modalContent>
    <div class="form-group">
      <label for="supplierStandard">
        <input class="form-control" id="supplierStandard" type="number" name="supplierStandard" :placeholder="$t('global.supplierStandardD')" v-model="supplierStandard" @click="supplierStandard === 0 ? supplierStandard = null : supplierStandard = supplierStandard" @blur="supplierStandard === null ? supplierStandard = 0 : supplierStandard = supplierStandard" @keyup="checkValue"/><span>{{ $t('global.supplierStandardD') }}    </span>
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
import { useToast } from "vue-toastification";
import { translate } from '@/utils/translation'

export default defineComponent({
  name: 'CalculumSetSupplierStandard',
  components: { CalculumModal },
  props: {
    withoutNavbar: { type: Boolean, required: false, default: false },
  },
  emits: ['hide-modal','save-data'],
  setup( props, { emit }) {

    interface DataInterface {
      supplierStandard: number | null,
      thirdQuartile: number | null,
      maxValue: number | null,
      numberOfOccurrences: number| null
      disabledSave: boolean
    }

    const data = reactive<DataInterface>({
      supplierStandard: null,
      thirdQuartile: null,
      maxValue: null,
      numberOfOccurrences: null,
      disabledSave: true
    })

    const toast = useToast();

    function checkValue(){
      data.supplierStandard = Number(data.supplierStandard)
      data.thirdQuartile = Number(data.thirdQuartile)
      data.maxValue = Number(data.maxValue)
      data.numberOfOccurrences = Number(data.numberOfOccurrences)
      
      if (
          data.supplierStandard < 0 || data.supplierStandard > 360 ||  
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
      if (data.maxValue && data.supplierStandard && data.thirdQuartile && 
        (
          data.maxValue > data.supplierStandard && data.maxValue > data.thirdQuartile 
          && data.thirdQuartile > data.supplierStandard
        )
      ) {
        emit('save-data',data.supplierStandard, data.thirdQuartile, data.maxValue, data.numberOfOccurrences)        
        toast.success(translate.t('global.noty.success.update.suppliers'));
      } else {
        toast.error(translate.t('global.maxValidationSupplierStandard'));        
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