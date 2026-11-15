<template>
<div class="test mb-0">
  <p class="text-gray-900 text-lg font-bold">{{ objData.title }}</p>
  <div class="count-class">
    <p class="font-weight-bold text-4xl">{{ objData.valuePercent }}</p>
    <div class="d-flex align-items-center">
      <div class="count-class-1 mr-5">
        <p class="mb-0 third-row">{{ objData.baseRate.title }}</p>
        <p class="font-weight-bold">{{ objData.baseRate.data }}</p>
      </div>
      <div class="count-class-2 ml-5 mr-0">
        <p class="mb-0 third-row">{{ objData.costOfDebt.title }}</p>
        <p class="font-weight-bold">{{ objData.costOfDebt.data }}</p>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    name: "SupplierCostBoxComponent",
    props: {
        objData: { type: Object, required: true },
    }
})
</script>

<style scoped lang="scss">
.test {
    display: flex;
    flex-direction: column;
    
    .d-flex {
        margin-top: -10px;
        margin-bottom: -11px;
        margin-left: 13px;
        justify-content: space-between;
    }
}


.third-row {
    font-size: 0.60rem;
}

.count-class {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
}
</style>