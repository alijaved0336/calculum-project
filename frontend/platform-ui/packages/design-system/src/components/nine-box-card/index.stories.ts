import type { Meta, StoryObj } from "@storybook/vue3";
import { formatUnionType, propDoc } from "@ds-storybook/argTypes";
import NineBoxCard from "./Index.vue";
import { NINE_BOX_CARD_ACCENTS, type NineBoxCardRow } from "./types";

const sampleRows: NineBoxCardRow[] = [{ label: "Total Value", value: "2.4m" }];

const meta: Meta<typeof NineBoxCard> = {
  title: "Components/NineBoxCard",
  component: NineBoxCard,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template: '<div style="max-width: 12rem;"><story /></div>',
    }),
  ],
  argTypes: {
    badge: propDoc({
      description: "Big circular badge content (a rank or a count).",
      type: "string | number",
      required: true,
    }),
    title: propDoc({
      description: "Card title. Omit to render only the badge and rows (AP's own card has no separate title).",
      type: "string",
      defaultValue: "''",
    }),
    rows: propDoc({
      description: "Label / value metric rows shown below the title.",
      type: "NineBoxCardRow[]",
      control: false,
      detail: "{ label: string; value: string }[]",
    }),
    accent: propDoc({
      description: "Color family for the card's background and selected-state accents.",
      type: formatUnionType(NINE_BOX_CARD_ACCENTS),
      required: true,
      control: "select",
      options: [...NINE_BOX_CARD_ACCENTS],
    }),
    selected: propDoc({
      description: "Recolors the card to a white surface with an accent border.",
      type: "boolean",
      defaultValue: "false",
    }),
    clickable: propDoc({
      description: "`false` disables hover/cursor/click, without necessarily dimming the card (see `muted`).",
      type: "boolean",
      defaultValue: "true",
    }),
    muted: propDoc({
      description: "`true` renders the dimmed, opacity-0.5 look (AP's zero-volume \"not selectable\" box).",
      type: "boolean",
      defaultValue: "false",
    }),
    tall: propDoc({
      description: "Extra-height variant (AP's vCard 9-box).",
      type: "boolean",
      defaultValue: "false",
    }),
  },
  args: {
    badge: 7,
    title: "High prob. / High impact",
    rows: sampleRows,
    accent: "blue-700",
    selected: false,
    clickable: true,
    muted: false,
    tall: false,
  },
};

export default meta;
type Story = StoryObj<typeof NineBoxCard>;

export const Default: Story = {
  render: (args) => ({
    components: { NineBoxCard },
    setup() {
      return { args };
    },
    template: `
      <NineBoxCard
        :badge="args.badge"
        :title="args.title"
        :rows="args.rows"
        :accent="args.accent"
        :selected="args.selected"
        :clickable="args.clickable"
        :muted="args.muted"
        :tall="args.tall"
      />
    `,
  }),
};

export const Selected: Story = {
  args: { selected: true },
  render: (args) => ({
    components: { NineBoxCard },
    setup() {
      return { args };
    },
    template: `
      <NineBoxCard
        :badge="args.badge"
        :title="args.title"
        :rows="args.rows"
        :accent="args.accent"
        :selected="args.selected"
      />
    `,
  }),
};

export const NotSelectable: Story = {
  args: { clickable: false, muted: true },
  render: (args) => ({
    components: { NineBoxCard },
    setup() {
      return { args };
    },
    template: `
      <NineBoxCard
        :badge="args.badge"
        :title="args.title"
        :rows="args.rows"
        :accent="args.accent"
        :clickable="args.clickable"
        :muted="args.muted"
      />
    `,
  }),
};

export const Grid: Story = {
  render: (args) => ({
    components: { NineBoxCard },
    setup() {
      return { args };
    },
    template: `
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 6px; max-width: 24rem;">
        <NineBoxCard v-for="(accent, i) in ['gray-600','blue-700','blue-700','gray-500','gray-600','blue-700','gray-400','gray-500','gray-600']" :key="i" :badge="i + 1" :title="args.title" :rows="args.rows" :accent="accent" />
      </div>
    `,
  }),
};

export const AllAccents: Story = {
  render: () => ({
    components: { NineBoxCard },
    setup() {
      return { accents: NINE_BOX_CARD_ACCENTS, rows: sampleRows };
    },
    template: `
      <div style="display:flex; flex-wrap:wrap; gap: 6px;">
        <NineBoxCard v-for="accent in accents" :key="accent" :badge="1" :title="accent" :rows="rows" :accent="accent" style="width: 9rem;" />
      </div>
    `,
  }),
};
