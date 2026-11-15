/**
 * Named Kendo cell / detail slots on `CalculumGridGraphql`.
 *
 * Slot names stay on the Grid in the facade (Kendo resolves `#slotName` there).
 * This map is documentation only — do not build a dynamic slot renderer from it.
 *
 * Match / cluster / tooltip slots that are already a one-line forward to
 * `TooltipText` or another column SFC stay as those forwards. Do not wrap them.
 *
 * Chrome (not cell slots) — mounted inside Kendo `GridToolbar` on the facade:
 * - `toolbarTabsFilterOptions` body → `GraphqlGridToolbar` (`chrome/`)
 * Column menus already use `ColumnMenuGraphql` / `ColumnMenuActions` /
 * `ColumnMatchActions` (DS-boundary shells) — do not wrap again.
 * Pager: Kendo `pageable` only — no custom chrome markup yet.
 * Meaningful cells already extracted: `TeamNameCell`, `TotalStringCell`.
 */
export const GRAPHQL_GRID_SLOT_MAP = {
  // Column menus
  columnMenuTemplate: "ColumnMenuGraphql",
  columnMenuTemplateActions: "ColumnMenuActions",
  columnMatchTemplateActions: "ColumnMatchActions",

  // Detail / expand
  listSuppliersChildBoxes: "SupplierGridBoxes",
  detailTemplateSupplier: "SupplierGridDetails",
  detailTemplateParent: "ParentGridDetails",
  detailTemplateSupplierAnalyze: "SupplierGridAnalyze",
  listParentsChildBoxes: "ParentGridBoxes",
  detailTemplateParentAnalyze: "ParentGridAnalyze",
  detailTemplateSupplierAnalyzeEdit: "SupplierGridAnalyzeEdit",
  detailTemplateParentAnalyzeEdit: "ParentGridAnalyzeEdit",
  detailPlanSuppliersGraphql: "SupplierGridPlanGraphql",
  detailPlanParentsGridGraphql: "ParentsGridPlanGraphql",

  // Admin / negotiation / plan
  approvedDataChangeColumn: "AdminDataColumn",
  negotiationStatus: "ColumnNegotiationStatus",
  planListSupplierIndustryNameTooltip: "TooltipText",

  // Match list (TooltipText / ConfidenceScoreColumn)
  domainMatch: "TooltipText",
  currencyMatch: "TooltipText",
  originalPaymentTermDescriptionMatch: "TooltipText",
  alpha3CodeMatch: "TooltipText",
  countryMatch: "TooltipText",
  originalZipCodeMatch: "TooltipText",
  originalAddressMatch: "TooltipText",
  cityMatch: "TooltipText",
  originalCityMatch: "TooltipText",
  stateMatch: "TooltipText",
  zipCodeMatch: "TooltipText",
  originalStateMatch: "TooltipText",
  nameMatchListTooltipSticky: "TooltipText",
  aggregatedLinesCountMatch: "TooltipText",
  aggreatedLinesCountMatchFooter: "TooltipText",
  originalIdNumberMatch: "TooltipText",
  confidenceScoreColumnSticky: "ConfidenceScoreColumn",
  nameMatchListTooltip: "TooltipText",
  originalParentCompanyNameMatch: "TooltipText",
  originalSupplierNameMatch: "TooltipText",
  commodityColumn: "TooltipColumn",

  // Cluster (TooltipText)
  clusterSimilarityRateText: "TooltipText",
  clusterSupplierRegion: "TooltipText",
  clusterSupplierCountryCode: "TooltipText",
  clusterBuyerLeverage: "TooltipText",
  clusterBuyerCountryCode: "TooltipText",
  clusterNaicsCode: "TooltipText",
  clusterFirstQuartile: "TooltipText",
  clusterMedian: "TooltipText",
  clusterThirdQuartile: "TooltipText",
  clusterNinety: "TooltipText",
  clusterOccurrences: "TooltipText",
  clusterMin: "TooltipText",
  clusterMax: "TooltipText",
  clusterInfo: "TooltipText",
  clusterAverage: "TooltipText",
  clusterIdPeerGroup: "TooltipText",
  clusterIdSupplierStandard: "TooltipText",
  clusterBuyerRegion: "TooltipText",
  clusterVersion: "TooltipText",
  clusterCompaniesCount: "TooltipText",
  clusterCompanies: "TooltipText",
  clusterSuppliers: "TooltipText",
  clusterParents: "TooltipText",
  clusterSupplierName: "TooltipText",
  clusterParentName: "TooltipText",

  // Tooltip text / original name
  regulatoryTermsColumn: "TooltipText",
  enforcedPromotedColumn: "TooltipText",
  addressTooltip: "TooltipText",
  suppliersReceivedAddressTooltip: "TooltipText",
  suppliersReceivedOriginalCommodityTooltip: "TooltipText",
  suppliersReceivedUltimateParentTooltip: "TooltipText",
  suppliersReceivedNameMatchListTooltip: "TooltipText",
  supplierNameMatchListUltimateParentTooltip: "TooltipText",
  supplierCommodityTooltip: "TooltipText",
  spendCommodityTooltip: "TooltipText",
  spendOriginalNameTooltip: "TooltipText",
  entityOriginalNameTooltip: "TooltipText",
  spendOriginalNameProgramListTooltip: "TooltipText",
  supplierOriginalNameTooltip: "TooltipText",
  defaultTeamNameTooltip: "TooltipText",
  parentOriginalNameTooltip: "TooltipText",
  spendBuyerEntityTooltip: "TooltipText",
  supplierBuyerEntityTooltip: "TooltipText",
  spendTeamTooltip: "TooltipText",
  programListSpendTeamTooltip: "TooltipText",
  planListSpendTeamTooltip: "TooltipText",
  supplierTeamTooltip: "TooltipText",
  parentTeamTooltip: "TooltipText",

  // Financing-data view
  selectedCompanyFinancialDataView: "SelectedEntity",
  selectedCompanyFinancialDataViewName: "TooltipColumn",
  selectedCompanyFinancialDataViewCountry: "TooltipColumn",
  selectedCompanyFinancialDataViewRegion: "TooltipColumn",
  selectedCompanyFinancialDataViewIndustry: "TooltipColumn",
  selectedCompanyFinancialDataViewNaicsCode: "TooltipColumn",

  // Money / percent / totals
  datesInfoTemplate: "DatesColumn",
  moneyTemplate: "MoneyColumn",
  percentColumn: "PercentColumn",
  moneyTemplateRound: "MoneyColumnRound",
  moneyTemplateRound0decimals: "MoneyColumnRound",
  moneyRoundSummaryTemplate: "MoneyColumnRoundSummary",
  moneyRoundSummaryNoneDecimalsTemplate: "MoneyColumnRoundSummary",
  TotalsBycolumnsSum: "TotalsFooterColumn",
  TotalsBycolumnsCount: "TotalsFooterColumn",
  TotalsBycolumnsAvgWeightedCeil: "TotalsFooterColumn",
  TotalsBycolumnsCountTrue: "TotalsFooterColumn",
  weightAvgRoundSummaryOneDecimalsTemplate: "WeightAvgColumnSummaryOneDecimals",
  weightAvgRoundSummaryNoneDecimalsTemplate: "WeightAvgColumnSummaryNoneDecimals",
  textJointColumnSummaryTemplate: "TextJointColumnSummary",
  decimalsTemplate: "NoDecimalsColumn",
  customDataPointNumericTemplate: "CustomDataPointNumericColumn",

  // Admin users
  adminUsername: "AdminUsername",
  adminUserLastAccess: "AdminUserLastAccess",
  adminUserDisabledStatus: "AdminUserEnabledStatus",
  adminUserActions: "AdminUserActions",
  adminUserActionsGlobalManage: "AdminUserActions",

  // Row actions / flags
  excludeInfoTemplate: "ExcludeColumn",
  pilotTemplate: "PilotColumn",
  harmonizationTemplate: "HarmonizationColumn",
  financingTemplate: "FinancingColumn",
  harmofinanTemplate: "HarmoFinanStyle",
  flagTemplate: "FlagColumns",
  showFlags: "ShowFlags",
  flagCompareAddCompanies: "FlagColumns",
  companiesListTemplate: "CompaniesListColumn",
  companyUiGroupNameBadges: "CompanyUiGroupNameColumn",
  HarmonizationFinancingView: "HarmonizationFinancingView",

  // Text / identity
  regulatoryCountrySourceTemplate: "TooltipColumn",
  textTemplate: "TextColumn",
  textTemplateLeftAlign: "TextColumn",
  teamNameColumn: "TeamNameCell",
  totalTemplateString: "TotalStringCell",
  ethnicTemplate: "EthnicColumn",
  womanTemplate: "WomanColumn",
  esgTemplate: "EsgColumn",
  dateTermsTemplate: "DateTermsColumn",
  aliasTemplate: "AliasTextEditableColumn",

  // Entity / company chrome
  supplierSpendsInfoTemplate: "CompanyAbstractInfoColumn",
  supplierSpendsInfoTemplateSticky: "CompanyAbstractInfoColumn",
  buyerSpendsInfoTemplate: "CompanyAbstractInfoColumn",
  buyerSpendsInfoTemplateSticky: "CompanyAbstractInfoColumn",
  buyerInfoTemplate: "CompanyAbstractInfoColumn",
  buyerInfoTemplateSticky: "CompanyAbstractInfoColumn",
  providerInfoTemplate: "CompanyAbstractInfoColumn",
  entityColumnTemplate: "EntityColumn",
  entityColumnTemplateParent: "EntityColumn",
  restrictModalEntitySpend: "EntityColumn",
  restrictModalEntitySupplier: "EntityColumn",
  providerInfoTemplateSticky: "CompanyAbstractInfoColumn",
  supplierInListParentCompanyInfoTemplateSticky: "CompanyAbstractInfoColumn",
  parentCompanyInfoTemplate: "CompanyAbstractInfoColumn",
  parentCompanyInfoTemplateSticky: "CompanyAbstractInfoColumn",
  activeProgramColumn: "ActiveProgramColumn",
  historicalSourceTemplate: "HistoricalSourceColumn",
  programColumn: "ProgramColumn",

  // TooltipColumn variants
  dataChangedValuesResult: "TooltipColumn",
  entityExternalIdText: "TooltipColumn",
  harmonizationLevelText: "TooltipColumn",
  creditRatingSourceText: "TooltipColumn",
  creditRatingText: "TooltipColumn",
  countryCreditRatingText: "TooltipColumn",
  entityStockPerformanceMarketIndexText: "TooltipColumn",
  entityCompanySizeText: "TooltipColumn",
  isSME: "SmeColumn",
  booleanYesNoColumn: "BooleanYesNoColumn",
  supplierCountCell: "TooltipColumn",
  spendCountCell: "TooltipColumn",
  spendAliasCell: "TooltipColumn",
  entityBuyerLeverageLevelText: "TooltipColumn",
  paymentTermsAgreed: "TooltipColumn",
  entitySupplierLeverageLevelText: "TooltipColumn",
  commoditySpendColumn: "TooltipColumn",
  industryColumn: "TooltipColumn",
  userMessage: "TooltipColumn",
  userRoles: "TooltipColumn",
  industryCompareAddCompaniesColumn: "TooltipColumn",
  buyerInfoTooltip: "TooltipColumn",

  // Nine boxes
  nineBoxes: "NineBoxes",
  nineBoxesFinancing: "NineBoxes",
  nineBoxesFinancingSCF: "NineBoxes",
  nineBoxesVcard: "NineBoxes",
  nineBoxesCashFlowImpact: "NineBoxesCashFlowImpact",
  nineBoxesCashFlowImpactSCF: "NineBoxesCashFlowImpact",
  vCardEconomicProfitImpactLabelVcard: "NineBoxesCashFlowImpact",
  scalePotentialScfrevenueColumn: "NineBoxesCashFlowImpact",
  nineBoxesSuccessProbability: "ProbabilityOfSuccessLabel",
  scaleFinancingValueToSupplierColumn: "ProbabilityOfSuccessLabel",
  scaleUsingFinancingColumn: "ProbabilityOfSuccessLabel",

  // VCard / forecast
  vCardBadge: "VCardRelated",
  vCardRebatePercentCell: "VCardRelated",
  vCardAcceptanceTypeCell: "VCardRelated",
  forecastEditValueColumnCell: "ForecastEditValueColumn",
} as const;

export type GraphqlGridSlotName = keyof typeof GRAPHQL_GRID_SLOT_MAP;
