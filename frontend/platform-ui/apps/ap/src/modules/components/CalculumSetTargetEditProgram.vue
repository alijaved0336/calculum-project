<template>
<CalculumModal :size="'md'" :showClose="true" :title="'Target Payment Terms (days)'" @close="$emit('hide-modal')">
  <template v-slot:modalContent>
    <div class="form-group">
      <label for="target">
        <input class="form-control" id="target" type="number" name="targetAmount" :placeholder="$t('global.targetPaymentTermsD')" v-model="targetAmount" @keyup="checkValue"/><span>{{ $t('global.targetPaymentTermsD') }}    </span>
      </label>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="$emit('hide-modal')" style="z-index: 1; width: fit-content"> <span>{{ $t('global.cancel') }}            </span></button>
    <button class="btn outline-secondary-btn font-md" @click="$emit('save-target',null)" style="z-index: 1; width: fit-content"> <span>{{ $t('global.clear') }}            </span></button>
    <button class="btn btn-primary font-md" @click="$emit('save-target',targetAmount)" style="z-index: 1; width: fit-content" :disabled="disabledSave"> <span>{{ $t('button.save') }}            </span></button>
  </template>
</CalculumModal>
</template>
    
<script lang="ts">
import { defineComponent, toRefs, reactive } from 'vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { useToast } from "vue-toastification";

export default defineComponent({
  name: 'CalculumSetTargetEditProgram',
  components: { CalculumModal },
  props: {
    withoutNavbar: { type: Boolean, required: false, default: false },
  },
  emits: ['hide-modal','save-target'],
  setup() {
    const toast = useToast();

    interface DataInterface {
      targetAmount: number | null,
      disabledSave: boolean
    }

    const data = reactive<DataInterface>({
      targetAmount: null,
      disabledSave: true
    })

    function checkValue(){
      data.targetAmount = Number(data.targetAmount)
      if (data.targetAmount <= 0 || data.targetAmount > 365) {
        data.disabledSave = true
        toast.error('Target value should be greater than 0 and less or equal to 365.');
      } else {
        data.disabledSave = false
      }
    
    }

    return {
      ...toRefs(data),
      checkValue,
      
    }
  }
})
</script>