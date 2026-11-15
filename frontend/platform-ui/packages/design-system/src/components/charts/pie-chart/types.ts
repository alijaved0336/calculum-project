export interface PieChartItem {
  /** Legend label / slice category. */
  category: string;
  /** Slice value. */
  value: number;
  /** Slice fill color. Defaults to the Kendo theme palette when omitted. */
  color?: string;
}

export type PieChartLabelArgs = {
  category?: string;
  value: number;
  percentage: number;
  dataItem: PieChartItem;
};

export type PieChartSliceClickPayload = {
  /** The clicked slice's `category`. */
  category: string;
  /** Index of the clicked slice within `items`. */
  index: number;
};
