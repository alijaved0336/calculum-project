export interface BubbleMapPoint {
  country: string;
  geoLat: number;
  geoLon: number;
  supplierOrBuyerCount: number;
  spendCount: number;
  volume: string;
}

export interface BubbleMapData {
  suppliers: BubbleMapPoint[];
  buyers: BubbleMapPoint[];
}

export type BubbleMapMetric = "numberOfSuppliers" | "numberOfSpends" | "spendVolume";

export type BubbleMapGroup = "suppliers" | "buyers";

export interface BubbleMapMarker {
  location: [number, number];
  value: number;
  type: BubbleMapGroup;
  country: string;
  amountFormatted: string;
}

export interface BubbleMapLocationClickedPayload {
  country: string;
  type: BubbleMapGroup;
  amountFormatted: string;
}

export interface BubbleMapShapeOptions {
  set: (key: string, value: unknown) => void;
}

export interface BubbleMapShape {
  dataItem: BubbleMapMarker;
  options: BubbleMapShapeOptions;
}

export interface BubbleMapShapeEvent {
  shape: BubbleMapShape;
}

/** Mirrors Index.vue's inline `defineProps<{...}>()` shape (same duplication as horizontal-bar/types.ts). */
export type BubbleMapProps = {
  data?: BubbleMapData;
  metric: BubbleMapMetric;
  selectedCountry?: string | null;
  supplierLabel?: string;
  buyerLabel?: string;
  noDataTitle?: string;
  noDataMessage?: string;
  mapUnavailableMessage?: string;
  infoTooltipText?: string;
  height?: string;
  legendVisible?: boolean;
};
