<template>
<table class="mb-0 table table-bordered rounded" id="nine-boxes-table" style="border-radius: 8px;">
  <thead>
    <tr class="bg-color-gray-50-9box-table" id="border-radius-8-9box-table">
      <th class="custom-title-9box-table" scope="terms"> </th>
      <th class="custom-title-9box-table" scope="col"> {{$t('global.selection')}}</th>
      <th class="custom-title-9box-table" scope="col"> {{$t('global.total')}}</th>
      <th class="custom-title-9box-table" id="percent-9box" scope="col">%</th>
    </tr>
  </thead>
  <tbody class="table-body-9box w-100">
    <tr class="w-100" v-for="(item, index) in tableValues" :key="index">
      <th class="th-table-9box-text" scope="row">{{  item.title  }}        </th>
      <td class="th-table-9box">{{ item.selected }}</td>
      <td class="th-table-9box">{{ item.total }}</td>
      <td class="th-table-9box">{{ item.percentage }}</td>
    </tr>
  </tbody>
</table><span class="mt-1">{{  $t('global.nineboxvcardmessage')   }}</span>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, onMounted, computed } from 'vue'
import iconInformation from '@/resources/assets/images/icons/iconInformation.vue'
import * as formatData from '@/utils/FormatData'
import { HomeAnalyzeProgramNineBoxesTableVcard } from '@/modules/home/analyze/types/vcard'
import { useI18n } from 'vue-i18n'
import { StringUtils } from '@/utils'

export default defineComponent({
  name: 'AnalyzeProgramNineBoxesTableVcard',
  components: {
    iconInformation
  },
  props: {
    infoSummary: { type: Object, required: true },
    selectedLevel: { type: String, required: true }
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const data = reactive<HomeAnalyzeProgramNineBoxesTableVcard>({
      totalBoxesInfoSummary: [],
      selectedBoxesInfoSummary: [],
      selectedBoxesArray: [],
      currentTabSelected: 'all',
      currentTableSelected: {},
      selectedBoxesPercentage: {
        selectedBoxesPercentageExpectedEconomicProfit: '',
        selectedBoxesPercentageExpectedCashFlow: '',
        selectedBoxesPercentageExpectedRebateCashFlow: '',
        selectedBoxesPercentageSpends: '',
        selectedBoxesPercentageSuppliers: '',
        selectedBoxesPercentageParents: '',
        selectedBoxesPercentageEconomicProfit: '',
        selectedBoxesPercentageVolume: '',
        selectedBoxesPercentageCashflow: '',
        selectedBoxesPercentageRebateCashFlow: '',
        
      },
      selectedBoxesTotalBigNumber: {
        selectedBoxesTotalExpectedEconomicProfitBigNumber: '',
        selectedBoxesTotalExpectedCashFlowBigNumber: '',
        selectedBoxesTotalExpectedRebateCashFlowBigNumber: '',
        selectedBoxesTotalSpendsBigNumber: '',
        selectedBoxesTotalSuppliersBigNumber: '',
        selectedBoxesTotalParentsBigNumber: '',
        selectedBoxesTotalEconomicProfitNumber: '',
        selectedBoxesTotalVolumeBigNumber: '',
        selectedBoxesTotalCashflowBigNumber: '',        
        selectedBoxesTotalRebateCashFlowBigNumber: ''
      },
      selectedBoxesTotal: {
        selectedBoxesTotalExpectedEconomicProfitTerms: 0,
        selectedBoxesTotalExpectedCashFlowTerms: 0,
        selectedBoxesTotalExpectedRebateCashFlowTerms: 0,
        selectedBoxesTotalSpends: 0,
        selectedBoxesTotalSuppliers: 0,
        selectedBoxesTotalParents: 0,
        selectedBoxesTotalEconomicProfit: 0,
        selectedBoxesTotalVolume: 0,
        selectedBoxesTotalCashflow: 0,
        selectedBoxesTotalRebateCashFlow: 0
      },
      selectedBoxesStringValue: '',
      showZeroBoxSection: false,
      totalBoxes: {
        totalExpectedCashFlow: 0,
        totalExpectedRebateCashFlow: 0,
        totalSpends: 0,
        totalSuppliers: 0,
        totalParents: 0,
        totalEconomicProfit: 0,
        totalVolume: 0,
        totalCashflow: 0,
        totalDiscounts: 0,
        totalRebateCashFlow: 0,
        totalExpectedEconomicProfit: 0,
        totalContractualPaymentTerms: 0,
        totalActualPaymentTerms: 0,
        totalPaymentTermsOpportunity: 0,
        totalExpectedPaymentTerms: 0,
      },
      totalBoxesBigNumber: {
        totalExpectedCashFlowBigNumber: '',
        totalExpectedRebateCashFlowBigNumber: '',
        totalSpendsBigNumber: '',
        totalSuppliersBigNumber: '',
        totalParentsBigNumber: '',
        totalEconomicProfitBigNumber: '',
        totalExpectedEconomicProfitBigNumber: '',
        totalVolumeBigNumber: '',
        totalCashflowBigNumber: '',
        totalRebateCashFlowBigNumber: '',
      }

    })

    const tableValues = computed(() => {
      let table = [        

        {  
          title: translate.t('global.nineboxes.table.volume'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalVolumeBigNumber),
          total: data.totalBoxesBigNumber.totalVolumeBigNumber,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageVolume
        },

        //* economicProfit
        {  
          title: translate.t('home.entityCard.infoCards.vCardEconomicProfit'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalEconomicProfitNumber),
          total: data.totalBoxesBigNumber.totalEconomicProfitBigNumber,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageEconomicProfit
        },


        {
          title: translate.t('global.nineboxes.table.cashflowOpportunity'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalCashflowBigNumber),
          total: data.totalBoxesBigNumber.totalCashflowBigNumber,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageCashflow
        },

        //* rebateCashFlow

        {
          title: translate.t('global.rebatesOpportunity'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalRebateCashFlowBigNumber),
          total: data.totalBoxesBigNumber.totalRebateCashFlowBigNumber,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageRebateCashFlow
        },

        //* expectedEconomicProfit

        {  
          title: translate.t('home.entityCard.infoCards.vCardEconomicProfitExpected'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalExpectedEconomicProfitBigNumber),
          total: data.totalBoxesBigNumber.totalExpectedEconomicProfitBigNumber,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageExpectedEconomicProfit
        },

        //* expectedCashFlow

        {
          title: translate.t('global.nineboxes.table.cashflowOpportunityExpected'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalExpectedCashFlowBigNumber),
          total: data.totalBoxesBigNumber.totalExpectedCashFlowBigNumber,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageExpectedCashFlow
        },

        //* expectedRebateCashFlow

        {
          title: translate.t('global.rebatesOpportunityExpected'),
          selected: displayValue(data.selectedBoxesTotalBigNumber.selectedBoxesTotalExpectedRebateCashFlowBigNumber),
          total: data.totalBoxesBigNumber.totalExpectedRebateCashFlowBigNumber,
          percentage: data.selectedBoxesPercentage.selectedBoxesPercentageExpectedRebateCashFlow
        },
      ]

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
            title:translate.t('global.nineboxes.table.suppliers'),
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

    
      return table
    })

   
    function displayValue(val: any) {
      if (val !== null && val !== undefined && val !== '0') {
        return val
      } else {
        return '-'
      }
    }

    function getPercentage() {
      data.selectedBoxesPercentage.selectedBoxesPercentageSpends = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalSpends, data.totalBoxes.totalSpends);
      data.selectedBoxesPercentage.selectedBoxesPercentageSuppliers = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalSuppliers, data.totalBoxes.totalSuppliers);
      data.selectedBoxesPercentage.selectedBoxesPercentageParents = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalParents, data.totalBoxes.totalParents);
      data.selectedBoxesPercentage.selectedBoxesPercentageVolume = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalVolume, data.totalBoxes.totalVolume);
      data.selectedBoxesPercentage.selectedBoxesPercentageEconomicProfit = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalEconomicProfit, data.totalBoxes.totalEconomicProfit);
      data.selectedBoxesPercentage.selectedBoxesPercentageCashflow = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalCashflow, data.totalBoxes.totalCashflow);      
      data.selectedBoxesPercentage.selectedBoxesPercentageRebateCashFlow = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalRebateCashFlow, data.totalBoxes.totalRebateCashFlow);
      data.selectedBoxesPercentage.selectedBoxesPercentageExpectedEconomicProfit = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalExpectedEconomicProfitTerms, data.totalBoxes.totalExpectedEconomicProfit);
      data.selectedBoxesPercentage.selectedBoxesPercentageExpectedCashFlow = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalExpectedCashFlowTerms, data.totalBoxes.totalExpectedCashFlow);
      data.selectedBoxesPercentage.selectedBoxesPercentageExpectedRebateCashFlow = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalExpectedRebateCashFlowTerms, data.totalBoxes.totalExpectedRebateCashFlow);

    }


    function calculatePercentage(numerator: number, denominator: number): string {
      if (denominator !== 0) {
        const percentage = (numerator / denominator * 100).toFixed(2);
        return formatData.getNumberWithDecimals(percentage, 2);
      } else {
        return '0'; 
      }
    }


    /**
     * Calulcates the sums for the selected boxes, case 1, adds the sums of that category,
     * case 2, calulcated the weighted average of that category
     */
    function getSumsForSelected(myData: Array<any>) {
      myData.forEach((item: any) => {
        if (item.spends) {
          data.selectedBoxesTotal.selectedBoxesTotalSpends = data.selectedBoxesTotal.selectedBoxesTotalSpends + item.spends
        }
        if (item.suppliers) {
          data.selectedBoxesTotal.selectedBoxesTotalSuppliers = data.selectedBoxesTotal.selectedBoxesTotalSuppliers + item.suppliers
        }
        if (item.parents) {
          data.selectedBoxesTotal.selectedBoxesTotalParents = data.selectedBoxesTotal.selectedBoxesTotalParents + item.parents
        }
        
        if (item.volume) {
          data.selectedBoxesTotal.selectedBoxesTotalVolume = data.selectedBoxesTotal.selectedBoxesTotalVolume + item.volume
        }
        
        if (item.economicProfit) {
          data.selectedBoxesTotal.selectedBoxesTotalEconomicProfit = data.selectedBoxesTotal.selectedBoxesTotalEconomicProfit + item.economicProfit
        }


        if (item.cashFlow) {
          data.selectedBoxesTotal.selectedBoxesTotalCashflow = data.selectedBoxesTotal.selectedBoxesTotalCashflow + item.cashFlow
        }
        
        if (item.rebateCashFlow) {
          data.selectedBoxesTotal.selectedBoxesTotalRebateCashFlow = data.selectedBoxesTotal.selectedBoxesTotalRebateCashFlow + item.rebateCashFlow
        }

        if (item.expectedEconomicProfit) {
          data.selectedBoxesTotal.selectedBoxesTotalExpectedEconomicProfitTerms = data.selectedBoxesTotal.selectedBoxesTotalExpectedEconomicProfitTerms + item.expectedEconomicProfit
        }

        if (item.expectedCashFlow) {
          data.selectedBoxesTotal.selectedBoxesTotalExpectedCashFlowTerms = data.selectedBoxesTotal.selectedBoxesTotalExpectedCashFlowTerms + item.expectedCashFlow
        }

        if (item.expectedRebateCashFlow) {
          data.selectedBoxesTotal.selectedBoxesTotalExpectedRebateCashFlowTerms = data.selectedBoxesTotal.selectedBoxesTotalExpectedRebateCashFlowTerms + item.expectedRebateCashFlow
        }

      })
      
      calculateSelectedTotals()


    }

    
    /**
     * case 1 : calculates the sums for the given category
     * case 2: calculates the weighted avertage of all of the given category total
     */

    function getSumsValues(myData: any) {
      myData.forEach((item: any) => {
        if (item.spends) {
          data.totalBoxes.totalSpends = data.totalBoxes.totalSpends + item.spends
        }
        if (item.suppliers) {
          data.totalBoxes.totalSuppliers = data.totalBoxes.totalSuppliers + item.suppliers
        }
        if (item.parents) {
          data.totalBoxes.totalParents = data.totalBoxes.totalParents + item.parents
        }
        if (item.economicProfit) {
          data.totalBoxes.totalEconomicProfit = data.totalBoxes.totalEconomicProfit + item.economicProfit
        }
        if (item.volume) {
          data.totalBoxes.totalVolume = data.totalBoxes.totalVolume + item.volume
        }
        if (item.cashFlow) {
          data.totalBoxes.totalCashflow = data.totalBoxes.totalCashflow + item.cashFlow
        }
        
        if (item.rebateCashFlow) {
          data.totalBoxes.totalRebateCashFlow = data.totalBoxes.totalRebateCashFlow + item.rebateCashFlow
        }

        if (item.expectedEconomicProfit) {
          data.totalBoxes.totalExpectedEconomicProfit = data.totalBoxes.totalExpectedEconomicProfit + item.expectedEconomicProfit
        }

        if (item.expectedCashFlow) {
          data.totalBoxes.totalExpectedCashFlow = data.totalBoxes.totalExpectedCashFlow + item.expectedCashFlow
        }

        if (item.expectedRebateCashFlow) {
          data.totalBoxes.totalExpectedRebateCashFlow = data.totalBoxes.totalExpectedRebateCashFlow + item.expectedRebateCashFlow
        }

        
      })
      calculateTotals()
    }

    function calculateSelectedTotals() {

      data.selectedBoxesTotalBigNumber.selectedBoxesTotalEconomicProfitNumber = StringUtils.formatBigNumbers(data.selectedBoxesTotal.selectedBoxesTotalEconomicProfit)
      data.selectedBoxesTotalBigNumber.selectedBoxesTotalRebateCashFlowBigNumber = StringUtils.formatBigNumbers(data.selectedBoxesTotal.selectedBoxesTotalRebateCashFlow)
      data.selectedBoxesTotalBigNumber.selectedBoxesTotalExpectedEconomicProfitBigNumber = StringUtils.formatBigNumbers(data.selectedBoxesTotal.selectedBoxesTotalExpectedEconomicProfitTerms)
      data.selectedBoxesTotalBigNumber.selectedBoxesTotalExpectedCashFlowBigNumber = StringUtils.formatBigNumbers(data.selectedBoxesTotal.selectedBoxesTotalExpectedCashFlowTerms)
      data.selectedBoxesTotalBigNumber.selectedBoxesTotalExpectedRebateCashFlowBigNumber = StringUtils.formatBigNumbers(data.selectedBoxesTotal.selectedBoxesTotalExpectedRebateCashFlowTerms)
      data.selectedBoxesTotalBigNumber.selectedBoxesTotalSpendsBigNumber = formatData.getNumberWithDecimals(`${data.selectedBoxesTotal.selectedBoxesTotalSpends}`, 0)
      data.selectedBoxesTotalBigNumber.selectedBoxesTotalSuppliersBigNumber = formatData.getNumberWithDecimals(`${data.selectedBoxesTotal.selectedBoxesTotalSuppliers}`, 0)
      data.selectedBoxesTotalBigNumber.selectedBoxesTotalParentsBigNumber = formatData.getNumberWithDecimals(`${data.selectedBoxesTotal.selectedBoxesTotalParents}`, 0)
      data.selectedBoxesTotalBigNumber.selectedBoxesTotalVolumeBigNumber = StringUtils.formatBigNumbers(data.selectedBoxesTotal.selectedBoxesTotalVolume)
      data.selectedBoxesTotalBigNumber.selectedBoxesTotalCashflowBigNumber = StringUtils.formatBigNumbers(data.selectedBoxesTotal.selectedBoxesTotalCashflow)      
      
    }

    function calculateTotals() {
      
      data.totalBoxesBigNumber.totalSpendsBigNumber = formatData.getNumberWithDecimals(`${data.totalBoxes.totalSpends}`, 0)
      data.totalBoxesBigNumber.totalSuppliersBigNumber = formatData.getNumberWithDecimals(`${data.totalBoxes.totalSuppliers}`, 0)
      data.totalBoxesBigNumber.totalParentsBigNumber = formatData.getNumberWithDecimals(`${data.totalBoxes.totalParents}`, 0)
      data.totalBoxesBigNumber.totalEconomicProfitBigNumber = StringUtils.formatBigNumbers(data.totalBoxes.totalEconomicProfit)
      data.totalBoxesBigNumber.totalVolumeBigNumber = StringUtils.formatBigNumbers(data.totalBoxes.totalVolume)
      data.totalBoxesBigNumber.totalCashflowBigNumber = StringUtils.formatBigNumbers(data.totalBoxes.totalCashflow)
      data.totalBoxesBigNumber.totalRebateCashFlowBigNumber = StringUtils.formatBigNumbers(data.totalBoxes.totalRebateCashFlow)
      data.totalBoxesBigNumber.totalExpectedEconomicProfitBigNumber = StringUtils.formatBigNumbers(data.totalBoxes.totalExpectedEconomicProfit)
      data.totalBoxesBigNumber.totalExpectedCashFlowBigNumber = StringUtils.formatBigNumbers(data.totalBoxes.totalExpectedCashFlow)
      data.totalBoxesBigNumber.totalExpectedRebateCashFlowBigNumber = StringUtils.formatBigNumbers(data.totalBoxes.totalExpectedRebateCashFlow)
    }

    /**
     * onMounted
     */
    onMounted(() => {
      data.showZeroBoxSection = false
      data.totalBoxesInfoSummary = props.infoSummary
      if (data.totalBoxesInfoSummary.length > 0) {
        const zeroData = Object.values(data.totalBoxesInfoSummary[0])
        zeroData.forEach((element: any) => {
          /**
           * At least 1 item is > cero, show the sections
          */
          if (element > 0) {
            data.showZeroBoxSection = true
          }
        });
      }

      data.selectedBoxesInfoSummary = data.totalBoxesInfoSummary.filter((item: any) => {
        if (item.selected) {
          data.selectedBoxesStringValue += item.box + ','
          return item
        }

      })
      data.selectedBoxesStringValue = data.selectedBoxesStringValue.slice(0, -1)

      getSumsValues(data.totalBoxesInfoSummary)
      getSumsForSelected(data.selectedBoxesInfoSummary)
      getPercentage()
    })

    return {
      ...toRefs(data),
      formatData,
      tableValues,
    }
  },
})
</script>