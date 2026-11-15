<template>
<div class="row">
  <div class="col-xl-3">
    <div class="card">
      <text-base class="font-semibold mb-4">{{ $t('home.entityCard.calculator.paymentTermsVsPriceCalculator') }}</text-base>
      <div class="icons-descriptions mb-4">
        <IconCalculator></IconCalculator>
      </div><span v-html="$t('home.entityCard.calculator.description1')"></span>
    </div>
  </div>
  <div class="col-xl-9">
    <div class="card">
      <text-base class="font-semibold mb-4">{{ $t('home.entityCard.calculator.impactOfPaymentTermsonEconomicProfit') }}</text-base>
      <div class="row">
        <div class="col-lg-12 col-xl-4">
          <div class="icons-descriptions mb-4">
            <IconChartLine></IconChartLine>
          </div><span v-html="$t('home.entityCard.calculator.description2')"></span>
        </div>
        <div class="col-lg-12 col-xl-4">
          <div class="icons-descriptions mb-4">
            <IconCalendarCalculator>                   </IconCalendarCalculator>
          </div><span v-html="$t('home.entityCard.calculator.description3')"></span>
        </div>
        <div class="col-lg-12 col-xl-4">
          <div class="icons-descriptions mb-4">
            <IconCalculatorWallet>                   </IconCalculatorWallet>
          </div><span v-html="$t('home.entityCard.calculator.description4')"></span>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script>

import { defineComponent } from 'vue'
import IconCalculator from "@/resources/assets/images/icons/IconCalculator.vue";
import IconChartLine from "@/resources/assets/images/icons/IconChartLine.vue";
import IconCalendarCalculator from "@/resources/assets/images/icons/IconCalendarCalculator.vue";
import IconCalculatorWallet from "@/resources/assets/images/icons/IconCalculatorWallet.vue";

export default defineComponent({
    name: 'Descriptions',
    components: {
        IconCalculator,
        IconChartLine,
        IconCalendarCalculator,
        IconCalculatorWallet
    }
})
</script>

<style lang="scss" scoped>

@import "src/resources/assets/styles/variables/colors";

.card {
    min-height: 475px;
    @media(max-width: 1440px) {
        min-height: 630px;
    }

    @media(max-width: 1399px) {
        min-height: unset;
    }
}

.icons-descriptions {
    width: 56px;
    height: 56px;
    background: $color-gray-100;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-content: center;    
    flex-wrap: wrap;
}
</style>