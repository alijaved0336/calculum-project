import { translate } from '../../../../utils/translation'

// Modal Full Harmonization Groups List
export const modalFullHarmGListGridColumns = [
  { field: 'pillLabel', title: translate.t('global.harmonizationGroups'), height: '100px', width: 'auto', resizable: true, allowHide: false, hidden: false, filter: 'text', cell: 'rainbowPills' },
  { field: 'paymentTermsWithoutCashDiscountDays', title: translate.t('global.paymentTermsWithoutCashDiscountD'), width: 'auto', resizable: true, allowHide: false, hidden: false, filter: 'text', className: 'text-right', cell: '' },
]

// Modal Full Financing Groups List
export const modalFullFinancingGListGridColumns = [
  { field: 'pillLabel', title: translate.t('global.financingGroup'), height: '100px', width: 'auto', resizable: true, allowHide: false, hidden: false, filter: 'text', cell: 'rainbowPills' },
  { field: 'name', title: translate.t('global.name'), width: 'auto', resizable: true, allowHide: false, hidden: false, filter: 'text', className: 'text-left', cell: '' },
  { field: 'auto', title: translate.t('home.analyze.table.auto'), width: 'auto', resizable: true, allowHide: false, hidden: false, filter: 'text', className: 'text-left', cell: '' },
  { field: 'baseRate', title: translate.t('global.baseRatePercentage'), width: 'auto', resizable: true, allowHide: false, hidden: false, filter: 'text', className: 'text-right', cell: '' },
  { field: 'fundingSpread', title: translate.t('global.fundingSpreadPercentage'), width: 'auto', resizable: true, allowHide: false, hidden: false, filter: 'text', className: 'text-right', cell: '' },
]