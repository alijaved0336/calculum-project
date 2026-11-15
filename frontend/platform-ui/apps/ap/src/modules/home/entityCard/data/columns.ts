import { translate } from '@/utils/translation'
import * as globalColumns from '@ada/design-system/data/globalColumns';

export const columnsFundingCostModal = [
  { field: 'isinCode', title: translate.t('home.entityCard.fundingCost.isinCode'), width: '145px', resizable: false, allowHide: true, columnMenu: false },
  { field: 'currency', title: translate.t('home.entityCard.fundingCost.currency'), width: '80px', resizable: false, allowHide: true, columnMenu: false },
  { field: 'maturityDate', title: translate.t('home.entityCard.fundingCost.maturityDate'), width: '100px', resizable: false, allowHide: true, columnMenu: false },
  { field: 'couponRate', title: translate.t('home.entityCard.fundingCost.couponRate'), width: '100px', resizable: false, allowHide: true, columnMenu: false },
  { field: 'couponRateDescription', title: translate.t('home.entityCard.fundingCost.couponRateDescription'), resizable: false, allowHide: true, cell: 'couponRateDescriptionColumn', columnMenu: false },
  { field: 'stockExchange', title: translate.t('home.entityCard.fundingCost.stockExchange'), resizable: false, allowHide: true, columnMenu: false, cell: 'stockExchangeColumn' },
  { field: 'yield', title: translate.t('home.entityCard.fundingCost.yield'), resizable: false, allowHide: true, columnMenu: false, cell: 'yieldColumnFundingCost' }
]

export const columnsNegotiationTab = [
  { field: 'alias', title: translate.t('home.analyze.table.alias'), width: '200px', resizable: true, allowHide: true, hidden: false, filter: 'text', className: 'text-left', footerCell: 'totalTemplateString', footerClassName: 'text-left' },
  ...globalColumns.negotiationStatus,
  { field: 'harmonizationGroup.name', title: translate.t('home.analyze.table.harmonization'), width: '165px', resizable: false, allowHide: true, hidden: false, cell: 'harmonizationTemplate' },
  { field: 'financingGroup.name', title: translate.t('home.analyze.table.financingGroup'), width: '185px', resizable: false, allowHide: true, hidden: false, cell: 'financingTemplate' },
  { field: 'provider.name', title: translate.t('home.analyze.table.supplierName'), width: '300px', resizable: false, allowHide: true, hidden: false, filter: 'text', cell: 'providerInfoTemplate' },
  { field: 'cashDiscounts', title: translate.t('home.analyze.table.cashDiscount'), width: '150px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, className: 'text-center', cell: 'percentColumn' },
  { field: 'spend_volume', title: translate.t('home.analyze.table.volume'), width: '150px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'moneyTemplate', footerCell: 'moneyRoundSummaryTemplate', footerClassName: 'text-right' },
  { field: 'contractualPaymentTermsWithoutCashDiscounts', title: translate.t('home.analyze.table.withoutDiscount'), width: '150px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'decimalsTemplate', footerCell: 'weightAvgRoundSummaryNoneDecimalsTemplate', footerClassName: 'text-right' },
  { field: 'actualPaymentTerms', title: translate.t('home.analyze.table.actualPaymentTerms'), width: '150px', resizable: true, allowHide: true, hidden: false, filter: 'numeric', cell: 'decimalsTemplate', footerCell: 'weightAvgRoundSummaryNoneDecimalsTemplate', footerClassName: 'text-right' },
  { field: 'modelPaymentTerms', title: translate.t('home.analyze.table.proposedTerms'), width: '150px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'decimalsTemplate', footerCell: 'weightAvgRoundSummaryNoneDecimalsTemplate', footerClassName: 'text-right' },
  { field: 'targetOpportunity', title: translate.t("home.analyze.table.paymentTermsOpportunityTarget"), width: '150px', filter: 'numeric', allowHide: true, hidden: false, resizable: true, className: 'text-right' },
  { field: 'newTermsWithoutCashDiscount', title: translate.t('tableHeaders.negotiatedContractualWithoutCash'), width: '150px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'moneyTemplateRound', footerCell: 'weightAvgRoundSummaryNoneDecimalsTemplate', footerClassName: 'text-right' },
  { field: 'newTermsWithCashDiscount', title: translate.t('tableHeaders.negotiatedContractualWithCash'), width: '150px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'moneyTemplateRound', footerCell: 'weightAvgRoundSummaryNoneDecimalsTemplate', footerClassName: 'text-right' },
  { field: 'newCashDiscounts', title: translate.t('tableHeaders.negotiatedCashDiscount'), width: '150px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'percentColumn', footerCell: 'moneyRoundSummaryTemplate', footerClassName: 'text-right' },
  { field: 'newAgreedDateOfChange', title: translate.t('tableHeaders.agreedDateofChange'), width: '150px', allowHide: true, hidden: false, filter: 'date', resizable: true, className: 'text-right' },
  { field: 'newNextReviewDate', title: translate.t('tableHeaders.nextReviewDate'), width: '150px', allowHide: true, hidden: false, filter: 'date', resizable: true, className: 'text-right' },
  { field: 'dateOfLastTermNegotiation', title: translate.t('tableHeaders.dateOfLastTermNegotiation'), width: '150px', allowHide: true, hidden: false, filter: 'date', resizable: true, className: 'text-right' },
  { field: 'contractualPaymentTermsWithCashDiscounts', title: translate.t('home.analyze.table.withDiscount'), width: '150px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'decimalsTemplate', footerCell: 'weightAvgRoundSummaryNoneDecimalsTemplate', footerClassName: 'text-right' },
  { field: 'modelCashFlow', title: translate.t('home.analyze.table.potentialCashFlow'), width: '150px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, className: 'text-center', cell: 'moneyTemplate', footerCell: 'moneyRoundSummaryTemplate', footerClassName: 'text-right' },
  { field: 'buyer.name', title: translate.t('home.analyze.table.buyerEntity'), width: '250px', allowHide: true, hidden: false, filter: 'text', resizable: true, cell: 'buyerInfoTemplate' },
  { field: 'commodities', title: translate.t('home.analyze.table.commodity'), width: '250px', allowHide: true, hidden: false, filter: 'text', resizable: true, cell:"commodityColumn" },
  { field: 'team', title: translate.t('home.analyze.table.team'), width: '150px', allowHide: true, hidden: true, filter: 'text', resizable: true, cell:"spendTeamTooltip" },
  { field: 'nameProgramActive', title: translate.t('home.analyze.table.activeProgram'), width: '300px', allowHide: true, hidden: false, filter: 'text', resizable: true, cell: 'activeProgramColumn' },
  { field: 'countryName', title: translate.t('global.country'), width: '250px', allowHide: true, hidden: false, filter: 'text', resizable: true, cell: 'flagTemplate' },
  { field: 'commodity', title: translate.t('home.analyze.table.commodity'), width: '250px', allowHide: true, hidden: false, filter: 'text', resizable: true, cell:"commodityColumn" },
  { field: 'currency', title: translate.t('home.analyze.table.currency'), width: '110px', allowHide: true, hidden: true, filter: 'text', resizable: true, className: 'text-center' },
]

export const columnsOfferingTab = [
  { field: 'financingGroup.name', title: translate.t('home.analyze.table.financingGroup'), width: '185px', resizable: false, allowHide: true, hidden: false, cell: 'financingTemplate' },
  { field: 'provider.name', title: translate.t('home.analyze.table.supplierName'), width: '300px', resizable: false, allowHide: true, hidden: false, filter: 'text', cell: 'providerInfoTemplate' },
  { field: 'countryName', title: translate.t('global.country'), width: '250px', allowHide: true, hidden: false, filter: 'text', resizable: true, cell: 'flagTemplate' },
  { field: 'alias', title: translate.t('home.analyze.table.alias'), width: '200px', resizable: true, allowHide: true, hidden: false, filter: 'text', className: 'text-left', footerCell: 'totalTemplateString', footerClassName: 'text-left' },
  { field: 'spend_volume', title: translate.t('home.analyze.table.volume'), width: '150px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'moneyTemplate', footerCell: 'moneyRoundSummaryTemplate', footerClassName: 'text-right' },
  { field: 'contractualPaymentTermsWithoutCashDiscounts', title: translate.t('home.analyze.table.withoutDiscount'), width: '150px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'decimalsTemplate', footerCell: 'weightAvgRoundSummaryNoneDecimalsTemplate', footerClassName: 'text-right' },
  { field: 'actualPaymentTerms', title: translate.t('home.analyze.table.actualPaymentTerms'), width: '150px', resizable: true, allowHide: true, hidden: false, filter: 'numeric', cell: 'decimalsTemplate', footerCell: 'weightAvgRoundSummaryNoneDecimalsTemplate', footerClassName: 'text-right' },
  { field: 'modelPaymentTerms', title: translate.t('home.analyze.table.proposedTerms'), width: '150px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'decimalsTemplate', footerCell: 'weightAvgRoundSummaryNoneDecimalsTemplate', footerClassName: 'text-right' },
  { field: 'cashDiscounts', title: translate.t('home.analyze.table.cashDiscount'), width: '150px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, className: 'text-center', format: '{0:p2}', footerClassName: 'text-right' },
  { field: 'approachBuyerSavings', title: translate.t('home.analyze.table.potentialSavings'), width: '110px', allowHide: true, hidden: true, filter: 'numeric', resizable: true, cell: 'moneyTemplate', footerCell: 'moneyRoundSummaryTemplate', footerClassName: 'text-right' },
  { field: 'approachSupplierGainLossTotal', title: translate.t('home.analyze.table.totalSupplierGainLoss'), width: '110px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'moneyTemplate', footerCell: 'moneyRoundSummaryTemplate', footerClassName: 'text-right' },
  { field: 'approachTotalBuyerGainOrLoss', title: translate.t('home.analyze.table.totalBuyerGainLoss'), width: '110px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'moneyTemplate', footerCell: 'moneyRoundSummaryTemplate', footerClassName: 'text-right' },
  { field: 'buyer.name', title: translate.t('home.analyze.table.buyerEntity'), width: '250px', allowHide: true, hidden: false, filter: 'text', resizable: true, cell: 'buyerInfoTemplate' },
  { field: 'currency', title: translate.t('home.analyze.table.currency'), width: '110px', allowHide: true, hidden: true, filter: 'text', resizable: true, className: 'text-center' },
  { field: 'commodity', title: translate.t('home.analyze.table.commodity'), width: '250px', allowHide: true, hidden: false, filter: 'text', resizable: true, cell:"commodityColumn" },
  { field: 'team', title: translate.t('home.analyze.table.team'), width: '150px', allowHide: true, hidden: true, filter: 'text', resizable: true, cell:"spendTeamTooltip" },
  { field: 'nameProgramActive', title: translate.t('home.analyze.table.activeProgram'), width: '300px', allowHide: true, hidden: false, filter: 'text', resizable: true, cell: 'activeProgramColumn' },
  { field: 'negotiationStatus', title: translate.t('tableHeaders.negotiationStatus'), width: '300px', allowHide: true, hidden: false, filter: 'text', resizable: true, className: 'text-center' },
  { field: 'finalFinancingCosts', title: translate.t('home.analyze.table.supplierFinancingRate'), width: '110px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'percentColumn', footerClassName: 'text-right' },
  { field: 'approachEarlyPaymentTermRate', title: translate.t('home.analyze.table.earlyPaymentRate'), width: '110px', allowHide: true, hidden: false, filter: 'numeric', resizable: true, cell: 'percentColumn', footerClassName: 'text-right' }
]

export const defaultEntityTableColumns = [
 
  { field: 'provider.name', title: translate.t('home.analyze.table.supplierName'), width: '400px', resizable: true, allowHide: true, hidden: false, filter: 'text', cell: 'providerInfoTemplate' },
  { field: 'countryName', title: translate.t('global.country'), width: '250px', allowHide: true, hidden: false, filter: 'text', resizable: true, cell: 'flagTemplate' },
  {
    field: 'alias',
    title: translate.t('home.analyze.table.alias'),
    width: '150px',
    allowHide: true,
    hidden: false,
    filter: 'text',
    resizable: true,
    className: 'text-center',
    footerCell: 'totalTemplateString',
    footerClassName: 'text-left'
  },
  {
    field: 'buyer',
    title: translate.t('home.analyze.table.buyerName'),
    width: '250pxx',
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: 'text',
    cell: 'buyerInfoTemplate',
    // footerCell: 'textJointColumnSummaryTemplate',
    footerClassName: 'text-center'
  }, {
    field: 'commodity',
    title: translate.t('home.analyze.table.commodity'),
    width: '170px',
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: 'text',
    class:"text-left text-ok",
    // footerCell: 'textJointColumnSummaryTemplate',
    footerClassName: 'text-center'
  }, {
    field: 'currency_code',
    title: translate.t('home.analyze.table.currency'),
    width: '170px',
    allowHide: true,
    hidden: false,
    filter: 'text',
    className: 'text-center',
    resizable: true,
    // footerCell: 'textJointColumnSummaryTemplate',
    footerClassName: 'text-center'
  }, {
    field: 'spend_volume',
    title: translate.t('home.analyze.table.volume'),
    width: '150px',
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    resizable: true,
    className: 'text-right',
    cell: 'moneyTemplate',
    footerCell: 'moneyRoundSummaryTemplate',
    footerClassName: 'text-right'
  }, {
    field: 'actual_payment_terms',
    title: translate.t('home.analyze.table.actualPaymentTerms'),
    width: '150px',
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    className: 'text-right',
    cell: 'decimalsTemplate',
    footerCell: 'weightAvgRoundSummaryNoneDecimalsTemplate',
    footerClassName: 'text-right'
  }, 
  { field: 'targetOpportunity', title: translate.t("home.analyze.table.paymentTermsOpportunityTarget"), width: '150px', filter: 'numeric', allowHide: true, hidden: false, resizable: true, className: 'text-right' },
  {
    field: 'model_payment_terms',
    title: translate.t('home.analyze.table.paymentTermsOpportunity'),
    width: '150px',
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    className: 'text-right',
    cell: 'decimalsTemplate',
    footerCell: 'weightAvgRoundSummaryNoneDecimalsTemplate',
    footerClassName: 'text-right'
  }, {
    field: 'model_cash_flow',
    title: translate.t('home.analyze.table.potentialCashFlow'),
    width: '150px',
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    className: 'text-right',
    cell: 'moneyTemplate',
    footerCell: 'moneyRoundSummaryTemplate',
    footerClassName: 'text-right'
  }, {
    field: 'team',
    title: translate.t('home.analyze.table.team'),
    width: '150px',
    allowHide: true,
    hidden: false,
    filter: 'text',
    resizable: false,
    cell: "spendTeamTooltip"
  },
  { field: 'nameProgramActive', title: translate.t('home.analyze.table.activeProgram'), width: '300px', allowHide: true, hidden: false, filter: 'text', resizable: true, cell: 'activeProgramColumn' }
]

/** ListHistorical (payment terms history table) columns */
export const columnsListHistorical = [
  { field: 'contractualPayment', title: translate.t('home.entityCard.listHistorical.contractualPayment'), width: '120px', resizable: true, hidden: false },
  { field: 'avgDaysPaid', title: translate.t('home.entityCard.details.averageActualTerms'), width: '110px', resizable: true, hidden: false },
  { field: 'contractualWithDiscount', title: translate.t('home.entityCard.listHistorical.contractualWithDiscount'), width: '180px', resizable: true, hidden: false },
  { field: 'discount', title: translate.t('home.entityCard.details.discount'), width: '100px', resizable: true, hidden: false },
  { field: 'description', title: translate.t('home.entityCard.listHistorical.description'), width: '140px', resizable: true, hidden: false },
  { field: 'dateOfAgreement', title: translate.t('home.entityCard.listHistorical.dateOfAgreement'), width: '130px', resizable: true, hidden: false },
  { field: 'effectiveDate', title: translate.t('home.entityCard.results.effectiveDate'), width: '120px', resizable: true, hidden: false },
  { field: 'source', title: translate.t('home.entityCard.listHistorical.source'), width: '120px', resizable: true, cell: 'historicalSourceTemplate', hidden: false },
  {
    field: 'ptStatus',
    title: translate.t('home.entityCard.listHistorical.ptStatus'),
    width: '100px',
    resizable: true,
    headerClassName: 'historical-grid-header-blue',
    cell: 'textTemplate',
    hidden: false
  },
  {
    field: 'recentlyAgreed',
    title: translate.t('home.entityCard.listHistorical.recentlyAgreed'),
    width: '120px',
    resizable: true,
    headerClassName: 'historical-grid-header-blue',
    hidden: false
  },
  { field: 'spendVolume', title: translate.t('home.analyze.table.volume'), width: '120px', resizable: true, cell: 'moneyTemplate', hidden: false },
  { field: 'achievedCashFlow', title: translate.t('home.entityCard.listHistorical.achievedCashFlow'), width: '140px', resizable: true, cell: 'moneyTemplate', hidden: false }
]
