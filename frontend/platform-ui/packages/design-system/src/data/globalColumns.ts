import { translate } from "../utils/translate";

/** Generic columns */

export const contactAttempts = [
  {
    className: "text-center",
    field: "contactAttempts",
    title: translate.t('global.contactAttempts'),
    width: "150px",
    resizable: true,
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text"
  }
];

export const contactStatus = [
  {
    field: "contactStatus",
    title: translate.t('global.contactStatus'),
    width: "130px",
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text"
  }
];

export const forecastValue = [
  {
    field: "forecastValue",
    title: translate.t('global.spendVolumeChange'),
    width: "180px",
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    resizable: true,
    cell: "forecastEditValueColumnCell",
    footerCell: "TotalsBycolumnsSum"
  }
]

export const forecastVolume = [
  {
    field: "forecastVolume",
    title: translate.t('global.metricCategories.forecastVolume'),
    width: "200px",
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    resizable: true,
    cell: "moneyTemplate",
    footerCell: "TotalsBycolumnsSum"
  }
]


export const forecastVolumeF = [
  {
    field: "forecastVolume",
    title: translate.t('global.metricCategories.forecastVolume'),
    width: "200px",
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    resizable: true,
    cell: "moneyTemplate",
    footerCell: "TotalsBycolumnsSum"
  }
]

export const countryName = [
  {
    field: "countryName",
    title: translate.t("global.supplierCountry"),
    width: "350px",
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    resizable: true
  }
];

export const emailStatus = [
  {
    field: "emailStatus",
    title: translate.t('global.emailStatus'),
    width: "150px",
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "text"
  }
];

export const email = [
  {
    field: "email",
    title: translate.t('global.emailAddress'),
    width: "200px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text"
  }
];

export const emailMetrics = [
  {
    field: "emailMetrics",
    title: translate.t('global.emailMetrics'),
    width: "200px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text"
  }
];

export const entityOriginalName = [
  {
    field: "entityOriginalName",
    title: translate.t("home.analyze.table.originalName"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    cell: "entityOriginalNameTooltip"
  }
];

export const entityName = [
  {
    field: "entityName",
    title: translate.t("home.analyze.table.supplierName"),
    width: "300px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    cell: "entityColumnTemplate"
  }
];

export const eventType = [
  {
    field: "eventType",
    title: translate.t('global.eventType'),
    width: "200px",
    resizable: true,
    allowHide: false,
    sortable: true,
    hidden: false,
    filter: "text"
  }
];

export const financings = [
  {
    field: "financings",
    title: translate.t("home.analyze.table.earlyPaymentGroup"),
    width: "185px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    cell: "HarmonizationFinancingView"
  }
];

/** This is the new column */
export const earlyPaymentRateColumn = [
  {
    field: "earlyPaymentTermRate",
    title: translate.t("home.analyze.table.earlyPaymentRateColumn"),
    width: "185px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    cell: "percentColumn"
  }
];

export const harmonizations = [
  {
    field: "harmonizationLevels",
    title: translate.t("home.analyze.table.harmonization"),
    width: "165px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    className: "text-center text-capitalize",
    cell: "harmonizationLevelText"
  }
];

export const phaseName = [
  {
    field: "phaseName",
    title: translate.t('global.phase'),
    width: "120px",
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false
  }
];

export const planName = [
  {
    field: "planName",
    title: translate.t("home.plan.plan"),
    width: "200px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true
  }
];

export const recipientEmail = [
  {
    field: "recipientEmail",
    title: translate.t('global.recipientEmail'),
    width: "300px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text"
  }
];

export const recipientName = [
  {
    field: "recipientName",
    title: translate.t('global.recipientName'),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text"
  }
];

export const resolutionType = [
  {
    field: "resolutionType",
    title: translate.t('global.resolutionType'),
    width: "200px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text"
  }
];

export const sentDate = [
  {
    cell: "datesInfoTemplate",
    field: "sentDate",
    title: translate.t('global.sentDate'),
    width: "150px",
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "text"
  }
];

export const spendAlias = [
  {
    field: "spendAlias",
    title: translate.t('home.analyze.table.spendAlias'),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];


export const entityDomain = [
  {
    field: "entityDomain",
    title: translate.t('global.url'),
    width: "350px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }

]

export const spendFileName = [
  {
    field: "spendFileName",
    title: translate.t('global.spendFileNameColumn'),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }

]

export const spendFileVersion = [
  {
    field: "spendFileVersion",
    title: translate.t('global.spendFileVersionColumn'),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "numeric",
    className: "text-center",
    cell: "textTemplate"
  }

]

export const entityRevenue = [
  {
    field: "entityRevenue",
    title: translate.t('global.supplierRevenue'),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "moneyTemplate"
  }

]







export const companyTenant = [
  {
    field: "companyTenant",
    title: translate.t('global.companyTenant'),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }

]









export const spendLines = [
  {
    allowHide: true,
    field: "spendLines",
    filter: "text",
    hidden: false,
    resizable: true,
    sortable: true,
    filterable: false,
    title: translate.t('global.spendLine'),
    width: "200px"
  }
];

export const spendCounts = [
  {
    field: "spendCounts",
    title: translate.t("home.analyze.table.spendsAmount"),
    width: "155px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "numeric",
    className: "text-center",
    cell: "spendCountCell",
    footerCell: "TotalsBycolumnsSum"
  }
];

export const supplierCounts = [
  {
    field: "supplierCounts",
    title: translate.t("home.analyze.table.suppliersAmount"),
    width: "120px",
    resizable: true,
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    className: "text-center",
    cell: "supplierCountCell",
    footerCell: "TotalsBycolumnsSum"
  }
];

export const supplierName = [
  {
    field: "supplierName",
    title: translate.t('home.analyze.table.supplierName'),
    width: "250px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    cell: "textTemplateLeftAlign"
  }
];

export const buyerName = [
  {
    field: "buyerName",
    title: translate.t("home.analyze.table.buyerEntity"),
    width: "250px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "entityColumnTemplate"
  }
];

export const teamName = [
  {
    field: "teamName",
    title: translate.t("home.analyze.table.team"),
    width: "150px",
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    resizable: true,
    className: "text-center",
    cell: "teamNameColumn"
  }
];

export const entityExternalId = [
  {
    field: "entityExternalId",
    title: translate.t("home.analyze.table.idNumber"),
    width: "120px",
    resizable: true,
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    className: "text-center",
    cell: "entityExternalIdText"
  }
];

export const entityOriginalIdNumber = [
  {
    field: "entityOriginalIdNumber",
    title: translate.t("home.analyze.table.spendFileInternalID"),
    width: "200px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center"
  }
];

export const identificationType = [
  {
    field: "identificationType",
    title: translate.t("home.analyze.table.typeOfID"),
    width: "200px",
    resizable: true,
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    className: "text-center"
  }
];

export const parentName = [
  {
    field: "parentName",
    title: translate.t("home.analyze.table.parentCompanyName"),
    width: "300px",
    resizable: true,
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    cell: "entityColumnTemplateParent"
  }
];

export const entityCompanySize = [
  {
    field: "entityCompanySize",
    title: translate.t("home.analyze.table.companySize"),
    width: "200px",
    resizable: true,
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    className: "text-center",
    cell: "entityCompanySizeText"
  }
];
export const isSME = [
  {
    field: "isSME",
    title: translate.t("home.analyze.table.isSME"),
    width: "200px",
    resizable: true,
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "boolean",
    className: "text-center",
    cell: "isSME",
    footerCell: "TotalsBycolumnsCountTrue"
  }
];
export const smeSource = [
  {
    field: "smeSource",
    title: translate.t("home.analyze.table.smeSource"),
    width: "200px",
    resizable: true,
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];

export const entityBuyerLeverageLevel = [
  {
    field: "entityBuyerLeverageLevel",
    title: translate.t("home.analyze.table.buyerLeverage"),
    width: "200px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "entityBuyerLeverageLevelText"
  }
];

export const entitySupplierLeverageLevel = [
  {
    field: "entitySupplierLeverageLevel",
    title: translate.t("home.analyze.table.supplierLeverage"),
    width: "200px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "entitySupplierLeverageLevelText"
  }
];

export const currencyCode = [
  {
    field: "currencyCode",
    title: translate.t("home.analyze.table.currency"),
    width: "110px",
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    resizable: true,
    className: "text-center"
  }
];

export const earlyPaymentRate = [
  {
    field: "financings",
    title: translate.t("home.analyze.table.earlyPaymentRateColumn"),
    width: "110px",
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    resizable: true,
    className: "text-center"
  }
];

export const costOfDebt = [
  {
    field: "costOfDebt",
    title: translate.t("home.analyze.table.costOfDebt"),
    width: "110px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-right",
    cell: "percentColumn"
  }
];

export const costOfDebtBaseRate = [
  {
    field: "baseRate",
    title: translate.t("home.analyze.table.costOfDebtBaseRate"),
    width: "110px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-right",
    cell: "percentColumn"
  }
];

export const volume = [
  {
    field: "volume",
    title: translate.t("home.analyze.table.volume"),
    width: "180px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "moneyTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
];



export const outstanding = [
  {
    field: "outstanding",
    title: translate.t("home.analyze.table.outstanding"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "moneyTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
];

export const periodInMonths = [
  {
    field: "periodInMonths",
    title: translate.t("home.analyze.table.periodInMonths"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    className: "text-center"
  }
];

export const startDate = [
  {
    field: "startDate",
    title: translate.t("home.analyze.table.startDate"),
    type: "date",
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "date",
    resizable: true,
    className: "text-right",
    cell: "datesInfoTemplate"
  }
];

export const endDate = [
  {
    field: "endDate",
    title: translate.t("home.analyze.table.endDate"),
    width: "150px",
    allowHide: true,
    hidden: true,
    filter: "date",
    sortable: true,
    resizable: true,
    className: "text-right",
    cell: "datesInfoTemplate"
  }
];

export const commodity = [
  {
    field: "commodity",
    title: translate.t("home.analyze.table.commodity"),
    width: "250px",
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const contractualPaymentTermsWithoutCashDiscounts = [
  {
    field: "contractualPaymentTermsWithoutCashDiscounts",
    title: translate.t("home.analyze.table.withoutDiscount"),
    width: "170px",
    allowHide: true,
    sortable: true,
    hidden: false,
    type: "number",
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate",
    footerCell: "TotalsBycolumnsAvgWeightedCeil"
  }
];

export const actualPaymentTerms = [
  {
    field: "actualPaymentTerms",
    title: translate.t("home.analyze.table.actualPaymentTerms"),
    width: "170px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "numeric",
    cell: "decimalsTemplate",
    footerCell: "TotalsBycolumnsAvgWeightedCeil"
  }
];

export const contractualPaymentTermsWithCashDiscounts = [
  {
    field: "contractualPaymentTermsWithCashDiscounts",
    title: translate.t("home.analyze.table.withDiscount"),
    width: "170px",
    allowHide: true,
    sortable: true,
    hidden: true,
    type: "number",
    filter: "numeric",
    resizable: true,
    className: "text-center",
    cell: "decimalsTemplate",
    footerCell: "TotalsBycolumnsAvgWeightedCeil"
  }
];

export const cashDiscounts = [
  {
    field: "cashDiscounts",
    title: translate.t("home.analyze.table.cashDiscount"),
    width: "170px",
    allowHide: true,
    hidden: true,
    filter: "numeric",
    sortable: true,
    resizable: true,
    className: "text-center",
    cell: "percentColumn"
  }
];

export const capturedCashDiscount = [
  {
    field: "capturedCashDiscount",
    title: translate.t("home.analyze.table.capturedCashDiscount"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    className: "text-center",
    cell: "moneyTemplateRound",
    footerCell: "TotalsBycolumnsSum",
  }
];

/**
 * SCF (Supply Chain Finance) related
 */

export const onSCF = [
  {
    field: "onSCF",
    title: translate.t("home.analyze.table.usingSCF"),
    width: "100px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "boolean",
    resizable: true,
    className: "text-center",
    cell: "booleanYesNoColumn"
  }
];

export const scfAccepted = [
  {
    field: "scfAccepted",
    title: translate.t("global.scfAccepted"),
    width: "120px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "boolean",
    resizable: true,
    className: "text-center",
    cell: "booleanYesNoColumn",
    aggregates: ["count"],
    footerCell: "customAggregateFooterCell",
    groupFooterCell: "customAggregateGroupFooterCell",
  }
];

/**
 * vCard related
 */

export const vCardGroup = [
  {
    field: "vCardGroupName",
    title: translate.t("global.vCard.headerColumnTitle.vCardGroup"),
    width: "300px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-center",
    cell: "vCardBadge"
  }
]

export const vCardIsApplied = [
  {
    field: "isVCardApplied",
    title: translate.t("home.analyze.table.isVCardApplied"),
    width: "150px",
    sortable: true,
    allowHide: true,
    hidden: true,
    filter: "text",
    resizable: true,
    className: "text-center",
    footerCell: "TotalsBycolumnsCountTrue"
  }
];

export const vCardRebatePercent = [
  {
    field: "vCardGroupRebate",
    title: translate.t("global.vCard.headerColumnTitle.vCardRebatePercent"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    className: "text-center",
    cell: "vCardRebatePercentCell"
  }
]

export const vCardAcceptanceType = [
  {
    field: "vCardAcceptanceType",
    title: translate.t("global.vCard.headerColumnTitle.vCardAcceptanceType"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-center",
    cell: "vCardAcceptanceTypeCell"
  }
]

export const vCardCashFlowGain = [
  {
    field: "vCardCashFlowGainFull",
    title: translate.t("global.vCard.headerColumnTitle.vCardCashFlowGain"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    className: "text-center",
    cell: "moneyTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
]

export const vCardCashFlowEP = [
  {
    field: "vCardCashFlowEpFull",
    title: translate.t("global.vCard.headerColumnTitle.vCardCashFlowEP"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    className: "text-center",
    cell: "moneyTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
]

export const vCardRebate = [
  {
    field: "vCardRebateFull",
    title: translate.t("global.vCard.headerColumnTitle.vCardRebate"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    className: "text-center",
    cell: "moneyTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
]

export const vCardRebateEP = [
  {
    field: "vCardRebateEpFull",
    title: translate.t("global.vCard.headerColumnTitle.vCardRebateEP"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    className: "text-center",
    cell: "moneyTemplate",
    footerCell: "TotalsBycolumnsSum"
  }
]

export const vCardTotalEconomicProfitEP = [
  {
    field: "vCardTotalEconomicProfitFull",
    title: translate.t("global.vCard.headerColumnTitle.vCardTotalEconomicProfitEP"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    className: "text-center",
    cell: "moneyTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
]



/**
 * End of vCard Related
 */

export const averageDaysToApproveInvoice = [
  {
    field: "averageDaysToApproveInvoice",
    title: translate.t("home.analyze.table.avgInvoiceApprov"),
    width: "170px",
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate",
    footerCell: "TotalsBycolumnsAvgWeightedCeil"
  }
];

export const buyerCountry = [
  {
    field: "buyerCountry",
    title: translate.t("global.buyerCountry"),
    width: "250px",
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    resizable: true,
    cell: "showFlags"
  }
];
export const buyerCountrySupplier = [
  {
    field: "buyerCountry",
    title: translate.t("global.buyerCountrySupplier"),
    width: "250px",
    allowHide: true,
    hidden: true,
    filter: "text",
    sortable: true,
    resizable: true,
    cell: "showFlags"
  }
];

export const buyerRegion = [
  {
    field: "buyerRegion",
    title: translate.t("global.buyerRegion"),
    width: "150px",
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    resizable: true,
    cell: "textTemplate"
  }
];
export const buyerRegionSupplier = [
  {
    field: "buyerRegion",
    title: translate.t("global.buyerRegionSupplier"),
    width: "150px",
    allowHide: true,
    hidden: true,
    filter: "text",
    sortable: true,
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];
export const buyerRegionContinent = [
  {
    field: "buyerContinent",
    title: translate.t("global.buyerContinent"),
    width: "150px",
    allowHide: true,
    hidden: true,
    filter: "text",
    sortable: true,
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const entityCountryName = [
  {
    field: "entityCountryName",
    title: translate.t("global.supplierCountry"),
    width: "250px",
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    resizable: true,
    cell: "showFlags"
  }
];

export const entityRegion = [
  {
    field: "entityRegion",
    title: translate.t("home.analyze.table.regionSupplier"),
    width: "250px",
    allowHide: true,
    hidden: true,
    filter: "text",
    sortable: true,
    resizable: true,
    cell: "textTemplate"
  }
];

export const entityContinent = [
  {
    field: "entityContinent",
    title: translate.t("home.analyze.table.continentSupplier"),
    width: "120px",
    allowHide: true,
    hidden: true,
    filter: "text",
    sortable: true,
    resizable: true,
    cell: "textTemplate"
  }
];

export const entityIndustryName = [
  {
    field: "entityIndustryName",
    title: translate.t("home.analyze.table.industry"),
    width: "250px",
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];


export const entityIndustryNameNaics2 = [
  {
    field: "entityIndustryNameNaics2",
    title: translate.t("home.analyze.table.industry"),
    width: "250px",
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const entityIndustryNameNaics3 = [
  {
    field: "entityIndustryNameNaics3",
    title: translate.t("home.analyze.table.industry"),
    width: "250px",
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const creditScoreSource = [
  {
    field: "creditScoreSource",
    title: translate.t("home.analyze.table.creditRatingEstimated"),
    width: "200px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center grid-capitalize-text",
    cell: "creditRatingSourceText"
  }
];

export const countryCreditRating = [
  {
    field: "countryCreditRating",
    title: translate.t("home.analyze.table.countryRating"),
    width: "200px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "countryCreditRatingText"
  }
];

export const entityStockPerformanceMarketIndex = [
  {
    field: "entityStockPerformanceMarketIndex",
    title: translate.t("home.analyze.table.creditRating"),
    width: "200px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "entityStockPerformanceMarketIndexText"
  }
];

export const entityAfterTaxWacc = [
  {
    field: "entityAfterTaxWacc",
    title: translate.t("home.analyze.table.entityAfterTaxWacc"),
    width: "110px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "percentColumn"
  }
];

export const entityPreTaxWacc = [
  {
    field: "entityPreTaxWacc",
    title: translate.t("home.analyze.table.entityPreTaxWacc"),
    width: "110px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "percentColumn"
  }
];

export const buyerWacc = [
  {
    field: "buyerWacc",
    title: translate.t("home.analyze.table.buyerWacc"),
    width: "110px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "percentColumn"
  }
];

export const paymentTermsOpportunity = [
  {
    // AB#19950: one column for Opportunity and Target. modelPaymentTerms is the backend's
    // coalesce(spend.target_payment_terms, config.model_payment_terms) - the target when the
    // spend file carries one, the model's proposal otherwise.
    field: "modelPaymentTerms",
    title: translate.t("home.analyze.table.paymentTermsOpportunity"),
    width: "170px",
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const modelPaymentTerms = [
  {
    // AB#19878: the Target column read modelPaymentTerms, which is the Opportunity value.
    field: "targetPaymentTerms",
    title: translate.t("home.analyze.table.paymentTermsOpportunityTarget"),
    width: "170px",
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const cashFlowContributionOnSelection = [
  {
    field: "cashFlowContribution",
    title: translate.t("home.analyze.table.cashFlowContributionOnSelection"),
    width: "150px",
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    className: "text-right",
    cell: "moneyTemplate",
    sortable: false,
    filterable: false,
    footerCell: "TotalsBycolumnsSum",
  }
];

export const modelCashFlow = [
  {
    // AB#19950: the Opportunity/Target cash flow. modelCashFlow is computed from the same
    // target-or-model terms (CashFlowTargetProgramManager), gated on the program's enabled
    // spends - unlike targetCashFlow, which sums the ungated column.
    field: "modelCashFlow",
    title: translate.t("home.analyze.table.potentialCashFlow"),
    width: "150px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "numeric",
    resizable: true,
    className: "text-right",
    cell: "moneyTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
];
export const modelCashFlowTarget = [
  {
    field: "targetCashFlow",
    title: translate.t("home.analyze.table.potentialCashFlowTarget"),
    width: "150px",
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "numeric",
    resizable: true,
    className: "text-right",
    cell: "moneyTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
];

export const negotiationStatus = [
  {
    field: "negotiationStatus",
    cell: "negotiationStatus",
    title: translate.t("tableHeaders.status"),
    width: "200px",
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    resizable: true,
    className: "text-center"
  }
];

export const entitySupplierParentGroupMaxStrategy = [
  {
    field: "entityParentSupplierMaxStrategy",
    title: translate.t("home.analyze.table.parentSupplierMaxStrategy"),
    width: "150px",
    sortable: true,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "numeric",
    cell: "decimalsTemplate"
  }
];

export const entityIndustryRegionStandardStrategy = [
  {
    field: "entityIndustryRegionStandardStrategy",
    title: translate.t("home.analyze.table.industryRegionStandardStrategy"),
    width: "150px",
    sortable: true,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "numeric",
    cell: "decimalsTemplate"
  }
];

export const entitySupplierStandardStrategy = [
  {
    field: "entitySupplierStandardStrategy",
    title: translate.t("home.analyze.table.supplierStandardStrategy"),
    width: "150px",
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "numeric",
    cell: "decimalsTemplate"
  }
];

export const entityPeerGroupAverageStrategy = [
  {
    field: "entityPeerGroupAverageStrategy",
    title: translate.t("home.analyze.table.peerGroupAvgStrategy"),
    width: "150px",
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "numeric",
    cell: "decimalsTemplate"
  }
];

export const entitySupplierStandard2Strategy = [
  {
    field: "entitySupplierStandard2Strategy",
    title: translate.t("home.analyze.table.supplierStandard2Strategy"),
    width: "150px",
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "numeric",
    cell: "decimalsTemplate"
  }
];

export const entityPeerGroupStandard2Strategy = [
  {
    field: "entityPeerGroupStandard2Strategy",
    title: translate.t("home.analyze.table.peerGroupStandard2Strategy"),
    width: "150px",
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "numeric",
    cell: "decimalsTemplate"
  }
];

export const financingStrategy = [
  {
    field: "financingStrategy",
    title: translate.t("home.analyze.table.financingStrategy"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "numeric",
    cell: "decimalsTemplate"
  }
];

export const discountConversionStrategy = [
  {
    field: "discountConversionStrategy",
    title: translate.t("home.analyze.table.cashDiscountConversionStrategy"),
    width: "150px",
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "numeric",
    cell: "decimalsTemplate"
  }
];

export const buyerStandardStrategy = [
  {
    field: "buyerStandardStrategy",
    title: translate.t("home.analyze.table.buyerStandardStrategy"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "numeric",
    cell: "decimalsTemplate"
  }
];

export const entityRegulatoryTermsStrategy = [
  {
    field: "entityRegulatoryTermsStrategy",
    title: translate.t("home.analyze.table.regulatoryTerms"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "numeric",
    className: "text-center",
    cell: "textTemplate"
  }
];

export const entityRegulatoryTermsStrategyModality = [
  {
    field: "entityRegulatoryTermsStrategyModality",
    title: translate.t("global.enforcedPromoted"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];

export const entityRegulatoryCountrySource = [
  {
    field: "regulatoryCountrySource",
    title: translate.t("home.analyze.table.regulatoryCountrySource"),
    width: "160px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "regulatoryCountrySourceTemplate"
  }
];

//cashflowAgreed
export const cashflowAgreed = [
  {
    field: "agreedCashFlow",
    title: translate.t("home.analyze.table.cashflowAgreed"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-right",
    cell: "moneyTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
];
export const paymentTermsAgreed = [
  {
    field: "termsWithoutCashDiscount",
    title: translate.t("home.analyze.table.paymentTermsAgreed"),
    width: "170px",
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "paymentTermsAgreed",
    footerCell: "TotalsBycolumnsAvgWeightedCeil"
  }
];
export const payOnTermsStrategy = [
  {
    field: "contractualPaymentTermsWithoutCashDiscounts",
    title: translate.t("home.analyze.table.payOnTermsStrategy"),
    width: "170px",
    sortable: true,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    footerCell: "TotalsBycolumnsAvgWeightedCeil"
  }
];

export const activeProgram = [
  {
    field: "activeProgram",
    title: translate.t("home.analyze.table.activeProgram"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "programColumn"
  }
];

export const entityEthnicMinorityOwnedBusiness = [
  {
    field: "entityEthnicMinorityOwnedBusiness",
    title: translate.t("home.analyze.table.ethnicMinorityOwnedBusiness"),
    width: "150px",
    sortable: true,
    allowHide: true,
    hidden: true,
    filter: "text",
    resizable: true,
    className: "text-center",
    footerCell: "TotalsBycolumnsCountTrue"
  }
];

export const entityWomanOwnedBusiness = [
  {
    field: "entityWomanOwnedBusiness",
    title: translate.t("home.analyze.table.womanOwnedBusiness"),
    width: "150px",
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    resizable: true,
    className: "text-center",
    footerCell: "TotalsBycolumnsCountTrue"
  }
];

export const entityVeteranOwnedBusiness = [
  {
    field: "entityVeteranOwnedBusiness",
    title: translate.t("home.analyze.table.veteran"),
    width: "150px",
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    resizable: true,
    className: "text-center",
    footerCell: "TotalsBycolumnsCountTrue"
  }
];

export const entityInvestVerteScore = [
  {
    field: "entityInvestVerteScore",
    title: translate.t("home.analyze.table.investVerteScore"),
    width: "150px",
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    resizable: true,
    className: "text-center"
  }
];

export const fundingCost = [
  {
    field: "fundingCost",
    title: translate.t("home.analyze.table.supplierFinancingRateSelectedRate"),
    width: "200px",
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    className: "text-right",
    cell: "percentColumn"
  }
];

export const baseRate = [
  {
    field: "baseRate",
    title: translate.t("home.analyze.table.costOfDebtBaseRate"),
    width: "200px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-right",
    cell: "percentColumn"
  }
];

export const fundingSpread = [
  {
    field: "fundingSpread",
    title: translate.t("global.creditSpread"),
    width: "200px",
    resizable: true,
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    className: "text-right",
    cell: "percentColumn"
  }
];

export const customDataPoint1 = [
  {
    field: "customDataPoint1",
    title: translate.t("global.globalFilters.customDataPoint1"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];
export const customDataPoint2 = [
  {
    field: "customDataPoint2",
    title: translate.t("global.globalFilters.customDataPoint2"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];
export const customDataPoint3 = [
  {
    field: "customDataPoint3",
    title: translate.t("global.globalFilters.customDataPoint3"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];
export const customDataPoint4 = [
  {
    field: "customDataPoint4",
    title: translate.t("global.globalFilters.customDataPoint4"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];
export const customDataPoint5 = [
  {
    field: "customDataPoint5",
    title: translate.t("global.globalFilters.customDataPoint5"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];
export const customDataPoint6 = [
  {
    field: "customDataPoint6",
    title: translate.t("global.globalFilters.customDataPoint6"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];
export const customDataPoint7 = [
  {
    field: "customDataPoint7",
    title: translate.t("global.globalFilters.customDataPoint7"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];
export const customDataPoint8 = [
  {
    field: "customDataPoint8",
    title: translate.t("global.globalFilters.customDataPoint8"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];
export const customDataPoint9 = [
  {
    field: "customDataPoint9",
    title: translate.t("global.globalFilters.customDataPoint9"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];
export const customDataPoint10 = [
  {
    field: "customDataPoint10",
    title: translate.t("global.globalFilters.customDataPoint10"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];


export const customDataPoint11 = [
  {
    field: "customDataPoint11",
    title: translate.t("global.globalFilters.customDataPoint11"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];

export const customDataPoint12 = [

  {
    field: "customDataPoint12",
    title: translate.t("global.globalFilters.customDataPoint12"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];


export const customDataPoint13 =   [

  {
    field: "customDataPoint13",
    title: translate.t("global.globalFilters.customDataPoint13"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];

export const customDataPoint14 = [

  {
    field: "customDataPoint14",
    title: translate.t("global.globalFilters.customDataPoint14"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];


export const customDataPoint15 = [

  {
    field: "customDataPoint15",
    title: translate.t("global.globalFilters.customDataPoint15"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];


export const customDataPoint16 = [  

  {
    field: "customDataPoint16",
    title: translate.t("global.globalFilters.customDataPoint16"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];

export const customDataPoint17 = [

  {
    field: "customDataPoint17",
    title: translate.t("global.globalFilters.customDataPoint17"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];


export const customDataPoint18 = [

  {
    field: "customDataPoint18",
    title: translate.t("global.globalFilters.customDataPoint18"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];


export const customDataPoint19 = [

  {
    field: "customDataPoint19",
    title: translate.t("global.globalFilters.customDataPoint19"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];

export const customDataPoint20 = [

  {
    field: "customDataPoint20",
    title: translate.t("global.globalFilters.customDataPoint20"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    className: "text-center",
    cell: "textTemplate"
  }
];

export const customDataPoint21 = [
  {
    field: "customDataPoint21",
    title: translate.t("global.globalFilters.customDataPoint21"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "numeric",
    className: "text-center",
    cell: "customDataPointNumericTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
];

export const customDataPoint22 = [
  {
    field: "customDataPoint22",
    title: translate.t("global.globalFilters.customDataPoint22"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "numeric",
    className: "text-center",
    cell: "customDataPointNumericTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
];

export const customDataPoint23 = [
  {
    field: "customDataPoint23",
    title: translate.t("global.globalFilters.customDataPoint23"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "numeric",
    className: "text-center",
    cell: "customDataPointNumericTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
];

export const customDataPoint24 = [
  {
    field: "customDataPoint24",
    title: translate.t("global.globalFilters.customDataPoint24"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "numeric",
    className: "text-center",
    cell: "customDataPointNumericTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
];

export const customDataPoint25 = [
  {
    field: "customDataPoint25",
    title: translate.t("global.globalFilters.customDataPoint25"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "numeric",
    className: "text-center",
    cell: "customDataPointNumericTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
];

export const customDataPoint26 = [
  {
    field: "customDataPoint26",
    title: translate.t("global.globalFilters.customDataPoint26"),
    width: "150px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "numeric",
    className: "text-center",
    cell: "customDataPointNumericTemplate",
    footerCell: "TotalsBycolumnsSum",
  }
];



/**
 * 9 boxes
 */

export const box = [
  {
    field: "box",
    title: translate.t("home.analyze.table.cashFlowBox"),
    width: "150px",
    resizable: true,
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    className: "text-center",
    cell: "nineBoxes"
  }
];



export const cashFlowImpactLabel = [
  {
    field: "cashFlowImpactLabel",
    title: translate.t("home.analyze.table.buyerImpact"),
    width: "180px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "nineBoxesCashFlowImpact"
  }
];

export const cashFlowImpactLabelSCF = [
  {
    field: "cashFlowImpactLabel",
    title: translate.t("home.analyze.table.buyerImpactSCF"),
    width: "180px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "nineBoxesCashFlowImpactSCF"
  }
];

export const successProbabilityLabel = [
  {
    field: "successProbabilityLabel",
    title: translate.t("global.probabilityOfSuccess"),
    width: "160px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "nineBoxesSuccessProbability"
  }
];

export const successProbabilityLabelVcard = [
  {
    field: "successProbabilityLabel",
    title: translate.t("home.analyze.analyzeProgramOverview.probabilityofAcceptance"),
    width: "220px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "nineBoxesSuccessProbability"
  }
];

// financial_box = nuemero de box

/**
 * 9 box financing
 */

export const scalePotentialSCFRevenue = [
  {
    field: "scalePotentialSCFRevenue",
    title: translate.t("global.potentialScfRevenue"),
    width: "200px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "scalePotentialScfrevenueColumn"
  }
];

export const scaleFinancingValueToSupplier = [
  {
    field: "scaleFinancingValueToSupplier",
    title: translate.t("global.financingValueToSupplier"),
    width: "200px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "scaleFinancingValueToSupplierColumn"
  }
];

export const financialBox = [
  {
    field: "financialBox",
    title: translate.t("home.analyze.table.financingBox"),
    width: "150px",
    resizable: true,
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    cell: "nineBoxesFinancing"
  }
];

export const scaleUsingFinancing = [
  {
    field: "scaleUsingFinancing",
    title: translate.t("global.supplierUsingFinancing"),
    width: "200px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "scaleUsingFinancingColumn"
  }
];

export const scfBox = [
  {
    field: "scfBox",
    title: translate.t("home.analyze.table.scfBox"),
    width: "150px",
    resizable: true,
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    cell: "nineBoxesFinancingSCF"
  }
];


//* Vcard
export const vCardBox = [
  {
    field: "vCardBox",
    title: translate.t("home.analyze.table.vCardFlowBox"),
    width: "150px",
    resizable: true,
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    className: "text-center",
    cell: "nineBoxesVcard"
  }
];


export const vCardEconomicProfitImpactLabel = [
  {
    field: "vCardEconomicProfitImpactLabel",
    title: translate.t("global.buyerImpactVcard"),
    width: "180px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "vCardEconomicProfitImpactLabelVcard"
  }
];


export const vCardSuccessProbability = [
  {
    field: "vCardSuccessProbability",
    title: translate.t("global.vcardSuccessProbabilityColumn"),
    width: "180px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-center",
    cell: "vCardRebatePercentCell"
  }
];

/**
 *  Analyze
 * */

export const dateOfLastTermNegotiation = [
  {
    field: "dateOfLastTermNegotiation",
    title: translate.t("tableHeaders.dateOfLastTermNegotiation"),
    width: "100px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "date",
    resizable: true,
    className: "text-center",
    cell: "datesInfoTemplate"
  }
];
//days
export const termsWithoutCashDiscount = [
  {
    field: "termsWithoutCashDiscount",
    title: translate.t("tableHeaders.negotiatedContractualWithoutCash"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "moneyTemplateRound"
  }
];

export const termsWithCashDiscount = [
  {
    field: "termsWithCashDiscount",
    title: translate.t("tableHeaders.negotiatedContractualWithCash"),
    width: "170px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "moneyTemplateRound",
    footerCell: "TotalsBycolumnsAvgWeightedCeil"
  }
];

export const newTermsCashDiscount = [
  {
    field: "newTermsCashDiscount",
    title: translate.t("tableHeaders.negotiatedCashDiscount"),
    width: "100px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "percentColumn"
  }
];

export const agreedDateOfChange = [
  {
    field: "agreedDateOfChange",
    title: translate.t("tableHeaders.agreedDateofChange"),
    width: "100px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "date",
    resizable: true,
    className: "text-right",
    cell: "datesInfoTemplate"
  }
];

export const nextReviewDate = [
  {
    field: "nextReviewDate",
    title: translate.t("tableHeaders.nextReviewDate"),
    width: "100px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "date",
    resizable: true,
    className: "text-right",
    cell: "datesInfoTemplate"
  }
];

export const effectiveDate = [
  {
    field: "effectiveDate",
    title: translate.t("home.entityCard.results.effectiveDate"),
    width: "100px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "date",
    resizable: true,
    className: "text-right",
    cell: "datesInfoTemplate"
  }
];

export const entityCountry = [
  {
    field: "entityCountry",
    title: translate.t("home.analyze.table.alpha3Code"),
    width: "100px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-center"
  }
];

export const entityIndustryCode = [
  {
    field: "entityIndustryCode",
    title: translate.t("home.analyze.table.industryNAICS"),
    width: "100px",
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    resizable: true,
    className: "text-center",
    cell: "textTemplate"
  }
];

export const entityIndustryCodeNaics2 = [
  {
    field: "entityIndustryCodeNaics2",
    title: translate.t("home.analyze.table.entityIndustryCodeNaics2"),
    width: "100px",
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    resizable: true,
    className: "text-center",
    cell: "textTemplate"
  }
];

export const entityIndustryCodeNaics3 = [
  {
    field: "entityIndustryCodeNaics3",
    title: translate.t("home.analyze.table.entityIndustryCodeNaics3"),
    width: "100px",
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    resizable: true,
    className: "text-center",
    cell: "textTemplate"
  }
];

export const parentIndustryIsic = [
  {
    field: "parentIndustryIsic",
    title: translate.t("home.analyze.table.isic"),
    width: "100px",
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    resizable: true,
    className: "text-left",
    cell: "textTemplate"
  }
];

/** Plan */

export const phases = [
  {
    field: "phases",
    title: translate.t("home.plan.planTable.phase"),
    width: "80px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    className: "text-left"
  }
];

export const expectedCashFlow = [
  {
    field: "expectedCashFlow",
    title: translate.t("global.expectedCashFlow"),
    width: "150px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "moneyTemplate"
  }
];

export const planNames = [
  {
    field: "planNames",
    title: translate.t("home.plan.plan"),
    width: "200px",
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    resizable: true,
    className: "text-left",
    cell: "textTemplate"
  }
];

export const phaseNameStatuses = [
  {
    field: "phaseNameStatuses",
    title: translate.t("global.phaseOfPlan"),
    width: "200px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-left",
    cell: "textTemplate"
  }
];

/** Program */

//change the field name once the api is ready
export const pilotColumn = [
  {
    field: "isPilot",
    title: translate.t("home.analyze.table.pilot"),
    width: "150px",
    resizable: true,
    allowHide: false,
    sortable: true,
    hidden: true,
    filter: "boolean",
    cell: "pilotTemplate"
  }
];

export const disabled = [
  {
    field: "disabled",
    title: translate.t("home.analyze.table.exclude"),
    width: "150px",
    resizable: true,
    allowHide: false,
    sortable: true,
    hidden: false,
    filter: "boolean",
    cell: "excludeInfoTemplate"
  }
];

// AB#20307: Edit Mode's "Reason for Exclusion" column. Named `programExclusionReason` here
// (not `reason` or `exclusionReason`, both already exported above/below for unrelated concepts -
// Overview's file-ingestion no-match reason and the `ar` app's opportunity grid, respectively) to
// avoid confusion between three different "reason" fields sharing this file. The `field` value
// still matches the backend property name (ProgramListSpend/Supplier/Parent.exclusionReason) -
// only this JS export identifier needed to be distinct. Uses the plain text cell like `financings`/
// `harmonizations` do for their own multi-value rollups: the backend already returns a single `|`
// -joined string when a Supplier/Parent row's spends carry more than one distinct reason (only ever
// when every one of them is excluded - see AnalyzeSummaryManager::exclusion_reason), and
// ListsCFEdit.vue's existing fetch-time "Multiple" substitution (mirroring financings/
// harmonizations) turns that into the localized "Multiple" label - no new cell component needed.
export const programExclusionReason = [
  {
    field: "exclusionReason",
    title: translate.t("home.analyze.table.exclusionReason"),
    width: "200px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    cell: "textTemplate"
  }
];

export const scfGroupStandardStrategy = [
  {
    field: "scfGroupStandardStrategy",
    title: translate.t("home.analyze.table.scfGroupStandardStrategy"),
    width: "150px",
    sortable: true,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "numeric",
    cell: "decimalsTemplate"
  }
];

/** Commpare */

export const nameCompare = [
  {
    field: "name",
    title: translate.t('home.analyze.table.companyName'),
    width: "300px",
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    filterable: false
  }
];

export const countryCompare = [
  {
    field: "country",
    title: translate.t('home.analyze.table.country'),
    width: "300px",
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    filterable: false
  }
];

export const industryCompare = [
  {
    field: "industry",
    title: translate.t('global.industry'),
    width: "300px",
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    filterable: false
  }
];
/** Home Financing Data List  */

export const selected = [
  {
    field: "selected",
    title: translate.t("home.analyze.table.selected"),
    width: "100px",
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "boolean",
    cell: "selectedCompanyFinancialDataView",
    sortable: true,
    filterable: false
  }
];

export const companyNameFinancingView = [
  {
    field: "name",
    title: translate.t("home.analyze.table.companyName"),
    width: "250px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    cell: "selectedCompanyFinancialDataViewName"
  }
];

export const countryFinancingView = [
  {
    field: "country",
    title: translate.t("home.analyze.table.country"),
    width: "250px",
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    cell: "selectedCompanyFinancialDataViewCountry"
  }
];

export const regionFinancingView = [
  {
    field: "region",
    title: translate.t("home.analyze.table.region"),
    width: "250px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    cell: "selectedCompanyFinancialDataViewRegion"
  }
];

export const industryFinancingView = [
  {
    field: "industry",
    title: translate.t("home.analyze.table.industry"),
    width: "250px",
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    cell: "selectedCompanyFinancialDataViewIndustry"
  }
];

export const naicsCodeFinancingView = [
  {
    field: "naicsCode",
    title: translate.t("home.analyze.table.naicsCode"),
    width: "auto",
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    cell: "selectedCompanyFinancialDataViewNaicsCode"
  }
];

//for admin console, clusters grid

export const clusterIdPeerGroup = [
  {
    field: "clusterId",
    title: translate.t("adminBackend.adminClusters.table.clusterType"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    resizable: true,
    filterable: true,
    sortable: true,
    className: "text-center",
    cell: "clusterIdPeerGroup"
  }
];
export const clusterIdSupplierStandard = [
  {
    field: "clusterId",
    title: translate.t("adminBackend.adminClusters.table.clusterType"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    resizable: true,
    filterable: true,
    sortable: true,
    className: "text-center",
    cell: "clusterIdSupplierStandard"
  }
];

export const similarityRateText = [
  {
    field: "similarityRateText",
    title: translate.t("adminBackend.adminClusters.table.similarityRate"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'text',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center text-capitalize",
    cell: "clusterSimilarityRateText"
  }
];

export const supplierCountryCode = [
  {
    field: "supplierCountryCode",
    title: translate.t("adminBackend.adminClusters.table.supplierCountry"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'text',
    sortable: true,
    filterable: true,
    resizable: true,
    cell: "clusterSupplierCountryCode"
  }
];

export const supplierRegion = [
  {
    field: "supplierRegion",
    title: translate.t("adminBackend.adminClusters.table.supplierRegion"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'text',
    sortable: true,
    filterable: true,
    resizable: true,
    cell: "clusterSupplierRegion"
  }
];

export const buyerLeverage = [
  {
    field: "buyerLeverage",
    title: translate.t("adminBackend.adminClusters.table.buyerLeverage"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'text',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterBuyerLeverage"
  }
];

export const buyerCountryCode = [
  {
    field: "buyerCountryCode",
    title: translate.t("adminBackend.adminClusters.table.buyerCountryCode"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'text',
    sortable: true,
    filterable: true,
    resizable: true,
    cell: "clusterBuyerCountryCode"
  }
];

export const naicsCode = [
  {
    field: "naicsCode",
    title: translate.t("adminBackend.adminClusters.table.naicsCode"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterNaicsCode"
  }
];
export const clusterBuyerRegion = [
  {
    field: "buyerRegion",
    title: translate.t("adminBackend.adminClusters.table.buyerRegion"),
    width: 250,
    allowHide: true,
    hidden: false,
    filter: 'text',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterBuyerRegion"
  }
];
export const clusterSupplierRegion = [
  {
    field: "supplierRegion",
    title: translate.t("adminBackend.adminClusters.table.supplierRegion"),
    width: 250,
    allowHide: true,
    hidden: false,
    filter: 'text',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterSupplierRegion"
  }
];

export const firstQuartile = [
  {
    field: "firstQuartile",
    title: translate.t("adminBackend.adminClusters.table.firstQuartile"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterFirstQuartile"
  }
];

export const median = [
  {
    field: "median",
    title: translate.t("adminBackend.adminClusters.table.median"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterMedian"
  }
];

export const thirdQuartile = [
  {
    field: "thirdQuartile",
    title: translate.t("adminBackend.adminClusters.table.thirdQuartile"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterThirdQuartile"
  }
];

export const ninety = [
  {
    field: "ninety",
    title: translate.t("adminBackend.adminClusters.table.ninety"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterNinety"
  }
];

export const occurrences = [
  {
    field: "occurrences",
    title: translate.t("adminBackend.adminClusters.table.occurrences"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterOccurrences"
  }
];

export const min = [
  {
    field: "min",
    title: translate.t("adminBackend.adminClusters.table.min"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterMin"
  }
];

export const max = [
  {
    field: "max",
    title: translate.t("adminBackend.adminClusters.table.max"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterMax"
  }
];

export const clusterInfo = [
  {
    field: "clusterInfo",
    title: translate.t("adminBackend.adminClusters.table.clusterInfo"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'text',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterInfo"
  }
];

export const average = [
  {
    field: "average",
    title: translate.t("adminBackend.adminClusters.table.average"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterAverage"
  }
];

export const clusterVersion = [
  {
    field: "clusterVersion",
    title: translate.t("adminBackend.adminClusters.table.version"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterVersion"
  }
];

export const clusterCompaniesCount = [
  {
    field: "companiesCount",
    title: translate.t("adminBackend.adminClusters.table.companiesCount"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: 'numeric',
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterCompaniesCount"
  }
];

export const clusterCompanies = [
  {
    field: "companies",
    title: translate.t("adminBackend.adminClusters.table.companies"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    filterable: false,
    resizable: true,
    className: "text-center",
    cell: "clusterCompanies"
  }
];
export const clusterTerms = [
  {
    field: "terms",
    title: translate.t("adminBackend.adminClusters.table.terms"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center"
  }
];

export const clusterSuppliers = [
  {
    field: "suppliers",
    title: translate.t("adminBackend.adminClusters.table.suppliers"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    filterable: false,
    resizable: true,
    className: "text-center",
    cell: "clusterSuppliers"
  }
]


export const clusterParents = [
  {
    field: "parents",
    title: translate.t("adminBackend.adminClusters.table.parents"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    filterable: false,
    resizable: true,
    className: "text-center",
    cell: "clusterParents"
  }
]

export const clusterSupplierName = [
  {
    field: "supplierName",
    title: translate.t("adminBackend.adminClusters.table.supplierName"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterSupplierName"
  }
]



export const clusterParentName = [
  {
    field: "parentName",
    title: translate.t("adminBackend.adminClusters.table.parentName"),
    width: 150,
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    filterable: true,
    resizable: true,
    className: "text-center",
    cell: "clusterParentName"
  }
]


/** List invitation columns */





export const createdByInvitations = [
  {
    field: "createdBy.firstName",
    title: translate.t('home.analyze.createdBy'),
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
  }
];

export const createdByInvitationsbyEmail = [
  {
    field: "createdBy.email",
    title: translate.t('home.analyze.createdBy'),
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "text",

  }
];


export const companyNameInvitations = [
  {
    field: "companyName",
    title: translate.t('home.analyze.table.companyName'),
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
  }
];

export const emailsInvitations = [
  {
    field: "emails",
    title: translate.t('global.emails'),
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
  }
];

export const invitationExpireDate = [
  {
    field: "invitationExpireDate",
    title: translate.t('global.invitationExpireDate'),
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    cell: "datesInfoTemplate"
  }
];

export const createdInvitation = [
  {
    field: "created",
    title: translate.t('global.creationDate'),    
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    cell: "datesInfoTemplate"
  }
];

export const actionsListInvitation = [

  {
    field: "actions",
    title: "  ",
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    columnMenu: false,
    cell: "actionsListInvitations",
    sortable: false
  }
]

export const statusListInvitation = [
  {
    field: "status",
    title: translate.t('global.status'),
    width: "200px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-left",
    cell: "textTemplate"
  }
];
export const programApplied = [
  {
    field: "programApplied",
    title: translate.t("global.programApplied"),
    width: "250px",
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    resizable: true,
    cell: "textTemplate"
  }
];


/** Value proposition columns */


export const statusofValueProposition = [
  {
    field: 'status',
    title: translate.t('global.status'),
    allowHide: true,
    hidden: false,
    sortable: true,        
    filter: "text",
    resizable: true,
    className: "text-left",
    cell: "textTemplate"
  }
];

export const nameofValueProposition = [
  {
    field: "valuePropositionName",
    title: translate.t("valueProposition.form.name"),
    allowHide: true,
    hidden: false,
    filter: "text",
    sortable: true,
    resizable: true,
    cell: "openValueProposition"
  }
];


export const currencyCodeValueProposition = [
  {
    field: "valuePropositionCurrency.code",
    title: translate.t("valueProposition.form.currency"),
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    resizable: true,
    className: "text-center",
    cell: "textTemplate"
  }
];


export const updatedBy = [
  {
    field: "updatedBy.email",
    title: translate.t('global.editedBy'),    
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-left"
  }
];


export const isPublic = [
  {
    field: 'isPublicText',
    title: translate.t('global.publicColumn'),    
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-left",
    cell: "textTemplate"
  }
];

export const updatedDateBy = [
  {
    field: "updatedBy.updated",
    title: translate.t('global.dateOfLastEdits'),    
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-left",
    cell: "datesInfoTemplate"
  }
];


export const actionsValueProposition = [

  {
    field: "actions",
    title: translate.t('common.actions'),
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    columnMenu: false,
    cell: "actionsValueProposition",
    sortable: false
  }
]

export const shareValueProposition = [

  {
    field: "actions",
    title: translate.t("valueProposition.invitations"),
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    columnMenu: false,
    cell: "shareValueProposition",
    sortable: false
  }
]



export const actionsInvitationsValueProposition = [

  {
    field: "actions",
    title: translate.t('common.actions'),
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    columnMenu: false,
    cell: "actionsInvitationsValueProposition",
    sortable: false,
    width: '80px'
  }
]

export const ValuePropositionExpireDate = [
  {
    field: "expirationDays",
    title: translate.t('global.expirationDate'),
    resizable: true,
    sortable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    cell: "datesInfoTemplate"
  }
];

/** Invitations by Value Proposition */


export const invitationIdbyValueProposition = [
  {
    field: "emails",
    title: translate.t('global.sentTo'),    
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-left"
  }
];

// Match columns
export const macthStatus=[{
  field: "status",
  title: translate.t("home.analyze.table.status"),
  width: "120px",
  className: "text-center",
  allowHide: true,
  hidden: false,
  type: "text",
  resizable: true,
  locked: false,
  columnMenu: "columnMenuTemplate"
}]
export const confidenceScore=[{
  field: "confidenceScore",
  title: translate.t("home.overview.list.confidanceScore"),
  width: "150px",
  allowHide: true,
  hidden: false,
  resizable: true,
  type: "text",
  locked: false,
  cell: "confidenceScoreColumnSticky",
  columnMenu: "columnMenuTemplate"
}]
export const matchSupplierName=[{
  field: "name",
  title: translate.t("home.overview.list.supplierName"),
  width: "250px",
  allowHide: true,
  hidden: false,
  type: "text",
  resizable: true,
  locked: false,
  columnMenu: "columnMenuTemplate",
  cell: "nameMatchListTooltipSticky"
}]
export const matchSupplierNameReceived=[{
  field: "originalSupplierName",
  title: translate.t("home.overview.list.supplierNameReceived"),
  width: "420px",
  allowHide: true,
  hidden: false,
  type: "text",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "originalSupplierNameMatch"
}]
export const aggregatedLinesCount=[{
  field: "aggregatedLinesCount",
  title: translate.t("home.overview.list.aggregatedLinesCount"),
  allowHide: true,
  hidden: false,
  width: "150px",
  type: "number",
  filter: "numeric",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: 'aggregatedLinesCountMatch',
  // footerCell: 'aggreatedLinesCountMatchFooter'
}]
export const originalIdNumber=[{
  field: "originalIdNumber",
  title: translate.t("home.overview.list.idNumber"),
  allowHide: true,
  hidden: false,
  width: "150px",
  className: "text-center",
  type: "number",
  filter: "numeric",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: 'originalIdNumberMatch'
}]
export const matchParentCompanyName=[{
  field: "parentCompanyName",
  title: translate.t("home.overview.list.ultimateParentCompany"),
  width: "200px",
  allowHide: true,
  hidden: false,
  className: "wrap-text-column",
  type: "number",
  filter: "text",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "supplierNameMatchListUltimateParentTooltip"
}]
export const matchParentCompanyNameReceived=[{
  field: "originalParentCompanyName",
  title: translate.t("home.overview.list.ultimateParentCompanyReceived"),
  width: "200px",
  allowHide: true,
  hidden: false,
  className: "wrap-text-column",
  type: "number",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "originalParentCompanyNameMatch"
}]
export const matchCommodity=[{
  field: "commodity",
  title: translate.t("home.overview.list.commodity"),
  width: "150px",
  allowHide: true,
  hidden: false,
  type: "number",
  filter: "text",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "commodityColumn"
}]
export const matchAddress=[{
  field: "address",
  title: translate.t("home.overview.list.address"),
  width: "220px",
  allowHide: true,
  hidden: true,
  type: "text",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "addressTooltip"
}]
export const matchAddressReceived=[{
  field: "originalAddress",
  title: translate.t("home.overview.list.addressReceived"),
  allowHide: true,
  hidden: true,
  width: "220px",
  type: "text",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "originalAddressMatch"
}]
export const matchCity=[{
  field: "city",
  title: translate.t("home.overview.list.city"),
  width: "200px",
  className: "text-left",
  allowHide: true,
  hidden: true,
  type: "text",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell:"cityMatch"
}]
export const macthCityReceived=[{
  field: "originalCity",
  title: translate.t("home.overview.list.cityReceived"),
  width: "200px",
  className: "text-left",
  allowHide: true,
  hidden: true,
  type: "text",
  resizable: true,
  columnMenu: "originalCityMatch"
}]
export const matchState=[{
  field: "state",
  title: translate.t("home.overview.list.state"),
  width: "200px",
  className: "text-left",
  type: "text",
  allowHide: true,
  hidden: true,
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "stateMatch"
}]
export const matchStateReceived= [{
  field: "originalState",
  title: translate.t("home.overview.list.stateReceived"),
  width: "200px",
  className: "text-left",
  type: "text",
  allowHide: true,
  hidden: true,
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell:'originalStateMatch'
}]
export const matchZipCode=[{
  field: "zipCode",
  title: translate.t("home.overview.list.zipCode"),
  width: "100px",
  type: "text",
  allowHide: true,
  hidden: true,
  className: "text-left",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "zipCodeMatch"
}]
export const matchZipCodeReceived=[{
  field: "originalZipCode",
  title: translate.t("home.overview.list.zipCodeReceived"),
  width: "100px",
  type: "text",
  allowHide: true,
  hidden: true,
  className: "text-left",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "originalZipCodeMatch"
}]
export const matchCountry=[{
  field: "country",
  title: translate.t("global.countrySupplier"),
  width: "300px",
  type: "text",
  className: "k-text-capitalize",
  allowHide: true,
  hidden: false,
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "countryMatch"
}]
export const matchAlpha3Code=[{
  field: "alpha3Code",
  title: translate.t("home.overview.list.countryISOCode"),
  width: "100px",
  allowHide: true,
  hidden: false,
  type: "text",
  className: "text-center",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "alpha3CodeMatch"
}]
export const matchDomain=[{
  field: "domain",
  title: translate.t("home.overview.list.url"),
  width: "200px",
  className: "wrap-text-column",
  allowHide: true,
  hidden: false,
  type: "text",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "domainMatch"
}]
export const macthCurrency=[{
  field: "currency",
  title: translate.t("home.overview.list.spendCurrency"),
  width: "100px",
  className: "text-center",
  allowHide: true,
  hidden: false,
  type: "number",
  filter: "text",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "textTemplate"
}]
export const matchOriginalPaymentTermDescription=[{
  field: "originalPaymentTermDescription",
  title: translate.t("home.overview.list.paymentTermsDescription"),
  width: "150px",
  className: "text-center",
  type: "number",
  filter: "numeric",
  resizable: true,
  cell: 'originalPaymentTermDescriptionMatch'
}]
export const reason=[{
  field: "reason",
  title: translate.t("home.overview.list.reason"),
  allowHide: true,
  hidden: false,
  width: "250px",
  type: "text",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "textTemplate"
}]
export const capturedCashDiscounts=[{
  field: "capturedCashDiscounts",
  title: translate.t("home.overview.list.capturedCashDiscounts"),
  width: "250px",
  className: "text-center",
  allowHide: true,
  hidden: false,
  type: "number",
  resizable: true,
  columnMenu: "columnMenuTemplate",
  cell: "moneyTemplate",
  // AB#20356 follow-up: Ada-Platform only ever defines this field under its WeightedAverage
  // summary nature (both grains), never Sum - "TotalsBycolumnsSum" 400'd the whole request the
  // moment this column was visible with a footer.
  footerCell: "TotalsBycolumnsAvgWeighted"
}]



//- Potential supplier request columns

export const potentialSupplierRequest = [
  {
    field: "name",
    title: translate.t("home.analyze.table.supplierName"),    
    width: '500px',
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    cell: "entityColumnTemplatePotentialSupplier"
  }
];


export const requestDate = [
  {
    field: "created",
    title: translate.t('global.requestDate'),    
    width: '500px',
    sortable: true,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    cell: "datesInfoTemplate",
  }
];


export const requesterUser = [
  {
    field: "createdBy.firstName",
    title: translate.t('global.requester'),    
    width: '500px',
    sortable: true,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    cell: "textTemplate"
  }
];


export const emailRequester = [
  {
    field: "createdBy.email",
    title: translate.t('global.emailAddress'),
    width: '500px',
    resizable: true,
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text"
  }
];


export const statusPotentialRequest = [
  {
    field: 'status',
    title: translate.t('global.status'),    
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    className: "text-left",
    cell: "statusPotentialSupplierColumns"
  }
];

/**
 * AR SaleMatchRow columns (Ada.Ar.Api's `saleMatchRows` GraphQL field)
 */

export const sourceRowNumber = [
  {
    field: "sourceRowNumber",
    title: "Row #",
    width: "100px",
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "numeric",
    resizable: true,
    className: "text-center"
  }
];

export const matchStatus = [
  {
    field: "matchStatus",
    title: "Status",
    width: "110px",
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "text",
    resizable: true,
    className: "text-center",
    cell: "textTemplate"    
  }
];

export const isMatched = [
  {
    field: "isMatched",
    title: "Matched",
    width: "110px",
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "boolean",
    resizable: true,
    className: "text-center",
    cell: "booleanYesNoColumn"
  }
];

export const isExcluded = [
  {
    field: "isExcluded",
    title: "Excluded",
    width: "110px",
    allowHide: true,
    sortable: true,
    hidden: false,
    filter: "boolean",
    resizable: true,
    className: "text-center",
    cell: "booleanYesNoColumn"
  }
];

export const exclusionReason = [
  {
    field: "exclusionReason",
    title: "Exclusion Reason",
    width: "200px",
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    resizable: true,
    cell: "textTemplate"
  }
];

export const noMatchReason = [
  {
    field: "noMatchReason",
    title: "No Match Reason",
    width: "200px",
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    resizable: true,
    cell: "textTemplate"
  }
];

export const buyerNameAR = [
  {
    field: "buyerName",
    title: translate.t("home.analyze.table.buyerEntity"),
    width: "250px",
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];


export const originalBuyerName = [
  {
    field: "originalBuyerName",
    // AB#20529: one label for the original name on every AR grid.
    title: translate.t("arOpportunity.list.columns.originalName"),
    width: "250px",
    allowHide: true,
    sortable: true,
    hidden: true,
    filter: "text",
    resizable: true,
    cell: "textTemplate"
  }
];

/**
 * AR Opportunity overview columns (Ada.Ar.Api's `saleLineOverviewRows` / `buyerOverviewRows` /
 * `parentOverviewRows`, see apps/ar's opportunity/data/overviewColumns.ts). None of these fields
 * are covered by an existing export above: either the field itself doesn't exist yet
 * (region/country/industry/opportunity/credit metrics), or it collides with a different field
 * (`paymentTermsAgreed`/`cashflowAgreed` above point at AP's
 * `termsWithoutCashDiscount`/`agreedCashFlow`, not client-only placeholders). `cashDiscounts`
 * itself is NOT redefined here - Opportunity's is the same raw-fraction-to-percent field as the
 * `cashDiscounts` export above (see apps/ar's overviewRows.ts toDisplayOverviewRow), so it's
 * reused as-is.
 */

export const opportunityRegionName = [
  {
    field: "regionName",
    title: translate.t("arOpportunity.list.columns.region"),
    width: "180px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityCountryCode = [
  {
    field: "countryCode",
    title: translate.t("arOpportunity.list.columns.country"),
    width: "130px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityIndustryName = [
  {
    field: "industryName",
    title: translate.t("arOpportunity.list.columns.industry"),
    width: "300px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityIsSme = [
  {
    field: "isSme",
    title: translate.t("arOpportunity.list.columns.sme"),
    width: "120px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "boolean",
    resizable: true,
    cell: "booleanYesNoColumn"
  }
];

export const opportunitySaleLineAlias = [
  {
    field: "alias",
    title: translate.t("arOpportunity.list.columns.alias"),
    width: "130px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplate"
  }
];

/** The row's own identity at the buyer level - field `name`, titled for a buying entity. */
export const opportunityBuyerPartyName = [
  {
    field: "name",
    title: translate.t("arOpportunity.list.columns.buyingEntity"),
    width: "220px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

/** The row's own identity at the parent level - field `name`, titled for an ultimate parent. */
export const opportunityParentPartyName = [
  {
    field: "name",
    title: translate.t("arOpportunity.list.columns.ultimateParent"),
    width: "220px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

/** The descriptive parent-organization column shared by the sale-line and buyer levels. */
export const opportunityParentOrganizationName = [
  {
    field: "parentName",
    title: translate.t("arOpportunity.list.columns.parentOrganization"),
    width: "220px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    // AB#20339: parity with AP's own parent-entity columns, which also carry a logo next to the
    // name (not just the buyer's own identity column).
    cell: "entityLogoTemplate"
  }
];

export const opportunitySaleLineCount = [
  {
    field: "saleLineCount",
    title: translate.t("arOpportunity.list.columns.salesLines"),
    width: "130px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "textTemplate"
  }
];

export const opportunityActualPaymentTermsAvg = [
  {
    field: "actualPaymentTermsAvg",
    title: translate.t("arOpportunity.list.columns.averageDaysPaid"),
    width: "160px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityContractualPaymentTermsWithoutCashDiscountsAvg = [
  {
    field: "contractualPaymentTermsWithoutCashDiscountsAvg",
    title: translate.t("arOpportunity.list.columns.contractualPaymentTerms"),
    width: "200px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityContractualPaymentTermsWithCashDiscountsAvg = [
  {
    field: "contractualPaymentTermsWithCashDiscountsAvg",
    title: translate.t("arOpportunity.list.columns.contractualWithCashDiscounts"),
    width: "220px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityDpo = [
  {
    field: "dpo",
    title: translate.t("arOpportunity.list.columns.dpo"),
    width: "120px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityRecommendedTerm = [
  {
    field: "recommendedTerm",
    title: translate.t("arOpportunity.list.columns.proposedPaymentTerms"),
    width: "160px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate",
  }
];

export const opportunityCurrentTerm = [
  {
    field: "currentTerm",
    title: translate.t("arOpportunity.list.columns.currentPaymentTerms"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate",
  }
];

export const opportunityExpectedTerm = [
  {
    field: "expectedTerm",
    title: translate.t("arOpportunity.list.columns.expectedPaymentTerms"),
    width: "160px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate",
  }
];

// AB#18931: present, empty, and never part of the GraphQL selection (see
// apps/ar's opportunity/data/overviewRows.ts CLIENT_ONLY_FIELDS) - not filterable or sortable,
// there is no backend column to filter or sort by yet.
export const opportunityPaymentTermsAgreed = [
  {
    field: "paymentTermsAgreed",
    title: translate.t("arOpportunity.list.columns.paymentTermsAgreed"),
    width: "180px",
    allowHide: true,
    hidden: false,
    sortable: false,
    filter: undefined,
    resizable: true,
    cell: "decimalsTemplate",
  }
];

export const opportunityCashFlowAgreed = [
  {
    field: "cashFlowAgreed",
    title: translate.t("arOpportunity.list.columns.cashFlowAgreed"),
    width: "180px",
    allowHide: true,
    hidden: false,
    sortable: false,
    filter: undefined,
    resizable: true,
    cell: "decimalsTemplate",
  }
];

export const opportunityCashFlowImpact = [
  {
    field: "cashFlowImpact",
    title: translate.t("arOpportunity.list.columns.cashFlowOpportunity"),
    width: "180px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "moneyTemplate"
  }
];

export const opportunityExpectedCashFlowImpact = [
  {
    field: "expectedCashFlowImpact",
    title: translate.t("arOpportunity.list.columns.expectedCashFlow"),
    width: "180px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "moneyTemplate"
  }
];

export const opportunityEconomicProfitImpact = [
  {
    field: "economicProfitImpact",
    title: translate.t("arOpportunity.list.columns.economicProfit"),
    width: "180px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "moneyTemplate"
  }
];

export const opportunityExpectedEconomicProfitImpact = [
  {
    field: "expectedEconomicProfitImpact",
    title: translate.t("arOpportunity.list.columns.expectedEconomicProfit"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "moneyTemplate"
  }
];

export const opportunityProbabilityScore = [
  {
    field: "probabilityScore",
    title: translate.t("arOpportunity.list.columns.successProbability"),
    width: "180px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "ProbabilityOfSuccessLabel"
  }
];

export const opportunityProbabilityTier = [
  {
    field: "probabilityTier",
    title: translate.t("arOpportunity.list.columns.probabilityTier"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: undefined,
    resizable: true,
    cell: "ProbabilityOfSuccessLabel"
  }
];

export const opportunityCashFlowImpactTier = [
  {
    field: "cashFlowImpactTier",
    title: translate.t("arOpportunity.list.columns.cashFlowTier"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "ProbabilityOfSuccessLabel"
  }
];

// AP's own equivalent (this file's own `box` export, `cell: "nineBoxes"`, field "box") isn't reused
// as-is: AR's row field is genuinely named `nineBox`, not `box`, and its cell (`NineBoxColumn.vue`)
// takes a plain 1-9 number rather than AP's own `typeOf9Boxes`-branching domain string.
//
// Title composed from the SAME `arOpportunity.nineBox.title` + `typeTermsReduction` keys
// NineBoxOverview.vue's own header uses, rather than its own separate `list.columns.nineBox`
// string - a static duplicate of "9 Boxes {type}" drifted from it (read "9 Boxes Cash Flow", AP's
// own type name, while the header already read "9 Boxes Terms Reduction"); composing from the one
// shared key means the two can't disagree again.
export const opportunityNineBox = [
  {
    field: "nineBox",
    title: translate.t("arOpportunity.nineBox.title", { type: translate.t("arOpportunity.nineBox.typeTermsReduction") }),
    width: "160px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "nineBoxColumn"
  }
];

export const opportunityWaterfallBucketName = [
  {
    field: "waterfallBucketName",
    title: translate.t("arOpportunity.list.columns.waterfallCategory"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityWinningStrategy = [
  {
    field: "winningStrategy",
    title: translate.t("arOpportunity.list.columns.winningStrategy"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityNoOpportunityReason = [
  {
    field: "noOpportunityReason",
    title: translate.t("arOpportunity.list.columns.noOpportunityReason"),
    width: "240px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityCreditLimit = [
  {
    field: "creditLimit",
    title: translate.t("arOpportunity.list.columns.creditLimit"),
    width: "180px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "moneyTemplate"
  }
];

export const opportunityCreditOutstanding = [
  {
    field: "creditOutstanding",
    title: translate.t("arOpportunity.list.columns.creditOutstanding"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "moneyTemplate"
  }
];

export const opportunityCreditOutstandingWithPastDue = [
  {
    field: "creditOutstandingWithPastDue",
    title: translate.t("arOpportunity.list.columns.creditPastDue"),
    width: "220px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "moneyTemplate"
  }
];

/**
 * AB#column-parity: the 149 fields Ada.Ar.Api's `saleLineOverviewRows`/`buyerOverviewRows`/
 * `parentOverviewRows` gained to reach column parity with the payables calculated tables (see
 * apps/ar's opportunity/data/overviewRows.ts for the row interfaces these back). Every export
 * below defaults `hidden: true` - the column chooser is how a user reveals one - both because
 * roughly a third of them return null until their calculator exists (backend's gap-ledger
 * G-485..G-491) and because this many columns visible at once would make the grid unusable.
 * Grouped the way the backend's own two grains group them; a field shared by both grains (same
 * name, same meaning) gets ONE export used from both apps/ar's saleLineOverviewColumns() and
 * partyValueColumns() - never a duplicate. Deliberately NOT reused despite a same-named export
 * existing elsewhere in this file (false-friend collisions, left as a trail for the next person):
 * `buyerLeverage`/`supplierCountryCode`/`supplierRegion` above belong to Admin Clusters (their own
 * unregistered cluster cells); `isPublic` above is a pre-formatted `isPublicText` string, not this
 * bool; `countryName` above is titled/scoped to AP's own supplier country; `originalBuyerName`
 * above is a different Match-domain concept from this section's `buyerOriginalName`; `modelCashFlow`
 * above's field is `opportunityCashFlow`, not this section's `modelCashFlow`.
 */

// -- Geography (buyer/party's own + the AR "supplier"-side entity's own) --------------------------

export const opportunityCountryNameFull = [
  {
    field: "countryName",
    title: translate.t("arOpportunity.list.columns.countryName"),
    width: "250px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityContinent = [
  {
    field: "continent",
    title: translate.t("arOpportunity.list.columns.continent"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunitySupplierCountryCode = [
  {
    field: "supplierCountryCode",
    title: translate.t("arOpportunity.list.columns.supplierCountryCode"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunitySupplierCountryName = [
  {
    field: "supplierCountryName",
    title: translate.t("arOpportunity.list.columns.supplierCountryName"),
    width: "250px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "countryFlagTemplate"
  }
];

export const opportunitySupplierRegionName = [
  {
    field: "supplierRegionName",
    title: translate.t("arOpportunity.list.columns.supplierRegionName"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunitySupplierContinent = [
  {
    field: "supplierContinent",
    title: translate.t("arOpportunity.list.columns.supplierContinent"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

// -- Identity / company profile --------------------------------------------------------------------

export const opportunitySalesTeam = [
  {
    field: "salesTeam",
    title: translate.t("arOpportunity.list.columns.salesTeam"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityOriginalCommodity = [
  {
    field: "originalCommodity",
    title: translate.t("arOpportunity.list.columns.originalCommodity"),
    width: "200px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityInternalId = [
  {
    field: "internalId",
    title: translate.t("arOpportunity.list.columns.internalId"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityBuyerOriginalName = [
  {
    field: "buyerOriginalName",
    title: translate.t("arOpportunity.list.columns.originalName"),
    width: "220px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityOriginalName = [
  {
    field: "originalName",
    title: translate.t("arOpportunity.list.columns.originalName"),
    width: "220px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityBuyerExternalId = [
  {
    field: "buyerExternalId",
    title: translate.t("arOpportunity.list.columns.buyerExternalId"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityExternalId = [
  {
    field: "externalId",
    title: translate.t("arOpportunity.list.columns.externalId"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityBuyerCleanCanonicalName = [
  {
    field: "buyerCleanCanonicalName",
    title: translate.t("arOpportunity.list.columns.buyerCleanCanonicalName"),
    width: "220px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityCleanCanonicalName = [
  {
    field: "cleanCanonicalName",
    title: translate.t("arOpportunity.list.columns.cleanCanonicalName"),
    width: "220px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityBuyerUrl = [
  {
    field: "buyerUrl",
    title: translate.t("arOpportunity.list.columns.buyerUrl"),
    width: "200px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityUrl = [
  {
    field: "url",
    title: translate.t("arOpportunity.list.columns.url"),
    width: "200px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityBuyerInvestVerteEsgScore = [
  {
    field: "buyerInvestVerteEsgScore",
    title: translate.t("arOpportunity.list.columns.buyerInvestVerteEsgScore"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityInvestVerteEsgScore = [
  {
    field: "investVerteEsgScore",
    title: translate.t("arOpportunity.list.columns.investVerteEsgScore"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityBuyerStockTicker = [
  {
    field: "buyerStockTicker",
    title: translate.t("arOpportunity.list.columns.buyerStockTicker"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityStockTicker = [
  {
    field: "stockTicker",
    title: translate.t("arOpportunity.list.columns.stockTicker"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityBvdIdNumber = [
  {
    field: "bvdIdNumber",
    title: translate.t("arOpportunity.list.columns.bvdIdNumber"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityIdNumber = [
  {
    field: "idNumber",
    title: translate.t("arOpportunity.list.columns.idNumber"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityTypeOfIdNumber = [
  {
    field: "typeOfIdNumber",
    title: translate.t("arOpportunity.list.columns.typeOfIdNumber"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityUltimateParentBvdId = [
  {
    field: "ultimateParentBvdId",
    title: translate.t("arOpportunity.list.columns.ultimateParentBvdId"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityLegalForm = [
  {
    field: "legalForm",
    title: translate.t("arOpportunity.list.columns.legalForm"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityRelationshipType = [
  {
    field: "relationshipType",
    title: translate.t("arOpportunity.list.columns.relationshipType"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityParentIndustryNaics = [
  {
    field: "parentIndustryNaics",
    title: translate.t("arOpportunity.list.columns.parentIndustryNaics"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityParentIndustryNaicsCode = [
  {
    field: "parentIndustryNaicsCode",
    title: translate.t("arOpportunity.list.columns.parentIndustryNaicsCode"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunitySmeClassificationStatus = [
  {
    field: "smeClassificationStatus",
    title: translate.t("arOpportunity.list.columns.smeClassificationStatus"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityEstimatedCompanySize = [
  {
    field: "estimatedCompanySize",
    title: translate.t("arOpportunity.list.columns.estimatedCompanySize"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "boolean",
    resizable: true,
    cell: "booleanYesNoColumn"
  }
];

export const opportunityIsCompanySizeFromParent = [
  {
    field: "isCompanySizeFromParent",
    title: translate.t("arOpportunity.list.columns.isCompanySizeFromParent"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "boolean",
    resizable: true,
    cell: "booleanYesNoColumn"
  }
];

export const opportunityAnnualRevenueIsEstimated = [
  {
    field: "annualRevenueIsEstimated",
    title: translate.t("arOpportunity.list.columns.annualRevenueIsEstimated"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "boolean",
    resizable: true,
    cell: "booleanYesNoColumn"
  }
];

// AB#20356: footerCell added to all 3 below to match AP's analogous `entity*OwnedBusiness`
// exports (which already ship `TotalsBycolumnsCountTrue`) - a count of how many rows are `true`.
// The column names also need adding to totalColumnsUtils.ts's `getFieldsByTrueValue` (AR's own
// field names aren't in that shared, AP/Match-oriented list) or the footer still won't request
// them - see that file's own note.
export const opportunityIsMinorityOwned = [
  {
    field: "isMinorityOwned",
    title: translate.t("arOpportunity.list.columns.isMinorityOwned"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "boolean",
    resizable: true,
    cell: "booleanYesNoColumn",
    footerCell: "TotalsBycolumnsCountTrue"
  }
];

export const opportunityIsVeteranOwned = [
  {
    field: "isVeteranOwned",
    title: translate.t("arOpportunity.list.columns.isVeteranOwned"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "boolean",
    resizable: true,
    cell: "booleanYesNoColumn",
    footerCell: "TotalsBycolumnsCountTrue"
  }
];

export const opportunityIsWomanOwned = [
  {
    field: "isWomanOwned",
    title: translate.t("arOpportunity.list.columns.isWomanOwned"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "boolean",
    resizable: true,
    cell: "booleanYesNoColumn",
    footerCell: "TotalsBycolumnsCountTrue"
  }
];

export const opportunityIsPublic = [
  {
    field: "isPublic",
    title: translate.t("arOpportunity.list.columns.isPublic"),
    width: "140px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "boolean",
    resizable: true,
    cell: "booleanYesNoColumn"
  }
];

// -- Credit & scoring --------------------------------------------------------------------------

export const opportunityCreditScore = [
  {
    field: "creditScore",
    title: translate.t("arOpportunity.list.columns.creditScore"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

/** G-810: the buyer's credit rating LABEL (AAA, BB+…), on both AR grains. Replaces the numeric
 * `opportunityCreditScore` as the lists' Credit Rating column. */
export const opportunityCreditRating = [
  {
    field: "creditRating",
    title: translate.t("arOpportunity.list.gridColumns.creditRating"),
    width: "150px",
    allowHide: true,
    hidden: false,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplate"
  }
];

export const opportunityDsoReference = [
  {
    field: "dsoReference",
    title: translate.t("arOpportunity.list.columns.dsoReference"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityModeFinanceCreditScore = [
  {
    field: "modeFinanceCreditScore",
    title: translate.t("arOpportunity.list.columns.modeFinanceCreditScore"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityCreditInsured = [
  {
    field: "creditInsured",
    title: translate.t("arOpportunity.list.columns.creditInsured"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

// -- Financial terms & negotiation ---------------------------------------------------------------

export const opportunityModelCashFlow = [
  {
    field: "modelCashFlow",
    title: translate.t("arOpportunity.list.columns.modelCashFlow"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "moneyTemplate"
  }
];

export const opportunityTargetPaymentTerms = [
  {
    field: "targetPaymentTerms",
    title: translate.t("arOpportunity.list.columns.targetPaymentTerms"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityNegotiationStatusCode = [
  {
    field: "negotiationStatusCode",
    title: translate.t("arOpportunity.list.columns.negotiationStatusCode"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityNegotiationStatusUpdatedAt = [
  {
    field: "negotiationStatusUpdatedAt",
    title: translate.t("arOpportunity.list.columns.negotiationStatusUpdatedAt"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "date",
    resizable: true,
    cell: "dateColumn"
  }
];

export const opportunityPeriodInDays = [
  {
    field: "periodInDays",
    title: translate.t("arOpportunity.list.columns.periodInDays"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

// -- WACC & strategy codes ------------------------------------------------------------------------

export const opportunityAfterTaxWacc = [
  {
    field: "afterTaxWacc",
    title: translate.t("arOpportunity.list.columns.afterTaxWacc"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityPreTaxWacc = [
  {
    field: "preTaxWacc",
    title: translate.t("arOpportunity.list.columns.preTaxWacc"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityWaccSource = [
  {
    field: "waccSource",
    title: translate.t("arOpportunity.list.columns.waccSource"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunityWaccFromParent = [
  {
    field: "waccFromParent",
    title: translate.t("arOpportunity.list.columns.waccFromParent"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "boolean",
    resizable: true,
    cell: "booleanYesNoColumn"
  }
];

export const opportunityPeerGroupStandard2Strategy = [
  {
    field: "peerGroupStandard2Strategy",
    title: translate.t("arOpportunity.list.columns.peerGroupStandard2Strategy"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityIndustryRegionStandardStrategy = [
  {
    field: "industryRegionStandardStrategy",
    title: translate.t("arOpportunity.list.columns.industryRegionStandardStrategy"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityBuyerParentMinStrategy = [
  {
    field: "buyerParentMinStrategy",
    title: translate.t("arOpportunity.list.columns.buyerParentMinStrategy"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityRegulatoryTermsStrategy = [
  {
    field: "regulatoryTermsStrategy",
    title: translate.t("arOpportunity.list.columns.regulatoryTermsStrategy"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityRegulatoryTermsEnforced = [
  {
    field: "regulatoryTermsEnforced",
    title: translate.t("arOpportunity.list.columns.regulatoryTermsEnforced"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "boolean",
    resizable: true,
    cell: "booleanYesNoColumn"
  }
];

export const opportunityBuyerLeverage = [
  {
    field: "buyerLeverage",
    title: translate.t("arOpportunity.list.columns.buyerLeverage"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunitySupplierLeverage = [
  {
    field: "supplierLeverage",
    title: translate.t("arOpportunity.list.columns.supplierLeverage"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityBuyerLeverageLevel = [
  {
    field: "buyerLeverageLevel",
    title: translate.t("arOpportunity.list.columns.buyerLeverageLevel"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

export const opportunitySupplierLeverageLevel = [
  {
    field: "supplierLeverageLevel",
    title: translate.t("arOpportunity.list.columns.supplierLeverageLevel"),
    width: "160px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "text",
    resizable: true,
    cell: "textTemplateLeftAlign"
  }
];

// -- Operational / misc ---------------------------------------------------------------------------

export const opportunityUsingWorkingCapitalFinance = [
  {
    field: "usingWorkingCapitalFinance",
    title: translate.t("arOpportunity.list.columns.usingWorkingCapitalFinance"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "boolean",
    resizable: true,
    cell: "booleanYesNoColumn"
  }
];

export const opportunityDataQuality = [
  {
    field: "dataQuality",
    title: translate.t("arOpportunity.list.columns.dataQuality"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityYear = [
  {
    field: "year",
    title: translate.t("arOpportunity.list.columns.year"),
    width: "110px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityPayOnTermsStrategyIsApplicable = [
  {
    field: "payOnTermsStrategyIsApplicable",
    title: translate.t("arOpportunity.list.columns.payOnTermsStrategyIsApplicable"),
    width: "180px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "boolean",
    resizable: true,
    cell: "booleanYesNoColumn"
  }
];

// The line grain's own `dpo` - a different metric from the party grain's pre-existing `opportunityDpo`
// above despite sharing a GraphQL field name (see this section's header comment); own export so the
// two are never confused at a call site.
export const opportunityLineDpo = [
  {
    field: "dpo",
    title: translate.t("arOpportunity.list.columns.lineDpo"),
    width: "130px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];

export const opportunityDpoStrategy = [
  {
    field: "dpoStrategy",
    title: translate.t("arOpportunity.list.columns.dpoStrategy"),
    width: "150px",
    allowHide: true,
    hidden: true,
    sortable: true,
    filter: "numeric",
    resizable: true,
    cell: "decimalsTemplate"
  }
];