<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { Map as KendoMap, MapLayer as KendoMapLayer } from "@progress/kendo-map-vue-wrapper";
import CalculumLoading from "../CalculumLoading.vue";
import CalculumLoadingAr from "../CalculumLoadingAr.vue";
import TooltipButton from "../primitives/tooltip-button/Index.vue";
import NoDataAvailable from "../no-data-available/Index.vue";
import { ensureKendoMapLoaded } from "./kendoMapLoader";
import { BUBBLE_MAP_COLORS } from "./colors";
import { formatBubbleMapNumber } from "./format";
import type { BubbleMapData, BubbleMapGroup, BubbleMapMarker, BubbleMapMetric, BubbleMapPoint, BubbleMapShapeEvent } from "./types";

defineOptions({
  name: "BubbleMap",
});

const props = withDefaults(
  defineProps<{
    /** Supplier and buyer country rows to plot. */
    data?: BubbleMapData;
    /** Which value drives marker size and the popup amount. */
    metric: BubbleMapMetric;
    /** Country currently selected elsewhere on the page — highlighted in blue. */
    selectedCountry?: string | null;
    /** Legend label for the supplier group. */
    supplierLabel?: string;
    /** Legend label for the buyer group. */
    buyerLabel?: string;
    /** Title shown when `data` has no suppliers or buyers. */
    noDataTitle?: string;
    /** Message shown alongside `noDataTitle`. */
    noDataMessage?: string;
    /** Message shown if the legacy Kendo map script fails to load. */
    mapUnavailableMessage?: string;
    /** Tooltip text for the optional info icon next to the legend. Omit to hide the icon. */
    infoTooltipText?: string;
    /** Fixed map height (CSS length, e.g. `"450px"`). */
    height?: string;
    /** Show the Supplier/Buyer legend row. Default: `true`. Set `false` for a caller with no real
     * two-group split (e.g. every point riding in one bucket) - the swatches would otherwise
     * label a distinction the data doesn't make. */
    legendVisible?: boolean;
    /** Show the AR loader artwork (`CalculumLoadingAr`) instead of the default one while loading. */
    arLoader?: boolean;
  }>(),
  {
    data: () => ({ suppliers: [], buyers: [] }),
    selectedCountry: null,
    supplierLabel: "Supplier",
    buyerLabel: "Buyer",
    noDataTitle: "No location data available",
    noDataMessage: "",
    mapUnavailableMessage: "Map will be available shortly. Please refresh the page.",
    infoTooltipText: "",
    height: "450px",
    legendVisible: true,
    arLoader: false,
  },
);

const emit = defineEmits<{
  (e: "location-clicked", payload: { country: string; type: BubbleMapGroup; amountFormatted: string }): void;
}>();

const loading = ref(true);
const isMapLoaded = ref(false);
const loadError = ref(false);
// Forces the Kendo map component to remount — the wrapper's `data-source` isn't reactive, so this
// is a real workaround (ported from OverviewLocation.vue's `keyComponent`), not vestigial.
const keyComponent = ref(0);

const popup = reactive({
  visible: false,
  country: "",
  amountFormatted: "",
});

const hasData = computed(() => props.data.suppliers.length > 0 || props.data.buyers.length > 0);

function buildMarkers(rows: BubbleMapPoint[], type: BubbleMapGroup): BubbleMapMarker[] {
  return rows.map((row) => {
    let value = 0;
    let amountFormatted = "";

    switch (props.metric) {
      case "numberOfSuppliers":
        value = row.supplierOrBuyerCount;
        amountFormatted = String(row.supplierOrBuyerCount);
        break;
      case "numberOfSpends":
        value = row.spendCount;
        amountFormatted = String(row.spendCount);
        break;
      case "spendVolume": {
        const amount = Math.round(parseFloat(row.volume) * 100) / 100;
        value = amount;
        amountFormatted = formatBubbleMapNumber(amount);
        break;
      }
    }

    return { location: [row.geoLat, row.geoLon], value, type, country: row.country, amountFormatted };
  });
}

const markers = computed<BubbleMapMarker[]>(() => [
  ...buildMarkers(props.data.suppliers, "suppliers"),
  ...buildMarkers(props.data.buyers, "buyers"),
]);

watch(markers, () => {
  keyComponent.value++;
});

watch(
  () => props.selectedCountry,
  () => {
    keyComponent.value++;
  },
);

function colorFor(type: BubbleMapGroup, country: string, hover: boolean): string {
  if (!hover && props.selectedCountry === country) {
    return BUBBLE_MAP_COLORS.selected;
  }
  if (type === "suppliers") {
    return hover ? BUBBLE_MAP_COLORS.supplierHover : BUBBLE_MAP_COLORS.supplier;
  }
  return hover ? BUBBLE_MAP_COLORS.buyerHover : BUBBLE_MAP_COLORS.buyer;
}

function onShapeCreated(e: BubbleMapShapeEvent) {
  const { type, country } = e.shape.dataItem;
  e.shape.options.set("fill", { color: colorFor(type, country, false), opacity: 0.65 });
}

function onShapeMouseEnter(e: BubbleMapShapeEvent) {
  const { type, country, amountFormatted } = e.shape.dataItem;
  e.shape.options.set("stroke", { width: 1, color: "#000000" });
  e.shape.options.set("fill", { color: colorFor(type, country, true), opacity: 0.85 });
  popup.visible = true;
  popup.country = country;
  popup.amountFormatted = amountFormatted;
}

function onShapeMouseLeave(e: BubbleMapShapeEvent) {
  const { type, country } = e.shape.dataItem;
  e.shape.options.set("stroke", { width: 1, color: "#aaaaaa" });
  e.shape.options.set("fill", { color: colorFor(type, country, false), opacity: 0.65 });
  popup.visible = false;
}

function onShapeClick(e: BubbleMapShapeEvent) {
  const { type, country, amountFormatted } = e.shape.dataItem;
  emit("location-clicked", { country, type, amountFormatted });
}

onMounted(async () => {
  loading.value = true;
  try {
    await ensureKendoMapLoaded();
    isMapLoaded.value = true;
  } catch (error) {
    if (import.meta.env.DEV) console.error("[BubbleMap] Failed to load Kendo map scripts:", error);
    loadError.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="bubble-map">
    <div v-if="legendVisible || infoTooltipText" class="bubble-map__header">
      <div v-if="legendVisible" class="bubble-map__legend">
        <span class="bubble-map__legend-item">
          <span class="bubble-map__swatch" :style="{ backgroundColor: BUBBLE_MAP_COLORS.supplier }" />
          {{ supplierLabel }}
        </span>
        <span class="bubble-map__legend-item">
          <span class="bubble-map__swatch" :style="{ backgroundColor: BUBBLE_MAP_COLORS.buyer }" />
          {{ buyerLabel }}
        </span>
      </div>
      <TooltipButton v-if="infoTooltipText" :text="infoTooltipText" />
    </div>

    <div class="bubble-map__container" :style="{ height }">
      <component :is="arLoader ? CalculumLoadingAr : CalculumLoading" v-if="loading" block />
      <NoDataAvailable v-else-if="loadError" :title="mapUnavailableMessage" />
      <NoDataAvailable v-else-if="!hasData" :title="noDataTitle" :message="noDataMessage" />
      <template v-else>
        <div v-show="popup.visible" class="bubble-map__popup">
          <div class="bubble-map__popup-country">{{ popup.country }}</div>
          <div class="bubble-map__popup-amount">{{ popup.amountFormatted }}</div>
        </div>

        <KendoMap
          :key="keyComponent"
          :zoom="2"
          :min-zoom="2"
          :max-zoom="21"
          style="width: 100%; height: 100%"
          :shape-mouse-enter="onShapeMouseEnter"
          :shape-mouse-leave="onShapeMouseLeave"
          :shape-created="onShapeCreated"
          :shape-click="onShapeClick"
        >
          <KendoMapLayer
            :type="'tile'"
            :url-template="'https://#= subdomain #.tile.openstreetmap.org/#= zoom #/#= x #/#= y #.png'"
            :subdomains="['a', 'b', 'c']"
            :attribution="'&copy; <a href=\'https://osm.org/copyright\'>OpenStreetMap contributors</a>'"
          />
          <KendoMapLayer :type="'bubble'" :symbol="'circle'" :data-source="markers" />
        </KendoMap>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bubble-map {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bubble-map__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bubble-map__legend {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
}

.bubble-map__legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.bubble-map__swatch {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 2px;
  display: inline-block;
}

.bubble-map__container {
  position: relative;
  width: 100%;
}

.bubble-map__popup {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 10;
  background-color: #fff;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 0.875rem;
  pointer-events: none;
  text-transform: capitalize;
}

.bubble-map__popup-country {
  font-weight: 700;
}
</style>
