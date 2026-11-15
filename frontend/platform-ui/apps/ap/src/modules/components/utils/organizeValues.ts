import { translate } from "@/utils/translation";
import {
  parseActualPaymentTermsForChart as parseActualPaymentTermsForChartShared,
  parseSupplierConcentrationForChart as parseSupplierConcentrationForChartShared,
  parseSupplierGroupForChart as parseSupplierGroupForChartShared,
  parseSupplierVolumeForChart as parseSupplierVolumeForChartShared,
} from "../../../utils/charts";

const chartOptions = {
  volumeXAxisKey: "global.numberOfSpends",
  procurementTeamSpendsXAxisKey: "global.numberOfSpends",
};

export const parseSupplierVolumeForChart = (selectedChart: string, myData: any) =>
  parseSupplierVolumeForChartShared(selectedChart, myData, translate.t, chartOptions);

export const parseSupplierConcentrationForChart = (selectedChart: string, myData: any) =>
  parseSupplierConcentrationForChartShared(selectedChart, myData, translate.t);

export const parseSupplierGroupForChart = (selectedChart: string, myData: any) =>
  parseSupplierGroupForChartShared(selectedChart, myData, translate.t, chartOptions);

export const parseActualPaymentTermsForChart = (selectedChart: string, myData: any) =>
  parseActualPaymentTermsForChartShared(selectedChart, myData, translate.t);


type OpcionesIniciales = {
  maxWords?: number;
  uppercase?: boolean;
};


export function getInitialLetters(textValue: string | null | undefined, options?: OpcionesIniciales): string {
  if (!options) options = { maxWords: 2, uppercase: true }; 
  if (!textValue) return '';
  if(textValue.startsWith('#')) textValue = textValue.slice(1);
  const words = textValue.trim().replace(/\s+/g, ' ').split(' ');
  let initialLetters = '';
  for (let i = 0; i < Math.min(words.length, options?.maxWords || 2); i++) {
    if (words[i].length > 0) {
      initialLetters += words[i].charAt(0);
    }
  }
  return options?.uppercase ? initialLetters.toUpperCase() : initialLetters;
}