import { translate } from "@/utils/translation";

const columnsCompaniesAdmin = [
  {
    field: "name",
    title: translate.t("adminBackend.companiesAdmin.companyName"),
    width: 250,
    resizable: false,
    allowHide: true,
    hidden: false,
    filter: "text",
    locked: true,
    columnMenu: false
  },
  {
    field: "limitUsers",
    title: translate.t("adminBackend.adminUploadData.grid.userCount"),
    width: 110,
    resizable: true,
    allowHide: true,
    hidden: false,
    filter: "text",
    filterable: false,
    columnMenu: false,
    cell: "limitUsers"
  },
  {
    field: "actions",
    title: translate.t("global.actions"),
    width: 110,
    resizable: false,
    allowHide: true,
    hidden: false,
    filter: "text",
    locked: true,
    columnMenu: false,
    cell: "actionsCompany",
    sortable: false
  },
  // WI#18362. Sits immediately after Actions, ahead of the modules and features, because it is
  // about the client company itself rather than about what it has switched on.
  {
    field: "activeClient",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.activeClient"),
    cell: "activeClient",
    // WI#19987: wide enough to keep the checkbox, the (Auto)/(Manual) caption and the Set
    // Auto button on a single line.
    width: 230,
    resizable: true,
    allowHide: true,
    hidden: false,
    // Sortable and filterable so a Super Admin can pull the active clients to the top or keep
    // only those. Not in the story's criteria, asked for on top.
    filter: "boolean",
    filterable: true,
    columnMenu: true,
    sortable: true
  },
  {
    field: "moduleAnalyzeIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.modules.analyze"),
    cell: "moduleAnalyzeIsAvailable",
    width: 105
  },
  {
    field: "moduleProgramIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.modules.opportunity"),
    cell: "moduleProgramIsAvailable",
    width: 115
  },
  {
    field: "modulePlanIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.modules.plan"),
    cell: "modulePlanIsAvailable",
    width: 85
  },
  {
    field: "moduleManageIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.modules.manage"),
    cell: "moduleManageIsAvailable",
    width: 105
  },
  {
    field: "moduleEntityCardIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.modules.suppliers"),
    cell: "moduleEntityCardIsAvailable",
    width: 115
  },
  {
    field: "moduleCompareIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.modules.compare"),
    cell: "moduleCompareIsAvailable",
    width: 115
  },
  {
    field: "moduleOverviewIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.modules.match"),
    cell: "moduleOverviewIsAvailable",
    width: 95
  },
  // UC-ENT-12. Sits with the modules rather than the features because it is the same kind of
  // switch, even though what it enables is a whole application rather than a screen.
  {
    field: "moduleArIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.modules.receivables"),
    cell: "moduleArIsAvailable",
    width: 155
  },
  {
    field: "downloadExcelIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.downloadExcel"),
    cell: "featureDownloadExcelCell",
    width: 115
  },
  {
    field: "matchDowloadExcelIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.matchDownloadExcel"),
    cell: "matchDowloadExcelCell",
    width: 115
  },
  {
    field: "scfStandardStrategy",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.scfStrategy"),
    cell: "scfStandardStrategy",
    width: 115
  },
  {
    field: "featureEmailNegotiationsIsAvailable",
    title: translate.t(
      "adminBackend.companiesAdmin.columnsTitles.features.emailNegotiation"
    ),
    cell: "featureEmailNegotiationsIsAvailable",
    width: 115
  },
  {
    field: "feature9BoxesFinancing",
    title: translate.t(
      "adminBackend.companiesAdmin.columnsTitles.features.9BoxesFinancing"
    ),
    cell: "feature9BoxesFinancing",
    width: 115
  },
  {
    field: "featureCreditRating",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.creditRating"),
    cell: "featureCreditRating",
    width: 115
  },

  {
    field: "featureLeverageDistribution",
    title: translate.t(
      "adminBackend.companiesAdmin.columnsTitles.features.leverageDistribution"
    ),
    cell: "featureLeverageDistributionCell",
    width: 115
  },

  {
    field: "featureVCardIsAvailable",
    title: translate.t(
      "adminBackend.companiesAdmin.columnsTitles.features.vCard"
    ),
    cell: "featureVCardIsAvailable",
    width: 115
  },
  {
    field: "featureSME",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.sME"),
    cell: "featureSME",
    width: 115
  },
  {
    field: "featurePilotAccountIsAvailable",
    title: translate.t(
      "adminBackend.companiesAdmin.columnsTitles.features.pilotAccount"
    ),
    cell: "featurePilotAccountIsAvailable",
    width: 115
  },
  {
    field: "pilotTimeExpires",
    title: translate.t(
      "adminBackend.companiesAdmin.columnsTitles.features.pilotAccountTimeLimit"
    ),
    cell: "featurePilotAccountTimeLimit",
    width: 165
  },

  {
    field: "featurePaymentTermsvsPrice",
    title: translate.t(
      "adminBackend.companiesAdmin.columnsTitles.features.paymentTermsVsPrice"
    ),
    cell: "paymentTermsvsPriceCell",
    width: 115
  },

  {
    field: "featureValueProposition",
    title: translate.t(
      "adminBackend.companiesAdmin.columnsTitles.features.valueProposition"
    ),
    cell: "valuePropositionCell",
    width: 115
  },

  {
    field: "featureEntityCardNewsletter",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.entityCardNewsletter"),
    cell: "featureEntityCardNewsletterCell",
    width: 115
  },
  {
    field: "featureKeepHistoricalData",
    title: translate.t('adminBackend.companiesAdmin.columnsTitles.features.keepHistoricalData'),
    cell: "featureKeepHistoricalDataCell",
    width: 115
  },
  {
    field: "featureSupplierStandard",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.supplierStandard"),
    cell: "featureSupplierStandard",
    width: 150
  },
  {
    field: "featurePeerGroupStandard",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.peerGroupStandard"),
    cell: "featurePeerGroupStandard",
    width: 170
  },  
  {  
    field: "featureSupplierInsightsIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.supplierInsights"),
    cell: "featureSupplierInsightsIsAvailable",
    width: 150
  },  
  {
    field: "featureForecastVolumeIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.forecastVolume"),
    cell: "featureForecastVolumeIsAvailable",
    width: 150
  },
  {
    field: "featureSupportBot",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.supportBot"),
    cell: "featureSupportBot",
    width: 150
  },
  {
    field: "featurePotentialSuppliersIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.potentialSuppliers"),
    cell: "featurePotentialSuppliersIsAvailable",
    width: 150
  },
  {
    field: "potentialSupplierRequestLimit",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.potentialSuppliersLimit"),
    cell: "potentialSuppliersLimitCell",
    width: 300
  },
  {
    field: "featureAiBotNegotiation",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.aiBotNegotiation"),
    cell: "featureAiBotNegotiation",
    width: 150
  },
  {
    field: "featureDynamicFilteredSummariesIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.dynamicFilteredSummaries"),
    cell: "featureDynamicFilteredSummariesIsAvailable",
    width: 150
  },
  {
    field: "featureDownloadPdfEntityIsAvailable",
    title: translate.t("adminBackend.companiesAdmin.columnsTitles.features.downloadPdfEntity"),
    cell: "featureDownloadPdfEntityIsAvailable",
    width: 115
  },
];


export default columnsCompaniesAdmin;
