import type { Meta, StoryObj } from "@storybook/vue3";
import { ref } from "vue";
import { propDoc } from "@ds-storybook/argTypes";
import ExportMenu from "./ExportMenu.vue";
import ColumnSelector from "./ColumnSelector.vue";
import type { GraphqlGridColumn } from "./types";

const columns: GraphqlGridColumn[] = [
  { field: "supplierName", title: "Supplier name" },
  { field: "email", title: "Email" },
  { field: "spend", title: "Spend" },
  { field: "contactStatus", title: "Status" },
];

const meta: Meta<typeof ExportMenu> = {
  title: "Components/GraphqlGridExportMenu",
  component: ExportMenu,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
The options (⋮) button of the GraphqlGrid toolbar: a boxed icon button that opens a DS \`DropdownPanel\` with one \`DropdownMenuItem\` (Export Excel by default).

- Choosing the entry emits \`export\` (no payload) and closes the panel; an outside click or Escape also closes it.
- The trigger is styled like the column selector's button (\`GraphqlGridColumnSelector\`), so the two sit side by side in the toolbar. \`GraphqlGrid\` renders this component when \`allowExport\` is set.
- Labels come from the caller (translated text): \`triggerLabel\` is the trigger's title / aria-label, \`exportLabel\` the entry's text.

\`\`\`vue
<GraphqlGridExportMenu
  trigger-label="Options"
  export-label="Export Excel"
  @export="onExport"
/>
\`\`\`
        `.trim(),
      },
    },
  },
  argTypes: {
    triggerLabel: propDoc({
      description: "Title and aria-label of the icon-only trigger button.",
      type: "string",
      control: "text",
      defaultValue: '"Options"',
    }),
    exportLabel: propDoc({
      description: "Label of the menu entry that emits `export`.",
      type: "string",
      control: "text",
      defaultValue: '"Export Excel"',
    }),
    onExport: {
      action: "export",
      description: "Emitted, with no payload, when the export entry is chosen.",
      table: { category: "events" },
    },
  },
  args: {
    triggerLabel: "Options",
    exportLabel: "Export Excel",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Click the ⋮ button, then the entry: `export` is logged in the Actions panel and the panel closes. */
export const Default: Story = {};

/** Labels are plain props, so a host can pass translated text. */
export const CustomLabels: Story = {
  name: "Custom labels",
  args: {
    triggerLabel: "Opciones",
    exportLabel: "Exportar a Excel",
  },
};

/**
 * The export button beside `GraphqlGridColumnSelector`'s trigger, as in the grid toolbar: same
 * box, border, radius, hover and 16px icon.
 */
export const NextToColumnSelector: Story = {
  name: "Next to the column selector",
  render: (args) => ({
    components: { ExportMenu, ColumnSelector },
    setup() {
      const selectorColumns = ref(columns.map((column) => ({ ...column })));
      return { args, selectorColumns };
    },
    template: `
      <div style="display: flex; justify-content: flex-end; align-items: center;">
        <ColumnSelector v-model:columns="selectorColumns" />
        <ExportMenu v-bind="args" />
      </div>
    `,
  }),
};
