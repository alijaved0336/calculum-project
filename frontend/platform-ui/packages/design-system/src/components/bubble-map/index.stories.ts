import type { Meta, StoryObj } from "@storybook/vue3";
import { propDoc } from "@ds-storybook/argTypes";
import BubbleMap from "./Index.vue";
import type { BubbleMapData } from "./types";

const sampleData: BubbleMapData = {
  suppliers: [
    { supplierOrBuyerCount: 11, spendCount: 18, volume: "836526.4483", country: "Austria", geoLat: 47.516231, geoLon: 14.550072 },
    { supplierOrBuyerCount: 6, spendCount: 7, volume: "380963.8561", country: "France", geoLat: 46.227638, geoLon: 2.213749 },
    { supplierOrBuyerCount: 11, spendCount: 28, volume: "2193875.9388", country: "Italy", geoLat: 41.87194, geoLon: 12.56738 },
    { supplierOrBuyerCount: 8, spendCount: 9, volume: "3106474.1119", country: "Spain", geoLat: 40.463667, geoLon: -3.74922 },
    { supplierOrBuyerCount: 14, spendCount: 18, volume: "4882021.0422", country: "United States", geoLat: 37.09024, geoLon: -95.712891 },
  ],
  buyers: [{ supplierOrBuyerCount: 2, spendCount: 136, volume: "15450861.7739", country: "France", geoLat: 46.227638, geoLon: 2.213749 }],
};

/** Full sample: 19 supplier countries + 1 buyer country. */
const allCountriesData: BubbleMapData = {
  suppliers: [
    { supplierOrBuyerCount: 11, spendCount: 18, volume: "836526.4483", country: "Austria", geoLat: 47.516231, geoLon: 14.550072 },
    { supplierOrBuyerCount: 4, spendCount: 12, volume: "50981.6509", country: "Belgium", geoLat: 50.503887, geoLon: 4.469936 },
    { supplierOrBuyerCount: 1, spendCount: 1, volume: "850.29", country: "Brazil", geoLat: -14.235004, geoLon: -51.92528 },
    { supplierOrBuyerCount: 1, spendCount: 2, volume: "674.28", country: "Czech Republic", geoLat: 49.817492, geoLon: 15.472962 },
    { supplierOrBuyerCount: 1, spendCount: 1, volume: "20876", country: "Denmark", geoLat: 56.26392, geoLon: 9.501785 },
    { supplierOrBuyerCount: 6, spendCount: 9, volume: "566057.8884", country: "Finland", geoLat: 61.92411, geoLon: 25.748151 },
    { supplierOrBuyerCount: 6, spendCount: 7, volume: "380963.8561", country: "France", geoLat: 46.227638, geoLon: 2.213749 },
    { supplierOrBuyerCount: 1, spendCount: 1, volume: "1265441.3659", country: "Hungary", geoLat: 47.162494, geoLon: 19.503304 },
    { supplierOrBuyerCount: 1, spendCount: 1, volume: "5882.5004", country: "India", geoLat: 20.593684, geoLon: 78.96288 },
    { supplierOrBuyerCount: 11, spendCount: 28, volume: "2193875.9388", country: "Italy", geoLat: 41.87194, geoLon: 12.56738 },
    { supplierOrBuyerCount: 1, spendCount: 2, volume: "15477", country: "Netherlands", geoLat: 52.132633, geoLon: 5.291266 },
    { supplierOrBuyerCount: 6, spendCount: 7, volume: "1048687.6266", country: "Poland", geoLat: 51.919438, geoLon: 19.145136 },
    { supplierOrBuyerCount: 1, spendCount: 1, volume: "65139.3649", country: "Portugal", geoLat: 39.399872, geoLon: -8.224454 },
    { supplierOrBuyerCount: 1, spendCount: 1, volume: "1721.21", country: "Singapore", geoLat: 1.352083, geoLon: 103.819836 },
    { supplierOrBuyerCount: 8, spendCount: 9, volume: "3106474.1119", country: "Spain", geoLat: 40.463667, geoLon: -3.74922 },
    { supplierOrBuyerCount: 6, spendCount: 9, volume: "927671.2607", country: "Sweden", geoLat: 60.128161, geoLon: 18.643501 },
    { supplierOrBuyerCount: 1, spendCount: 2, volume: "10361.4536", country: "Switzerland", geoLat: 46.818188, geoLon: 8.227512 },
    { supplierOrBuyerCount: 7, spendCount: 7, volume: "71178.4852", country: "United Kingdom", geoLat: 55.378051, geoLon: -3.435973 },
    { supplierOrBuyerCount: 14, spendCount: 18, volume: "4882021.0422", country: "United States", geoLat: 37.09024, geoLon: -95.712891 },
  ],
  buyers: [{ supplierOrBuyerCount: 2, spendCount: 136, volume: "15450861.7739", country: "France", geoLat: 46.227638, geoLon: 2.213749 }],
};

const meta: Meta<typeof BubbleMap> = {
  title: "Charts/BubbleMap",
  component: BubbleMap,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `
World tile map with colored circular bubble markers, split into a supplier group and a buyer
group, sized/labeled by a selectable metric. Built on the legacy \`@progress/kendo-map-vue-wrapper\`
(jQuery-based Kendo Map widget) — the app hosting this component must serve \`/scripts/jquery.js\`
and \`/scripts/kendo.js\` (copy them from \`apps/ap/public/scripts/\`).

\`\`\`vue
<BubbleMap :data="countriesData" metric="spendVolume" @location-clicked="onLocationClicked" />
\`\`\`
        `.trim(),
      },
    },
  },
  decorators: [
    () => ({
      template: '<div style="max-width: 48rem;"><story /></div>',
    }),
  ],
  argTypes: {
    data: propDoc({
      description: "Supplier and buyer country rows to plot.",
      type: "BubbleMapData",
      required: true,
      control: "object",
      detail: "{ suppliers: BubbleMapPoint[]; buyers: BubbleMapPoint[] }",
    }),
    metric: propDoc({
      description: "Which value drives marker size and the popup amount.",
      type: "BubbleMapMetric",
      required: true,
      options: ["numberOfSuppliers", "numberOfSpends", "spendVolume"],
    }),
    selectedCountry: propDoc({
      description: "Country currently selected elsewhere on the page — highlighted in blue.",
      type: "string | null",
      defaultValue: "null",
    }),
    supplierLabel: propDoc({
      description: "Legend label for the supplier group.",
      type: "string",
      defaultValue: '"Supplier"',
    }),
    buyerLabel: propDoc({
      description: "Legend label for the buyer group.",
      type: "string",
      defaultValue: '"Buyer"',
    }),
    noDataTitle: propDoc({
      description: "Title shown when `data` has no suppliers or buyers.",
      type: "string",
      defaultValue: '"No location data available"',
    }),
    noDataMessage: propDoc({
      description: "Message shown alongside `noDataTitle`.",
      type: "string",
      defaultValue: '""',
    }),
    mapUnavailableMessage: propDoc({
      description: "Message shown if the legacy Kendo map script fails to load.",
      type: "string",
      defaultValue: '"Map will be available shortly. Please refresh the page."',
    }),
    infoTooltipText: propDoc({
      description: "Tooltip text for the optional info icon next to the legend. Omit to hide the icon.",
      type: "string",
      defaultValue: '""',
    }),
    height: propDoc({
      description: "Fixed map height (CSS length).",
      type: "string",
      defaultValue: '"450px"',
    }),
  },
  args: {
    data: sampleData,
    metric: "spendVolume",
    selectedCountry: "",
    supplierLabel: "Supplier",
    buyerLabel: "Buyer",
    noDataTitle: "No location data available",
    noDataMessage: "",
    mapUnavailableMessage: "Map will be available shortly. Please refresh the page.",
    infoTooltipText: "",
    height: "450px",
  },
};

export default meta;
type Story = StoryObj<typeof BubbleMap>;

export const Default: Story = {};

export const AllCountries: Story = {
  args: {
    data: allCountriesData,
  },
};

export const NoData: Story = {
  args: {
    data: { suppliers: [], buyers: [] },
  },
};
