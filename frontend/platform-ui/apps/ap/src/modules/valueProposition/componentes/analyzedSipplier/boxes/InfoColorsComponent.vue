<template>
<div class="d-flex-flex-column card-text-content justify-content-between align-items-center">
  <div class="opportunity-container" v-if="type !== 'paymentTermOpp'">
    <p class="text-lg font-bold">{{ objData.title }}    </p><span class="info-box font-bold">{{ objData.data }}</span>
  </div>
  <div class="paymentTermOpp" v-else>
    <p class="text-lg font-bold">{{ 'Payment Terms Opportunity' }} </p>
    <div class="terms-row">
      <div class="term-col"><span class="term-value font-bold">{{ `${objData.dayOne.data}` }}<span class="term-days">&nbsp; days</span></span>
        <p class="term-label font-bold">{{ objData.dayOne.title }}</p>
      </div>
      <div class="arrow-col"><span class="arrow font-bold mt-2"><i class="fa-solid fa-arrow-right-long"></i></span></div>
      <div class="term-col"><span class="term-value font-bold">{{ `${objData.dayTwo.data}` }}<span class="term-days">&nbsp; days</span></span>
        <p class="term-label font-bold">{{ objData.dayTwo.title }}</p>
      </div>
    </div>
  </div>
  <div class="prueba"></div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    name: 'InfoColorsComponent',
    props: {
        objData: { type: Object, required: true },
        type: { type: String, required: true }
    }
})
</script>

<style scoped lang="scss">
@import "../../../../../resources/assets/styles/variables/colors";

.card-text-content {
    color: white;
}
.info-box {
    font-size: 2.25rem !important;
}
.info-box-payment {
    font-size: 2.25rem !important;
}
.terms-row {
    display: flex;
    align-items: center;
    margin-bottom: -45px;
}

.term-col {
    display: flex;
    flex-direction: column;
}

.term-value {
    font-size: 1.6rem;
    line-height: 1;
}


.term-days {
    font-size: 1.2rem;
    line-height: 1;
}

.term-label {
    font-size: 0.7rem;
    margin-top: 5px;
}

.arrow-col {
    width: 50px;
    display: flex;
    margin-top: -40px;
    justify-content: center;
}

.arrow {
    font-size: 2rem;
}
</style>