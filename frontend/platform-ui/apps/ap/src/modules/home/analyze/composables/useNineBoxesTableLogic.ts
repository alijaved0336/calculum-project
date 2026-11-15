import { reactive, onMounted } from 'vue'
import * as formatData from '@/utils/FormatData'
import type { HomeAnalyzeProgramNineBoxesTable } from '@/modules/home/analyze/types'
import { StringUtils } from '@/utils'

interface NineBoxesTableConfig {
  cashflowField: 'cashFlow' | 'potentialSCFRevenue'
  showExpectedCashFlowTotal: boolean
  calculateEconomicProfitPercentage: boolean
}

export function displayValue(val: any) {
  if (val !== null && val !== undefined && val !== '0') {
    return val
  } else {
    return '-'
  }
}

export function calculatePercentage(numerator: number, denominator: number): string {
  if (denominator === 0) {
    return '0';
  }
  const percentage = (numerator / denominator * 100).toFixed(2);
  return formatData.getNumberWithDecimals(percentage, 2);
}

export function useNineBoxesTableLogic(
  props: { infoSummary: any; selectedLevel: string },
  config: NineBoxesTableConfig
) {
  const data = reactive<HomeAnalyzeProgramNineBoxesTable>({
    totalBoxesInfoSummary: [],
    selectedBoxesInfoSummary: [],
    selectedBoxesArray: [],
    currentTabSelected: 'all',
    currentTableSelected: {},
    selectedBoxesPercentage: {
      selectedBoxesPercentageSpends: '',
      selectedBoxesPercentageSuppliers: '',
      selectedBoxesPercentageParents: '',
      selectedBoxesPercentageBuyers: '',
      selectedBoxesPercentageVolume: '',
      selectedBoxesPercentageCashflow: '',
      selectedBoxesPercentageDiscounts: '',
      selectedBoxesPercentageEconomicProfit: '',
      selectedBoxesPercentageExpectedCashFlow: '',
      selectedBoxesPercentageContractualPaymentTerms: '',
      selectedBoxesPercentageActualPaymentTerms: '',
      selectedBoxesPercentagePaymentTermsOpportunity: '',
      selectedBoxesPercentageExpectedPaymentTerms: ''
    },
    selectedBoxesTotalBigNumber: {
      selectedBoxesTotalSpendsBigNumber: '',
      selectedBoxesTotalSuppliersBigNumber: '',
      selectedBoxesTotalParentsBigNumber: '',
      selectedBoxesTotalBuyersBigNumber: '',
      selectedBoxesTotalVolumeBigNumber: '',
      selectedBoxesTotalCashflowBigNumber: '',
      selectedBoxesTotalDiscountsBigNumber: '',
      selectedBoxesTotalEconomicProfitBigNumber: '',
      selectedBoxesTotalExpectedCashFlowBigNumber: '',
      selectedBoxesTotalContractualPaymentTermsBigNumber: '',
      selectedBoxesTotalActualPaymentTermsBigNumber: '',
      selectedBoxesTotalPaymentTermsOpportunityBigNumber: '',
      selectedBoxesTotalExpectedPaymentTermsBigNumber: ''
    },
    selectedBoxesTotal: {
      selectedBoxesNumbers: [],
      selectedBoxesTotalSpends: 0,
      selectedBoxesTotalSuppliers: 0,
      selectedBoxesTotalParents: 0,
      selectedBoxesTotalBuyers: 0,
      selectedBoxesTotalVolume: 0,
      selectedBoxesTotalCashflow: 0,
      selectedBoxesTotalDiscounts: 0,
      selectedBoxesTotalEconomicProfit: 0,
      selectedBoxesTotalExpectedCashFlow: 0,
      selectedBoxesTotalContractualPaymentTerms: 0,
      selectedBoxesTotalActualPaymentTerms: 0,
      selectedBoxesTotalPaymentTermsOpportunity: 0,
      selectedBoxesTotalExpectedPaymentTerms: 0,
      selectedBoxesTotalContractualPaymentTermsNotWeighted: 0,
      selectedBoxesTotalActualPaymentTermsNotWeighted: 0,
      selectedBoxesTotalPaymentTermsOpportunityNotWeighted: 0,
      selectedBoxesTotalExpectedPaymentTermsNotWeighted: 0
    },
    selectedBoxesStringValue: '',
    showZeroBoxSection: false,
    totalBoxes: {
      totalSpends: 0,
      totalSuppliers: 0,
      totalParents: 0,
      totalBuyers: 0,
      totalVolume: 0,
      totalCashflow: 0,
      totalDiscounts: 0,
      totalEconomicProfit: 0,
      totalExpectedCashFlow: 0,
      totalContractualPaymentTerms: 0,
      totalActualPaymentTerms: 0,
      totalPaymentTermsOpportunity: 0,
      totalExpectedPaymentTerms: 0,
    },
    totalBoxesBigNumber: {
      totalSpendsBigNumber: '',
      totalSuppliersBigNumber: '',
      totalParentsBigNumber: '',
      totalBuyersBigNumber: '',
      totalVolumeBigNumber: '',
      totalCashflowBigNumber: '',
      totalDiscountsBigNumber: '',
      totalEconomicProfitBigNumber: '',
      totalExpectedCashFlowBigNumber: '',
      totalContractualPaymentTermsBigNumber: '',
      totalActualPaymentTermsBigNumber: '',
      totalPaymentTermsOpportunityBigNumber: '',
      totalExpectedPaymentTermsBigNumber: '',
      totalWeightedContractualPaymentTerms: 0,
      totalWeightedActualPaymentTerms: 0,
      totalWeightedPaymentTermsOpportunity: 0,
      totalWeightedExpectedPaymentTerms: 0
    },
    weightedCalculations: {
      selected: {
        selectedBoxesTotalExpectedPaymentTermsWeighted: 0,
        selectedBoxesTotalPaymentTermsOpportunityWeighted: 0,
        selectedBoxesTotalContractualPaymentTermsWeighted: 0,
        selectedBoxesTotalActualPaymentTermsWeighted: 0,
        totalVolumeWeight: 0,
      },
      total: {
        totalWeightedContractualPaymentTerms: 0,
        totalWeightedActualPaymentTerms: 0,
        totalWeightedPaymentTermsOpportunity: 0,
        totalWeightedExpectedPaymentTerms: 0,
        totalVolumeWeight: 0
      }
    },
  })

  function getPercentage() {
    data.selectedBoxesPercentage.selectedBoxesPercentageSpends = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalSpends, data.totalBoxes.totalSpends);
    data.selectedBoxesPercentage.selectedBoxesPercentageSuppliers = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalSuppliers, data.totalBoxes.totalSuppliers);
    data.selectedBoxesPercentage.selectedBoxesPercentageParents = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalParents, data.totalBoxes.totalParents);
    data.selectedBoxesPercentage.selectedBoxesPercentageBuyers = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalBuyers, data.totalBoxes.totalBuyers);
    data.selectedBoxesPercentage.selectedBoxesPercentageVolume = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalVolume, data.totalBoxes.totalVolume);
    data.selectedBoxesPercentage.selectedBoxesPercentageCashflow = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalCashflow, data.totalBoxes.totalCashflow);
    data.selectedBoxesPercentage.selectedBoxesPercentageDiscounts = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalDiscounts, data.totalBoxes.totalDiscounts);
    data.selectedBoxesPercentage.selectedBoxesPercentageExpectedCashFlow = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalExpectedCashFlow, data.totalBoxes.totalExpectedCashFlow);
    if (config.calculateEconomicProfitPercentage) {
      data.selectedBoxesPercentage.selectedBoxesPercentageEconomicProfit = calculatePercentage(data.selectedBoxesTotal.selectedBoxesTotalEconomicProfit, data.totalBoxes.totalEconomicProfit);
    }
    data.selectedBoxesPercentage.selectedBoxesPercentageContractualPaymentTerms = '-'
    data.selectedBoxesPercentage.selectedBoxesPercentageActualPaymentTerms = '-'
    data.selectedBoxesPercentage.selectedBoxesPercentagePaymentTermsOpportunity = '-'
    data.selectedBoxesPercentage.selectedBoxesPercentageExpectedPaymentTerms = '-'
  }

  function getSumsForSelected(myData: Array<any>) {
    myData.forEach((item: any) => {
      data.selectedBoxesTotal.selectedBoxesTotalSpends += item.spends || 0
      data.selectedBoxesTotal.selectedBoxesTotalSuppliers += item.suppliers || 0
      data.selectedBoxesTotal.selectedBoxesTotalParents += item.parents || 0
      data.selectedBoxesTotal.selectedBoxesTotalBuyers += item.buyers || 0
      data.selectedBoxesTotal.selectedBoxesTotalVolume += item.volume || 0
      data.selectedBoxesTotal.selectedBoxesTotalCashflow += item[config.cashflowField] || 0
      data.selectedBoxesTotal.selectedBoxesTotalDiscounts += item.discounts || 0
      data.selectedBoxesTotal.selectedBoxesTotalEconomicProfit += Number(item.economicProfit || 0)
      data.selectedBoxesTotal.selectedBoxesTotalExpectedCashFlow += item.expectedCashFlow || 0
      data.weightedCalculations.selected.totalVolumeWeight += item.volume || 0
      if (!item.volume) return
      if (item.contractualPaymentTerms) {
        data.selectedBoxesTotal.selectedBoxesTotalContractualPaymentTermsNotWeighted += item.contractualPaymentTerms
        data.weightedCalculations.selected.selectedBoxesTotalContractualPaymentTermsWeighted += item.contractualPaymentTermsAndVolume
      }
      if (item.actualPaymentTerms) {
        data.selectedBoxesTotal.selectedBoxesTotalActualPaymentTermsNotWeighted += item.actualPaymentTerms
        data.weightedCalculations.selected.selectedBoxesTotalActualPaymentTermsWeighted += item.actualPaymentTermsAndVolume
      }
      if (item.paymentTermsOpportunity) {
        data.selectedBoxesTotal.selectedBoxesTotalPaymentTermsOpportunityNotWeighted += item.paymentTermsOpportunity
        data.weightedCalculations.selected.selectedBoxesTotalPaymentTermsOpportunityWeighted += item.paymentTermsOpportunityAndVolume
      }
      if (item.expectedPaymentTerms) {
        data.selectedBoxesTotal.selectedBoxesTotalExpectedPaymentTermsNotWeighted += item.expectedPaymentTerms
        data.weightedCalculations.selected.selectedBoxesTotalExpectedPaymentTermsWeighted += item.expectedPaymentTermsAndVolume
      }
    })
    calculateWeightedValues(myData)
    calculateSelectedTotals()
  }

  function calculateWeightedValues(myData: Array<any>) {
    if (data.weightedCalculations.selected.totalVolumeWeight === 0) {
      data.selectedBoxesTotal.selectedBoxesTotalExpectedPaymentTerms = 0;
      data.selectedBoxesTotal.selectedBoxesTotalPaymentTermsOpportunity = 0;
      data.selectedBoxesTotal.selectedBoxesTotalContractualPaymentTerms = 0;
      data.selectedBoxesTotal.selectedBoxesTotalActualPaymentTerms = 0;
      return;
    }
    const totalVolume = myData.reduce((sum: any, item: any) => sum + (item.volume || 0), 0);
    data.selectedBoxesTotal.selectedBoxesTotalExpectedPaymentTerms = data.weightedCalculations.selected.selectedBoxesTotalExpectedPaymentTermsWeighted / totalVolume;
    data.selectedBoxesTotal.selectedBoxesTotalPaymentTermsOpportunity = data.weightedCalculations.selected.selectedBoxesTotalPaymentTermsOpportunityWeighted / totalVolume;
    data.selectedBoxesTotal.selectedBoxesTotalContractualPaymentTerms = data.weightedCalculations.selected.selectedBoxesTotalContractualPaymentTermsWeighted / totalVolume;
    data.selectedBoxesTotal.selectedBoxesTotalActualPaymentTerms = data.weightedCalculations.selected.selectedBoxesTotalActualPaymentTermsWeighted / totalVolume;
  }

  function getSumsValues(myData: any) {
    myData.forEach((item: any) => {
      data.totalBoxes.totalSpends += item.spends || 0
      data.totalBoxes.totalSuppliers += item.suppliers || 0
      data.totalBoxes.totalParents += item.parents || 0
      data.totalBoxes.totalBuyers += item.buyers || 0
      data.totalBoxes.totalVolume += item.volume || 0
      data.totalBoxes.totalCashflow += item[config.cashflowField] || 0
      data.totalBoxes.totalDiscounts += item.discounts || 0
      data.totalBoxes.totalEconomicProfit += Number(item.economicProfit || 0)
      data.totalBoxes.totalExpectedCashFlow += item.expectedCashFlow || 0
      data.totalBoxes.totalContractualPaymentTerms += item.contractualPaymentTerms || 0
      data.totalBoxes.totalActualPaymentTerms += item.actualPaymentTerms || 0
      data.totalBoxes.totalPaymentTermsOpportunity += item.paymentTermsOpportunity || 0
      data.totalBoxes.totalExpectedPaymentTerms += item.expectedPaymentTerms || 0
      data.weightedCalculations.total.totalVolumeWeight += item.volume || 0
      if (!item.volume) return
      if (item.contractualPaymentTerms) {
        data.weightedCalculations.total.totalWeightedContractualPaymentTerms += item.contractualPaymentTermsAndVolume
      }
      if (item.actualPaymentTerms) {
        data.weightedCalculations.total.totalWeightedActualPaymentTerms += item.actualPaymentTermsAndVolume
      }
      if (item.paymentTermsOpportunity) {
        data.weightedCalculations.total.totalWeightedPaymentTermsOpportunity += item.paymentTermsOpportunityAndVolume
      }
      if (item.expectedPaymentTerms) {
        data.weightedCalculations.total.totalWeightedExpectedPaymentTerms += item.expectedPaymentTermsAndVolume
      }
    })
    calculateTotals()
  }

  function calculateSelectedTotals() {
    data.selectedBoxesTotalBigNumber.selectedBoxesTotalSpendsBigNumber = formatData.getNumberWithDecimals(`${data.selectedBoxesTotal.selectedBoxesTotalSpends}`, 0)
    data.selectedBoxesTotalBigNumber.selectedBoxesTotalSuppliersBigNumber = formatData.getNumberWithDecimals(`${data.selectedBoxesTotal.selectedBoxesTotalSuppliers}`, 0)
    data.selectedBoxesTotalBigNumber.selectedBoxesTotalParentsBigNumber = formatData.getNumberWithDecimals(`${data.selectedBoxesTotal.selectedBoxesTotalParents}`, 0)
    data.selectedBoxesTotalBigNumber.selectedBoxesTotalBuyersBigNumber = formatData.getNumberWithDecimals(`${data.selectedBoxesTotal.selectedBoxesTotalBuyers}`, 0)
    data.selectedBoxesTotalBigNumber.selectedBoxesTotalVolumeBigNumber = StringUtils.formatBigNumbers(data.selectedBoxesTotal.selectedBoxesTotalVolume)
    data.selectedBoxesTotalBigNumber.selectedBoxesTotalCashflowBigNumber = StringUtils.formatBigNumbers(data.selectedBoxesTotal.selectedBoxesTotalCashflow)
    data.selectedBoxesTotalBigNumber.selectedBoxesTotalDiscountsBigNumber = StringUtils.formatBigNumbers(data.selectedBoxesTotal.selectedBoxesTotalDiscounts)
    data.selectedBoxesTotalBigNumber.selectedBoxesTotalEconomicProfitBigNumber = StringUtils.formatBigNumbers(data.selectedBoxesTotal.selectedBoxesTotalEconomicProfit)
    data.selectedBoxesTotalBigNumber.selectedBoxesTotalExpectedCashFlowBigNumber = config.showExpectedCashFlowTotal
      ? StringUtils.formatBigNumbers(data.selectedBoxesTotal.selectedBoxesTotalExpectedCashFlow)
      : ''
    data.selectedBoxesTotalBigNumber.selectedBoxesTotalContractualPaymentTermsBigNumber = formatData.getNumberWithDecimals(`${data.selectedBoxesTotal.selectedBoxesTotalContractualPaymentTerms}`, 0)
    data.selectedBoxesTotalBigNumber.selectedBoxesTotalActualPaymentTermsBigNumber = formatData.getNumberWithDecimals(`${data.selectedBoxesTotal.selectedBoxesTotalActualPaymentTerms}`, 0)
    data.selectedBoxesTotalBigNumber.selectedBoxesTotalPaymentTermsOpportunityBigNumber = formatData.getNumberWithDecimals(`${data.selectedBoxesTotal.selectedBoxesTotalPaymentTermsOpportunity}`, 0)
    data.selectedBoxesTotalBigNumber.selectedBoxesTotalExpectedPaymentTermsBigNumber = formatData.getNumberWithDecimals(`${data.selectedBoxesTotal.selectedBoxesTotalExpectedPaymentTerms}`, 0)
  }

  function calculateTotals() {
    const vw = data.weightedCalculations.total.totalVolumeWeight
    data.totalBoxesBigNumber.totalWeightedContractualPaymentTerms = Math.round(vw === 0 ? 0 : data.weightedCalculations.total.totalWeightedContractualPaymentTerms / vw) ?? 0;
    data.totalBoxesBigNumber.totalWeightedActualPaymentTerms = Math.round(vw === 0 ? 0 : data.weightedCalculations.total.totalWeightedActualPaymentTerms / vw) ?? 0;
    data.totalBoxesBigNumber.totalWeightedPaymentTermsOpportunity = Math.round(vw === 0 ? 0 : data.weightedCalculations.total.totalWeightedPaymentTermsOpportunity / vw) ?? 0;
    data.totalBoxesBigNumber.totalWeightedExpectedPaymentTerms = Math.round(vw === 0 ? 0 : data.weightedCalculations.total.totalWeightedExpectedPaymentTerms / vw) ?? 0;
    data.totalBoxesBigNumber.totalSpendsBigNumber = formatData.getNumberWithDecimals(`${data.totalBoxes.totalSpends}`, 0)
    data.totalBoxesBigNumber.totalSuppliersBigNumber = formatData.getNumberWithDecimals(`${data.totalBoxes.totalSuppliers}`, 0)
    data.totalBoxesBigNumber.totalParentsBigNumber = formatData.getNumberWithDecimals(`${data.totalBoxes.totalParents}`, 0)
    data.totalBoxesBigNumber.totalBuyersBigNumber = formatData.getNumberWithDecimals(`${data.totalBoxes.totalBuyers}`, 0)
    data.totalBoxesBigNumber.totalVolumeBigNumber = StringUtils.formatBigNumbers(data.totalBoxes.totalVolume)
    data.totalBoxesBigNumber.totalCashflowBigNumber = StringUtils.formatBigNumbers(data.totalBoxes.totalCashflow)
    data.totalBoxesBigNumber.totalDiscountsBigNumber = StringUtils.formatBigNumbers(data.totalBoxes.totalDiscounts)
    data.totalBoxesBigNumber.totalEconomicProfitBigNumber = StringUtils.formatBigNumbers(data.totalBoxes.totalEconomicProfit)
    data.totalBoxesBigNumber.totalExpectedCashFlowBigNumber = StringUtils.formatBigNumbers(data.totalBoxes.totalExpectedCashFlow)
    data.totalBoxesBigNumber.totalContractualPaymentTermsBigNumber = formatData.getNumberWithDecimals(`${data.totalBoxes.totalContractualPaymentTerms}`, 0)
    data.totalBoxesBigNumber.totalActualPaymentTermsBigNumber = formatData.getNumberWithDecimals(`${data.totalBoxes.totalActualPaymentTerms}`, 0)
    data.totalBoxesBigNumber.totalPaymentTermsOpportunityBigNumber = formatData.getNumberWithDecimals(`${data.totalBoxes.totalPaymentTermsOpportunity}`, 0)
    data.totalBoxesBigNumber.totalExpectedPaymentTermsBigNumber = formatData.getNumberWithDecimals(`${data.totalBoxes.totalExpectedPaymentTerms}`, 0)
  }

  onMounted(() => {
    data.showZeroBoxSection = false
    data.totalBoxesInfoSummary = props.infoSummary
    if (data.totalBoxesInfoSummary.length > 0) {
      const zeroData = Object.values(data.totalBoxesInfoSummary[0])
      zeroData.forEach((element: any) => {
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

  return { data, displayValue }
}
