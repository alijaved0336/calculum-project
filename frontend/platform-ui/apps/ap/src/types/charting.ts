/**
 * Represents the data structure for chart visualization.
 * This interface defines all the properties needed to render a chart component.
 */
export interface ChartData {
  /** Array of category labels for the chart (e.g., country names, supplier names) */
  categoriesData: Array<string>;
  /** Title displayed at the top of the chart */
  chartTitle: string;
  /** Array of numeric values corresponding to each category */
  dataSeries: Array<number>;
  /** Whether the chart should display as a big number instead of a graph */
  isBigNumber: boolean;
  /** Whether the chart data is currently being loaded */
  isLoading: boolean;
  /** Whether the chart should be displayed as a pie chart */
  isShowingPieChart: boolean;
  /** Label for the X-axis */
  xAxisTitle: string;
  /** Label for the Y-axis */
  yAxisTitle: string;
}

/**
 * @deprecated Use ChartData instead. This interface is kept for backward compatibility.
 */
export type DataValues = ChartData;
