import { translate } from "../../../../utils/translation";
import {
  parseActualPaymentTermsForChart as parseActualPaymentTermsForChartShared,
  parseSupplierConcentrationForChart as parseSupplierConcentrationForChartShared,
  parseSupplierGroupForChart as parseSupplierGroupForChartShared,
  parseSupplierVolumeForChart as parseSupplierVolumeForChartShared,
} from "../../../../utils/charts";

const chartOptions = {
  volumeXAxisKey: "global.spend",
  procurementTeamSpendsXAxisKey: "global.spend",
};

export const parseSupplierVolumeForChart = (selectedChart: string, myData: any) =>
  parseSupplierVolumeForChartShared(selectedChart, myData, translate.t, chartOptions);

export const parseSupplierConcentrationForChart = (selectedChart: string, myData: any) =>
  parseSupplierConcentrationForChartShared(selectedChart, myData, translate.t);

export const parseSupplierGroupForChart = (selectedChart: string, myData: any) =>
  parseSupplierGroupForChartShared(selectedChart, myData, translate.t, chartOptions);

export const parseActualPaymentTermsForChart = (selectedChart: string, myData: any) =>
  parseActualPaymentTermsForChartShared(selectedChart, myData, translate.t);
