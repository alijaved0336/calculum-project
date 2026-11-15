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
      <label for="selected-property-b">
        <select class="custom-select" v-model="selectedValueB" name="selected-property-b" id="selected-property-b">
          <option v-for="(item, index) in formData.listValuesB" :key="index" :value="item">{{ item }}</option>
        </select><span>{{ formData.selectedPropertyB }}</span>
      </label>
    </div>
  </div>
</div>
</template>
<script lang="ts">
import { defineComponent, toRefs, reactive, watch, onMounted } from 'vue'
export default defineComponent({
  name: "DataChangeTwoSelect",
  props: {
    formData: {
      type: Object,
      required: true
    },
  },
  emits: ['admin-user-input-changed'],
  setup(props, { emit }) {
    interface DataChangeTwoSelect {
      selectedPropertyA: string,
      selectedPropertyB: string
      selectedValueA: string,
      selectedValueB: string,
    }

    const data = reactive<DataChangeTwoSelect>({
      selectedPropertyA: props.formData.selectedPropertyA,
      selectedPropertyB: props.formData.selectedPropertyB,
      selectedValueA: props.formData.initialValueA,
      selectedValueB: props.formData.initialValueB
    })

    /**
     * OnMounted
     */
    onMounted(() => {
      const newAdminUserInput: { [key: string]: string } = {}

      newAdminUserInput[data.selectedPropertyA] = data.selectedValueA
      newAdminUserInput[data.selectedPropertyB] = data.selectedValueB

      emit('admin-user-input-changed', newAdminUserInput)
    })

    /**
     * Watchers
     */

    watch(data, () => {
      const newAdminUserInput: { [key: string]: string } = {}

      newAdminUserInput[data.selectedPropertyA] = data.selectedValueA
      newAdminUserInput[data.selectedPropertyB] = data.selectedValueB

      emit('admin-user-input-changed', newAdminUserInput)
    })

    return {
      ...toRefs(data)
    }
  }
})
</script>