import * as Iso36166 from "@/utils/ISO3166-1";
import { ChartData } from "../types/charting";

/**
 * Translation function type for internationalization
 */
type TranslateFn = (key: string) => string;

/**
 * Configuration options for chart axis labels
 */
interface ChartOptions {
  /** Translation key for the volume/spend X-axis label */
  volumeXAxisKey: string;
  /** Translation key for the procurement team spends X-axis label */
  procurementTeamSpendsXAxisKey: string;
}

const defaultChartOptions: ChartOptions = {
  volumeXAxisKey: "global.spend",
  procurementTeamSpendsXAxisKey: "global.spend",
};

/**
 * Base interface for chart data items with common properties
 */
interface BaseChartDataItem {
  total?: number;
  spend?: number;
  buyerAmount?: number;
  countryCode?: string;
  materialityDescription?: string;
}

/**
 * Data item for supplier volume charts
 */
interface SupplierVolumeDataItem extends BaseChartDataItem {
  buyerName?: string;
  region?: string;
  industryName?: string;
  commodityName?: string;
  creditScoreRange?: string;
  team?: string;
}

/**
 * Data item for supplier concentration charts
 */
interface SupplierConcentrationDataItem extends BaseChartDataItem {
  buyerName?: string;
  region?: string;
  industryName?: string;
  commodityName?: string;
  creditScoreLevel?: string;
  team?: string;
}

/**
 * Data item for supplier group charts
 */
interface SupplierGroupDataItem {
  supplierCount?: number;
  spendCount?: number;
  countryCode?: string;
  regionName?: string;
  buyerName?: string;
  team?: string;
  industry?: string;
  commodity?: string;
  creditScoreLevel?: string;
  materialityDescription?: string;
  currencies?: string;
  corporations?: string;
}

/**
 * Data item for actual payment terms charts
 */
interface PaymentTermsDataItem {
  buyerAvg?: number;
  teamAvg?: number;
  countryAvg?: number;
  avg?: number;
  buyerName?: string;
  supplierTeam?: string;
  supplierCountry?: string;
  region?: string;
  industryName?: string;
  commodityName?: string;
  companySizeDesc?: string;
  materialityDescription?: string;
  creditScoreLevel?: string;
}

/**
 * Logs a warning when an unrecognized chart type is encountered
 * @param selectedChart - The unrecognized chart type
 * @param functionName - The name of the function where the warning occurred
 */
function logUnrecognizedChart(selectedChart: string, functionName: string): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[${functionName}] Unrecognized chart type: "${selectedChart}". Returning default values.`,
    );
  }
}

/**
 * Parses supplier volume data for chart visualization.
 * Transforms raw data into a structured format based on the selected chart type.
 *
 * @param selectedChart - The type of chart to generate (translated key)
 * @param myData - Array of supplier volume data items
 * @param t - Translation function for internationalization
 * @param options - Optional chart configuration for axis labels
 * @returns ChartData object with parsed data ready for visualization
 */
export const parseSupplierVolumeForChart = (
  selectedChart: string,
  myData: SupplierVolumeDataItem[],
  t: TranslateFn,
  options: ChartOptions = defaultChartOptions,
): ChartData => {
  const valueObj: ChartData = {
    chartTitle: "",
    xAxisTitle: "",
    yAxisTitle: "",
    dataSeries: [],
    categoriesData: [],
    isBigNumber: false,
    isLoading: true,
    isShowingPieChart: false,
  };

  switch (selectedChart) {
    case t("home.categorize.spendVolumeCharts.perBuyingEntity"):
      valueObj.chartTitle = t("home.categorize.spendVolumeCharts.perBuyingEntity");
      valueObj.xAxisTitle = t(options.volumeXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.buyerAmount ?? 0);
      valueObj.categoriesData = myData.map((item) => item.buyerName ?? "");
      valueObj.isShowingPieChart = false;
      valueObj.isBigNumber = true;
      break;
    case t("home.categorize.spendVolumeCharts.perBuyerLeverage"):
      valueObj.chartTitle = t("home.categorize.spendVolumeCharts.perBuyerLeverage");
      valueObj.xAxisTitle = t(options.volumeXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.materialityDescription ?? "");
      valueObj.isShowingPieChart = false;
      valueObj.isBigNumber = true;
      break;
    case t("home.categorize.spendVolumeCharts.perCountry"):
      valueObj.chartTitle = t("home.categorize.spendVolumeCharts.perCountry");
      valueObj.xAxisTitle = t(options.volumeXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) =>
        Iso36166.getCountryName(item.countryCode ?? ""),
      );
      valueObj.isShowingPieChart = false;
      valueObj.isBigNumber = true;
      break;
    case t("home.categorize.spendVolumeCharts.perRegion"):
      valueObj.chartTitle = t("home.categorize.spendVolumeCharts.perRegion");
      valueObj.xAxisTitle = t(options.volumeXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.spend ?? 0);
      valueObj.categoriesData = myData.map((item) => item.region ?? "");
      valueObj.isShowingPieChart = false;
      valueObj.isBigNumber = true;
      break;
    case t("home.categorize.spendVolumeCharts.perIndustry"):
      valueObj.chartTitle = t("home.categorize.spendVolumeCharts.perIndustry");
      valueObj.xAxisTitle = t(options.volumeXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.industryName ?? "");
      valueObj.isShowingPieChart = false;
      valueObj.isBigNumber = true;
      break;
    case t("home.categorize.spendVolumeCharts.perCommodity"):
      valueObj.chartTitle = t("home.categorize.spendVolumeCharts.perCommodity");
      valueObj.xAxisTitle = t(options.volumeXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.commodityName ?? "");
      valueObj.isShowingPieChart = false;
      valueObj.isBigNumber = false;
      break;
    case t("home.categorize.spendVolumeCharts.perSupplierCreditRating"):
      valueObj.chartTitle = t(
        "home.categorize.spendVolumeCharts.perSupplierCreditRating",
      );
      valueObj.xAxisTitle = t(options.volumeXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.spend ?? 0);
      valueObj.categoriesData = myData.map((item) => item.creditScoreRange ?? "");
      valueObj.isShowingPieChart = false;
      valueObj.isBigNumber = true;
      break;
    case t("home.categorize.spendVolumeCharts.perProcurementTeam"):
      valueObj.chartTitle = t("home.categorize.spendVolumeCharts.perProcurementTeam");
      valueObj.xAxisTitle = t(options.volumeXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.spend ?? 0);
      valueObj.categoriesData = myData.map((item) => item.team ?? "");
      valueObj.isShowingPieChart = false;
      valueObj.isBigNumber = true;
      break;
    case t("home.categorize.spendVolumeCharts.perFinancingCosts"):
      valueObj.chartTitle = t("home.categorize.spendVolumeCharts.perFinancingCosts");
      valueObj.xAxisTitle = t(options.volumeXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.countryCode ?? "");
      valueObj.isShowingPieChart = false;
      break;
    case t("home.categorize.spendVolumeCharts.perCurrency"):
      valueObj.chartTitle = t("home.categorize.spendVolumeCharts.perCurrency");
      valueObj.xAxisTitle = t(options.volumeXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.countryCode ?? "");
      valueObj.isShowingPieChart = false;
      break;
    case t("home.categorize.spendVolumeCharts.perSupplierCompanySize"):
      valueObj.chartTitle = t("home.categorize.spendVolumeCharts.perSupplierCompanySize");
      valueObj.xAxisTitle = t("global.numberOfSuppliers");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.countryCode ?? "");
      valueObj.isShowingPieChart = false;
      break;
    case t("home.categorize.spendVolumeCharts.per9Box"):
      valueObj.chartTitle = t("home.categorize.spendVolumeCharts.per9Box");
      valueObj.xAxisTitle = t(options.volumeXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.countryCode ?? "");
      valueObj.isShowingPieChart = false;
      break;
    case t("home.categorize.spendVolumeCharts.perESGScore"):
      valueObj.chartTitle = t("home.categorize.spendVolumeCharts.perESGScore");
      valueObj.xAxisTitle = t(options.volumeXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.countryCode ?? "");
      valueObj.isShowingPieChart = false;
      break;
    case t("home.categorize.spendVolumeCharts.perDEIScore"):
      valueObj.chartTitle = t("home.categorize.spendVolumeCharts.perDEIScore");
      valueObj.xAxisTitle = t(options.volumeXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.countryCode ?? "");
      valueObj.isShowingPieChart = false;
      break;
    case t("home.categorize.spendVolumeCharts.perDataDepth"):
      valueObj.chartTitle = t("home.categorize.spendVolumeCharts.perDataDepth");
      valueObj.xAxisTitle = t(options.volumeXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.countryCode ?? "");
      valueObj.isShowingPieChart = false;
      break;
    default:
      logUnrecognizedChart(selectedChart, "parseSupplierVolumeForChart");
      break;
  }

  // Set isLoading to false after processing (if a valid case was matched)
  if (valueObj.chartTitle !== "") {
    valueObj.isLoading = false;
  }

  return valueObj;
};

/**
 * Parses supplier concentration data for chart visualization.
 * Transforms raw data into a structured format for pie chart visualization.
 *
 * @param selectedChart - The type of chart to generate (translated key)
 * @param myData - Array of supplier concentration data items
 * @param t - Translation function for internationalization
 * @returns ChartData object with parsed data ready for pie chart visualization
 */
export const parseSupplierConcentrationForChart = (
  selectedChart: string,
  myData: SupplierConcentrationDataItem[],
  t: TranslateFn,
): ChartData => {
  const valueObj: ChartData = {
    chartTitle: "",
    xAxisTitle: "",
    yAxisTitle: "",
    dataSeries: [],
    categoriesData: [],
    isBigNumber: false,
    isLoading: true,
    isShowingPieChart: false,
  };

  switch (selectedChart) {
    case t("home.categorize.spendConcentrationCharts.spendConcentrationPerBuyerLeverage"):
      valueObj.chartTitle = t(
        "home.categorize.spendConcentrationCharts.spendConcentrationPerBuyerLeverage",
      );
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.materialityDescription ?? "");
      valueObj.isShowingPieChart = true;
      break;
    case t("home.categorize.spendConcentrationCharts.spendConcentrationPerBuyingEntity"):
      valueObj.chartTitle = t(
        "home.categorize.spendConcentrationCharts.spendConcentrationPerBuyingEntity",
      );
      valueObj.dataSeries = myData.map((item) => item.buyerAmount ?? 0);
      valueObj.categoriesData = myData.map((item) => item.buyerName ?? "");
      valueObj.isShowingPieChart = true;
      break;
    case t("home.categorize.spendConcentrationCharts.spendConcentrationPerCountry"):
      valueObj.chartTitle = t(
        "home.categorize.spendConcentrationCharts.spendConcentrationPerCountry",
      );
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.countryCode ?? "");
      valueObj.isShowingPieChart = true;
      break;
    case t("home.categorize.spendConcentrationCharts.spendConcentrationPerRegion"):
      valueObj.chartTitle = t(
        "home.categorize.spendConcentrationCharts.spendConcentrationPerRegion",
      );
      valueObj.dataSeries = myData.map((item) => item.spend ?? 0);
      valueObj.categoriesData = myData.map((item) => item.region ?? "");
      valueObj.isShowingPieChart = true;
      break;
    case t("home.categorize.spendConcentrationCharts.spendConcentrationPerIndustry"):
      valueObj.chartTitle = t(
        "home.categorize.spendConcentrationCharts.spendConcentrationPerIndustry",
      );
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.industryName ?? "");
      valueObj.isShowingPieChart = true;
      break;
    case t("home.categorize.spendConcentrationCharts.spendConcentrationPerCreditRating"):
      valueObj.chartTitle = t(
        "home.categorize.spendConcentrationCharts.spendConcentrationPerCreditRating",
      );
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.creditScoreLevel ?? "");
      valueObj.isShowingPieChart = true;
      break;
    case t("home.categorize.spendConcentrationCharts.spendConcentrationPerCommodity"):
      valueObj.chartTitle = t(
        "home.categorize.spendConcentrationCharts.spendConcentrationPerCommodity",
      );
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.commodityName ?? "");
      valueObj.isShowingPieChart = true;
      break;
    case t("home.categorize.spendConcentrationCharts.spendConcentrationPerProcurementTeam"):
      valueObj.chartTitle = t(
        "home.categorize.spendConcentrationCharts.spendConcentrationPerProcurementTeam",
      );
      valueObj.dataSeries = myData.map((item) => item.spend ?? 0);
      valueObj.categoriesData = myData.map((item) => item.team ?? "");
      valueObj.isShowingPieChart = true;
      break;
    case t("home.categorize.spendConcentrationCharts.spendConcentrationPerCurrency"):
      valueObj.chartTitle = t(
        "home.categorize.spendConcentrationCharts.spendConcentrationPerCurrency",
      );
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.materialityDescription ?? "");
      valueObj.isShowingPieChart = true;
      break;
    case t("home.categorize.spendConcentrationCharts.spendConcentrationPerCompanySize"):
      valueObj.chartTitle = t(
        "home.categorize.spendConcentrationCharts.spendConcentrationPerCompanySize",
      );
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.materialityDescription ?? "");
      valueObj.isShowingPieChart = true;
      break;
    case t("home.categorize.spendConcentrationCharts.spendConcentrationPerESGScore"):
      valueObj.chartTitle = t(
        "home.categorize.spendConcentrationCharts.spendConcentrationPerESGScore",
      );
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.materialityDescription ?? "");
      valueObj.isShowingPieChart = true;
      break;
    case t("home.categorize.spendConcentrationCharts.spendConcentrationPerDEIScore"):
      valueObj.chartTitle = t(
        "home.categorize.spendConcentrationCharts.spendConcentrationPerDEIScore",
      );
      valueObj.dataSeries = myData.map((item) => item.total ?? 0);
      valueObj.categoriesData = myData.map((item) => item.materialityDescription ?? "");
      valueObj.isShowingPieChart = true;
      break;
    case t("home.categorize.spendConcentrationCharts.spendConcentrationPerTopSuppliers"):
      // Empty case - no data processing needed
      break;
    default:
      logUnrecognizedChart(selectedChart, "parseSupplierConcentrationForChart");
      break;
  }

  // Set isLoading to false after processing (if a valid case was matched)
  if (valueObj.chartTitle !== "") {
    valueObj.isLoading = false;
  }

  return valueObj;
};

/**
 * Parses supplier group data for chart visualization.
 * Transforms raw data into a structured format based on the selected chart type.
 *
 * @param selectedChart - The type of chart to generate (translated key)
 * @param myData - Array of supplier group data items
 * @param t - Translation function for internationalization
 * @param options - Optional chart configuration for axis labels
 * @returns ChartData object with parsed data ready for visualization
 */
export const parseSupplierGroupForChart = (
  selectedChart: string,
  myData: SupplierGroupDataItem[],
  t: TranslateFn,
  options: ChartOptions = defaultChartOptions,
): ChartData => {
  const valueObj: ChartData = {
    chartTitle: "",
    xAxisTitle: "",
    yAxisTitle: "",
    dataSeries: [],
    isBigNumber: false,
    categoriesData: [],
    isLoading: true,
    isShowingPieChart: false,
  };

  switch (selectedChart) {
    case t("home.categorize.supplierPaymentTermsCharts.perCountry"):
      valueObj.chartTitle = t("home.categorize.supplierPaymentTermsCharts.perCountry");
      valueObj.xAxisTitle = t("global.numberOfSuppliers");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.supplierCount ?? 0);
      valueObj.categoriesData = myData.map((item) => item.countryCode ?? "");
      break;
    case t("home.categorize.supplierPaymentTermsCharts.perRegion"):
      valueObj.chartTitle = t("home.categorize.supplierPaymentTermsCharts.perRegion");
      valueObj.xAxisTitle = t("global.numberOfSuppliers");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.supplierCount ?? 0);
      valueObj.categoriesData = myData.map((item) => item.regionName ?? "");
      break;
    case t("home.categorize.supplierPaymentTermsCharts.perBuyingEntity"):
      valueObj.chartTitle = t(
        "home.categorize.supplierPaymentTermsCharts.perBuyingEntity",
      );
      valueObj.xAxisTitle = t("global.numberOfSuppliers");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.supplierCount ?? 0);
      valueObj.categoriesData = myData.map((item) => item.buyerName ?? "");
      break;
    case t("home.categorize.supplierPaymentTermsCharts.perProcurementTeamSuppliers"):
      valueObj.chartTitle = t(
        "home.categorize.supplierPaymentTermsCharts.perProcurementTeamSuppliers",
      );
      valueObj.xAxisTitle = t("global.numberOfSuppliers");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => Math.ceil(item.supplierCount ?? 0));
      valueObj.categoriesData = myData.map((item) => item.team ?? "");
      break;
    case t("home.categorize.supplierPaymentTermsCharts.perProcurementTeamSpends"):
      valueObj.chartTitle = t(
        "home.categorize.supplierPaymentTermsCharts.perProcurementTeamSpends",
      );
      valueObj.xAxisTitle = t(options.procurementTeamSpendsXAxisKey);
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => Math.ceil(item.spendCount ?? 0));
      valueObj.categoriesData = myData.map((item) => item.team ?? "");
      break;
    case t("home.categorize.supplierPaymentTermsCharts.perIndustrySuppliers"):
      valueObj.chartTitle = t(
        "home.categorize.supplierPaymentTermsCharts.perIndustrySuppliers",
      );
      valueObj.xAxisTitle = t("global.numberOfSuppliers");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.supplierCount ?? 0);
      valueObj.categoriesData = myData.map((item) => item.industry ?? "");
      break;
    case t("home.categorize.supplierPaymentTermsCharts.perCommoditySuppliers"):
      valueObj.chartTitle = t(
        "home.categorize.supplierPaymentTermsCharts.perCommoditySuppliers",
      );
      valueObj.xAxisTitle = t("global.numberOfSuppliers");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.supplierCount ?? 0);
      valueObj.categoriesData = myData.map((item) => item.commodity ?? "");
      break;
    case t("home.categorize.supplierPaymentTermsCharts.perCreditRatingSuppliers"):
      valueObj.chartTitle = t(
        "home.categorize.supplierPaymentTermsCharts.perCreditRatingSuppliers",
      );
      valueObj.xAxisTitle = t("global.numberOfSuppliers");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.supplierCount ?? 0);
      valueObj.categoriesData = myData.map((item) => item.creditScoreLevel ?? "");
      break;
    case t("home.categorize.supplierPaymentTermsCharts.perBuyerLeverageSuppliers"):
      valueObj.chartTitle = t(
        "home.categorize.supplierPaymentTermsCharts.perBuyerLeverageSuppliers",
      );
      valueObj.xAxisTitle = t("global.numberOfSuppliers");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.supplierCount ?? 0);
      valueObj.categoriesData = myData.map((item) => item.materialityDescription ?? "");
      break;
    case t("home.categorize.supplierPaymentTermsCharts.perCurrencySuppliers"):
      valueObj.chartTitle = t(
        "home.categorize.supplierPaymentTermsCharts.perCurrencySuppliers",
      );
      valueObj.xAxisTitle = t("global.numberOfSuppliers");
      valueObj.yAxisTitle = t("global.currencies");
      valueObj.dataSeries = myData.map((item) => item.supplierCount ?? 0);
      valueObj.categoriesData = myData.map((item) => item.currencies ?? "");
      break;
    case t("home.categorize.supplierPaymentTermsCharts.perSupplierCompanySize"):
      valueObj.chartTitle = t(
        "home.categorize.supplierPaymentTermsCharts.perSupplierCompanySize",
      );
      valueObj.xAxisTitle = t("global.numberOfSuppliers");
      valueObj.yAxisTitle = t("global.corporation");
      valueObj.dataSeries = myData.map((item) => item.supplierCount ?? 0);
      valueObj.categoriesData = myData.map((item) => item.corporations ?? "");
      break;
    case t("home.categorize.supplierPaymentTermsCharts.per9BoxSuppliers"):
      valueObj.chartTitle = t(
        "home.categorize.supplierPaymentTermsCharts.per9BoxSuppliers",
      );
      valueObj.xAxisTitle = t("global.numberOfSuppliers");
      valueObj.yAxisTitle = t("global.boxNine");
      valueObj.dataSeries = myData.map((item) => item.supplierCount ?? 0);
      valueObj.categoriesData = myData.map((item) => item.currencies ?? "");
      break;
    case t("home.categorize.supplierPaymentTermsCharts.perESGScoreSuppliers"):
      valueObj.chartTitle = t(
        "home.categorize.supplierPaymentTermsCharts.perESGScoreSuppliers",
      );
      valueObj.xAxisTitle = t("global.numberOfSuppliers");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.supplierCount ?? 0);
      valueObj.categoriesData = myData.map((item) => item.currencies ?? "");
      break;
    case t("home.categorize.supplierPaymentTermsCharts.perDEIScoreSuppliers"):
      valueObj.chartTitle = t(
        "home.categorize.supplierPaymentTermsCharts.perDEIScoreSuppliers",
      );
      valueObj.xAxisTitle = t("global.numberOfSuppliers");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.supplierCount ?? 0);
      valueObj.categoriesData = myData.map((item) => item.currencies ?? "");
      break;
    default:
      logUnrecognizedChart(selectedChart, "parseSupplierGroupForChart");
      break;
  }

  // Set isLoading to false after processing (if a valid case was matched)
  if (valueObj.chartTitle !== "") {
    valueObj.isLoading = false;
  }

  return valueObj;
};

/**
 * Parses actual payment terms data for chart visualization.
 * Transforms raw data into a structured format based on the selected chart type.
 *
 * @param selectedChart - The type of chart to generate (translated key)
 * @param myData - Array of payment terms data items
 * @param t - Translation function for internationalization
 * @returns ChartData object with parsed data ready for visualization
 */
export const parseActualPaymentTermsForChart = (
  selectedChart: string,
  myData: PaymentTermsDataItem[],
  t: TranslateFn,
): ChartData => {
  const valueObj: ChartData = {
    chartTitle: "",
    xAxisTitle: "",
    yAxisTitle: "",
    dataSeries: [],
    categoriesData: [],
    isLoading: true,
    isBigNumber: false,
    isShowingPieChart: false,
  };

  switch (selectedChart) {
    case t("home.categorize.actualPaymentTermsCharts.perBuyingEntity"):
      valueObj.chartTitle = t("home.categorize.actualPaymentTermsCharts.perBuyingEntity");
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.buyerAvg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.buyerName ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perProcurementTeam"):
      valueObj.chartTitle = t("home.categorize.actualPaymentTermsCharts.perProcurementTeam");
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.teamAvg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.supplierTeam ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perCountry"):
      valueObj.chartTitle = t("home.categorize.actualPaymentTermsCharts.perCountry");
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.countryAvg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.supplierCountry ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perRegion"):
      valueObj.chartTitle = t("home.categorize.actualPaymentTermsCharts.perRegion");
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.avg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.region ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perIndustry"):
      valueObj.chartTitle = t("home.categorize.actualPaymentTermsCharts.perIndustry");
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.avg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.industryName ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perCommodity"):
      valueObj.chartTitle = t("home.categorize.actualPaymentTermsCharts.perCommodity");
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.avg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.commodityName ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perSupplierCompanySize"):
      valueObj.chartTitle = t(
        "home.categorize.actualPaymentTermsCharts.perSupplierCompanySize",
      );
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.avg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.companySizeDesc ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perBuyerLeverage"):
      valueObj.chartTitle = t("home.categorize.actualPaymentTermsCharts.perBuyerLeverage");
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.avg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.materialityDescription ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perCreditRating"):
      valueObj.chartTitle = t("home.categorize.actualPaymentTermsCharts.perCreditRating");
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.avg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.creditScoreLevel ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perCurrency"):
      valueObj.chartTitle = t("home.categorize.actualPaymentTermsCharts.perCurrency");
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.avg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.creditScoreLevel ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.per9Box"):
      valueObj.chartTitle = t("home.categorize.actualPaymentTermsCharts.per9Box");
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.avg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.creditScoreLevel ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perESGScore"):
      valueObj.chartTitle = t("home.categorize.actualPaymentTermsCharts.perESGScore");
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.avg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.creditScoreLevel ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perDEIScore"):
      valueObj.chartTitle = t("home.categorize.actualPaymentTermsCharts.perDEIScore");
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.avg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.creditScoreLevel ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perDataDepth"):
      valueObj.chartTitle = t("home.categorize.actualPaymentTermsCharts.perDataDepth");
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.avg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.creditScoreLevel ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perSpendVolume"):
      valueObj.chartTitle = t("home.categorize.actualPaymentTermsCharts.perSpendVolume");
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.avg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.creditScoreLevel ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perNumberOfSuppliers"):
      valueObj.chartTitle = t(
        "home.categorize.actualPaymentTermsCharts.perNumberOfSuppliers",
      );
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.avg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.creditScoreLevel ?? "");
      break;
    case t("home.categorize.actualPaymentTermsCharts.perNegotiationComplexity"):
      valueObj.chartTitle = t(
        "home.categorize.actualPaymentTermsCharts.perNegotiationComplexity",
      );
      valueObj.xAxisTitle = t("global.days");
      valueObj.yAxisTitle = "";
      valueObj.dataSeries = myData.map((item) => item.avg ?? 0);
      valueObj.categoriesData = myData.map((item) => item.creditScoreLevel ?? "");
      break;
    default:
      logUnrecognizedChart(selectedChart, "parseActualPaymentTermsForChart");
      break;
  }

  // Set isLoading to false after processing (if a valid case was matched)
  if (valueObj.chartTitle !== "") {
    valueObj.isLoading = false;
  }

  return valueObj;
};
