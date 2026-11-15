<template>
<table class="mb-0 table table-bordered rounded" id="nine-boxes-table" style="border-radius: 8px;">
  <thead>
    <tr class="bg-color-gray-50-9box-table" id="border-radius-8-9box-table">
      <th class="custom-title-9box-table" scope="terms"></th>
      <th class="custom-title-9box-table" scope="col"> {{$t('global.selection')}}</th>
      <th class="custom-title-9box-table" scope="col"> {{$t('global.total')}}</th>
      <th class="custom-title-9box-table" id="percent-9box" scope="col">%</th>
    </tr>
  </thead>
  <tbody class="table-body-9box w-100">
    <tr class="w-100" v-for="(item, index) in tableValues" :key="index">
      <th class="th-table-9box-text" scope="row"> {{  item.title  }}</th>
      <td class="th-table-9box">{{ item.selected }}</td>
      <td class="th-table-9box">{{ item.total }}</td>
      <td class="th-table-9box">{{ item.percentage }}</td>
    </tr>
  </tbody>
</table><span class="mt-1">{{  $t('global.nineboxfinancingmessage')   }}</span>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import iconInformation from '@/resources/assets/images/icons/iconInformation.vue'
import { useI18n } from 'vue-i18n'
import { useSpendFile } from '@/composables';
import { useNineBoxesTableLogic } from '@/modules/home/analyze/composables/useNineBoxesTableLogic'
import { useUserStore } from '@/stores/user'

export default defineComponent({
  name: 'AnalyzeProgramNineBoxesTableFinancingSCF',
  components: {
    iconInformation
  },
  props: {
    infoSummary: { type: Object, required: true },
    selectedLevel: { type: String, required: true }
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const userStore = useUserStore()
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid)
    const payOnTermsIsAllowed = computed(() => userStore.getShowPayOnTerms)
    const { showOpportunityExpectedOpportunity } = useSpendFile()

    const { data, displayValue } = useNineBoxesTableLogic(props, {
      cashflowField: 'cashFlow',
      showExpectedCashFlowTotal: false,
      calculateEconomicProfitPercentage: false,
    })

    const tableValues = computed(() => {
      const table = [
        {
          title: translate.t('global.nineboxes.table.buyers'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalBuyersBigNumber),
          total: data.totalBoxesBigNumber.totalBuyersBigNumber,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageBuyers
        },
        {
          title: translate.t('global.nineboxes.table.volume'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalVolumeBigNumber),
          total: data.totalBoxesBigNumber.totalVolumeBigNumber,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageVolume
        },
        {
          title: translate.t('global.buyerImpact9box'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalCashflowBigNumber),
          total: data.totalBoxesBigNumber.totalCashflowBigNumber,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageCashflow
        },
        {
          title: translate.t('global.nineboxes.table.contractualPaymentTerms'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalContractualPaymentTermsBigNumber),
          total: data.totalBoxesBigNumber.totalWeightedContractualPaymentTerms,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageContractualPaymentTerms
        },
        {
          title: translate.t('global.nineboxes.table.actualPaymentTerms'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalActualPaymentTermsBigNumber),
          total: data.totalBoxesBigNumber.totalWeightedActualPaymentTerms,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageActualPaymentTerms
        },
        {
          title: translate.t('global.nineboxes.table.paymentTermsOpportunity'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalPaymentTermsOpportunityBigNumber),
          total: data.totalBoxesBigNumber.totalWeightedPaymentTermsOpportunity,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentagePaymentTermsOpportunity
        }
      ]

      if (showOpportunityExpectedOpportunity.value === 'OPPORTUNITY_AND_EXPECTED') {
        table.push({
          title: translate.t('global.nineboxes.table.expectedPaymentTerms'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalExpectedPaymentTermsBigNumber),
          total: data.totalBoxesBigNumber.totalWeightedExpectedPaymentTerms,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageExpectedPaymentTerms
        })
      }

      table.push({
        title: translate.t('home.entityCard.infoCards.vCardEconomicProfitExpected'),
        selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalEconomicProfitBigNumber),
        total: data.totalBoxesBigNumber.totalEconomicProfitBigNumber,
        percentage: data.selectedBoxesPercentage.selectedBoxesPercentageEconomicProfit
      })

      if (props.selectedLevel === 'spend') {
        table.unshift({
          title: translate.t('global.spends'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalSpendsBigNumber),
          total: data.totalBoxesBigNumber.totalSpendsBigNumber,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageSpends
        })
      }

      if (props.selectedLevel === 'supplier') {
        table.unshift({
          title: translate.t('global.nineboxes.table.suppliers'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalSuppliersBigNumber),
          total: data.totalBoxesBigNumber.totalSuppliersBigNumber,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageSuppliers
        })
      }

      if (props.selectedLevel === 'parent') {
        table.unshift({
          title: translate.t('global.nineboxes.table.parents'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalParentsBigNumber),
          total: data.totalBoxesBigNumber.totalParentsBigNumber,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageParents
        })
      }

      let filteredTable = table
      if (hideAverageDaysPaid.value) {
        filteredTable = filteredTable.filter((row: any) => row.title !== translate.t('global.nineboxes.table.actualPaymentTerms'))
      }
      if (!payOnTermsIsAllowed.value) {
        filteredTable = filteredTable.filter((row: any) => row.title !== translate.t('global.nineboxes.table.contractualPaymentTerms'))
      }

      return filteredTable
    })

    return { tableValues }
  },
})
</script>
