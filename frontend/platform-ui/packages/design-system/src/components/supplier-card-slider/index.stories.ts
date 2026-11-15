import type { Meta, StoryObj } from "@storybook/vue3";
import { computed } from "vue";
import { propDoc } from "@ds-storybook/argTypes";
import SupplierCard from "../supplier-card/Index.vue";
import type {
  SupplierCardProps,
  SupplierCardSupplierItem,
  SupplierCardType,
} from "../supplier-card/types";
import SupplierCardSlider from "./Index.vue";
import {
  SUPPLIER_CARD_SLIDER_DEFAULT_SLIDES_PER_VIEW,
  SUPPLIER_CARD_SLIDER_DEFAULT_SPACE_BETWEEN,
} from "./types";

const flagSrc =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="#006aa7"/><rect x="6.5" y="0" width="3" height="16" fill="#fecc00"/><rect x="0" y="6.5" width="16" height="3" fill="#fecc00"/></svg>`,
  );

const logoSrc =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#e2e8f0"/><text x="16" y="21" text-anchor="middle" fill="#475569" font-family="sans-serif" font-size="14" font-weight="600">A</text></svg>`,
  );

const demoSuppliers: SupplierCardSupplierItem[] = [
  { id: "ns-1", label: "Acme Industrial Ltd" },
  { id: "ns-2", label: "Northwind Supplies" },
  { id: "ns-3", label: "Contoso Parts" },
];

type DemoSliderItem = SupplierCardProps & { id: string };

const CARD_TEMPLATES: SupplierCardProps[] = [
  {
    name: "Alconex Specialty Products INC",
    legalName: "Alconex Specialty Products Incorporated",
    logoSrc,
    flagSrc,
    countryName: "United States",
    types: ["sme", "parent"] as SupplierCardType[],
    metrics: {
      "Spend Volume": "48.3m",
      "Buying Entities": "NHS Supply Chain",
    },
    parentsValue: "",
    suppliers: demoSuppliers,
    suppliersCount: 99,
    showClose: true,
  },
  {
    name: "Acme Industrial Ltd",
    legalName: "Acme Industrial Limited",
    logoSrc,
    flagSrc,
    countryName: "United Kingdom",
    types: ["sme"] as SupplierCardType[],
    metrics: {
      "Spend Volume": "12.1m",
      "Spend Lines": "8",
    },
    parentsValue: "Acme Group",
    showClose: true,
  },
  {
    name: "Northwind Supplies",
    legalName: "Northwind Supplies PLC",
    logoSrc,
    flagSrc,
    countryName: "Sweden",
    types: ["sme", "potential"] as SupplierCardType[],
    metrics: {
      "Spend Volume": "6.4m",
      "Buying Entities": "NHS Supply Chain",
    },
    showClose: false,
  },
  {
    name: "Contoso Parts",
    legalName: "Contoso Parts GmbH",
    types: ["parent"] as SupplierCardType[],
    metrics: {
      "Spend Volume": "22.0m",
    },
    suppliers: demoSuppliers,
    suppliersCount: 12,
    showClose: true,
  },
  {
    name: "Fabrikam Logistics",
    legalName: "Fabrikam Logistics Inc",
    logoSrc,
    flagSrc,
    countryName: "United States",
    types: ["potential"] as SupplierCardType[],
    metrics: {
      "Spend Volume": "3.8m",
      "Spend Lines": "4",
    },
    parentsValue: "Fabrikam Holdings",
    showClose: true,
  },
  {
    name: "Wide World Importers",
    types: ["sme", "potential", "parent"] as SupplierCardType[],
    metrics: {
      "Spend Volume": "91.2m",
      "Buying Entities": "NHS Supply Chain",
    },
    suppliers: [{ id: "ww-1", label: "Wide World EU" }],
    suppliersCount: 5,
    showClose: false,
  },
];

function makeCards(count: number): DemoSliderItem[] {
  return Array.from({ length: count }, (_, index) => {
    const template = CARD_TEMPLATES[index % CARD_TEMPLATES.length];
    return {
      ...template,
      id: `card-${index + 1}`,
    };
  });
}

function cardProps(item: unknown): SupplierCardProps {
  if (typeof item !== "object" || item === null || !("name" in item)) {
    return { name: "" };
  }
  const { id: _id, ...card } = item as DemoSliderItem;
  return card;
}

const defaultCards = makeCards(12);

/** Story canvas override — component default stays `SUPPLIER_CARD_SLIDER_DEFAULT_SLIDES_PER_VIEW` (5). */
const STORY_SLIDES_PER_VIEW = 3;

type SupplierCardSliderArgs = {
  items: readonly unknown[];
  slidesPerView: number;
  spaceBetween: number;
  /** Story-only Playground control. */
  cardCount?: number;
};

const meta: Meta<SupplierCardSliderArgs> = {
  title: "Components/SupplierCardSlider",
  component: SupplierCardSlider,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `
Presentational Swiper row. Overflow turns on arrows, dots, and drag; at or under \`slidesPerView\` the chrome is off. The component default is 5 (chrome off for 0–5 items, on for 6+). Canvas stories below use 3 slides per view (chrome off for 0–3 items, on for 4+). Slide content comes from the \`#item\` slot — stories below pass \`SupplierCard\` via \`#item\`.
        `.trim(),
      },
    },
  },
  decorators: [
    () => ({
      template:
        '<div style="width: 100%; padding: 1.5rem; background: var(--bg-page);"><story /></div>',
    }),
  ],
  argTypes: {
    items: propDoc({
      description:
        "Slide payloads. Opaque to the slider; rendered via the `#item` slot.",
      type: "unknown[]",
      control: "object",
      detail: "{ id?: string | number }[] — extra fields are passed through `#item`.",
      defaultValue: "[]",
    }),
    slidesPerView: propDoc({
      description:
        "Swiper `slidesPerView`. Default 5 — five full cards, no peek. When `items.length` does not overflow this value, carousel chrome is off (with the default, 0–5 items hide chrome; 6+ show it).",
      type: "number",
      defaultValue: String(SUPPLIER_CARD_SLIDER_DEFAULT_SLIDES_PER_VIEW),
    }),
    spaceBetween: propDoc({
      description: "Gap between slides in px.",
      type: "number",
      defaultValue: "16",
    }),
    cardCount: {
      control: false,
      table: { disable: true },
    },
  },
  args: {
    items: defaultCards,
    slidesPerView: STORY_SLIDES_PER_VIEW,
    spaceBetween: SUPPLIER_CARD_SLIDER_DEFAULT_SPACE_BETWEEN,
  },
  render: (args) => ({
    components: { SupplierCardSlider, SupplierCard },
    setup() {
      return { args, cardProps };
    },
    template: `
      <SupplierCardSlider
        :items="args.items"
        :slides-per-view="args.slidesPerView"
        :space-between="args.spaceBetween"
      >
        <template #item="{ item }">
          <SupplierCard v-bind="cardProps(item)" />
        </template>
      </SupplierCardSlider>
    `,
  }),
};

export default meta;
type Story = StoryObj<SupplierCardSliderArgs>;

export const Default: Story = {};

export const FewItems: Story = {
  args: {
    items: makeCards(STORY_SLIDES_PER_VIEW),
  },
};

export const SingleItem: Story = {
  args: {
    items: makeCards(1),
  },
};

export const Empty: Story = {
  args: {
    items: [],
  },
};

export const Playground: Story = {
  args: {
    slidesPerView: STORY_SLIDES_PER_VIEW,
    spaceBetween: SUPPLIER_CARD_SLIDER_DEFAULT_SPACE_BETWEEN,
    cardCount: 12,
  },
  argTypes: {
    cardCount: {
      control: { type: "range", min: 0, max: 16, step: 1 },
      description: "Story-only: how many supplier cards to show.",
      table: { disable: false, category: "Demo" },
    },
    items: { control: false },
  },
  render: (args) => ({
    components: { SupplierCardSlider, SupplierCard },
    setup() {
      const cards = computed(() => makeCards(args.cardCount ?? 0));
      return { args, cards, cardProps };
    },
    template: `
      <SupplierCardSlider
        :items="cards"
        :slides-per-view="args.slidesPerView"
        :space-between="args.spaceBetween"
      >
        <template #item="{ item }">
          <SupplierCard v-bind="cardProps(item)" />
        </template>
      </SupplierCardSlider>
    `,
  }),
};
