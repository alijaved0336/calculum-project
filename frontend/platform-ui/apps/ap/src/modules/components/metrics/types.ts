import { FiltersApplied } from "@/types";

export interface DataInterface {
  chartsbyGroup: Array<any>;
  chartTypeToshow: string;
  currentSelectedChart: {
    chartTitle: string;
    xAxisTitle: string;
    yAxisTitle: string;
    dataSeries: Array<any>;
    categoriesData: Array<any>;
  };
  currentIndex: number;
  geoKey: number;
  globalFilters: FiltersApplied;
  groupSelected: string;
  isBigNumber: boolean;
  isDropdownSelected: boolean;
  loading: boolean;
  loadingChartData: boolean;
  loadingGroups: boolean;
  metricsGroups: Array<any>;
  selectedChart: string;
  showPieChart: boolean;
  place: string;
  view: string;
  getCustomHeightChart: number;
  chartsLoaded: boolean;
  keyMetricsComponent: number;
  creditRating?: string;
  ultimateParentName?: string;
}
