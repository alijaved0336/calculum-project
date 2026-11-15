<template>
<div class="row">
  <div class="col-12">
    <div class="form-group">
      <label for="selected-property-a">
        <select class="custom-select" v-model="selectedValueA" name="selected-property-a" id="selected-property-a" :disabled="formData.status === 'solved'">
          <option v-for="(item, index) in formData.listValuesA" :key="index" :value="item.id">{{ item.text }}</option>
        </select><span>{{ formData.selectedPropertyA }}</span>
      </label>
    </div>
  </div>
</div>
<div class="row mb-3">
  <div class="col-12">
    <div class="form-group">
      <label for="input-property-b">
        <input class="form-control" v-model="inputValueB" name="input-property-b" id="input-property-b" type="text" min="formData.inputValueBRange.min" max="formData.inputValueBRange.max"/><span>{{ formData.inputPropertyB }}</span>
      </label>
    </div>
  </div>
  <div class="col-12"><span class="text-error" v-if="errorOutOfRangeShowing">{{ $t('error.outOfRange') }}</span></div>
</div>
</template>
<script lang="ts">
import { defineComponent, toRefs, reactive, watch } from 'vue'

export default defineComponent({
  name: "DataChangeTwoInputTxt",
  props: {
    formData: {
      type: Object,
      required: true
    },
  },
  emits: ['admin-user-input-changed'],
  setup(props, { emit }) {
    interface DataChangeTwoSelect {
      errorOutOfRangeShowing: boolean,
      inputValueB: string,
      selectedValueA: string,
    }

    const data = reactive<DataChangeTwoSelect>({
      errorOutOfRangeShowing: false,
      inputValueB: props.formData.inputValueB,
      selectedValueA: props.formData.initialValueA,  // Get the first value from the list
    })

    /**
     * Watchers
     */

    /**
     * Watch for changes in inputValueB and emit the new value
     */
    watch(data, () => {
      const newAdminUserInput: { [key: string]: string } = {}

      // Check if the input field is not empty
      if (data.inputValueB === '') {
        // Hide error message
        data.errorOutOfRangeShowing = false

        return
      }

      /**
       * Parse the input value and convert it to a number
       * Show error if it is less than the min or greater than the max
       */
      if (parseInt(data.inputValueB) >= props.formData.inputValueBRange.min
        && parseInt(data.inputValueB) <= props.formData.inputValueBRange.max) {
        // Hide error message
        data.errorOutOfRangeShowing = false

        newAdminUserInput[props.formData.selectedPropertyA] = data.selectedValueA
        newAdminUserInput[props.formData.inputPropertyB] = data.inputValueB
      } else {
        // Show error message
        data.errorOutOfRangeShowing = true

        if (import.meta.env.DEV) console.error('** Error: inputValueB out of range:', data.inputValueB)
      }

      emit('admin-user-input-changed', newAdminUserInput)
    })

    return {
      ...toRefs(data)
    }
  }
})
</script>

<style lang="scss" scoped>
@import 'src/resources/assets/styles/variables/_colors.scss';

.text-error {
  color: $color-error-500;
}
</style>