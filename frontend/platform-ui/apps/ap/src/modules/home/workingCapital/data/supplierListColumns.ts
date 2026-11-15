// WI#20545 — Achievement List columns. Two groups, one per file, with the same four
// values side by side (AC-06). No fixed widths so every column fits the screen without
// scrolling sideways (NFR Usability). Leaf columns carry their own column menu: with
// grouped columns the grid does not stamp one, and every column must be filterable (FR-06).

const COLUMN_MENU = 'columnMenuTemplate'

// Payment terms total: weighted by that file's own spend volume (AC-11, BR-05).
const ptColumn = (field: string, title: string, weightField: string) => ({
  field,
  title,
  filter: 'numeric',
  columnMenu: COLUMN_MENU,
  cell: 'decimalsTemplate',
  footerCell: 'weightAvgRoundSummaryNoneDecimalsTemplate',
  footerWeightField: weightField,
  footerClassName: 'text-right',
})

const moneyColumn = (field: string, title: string) => ({
  field,
  title,
  filter: 'numeric',
  columnMenu: COLUMN_MENU,
  cell: 'moneyTemplate',
  footerCell: 'moneyRoundSummaryTemplate',
  footerClassName: 'text-right',
})

type FileSide = 'current' | 'comparison'
type FileNames = { current?: string; comparison?: string }

// The group header names its file: "Current File: <name>".
const fileTitle = (t: (key: string) => string, side: FileSide, fileNames: FileNames) => {
  const label = t(`home.workingCapital.list.columns.${side}File`)
  return fileNames[side] ? `${label}: ${fileNames[side]}` : label
}

export function buildSupplierListColumns(
  t: (key: string, values?: Record<string, unknown>) => string,
  currency: string,
  fileNames: FileNames = {},
) {
  const fileColumns = (side: 'current' | 'comparison') => [
    ptColumn(`${side}Pt`, t('home.workingCapital.list.columns.paymentTerms'), `${side}Volume`),
    moneyColumn(`${side}Volume`, t('home.workingCapital.list.columns.spendVolume', { currency })),
    moneyColumn(`${side}CfOpportunity`, t('home.workingCapital.list.columns.cfOpportunity', { currency })),
    ptColumn(`${side}TargetPt`, t('home.workingCapital.list.columns.targetPt'), `${side}Volume`),
  ]

  return [
    {
      field: 'supplier',
      title: t('home.workingCapital.list.columns.supplier'),
      filter: 'text',
      columnMenu: COLUMN_MENU,
      className: 'text-left',
      footerCell: 'totalTemplateString',
      footerClassName: 'text-left',
    },
    { field: 'country', title: t('home.workingCapital.list.columns.country'), filter: 'text', columnMenu: COLUMN_MENU },
    { field: 'statusLabel', title: t('home.workingCapital.list.columns.status'), filter: 'text', columnMenu: COLUMN_MENU },
    { title: fileTitle(t, 'current', fileNames), children: fileColumns('current') },
    { title: fileTitle(t, 'comparison', fileNames), children: fileColumns('comparison') },
  ]
}

// The Excel file groups its headers like the grid: one row with each file's name over
// its four values, the money headers naming the currency (AC-13).
export function buildSupplierListExcelColumns(
  t: (key: string, values?: Record<string, unknown>) => string,
  currency: string,
  fileNames: FileNames = {},
) {
  const fileGroup = (side: FileSide) => ({
    title: fileTitle(t, side, fileNames),
    children: [
      { field: `${side}Pt`, title: t('home.workingCapital.list.columns.paymentTerms'), width: 120 },
      { field: `${side}Volume`, title: t('home.workingCapital.list.columns.spendVolume', { currency }), width: 160 },
      { field: `${side}CfOpportunity`, title: t('home.workingCapital.list.columns.cfOpportunity', { currency }), width: 180 },
      { field: `${side}TargetPt`, title: t('home.workingCapital.list.columns.targetPt'), width: 120 },
    ],
  })

  return [
    { field: 'supplier', title: t('home.workingCapital.list.columns.supplier'), width: 260 },
    { field: 'country', title: t('home.workingCapital.list.columns.country'), width: 140 },
    { field: 'statusLabel', title: t('home.workingCapital.list.columns.status'), width: 160 },
    fileGroup('current'),
    fileGroup('comparison'),
  ]
}
