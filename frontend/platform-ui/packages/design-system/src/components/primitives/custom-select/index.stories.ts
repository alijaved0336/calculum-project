import type { Meta, StoryObj } from "@storybook/vue3";
import { ref, watch } from "vue";
import { propDoc } from "@ds-storybook/argTypes";
import CustomSelect from "./Index.vue";
import type { CustomSelectValue } from "./types";

const sports = [
  "Avg. Days Paid",
  "Avg. Days Outstanding... and more text to see if it wraps",
  "Spend Volume",
  "Cash Flow Opportunity",
];

const meta: Meta<typeof CustomSelect> = {
  title: "Primitives/CustomSelect",
  component: CustomSelect,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template:
        '<div style="padding: 1rem; width: min(100%, 20rem);"><story /></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
Select **recipe** on \`DropdownPanel\` + \`DropdownMenuItem\` (Kendo Popup shell, check trailing).

\`\`\`vue
<CustomSelect
  v-model="sport"
  :data-items="sports"
  label="Select Value"
  default-item="Select sport ..."
  hint="hint text to help user"
/>
\`\`\`

\`default-item\` is only a placeholder in the closed field — it is **not** added to the dropdown list.

**Events**
- \`update:modelValue\` — for \`v-model\`
- \`change\` — fires only when the value actually changes

Hosts should import \`@ada/design-system/styles/dropdown-surface.scss\` (Storybook already does).
        `.trim(),
      },
    },
  },
  argTypes: {
    modelValue: propDoc({
      description: "Selected value (`v-model`).",
      type: "string | null",
      defaultValue: "null",
    }),
    dataItems: propDoc({
      description: "Options list (array of strings).",
      type: "string[]",
      required: true,
      control: "object",
    }),
    label: propDoc({
      description: 'Compact field label above the value, e.g. "Select Value".',
      type: "string",
      required: true,
    }),
    defaultItem: propDoc({
      description:
        "Placeholder text when nothing is selected. Not shown as a list option.",
      type: "string",
      defaultValue: "Select…",
    }),
    hint: propDoc({
      description: "Optional hint under the field.",
      type: "string",
      defaultValue: "undefined",
    }),
    disabled: propDoc({
      description: "Disables interaction.",
      type: "boolean",
      defaultValue: "false",
    }),
    panelWidth: propDoc({
      description:
        "Exact dropdown-list width (e.g. `\"18rem\"`). Use under a zoomed host instead of the default trigger-width match - see the prop's own doc for why.",
      type: "string | number",
      defaultValue: "undefined",
    }),
  },
  args: {
    label: "Select Value",
    defaultItem: "Select…",
    hint: "",
    disabled: false,
    dataItems: sports,
    modelValue: "Avg. Days Paid",
  },
};

export default meta;
type Story = StoryObj<typeof CustomSelect>;

export const Default: Story = {
  render: (args) => ({
    components: { CustomSelect },
    setup() {
      const value = ref<CustomSelectValue | null>(args.modelValue ?? null);
      watch(
        () => args.modelValue,
        (next) => {
          value.value = next ?? null;
        },
      );
      return { args, value };
    },
    template: `
      <CustomSelect
        v-model="value"
        :data-items="args.dataItems"
        :label="args.label"
        :default-item="args.defaultItem"
        :hint="args.hint"
        :disabled="args.disabled"
      />
    `,
  }),
};

export const WithHint: Story = {
  name: "With hint",
  render: () => ({
    components: { CustomSelect },
    setup() {
      const value = ref<CustomSelectValue | null>("Avg. Days Paid");
      return { value, sports };
    },
    template: `
      <CustomSelect
        v-model="value"
        :data-items="sports"
        label="Select Value"
        hint="hint text to help user"
      />
    `,
  }),
};

export const WithChangeHandler: Story = {
  name: "With @change handler",
  render: () => ({
    components: { CustomSelect },
    setup() {
      const value = ref<CustomSelectValue>("Avg. Days Paid");
      const lastChange = ref("—");

      function onChange(next: CustomSelectValue) {
        lastChange.value = next;
      }

      return { value, lastChange, sports, onChange };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <CustomSelect
          v-model="value"
          :data-items="sports"
          label="Select Value"
          @change="onChange"
        />
        <p style="margin: 0; font-size: 12px; color: var(--color-text-3);">
          Last change: {{ lastChange }}
        </p>
      </div>
    `,
  }),
};

export const Placeholder: Story = {
  name: "No selection (default-item)",
  render: () => ({
    components: { CustomSelect },
    setup() {
      const value = ref<CustomSelectValue | null>(null);
      return { value, sports };
    },
    template: `
      <CustomSelect
        v-model="value"
        :data-items="sports"
        label="Select Value"
        default-item="Select sport ..."
      />
    `,
  }),
};

export const Disabled: Story = {
  args: {
    label: "Select Value",
    modelValue: "Avg. Days Paid",
    dataItems: sports,
    disabled: true,
  },
};
