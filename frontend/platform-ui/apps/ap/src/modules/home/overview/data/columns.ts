import { translate } from "../../../../utils/translation";

export const defaultTop5GridColumns = [
  {
    field: "volume",
    title: translate.t("home.analyze.table.volume"),
    width: "150px",
    allowHide: true,
    hidden: false,
    filter: "numeric",
    resizable: true,
    cell: "moneyTemplate",
    columnMenu: false
  }
];

export const defaultSuppliersTop5GridColumns = [
  {
    field: "name",
    title: translate.t("home.analyze.table.spendsAmount"),
    resizable: false,
    allowHide: true,
    hidden: false,
    filter: "text",
    locked: true,
    columnMenu: false
  },
  ...defaultTop5GridColumns
];

export const defaultCountriesTop5GridColumns = [
  {
    field: "translatedName",
    title: translate.t("global.country"),
    resizable: false,
    allowHide: true,
    hidden: false,
    filter: "text",
    cell: "textTemplate",
    locked: true,
    columnMenu: false
  },
  ...defaultTop5GridColumns
];

export const defaultIndustriesTop5GridColumns = [
  {
    field: "name",
    title: translate.t("home.analyze.table.industry"),
    resizable: false,
    allowHide: true,
    hidden: false,
    filter: "text",
    locked: true,
    columnMenu: false
  },
  ...defaultTop5GridColumns
];

export const defaultCommoditiesTop5GridColumns = [
  {
    field: "commodity",
    title: translate.t("home.analyze.table.commodity"),
    resizable: false,
    allowHide: true,
    hidden: false,
    filter: "text",
    locked: true,
    columnMenu: false
  },
  ...defaultTop5GridColumns
];

export const defaultCurrencyTop5GridColumns = [
  {
    field: "code",
    title: translate.t("home.analyze.table.currency"),
    resizable: false,
    allowHide: true,
    hidden: false,
    filter: "text",
    locked: true,
    columnMenu: false
  },
  ...defaultTop5GridColumns
];

export const defaultMatchOverviewListGridColumns = [
  {
    title: translate.t("home.overview.results"),
    resizable: false,
    width: "270px",
    hidden: false,
    locked: false,
    //className: "k-grid-content-sticky",
    children: [
      {
        field: "status",
        title: translate.t("home.analyze.table.status"),
        width: "120px",
        className: "text-center",
        allowHide: true,
        hidden: false,
        type: "text",
        resizable: false,
        locked: false,
        columnMenu: "columnMenuTemplate"
      },
      {
        field: "confidenceScore",
        title: translate.t("home.overview.list.confidanceScore"),
        width: "150px",
        allowHide: false,
        hidden: false,
        resizable: false,
        type: "text",
        locked: false,
        cell: "confidenceScoreColumnSticky",
        columnMenu: "columnMenuTemplate"
      },
      {
        field: "name",
        title: translate.t("home.overview.list.supplierName"),
        width: "250px",
        allowHide: true,
        hidden: false,
        type: "text",
        resizable: false,
        locked: false,
        columnMenu: "columnMenuTemplate",
        cell: "nameMatchListTooltipSticky"
      },
    ]
  },
  {
    title: translate.t("home.overview.suppliersAnalyzedAndMatched"),
    resizable: false,
    children: [
      {
        field: "originalSupplierName",
        title: translate.t("home.overview.list.supplierNameReceived"),
        width: "420px",
        allowHide: true,
        hidden: false,
        type: "text",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "originalSupplierNameMatch"
      },
      {
        field: "aggregatedLinesCount",
        title: translate.t("home.overview.list.aggregatedLinesCount"),
        allowHide: true,
        hidden: false,
        width: "150px",
        type: "number",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: 'aggregatedLinesCountMatch',
        footerCell: 'aggreatedLinesCountMatchFooter'
      },
      {
        field: "originalIdNumber",
        title: translate.t("home.overview.list.idNumber"),
        allowHide: true,
        hidden: false,
        width: "150px",
        className: "text-center",
        type: "number",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: 'originalIdNumberMatch'
      },
      {
        field: "parentCompanyName",
        title: translate.t("home.overview.list.ultimateParentCompany"),
        width: "200px",
        allowHide: true,
        hidden: false,
        className: "wrap-text-column",
        type: "number",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "supplierNameMatchListUltimateParentTooltip"
      },
      {
        field: "originalParentCompanyName",
        title: translate.t("home.overview.list.ultimateParentCompanyReceived"),
        width: "200px",
        allowHide: true,
        hidden: false,
        className: "wrap-text-column",
        type: "number",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "originalParentCompanyNameMatch"
      },
      {
        field: "volume",
        title: translate.t("home.overview.list.spendVolume"),
        width: "120px",
        className: "text-right",
        allowHide: true,
        hidden: false,
        type: "number",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "moneyTemplate"
      },
      {
        field: "commodity",
        title: translate.t("home.overview.list.commodity"),
        width: "150px",
        allowHide: true,
        hidden: false,
        type: "number",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "commodityColumn"
      },
      {
        field: "address",
        title: translate.t("home.overview.list.address"),
        width: "220px",
        allowHide: true,
        hidden: true,
        type: "text",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "addressTooltip"
      },
      {
        field: "originalAddress",
        title: translate.t("home.overview.list.addressReceived"),
        allowHide: true,
        hidden: true,
        width: "220px",
        type: "text",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "originalAddressMatch"
      },
      {
        field: "city",
        title: translate.t("home.overview.list.city"),
        width: "200px",
        className: "text-left",
        allowHide: true,
        hidden: true,
        type: "text",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell:"cityMatch"
      },
      {
        field: "originalCity",
        title: translate.t("home.overview.list.cityReceived"),
        width: "200px",
        className: "text-left",
        allowHide: true,
        hidden: true,
        type: "text",
        resizable: false,
        columnMenu: "originalCityMatch"
      },
      {
        field: "state",
        title: translate.t("home.overview.list.state"),
        width: "200px",
        className: "text-left",
        type: "text",
        allowHide: true,
        hidden: true,
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "stateMatch"
      },
      {
        field: "originalState",
        title: translate.t("home.overview.list.stateReceived"),
        width: "200px",
        className: "text-left",
        type: "text",
        allowHide: true,
        hidden: true,
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell:'originalStateMatch'
      },
      {
        field: "zipCode",
        title: translate.t("home.overview.list.zipCode"),
        width: "100px",
        type: "text",
        allowHide: true,
        hidden: true,
        className: "text-left",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "zipCodeMatch"
      },
      {
        field: "originalZipCode",
        title: translate.t("home.overview.list.zipCodeReceived"),
        width: "100px",
        type: "text",
        allowHide: true,
        hidden: true,
        className: "text-left",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "originalZipCodeMatch"
      },
      {
        field: "country",
        title: translate.t("global.countrySupplier"),
        width: "100px",
        type: "text",
        className: "k-text-capitalize",
        allowHide: true,
        hidden: false,
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "countryMatch"
      },
      {
        field: "alpha3Code",
        title: translate.t("home.overview.list.countryISOCode"),
        width: "100px",
        allowHide: true,
        hidden: false,
        type: "text",
        className: "text-center",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "alpha3CodeMatch"
      },
      {
        field: "domain",
        title: translate.t("home.overview.list.url"),
        width: "200px",
        className: "wrap-text-column",
        allowHide: true,
        hidden: false,
        type: "text",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "domainMatch"
      },
      {
        field: "currency",
        title: translate.t("home.overview.list.spendCurrency"),
        width: "100px",
        className: "text-center",
        allowHide: true,
        hidden: false,
        type: "number",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "currencyMatch"
      },
      {
        field: "originalPaymentTermDescription",
        title: translate.t("home.overview.list.paymentTermsDescription"),
        width: "150px",
        className: "text-center",
        type: "number",
        resizable: false,
        cell: 'originalPaymentTermDescriptionMatch'
      },
      {
        field: "contractualPaymentTermsWithoutCashDiscounts",
        title: translate.t(
          "home.overview.list.contractualPaymentTermsWithOutCashDiscount"
        ),
        allowHide: true,
        hidden: false,
        width: "150px",
        className: "text-center",
        type: "number",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "moneyTemplateRound"
      },
      {
        field: "actualPaymentTerms",
        format: "{0:p0}",
        title: translate.t("home.overview.list.averageCurrentPaymentTerms"),
        width: "150px",
        className: "text-center",
        allowHide: true,
        hidden: false,
        type: "number",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "moneyTemplateRound"
      },
      {
        field: "contractualPaymentTermsWithCashDiscounts",
        title: translate.t(
          "home.overview.list.contractualPaymentTermsWithCashDiscount"
        ),
        width: "150px",
        className: "text-center",
        type: "number",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "moneyTemplateRound"
      },
      {
        field: "cashDiscounts",
        cell: "percentColumn",
        title: translate.t("home.overview.list.cashDiscounts"),
        width: "150px",
        className: "text-center",
        type: "number",
        allowHide: true,
        hidden: false,
        resizable: false,
        columnMenu: "columnMenuTemplate"
      },
      {
        field: "reason",
        title: translate.t("home.overview.list.reason"),
        allowHide: true,
        hidden: false,
        width: "150px",
        type: "text",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "textTemplate"
      },
      {
        field: "capturedCashDiscounts",
        title: translate.t("home.overview.list.capturedCashDiscounts"),
        width: "150px",
        className: "text-center",
        allowHide: true,
        hidden: false,
        type: "number",
        resizable: false,
        columnMenu: "columnMenuTemplate",
        cell: "moneyTemplate"
      }
    ]
  }
];
