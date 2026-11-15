import { describe, it, expect } from "vitest";
import {
  parseActualPaymentTermsForChart,
  parseSupplierConcentrationForChart,
  parseSupplierGroupForChart,
  parseSupplierVolumeForChart,
} from "@/utils/charts";

const t = (key: string) => key;

const baseData = [
  {
    buyerAmount: 10,
    buyerName: "Buyer A",
    total: 25,
    materialityDescription: "High",
    countryCode: "US",
    spend: 12,
    region: "NA",
    industryName: "Tech",
    commodityName: "Hardware",
    creditScoreRange: "A",
    team: "Team 1",
    supplierCount: 5,
    regionName: "North America",
    industry: "Tech",
    commodity: "Hardware",
    creditScoreLevel: "B",
    currencies: "USD",
    corporations: "Corp A",
    spendCount: 8,
    supplierTeam: "Team 1",
    buyerAvg: 30,
    teamAvg: 40,
    countryAvg: 50,
    supplierCountry: "US",
    avg: 60,
    companySizeDesc: "Large",
  },
];

describe("charts utils", () => {
  it("parses supplier volume per buying entity", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perBuyingEntity"),
      baseData,
      t,
    );

    expect(result.chartTitle).toBe("home.categorize.spendVolumeCharts.perBuyingEntity");
    expect(result.dataSeries).toEqual([10]);
    expect(result.categoriesData).toEqual(["Buyer A"]);
    expect(result.isBigNumber).toBe(true);
    expect(result.isLoading).toBe(false);
  });

  it("parses supplier volume per country using ISO mapping", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perCountry"),
      baseData,
      t,
    );

    expect(result.categoriesData).toHaveLength(1);
    expect(result.categoriesData[0]).toEqual(expect.any(String));
    expect(result.isLoading).toBe(false);
  });

  it("parses supplier volume per commodity", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perCommodity"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["Hardware"]);
    expect(result.isBigNumber).toBe(false);
  });

  it("parses supplier volume per procurement team", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perProcurementTeam"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([12]);
    expect(result.categoriesData).toEqual(["Team 1"]);
  });

  it("parses supplier volume per buyer leverage", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perBuyerLeverage"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["High"]);
    expect(result.isBigNumber).toBe(true);
  });

  it("parses supplier volume per region", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perRegion"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([12]);
    expect(result.categoriesData).toEqual(["NA"]);
  });

  it("parses supplier volume per industry", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perIndustry"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["Tech"]);
  });

  it("parses supplier volume per supplier credit rating", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perSupplierCreditRating"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([12]);
    expect(result.categoriesData).toEqual(["A"]);
  });

  it("parses supplier volume per financing costs", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perFinancingCosts"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["US"]);
  });

  it("parses supplier volume per currency", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perCurrency"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["US"]);
  });

  it("parses supplier volume per supplier company size", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perSupplierCompanySize"),
      baseData,
      t,
    );

    expect(result.xAxisTitle).toBe("global.numberOfSuppliers");
    expect(result.dataSeries).toEqual([25]);
  });

  it("parses supplier volume per 9Box", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.per9Box"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["US"]);
  });

  it("parses supplier volume per ESG score", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perESGScore"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["US"]);
  });

  it("parses supplier volume per DEI score", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perDEIScore"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["US"]);
  });

  it("parses supplier volume per data depth", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perDataDepth"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["US"]);
  });

  it("uses volume axis options", () => {
    const result = parseSupplierVolumeForChart(
      t("home.categorize.spendVolumeCharts.perBuyerLeverage"),
      baseData,
      t,
      { volumeXAxisKey: "global.numberOfSpends", procurementTeamSpendsXAxisKey: "global.numberOfSpends" },
    );

    expect(result.xAxisTitle).toBe("global.numberOfSpends");
  });

  it("parses supplier concentration per currency", () => {
    const result = parseSupplierConcentrationForChart(
      t("home.categorize.spendConcentrationCharts.spendConcentrationPerCurrency"),
      baseData,
      t,
    );

    expect(result.categoriesData).toEqual(["High"]);
    expect(result.isShowingPieChart).toBe(true);
  });

  it("parses supplier concentration per buyer leverage", () => {
    const result = parseSupplierConcentrationForChart(
      t("home.categorize.spendConcentrationCharts.spendConcentrationPerBuyerLeverage"),
      baseData,
      t,
    );

    expect(result.chartTitle).toBe(
      "home.categorize.spendConcentrationCharts.spendConcentrationPerBuyerLeverage",
    );
    expect(result.isShowingPieChart).toBe(true);
    expect(result.isLoading).toBe(false);
  });

  it("parses supplier concentration per buying entity", () => {
    const result = parseSupplierConcentrationForChart(
      t("home.categorize.spendConcentrationCharts.spendConcentrationPerBuyingEntity"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([10]);
    expect(result.categoriesData).toEqual(["Buyer A"]);
    expect(result.isShowingPieChart).toBe(true);
  });

  it("parses supplier concentration per country", () => {
    const result = parseSupplierConcentrationForChart(
      t("home.categorize.spendConcentrationCharts.spendConcentrationPerCountry"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["US"]);
    expect(result.isShowingPieChart).toBe(true);
  });

  it("parses supplier concentration per region", () => {
    const result = parseSupplierConcentrationForChart(
      t("home.categorize.spendConcentrationCharts.spendConcentrationPerRegion"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([12]);
    expect(result.categoriesData).toEqual(["NA"]);
    expect(result.isShowingPieChart).toBe(true);
  });

  it("parses supplier concentration per industry", () => {
    const result = parseSupplierConcentrationForChart(
      t("home.categorize.spendConcentrationCharts.spendConcentrationPerIndustry"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["Tech"]);
    expect(result.isShowingPieChart).toBe(true);
  });

  it("parses supplier concentration per credit rating", () => {
    const result = parseSupplierConcentrationForChart(
      t("home.categorize.spendConcentrationCharts.spendConcentrationPerCreditRating"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["B"]);
    expect(result.isShowingPieChart).toBe(true);
  });

  it("parses supplier concentration per commodity", () => {
    const result = parseSupplierConcentrationForChart(
      t("home.categorize.spendConcentrationCharts.spendConcentrationPerCommodity"),
      baseData,
      t,
    );

    expect(result.categoriesData).toEqual(["Hardware"]);
    expect(result.isShowingPieChart).toBe(true);
  });

  it("parses supplier concentration per procurement team", () => {
    const result = parseSupplierConcentrationForChart(
      t("home.categorize.spendConcentrationCharts.spendConcentrationPerProcurementTeam"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([12]);
    expect(result.categoriesData).toEqual(["Team 1"]);
    expect(result.isShowingPieChart).toBe(true);
  });

  it("parses supplier concentration per company size", () => {
    const result = parseSupplierConcentrationForChart(
      t("home.categorize.spendConcentrationCharts.spendConcentrationPerCompanySize"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["High"]);
    expect(result.isShowingPieChart).toBe(true);
  });

  it("parses supplier concentration per ESG score", () => {
    const result = parseSupplierConcentrationForChart(
      t("home.categorize.spendConcentrationCharts.spendConcentrationPerESGScore"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["High"]);
    expect(result.isShowingPieChart).toBe(true);
  });

  it("parses supplier concentration per DEI score", () => {
    const result = parseSupplierConcentrationForChart(
      t("home.categorize.spendConcentrationCharts.spendConcentrationPerDEIScore"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([25]);
    expect(result.categoriesData).toEqual(["High"]);
    expect(result.isShowingPieChart).toBe(true);
  });

  it("handles supplier concentration per top suppliers (empty case)", () => {
    const result = parseSupplierConcentrationForChart(
      t("home.categorize.spendConcentrationCharts.spendConcentrationPerTopSuppliers"),
      baseData,
      t,
    );

    expect(result.isLoading).toBe(true);
  });

  it("parses supplier group procurement team spends with options", () => {
    const result = parseSupplierGroupForChart(
      t("home.categorize.supplierPaymentTermsCharts.perProcurementTeamSpends"),
      baseData,
      t,
      { volumeXAxisKey: "global.spend", procurementTeamSpendsXAxisKey: "global.numberOfSpends" },
    );

    expect(result.xAxisTitle).toBe("global.numberOfSpends");
    expect(result.dataSeries).toEqual([8]);
  });

  it("parses supplier group per country", () => {
    const result = parseSupplierGroupForChart(
      t("home.categorize.supplierPaymentTermsCharts.perCountry"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([5]);
    expect(result.categoriesData).toEqual(["US"]);
  });

  it("parses supplier group per region", () => {
    const result = parseSupplierGroupForChart(
      t("home.categorize.supplierPaymentTermsCharts.perRegion"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([5]);
    expect(result.categoriesData).toEqual(["North America"]);
  });

  it("parses supplier group per buying entity", () => {
    const result = parseSupplierGroupForChart(
      t("home.categorize.supplierPaymentTermsCharts.perBuyingEntity"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([5]);
    expect(result.categoriesData).toEqual(["Buyer A"]);
  });

  it("parses supplier group per procurement team suppliers", () => {
    const result = parseSupplierGroupForChart(
      t("home.categorize.supplierPaymentTermsCharts.perProcurementTeamSuppliers"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([5]);
    expect(result.categoriesData).toEqual(["Team 1"]);
  });

  it("parses supplier group per industry suppliers", () => {
    const result = parseSupplierGroupForChart(
      t("home.categorize.supplierPaymentTermsCharts.perIndustrySuppliers"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([5]);
    expect(result.categoriesData).toEqual(["Tech"]);
  });

  it("parses supplier group per commodity suppliers", () => {
    const result = parseSupplierGroupForChart(
      t("home.categorize.supplierPaymentTermsCharts.perCommoditySuppliers"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([5]);
    expect(result.categoriesData).toEqual(["Hardware"]);
  });

  it("parses supplier group per credit rating suppliers", () => {
    const result = parseSupplierGroupForChart(
      t("home.categorize.supplierPaymentTermsCharts.perCreditRatingSuppliers"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([5]);
    expect(result.categoriesData).toEqual(["B"]);
  });

  it("parses supplier group per buyer leverage suppliers", () => {
    const result = parseSupplierGroupForChart(
      t("home.categorize.supplierPaymentTermsCharts.perBuyerLeverageSuppliers"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([5]);
    expect(result.categoriesData).toEqual(["High"]);
  });

  it("parses supplier group per currency suppliers", () => {
    const result = parseSupplierGroupForChart(
      t("home.categorize.supplierPaymentTermsCharts.perCurrencySuppliers"),
      baseData,
      t,
    );

    expect(result.categoriesData).toEqual(["USD"]);
    expect(result.yAxisTitle).toBe("global.currencies");
  });

  it("parses supplier group per supplier company size", () => {
    const result = parseSupplierGroupForChart(
      t("home.categorize.supplierPaymentTermsCharts.perSupplierCompanySize"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([5]);
    expect(result.categoriesData).toEqual(["Corp A"]);
    expect(result.yAxisTitle).toBe("global.corporation");
  });

  it("parses supplier group per 9Box suppliers", () => {
    const result = parseSupplierGroupForChart(
      t("home.categorize.supplierPaymentTermsCharts.per9BoxSuppliers"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([5]);
    expect(result.categoriesData).toEqual(["USD"]);
    expect(result.yAxisTitle).toBe("global.boxNine");
  });

  it("parses supplier group per ESG score suppliers", () => {
    const result = parseSupplierGroupForChart(
      t("home.categorize.supplierPaymentTermsCharts.perESGScoreSuppliers"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([5]);
    expect(result.categoriesData).toEqual(["USD"]);
  });

  it("parses supplier group per DEI score suppliers", () => {
    const result = parseSupplierGroupForChart(
      t("home.categorize.supplierPaymentTermsCharts.perDEIScoreSuppliers"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([5]);
    expect(result.categoriesData).toEqual(["USD"]);
  });

  it("parses actual payment terms per negotiation complexity", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perNegotiationComplexity"),
      baseData,
      t,
    );

    expect(result.chartTitle).toBe(
      "home.categorize.actualPaymentTermsCharts.perNegotiationComplexity",
    );
    expect(result.isLoading).toBe(false);
  });

  it("parses actual payment terms per buying entity", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perBuyingEntity"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([30]);
    expect(result.categoriesData).toEqual(["Buyer A"]);
  });

  it("parses actual payment terms per procurement team", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perProcurementTeam"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([40]);
    expect(result.categoriesData).toEqual(["Team 1"]);
  });

  it("parses actual payment terms per country", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perCountry"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([50]);
    expect(result.categoriesData).toEqual(["US"]);
  });

  it("parses actual payment terms per region", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perRegion"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([60]);
    expect(result.categoriesData).toEqual(["NA"]);
  });

  it("parses actual payment terms per industry", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perIndustry"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([60]);
    expect(result.categoriesData).toEqual(["Tech"]);
  });

  it("parses actual payment terms per commodity", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perCommodity"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([60]);
    expect(result.categoriesData).toEqual(["Hardware"]);
  });

  it("parses actual payment terms per supplier company size", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perSupplierCompanySize"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([60]);
    expect(result.categoriesData).toEqual(["Large"]);
  });

  it("parses actual payment terms per buyer leverage", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perBuyerLeverage"),
      baseData,
      t,
    );

    expect(result.categoriesData).toEqual(["High"]);
  });

  it("parses actual payment terms per credit rating", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perCreditRating"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([60]);
    expect(result.categoriesData).toEqual(["B"]);
  });

  it("parses actual payment terms per currency", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perCurrency"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([60]);
    expect(result.categoriesData).toEqual(["B"]);
  });

  it("parses actual payment terms per 9Box", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.per9Box"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([60]);
    expect(result.categoriesData).toEqual(["B"]);
  });

  it("parses actual payment terms per ESG score", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perESGScore"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([60]);
    expect(result.categoriesData).toEqual(["B"]);
  });

  it("parses actual payment terms per DEI score", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perDEIScore"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([60]);
    expect(result.categoriesData).toEqual(["B"]);
  });

  it("parses actual payment terms per data depth", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perDataDepth"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([60]);
    expect(result.categoriesData).toEqual(["B"]);
  });

  it("parses actual payment terms per spend volume", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perSpendVolume"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([60]);
    expect(result.categoriesData).toEqual(["B"]);
  });

  it("parses actual payment terms per number of suppliers", () => {
    const result = parseActualPaymentTermsForChart(
      t("home.categorize.actualPaymentTermsCharts.perNumberOfSuppliers"),
      baseData,
      t,
    );

    expect(result.dataSeries).toEqual([60]);
    expect(result.categoriesData).toEqual(["B"]);
  });

  it("returns default values for unknown chart key", () => {
    const result = parseSupplierVolumeForChart("unknown", baseData, t);

    expect(result.isLoading).toBe(true);
    expect(result.dataSeries).toEqual([]);
  });

  it("returns defaults for unknown concentration and group charts", () => {
    const concentration = parseSupplierConcentrationForChart("unknown", baseData, t);
    const group = parseSupplierGroupForChart("unknown", baseData, t);

    expect(concentration.isLoading).toBe(true);
    expect(group.isLoading).toBe(true);
  });

  it("returns defaults for unknown payment terms chart", () => {
    const result = parseActualPaymentTermsForChart("unknown", baseData, t);

    expect(result.isLoading).toBe(true);
    expect(result.dataSeries).toEqual([]);
  });
});
