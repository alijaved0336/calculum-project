import { translate } from '../../../../utils/translation'

const optionsForCharts = [
  {
    title: translate.t('home.categorize.other.avgPaymentTermsperBuyingEntity'),
    value: 'averagePaymentTermsPerBuyingEntity',
    chartType: 'bar',
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.avgPaymentTermsperProcurementTeam'),
    value: 'averagePaymentTermsPerProcurementTeam',
    chartType: 'bar',
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.avgPaymentTermsperCountry'),
    value: 'averagePaymentTermsPerCountry',
    chartType: 'column',
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.avgPaymentTermsperRegion'),
    value: 'averagePaymentTermsPerRegion',
    chartType: 'bar',
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.avgPaymentTermsperIndustry'),
    value: 'averagePaymentTermsPerIndustry',
    chartType: 'bar',
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.avgPaymentTermsperCommodity'),
    value: 'averagePaymentTermsPerCommodity',
    chartType: 'bar',
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.avgPaymentTermsperSupplierCompanySize'),
    value: 'averagePaymentTermsPerSupplierCompanySize',
    chartType: 'bar',
    module: 'categorize'
  },
  // {
  //   title: translate.t('home.categorize.other.avgPaymentTermsperNegotiationComplexity'),
  //   value: 'averagePaymentTermsPerNegotiationComplexity',
  //   chartType: 'bar',
  //   module: 'categorize'
  // },
  {
    title: translate.t('home.categorize.other.avgPaymentTermsperBuyerLeverage'),
    value: 'averagePaymentTermsPerMateriality',
    chartType: 'bar',
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.avgPaymentTermsperCreditScore'),
    value: 'averagePaymentTermsPerCreditScore',
    chartType: 'bar',
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendConcentrationperBuyingEntity'),
    value: 'spendConcentrationPerBuyingEntity',
    chartType: 'pie',
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendperBuyingEntity'),
    value: 'spendPerBuyingEntity',
    chartType: 'bar',
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendConcentrationperProcurementTeam'),
    value: 'spendConcentrationPerProcurementTeam',
    chartType: 'pie',
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendperProcurementTeam'),
    value: 'spendPerProcurementTeam',
    chartType: 'bar',
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendConcentrationperCountry'),
    value: 'spendConcentrationPerCountry',
    chartType: 'pie',
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendperCountry'), 
    value: 'spendPerCountry', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendConcentrationperRegion'), 
    value: 'spendConcentrationPerRegion', 
    chartType: 'pie', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendperRegion'), 
    value: 'spendPerRegion', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendConcentrationperIndustry'), 
    value: 'spendConcentrationPerIndustry', 
    chartType: 'pie', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendperIndustry'), 
    value: 'spendPerIndustry', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendConcentrationperCommodity'), 
    value: 'spendConcentrationPerCommodity', 
    chartType: 'pie', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendperCommodity'), 
    value: 'spendPerCommodity', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendConcentrationperCreditScore'), 
    value: 'spendConcentrationPerCreditScore', 
    chartType: 'pie', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendperCreditScore'), 
    value: 'spendPerCreditScore', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendConcentrationperBuyerLeverage'), 
    value: 'spendConcentrationPerMateriality', 
    chartType: 'pie', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.spendperBuyerLeverage'), 
    value: 'spendPerMateriality', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.numberofSuppliersperCountry'), 
    value: 'numbersOfSuppliersPerCountry', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.numberofSuppliersperRegion'), 
    value: 'numbersOfSuppliersPerRegion', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.numberofSuppliersperBuyingEntity'), 
    value: 'numbersOfSuppliersPerBuyingEntity', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.numberofSuppliersperProcurementTeam'), 
    value: 'numbersOfSuppliersPerProcurementTeam', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.numberofSpendsperProcurementTeam'), 
    value: 'numbersOfSpendsPerProcurementTeam', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.numberofSuppliersperIndustry'), 
    value: 'numbersOfSuppliersPerIndustry', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.numberofSuppliersperCommodity'), 
    value: 'numbersOfSuppliersPerCommodity', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.numberofSuppliersperCreditScore'), 
    value: 'numbersOfSuppliersPerCreditScore', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.numberofSuppliersperBuyerLeverage'), 
    value: 'numbersOfSuppliersPerMateriality', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.outstandingperCountry'), 
    value: 'outstandingPerCountry', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.outstandingperRegion'), 
    value: 'outstandingPerRegion', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.outstandingperIndustry'), 
    value: 'outstandingPerIndustry', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.outstandingperCommodity'), 
    value: 'outstandingPerCommodity', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.outstandingperCreditScore'), 
    value: 'outstandingPerCreditScore', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.outstandingperBuyerLeverage'), 
    value: 'outstandingPerMateriality', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.outstandingperBuyingEntity'), 
    value: 'outstandingPerBuyingEntity', 
    chartType: 'bar', 
    module: 'categorize'
  },
  {
    title: translate.t('home.categorize.other.outstandingperProcurementTeam'), 
    value: 'outstandingPerProcurementTeam', 
    chartType: 'bar', 
    module: 'categorize'
  }
]

export default optionsForCharts