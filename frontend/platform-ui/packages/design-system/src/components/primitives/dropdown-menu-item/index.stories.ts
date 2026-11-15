import type { Meta, StoryObj } from "@storybook/vue3";
import { ref, watch } from "vue";
import { propDoc } from "@ds-storybook/argTypes";
import CustomBadge from "../custom-badge/Index.vue";
import DropdownMenuItem from "./Index.vue";
import {
  DROPDOWN_MENU_ITEM_STARTS,
  DROPDOWN_MENU_ITEM_TRAILINGS,
} from "./types";

const placeholderImage =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="6" fill="#e2e8f0"/><circle cx="16" cy="16" r="6" fill="#94a3b8"/></svg>`,
  );

const meta: Meta<typeof DropdownMenuItem> = {
  title: "Primitives/DropdownMenuItem",
  component: DropdownMenuItem,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template:
        '<div style="width: min(100%, 18rem); padding: 0.5rem; border: 1px solid var(--border-color-default); border-radius: var(--border-radius-default); background: var(--bg-surface);"><story /></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
Single dropdown row. Text via \`label\` prop or default slot.

- **Start** (one of): \`none\` | \`image\` | \`logo\`
- **Trailing** (one of): \`none\` | \`check\` | \`checkbox\` | \`radio\` | \`switch\` | \`chevron\`

\`chevron\` is a static affordance for submenu rows (compose with nested \`DropdownPanel\` \`placement="side"\`).

\`image\` uses a URL via \`<img>\`. \`logo\` resolves a design-system SVG asset name through \`InlineSvg\` (e.g. \`logo-calculum\`).

\`check\` is a static checkmark icon when selected. \`checkbox\` is an interactive \`CheckBox\` bound to \`v-model:selected\` (same as switch).

Default story uses **image + switch** so both sides are visible; change controls to try other combinations.

\`\`\`vue
<DropdownMenuItem
  label="Notifications"
  trailing="checkbox"
  v-model:selected="on"
/>
\`\`\`
        `.trim(),
      },
    },
  },
  argTypes: {
    label: propDoc({
      description: "Primary label text.",
      type: "string",
    }),
    start: propDoc({
      description: "Left adornment: none | image | logo.",
      type: '"none" | "image" | "logo"',
      control: "select",
      options: [...DROPDOWN_MENU_ITEM_STARTS],
      defaultValue: "none",
    }),
    startSrc: propDoc({
      description:
        "Image URL when start is image; DS SVG asset name when start is logo.",
      type: "string",
    }),
    startAlt: propDoc({
      description: "Alt text for start image.",
      type: "string",
      defaultValue: '""',
    }),
    trailing: propDoc({
      description:
        "Right adornment: none | check | checkbox | radio | switch | chevron.",
      type: '"none" | "check" | "checkbox" | "radio" | "switch" | "chevron"',
      control: "select",
      options: [...DROPDOWN_MENU_ITEM_TRAILINGS],
      defaultValue: "none",
    }),
    selected: propDoc({
      description:
        "Selected / on state for check, checkbox, radio, and switch (`v-model:selected`).",
      type: "boolean",
      defaultValue: "false",
    }),
    disabled: propDoc({
      description: "Disabled interaction.",
      type: "boolean",
      defaultValue: "false",
    }),
    active: propDoc({
      description: "Force active/hover styling (e.g. keyboard focus).",
      type: "boolean",
      defaultValue: "false",
    }),
    radioName: propDoc({
      description: "Radio group name when trailing is radio.",
      type: "string",
    }),
    radioValue: propDoc({
      description: "Radio option value when trailing is radio.",
      type: "string | number",
    }),
  },
  args: {
    label: "Dark mode",
    start: "image",
    startSrc: placeholderImage,
    startAlt: "Option",
    trailing: "switch",
    selected: false,
    disabled: false,
    active: false,
    radioName: "demo",
    radioValue: "a",
  },
};

export default meta;
type Story = StoryObj<typeof DropdownMenuItem>;

/** Playground: image + switch by default; tweak all props in Controls. */
export const Default: Story = {
  render: (args) => ({
    components: { DropdownMenuItem },
    setup() {
      const selected = ref(Boolean(args.selected));
      watch(
        () => args.selected,
        (next) => {
          selected.value = Boolean(next);
        },
      );
      return { args, selected };
    },
    template: `
      <DropdownMenuItem
        v-bind="args"
        v-model:selected="selected"
      />
    `,
  }),
};

export const TextOnly: Story = {
  name: "Text only",
  args: {
    label: "Avg. Days Paid",
    start: "none",
    trailing: "none",
    startSrc: "",
  },
};

export const WithCheck: Story = {
  name: "Trailing check (selected)",
  args: {
    label: "USD",
    start: "none",
    startSrc: "",
    trailing: "check",
    selected: true,
  },
};

export const WithRadio: Story = {
  name: "Start image + trailing radio",
  render: () => ({
    components: { DropdownMenuItem },
    setup() {
      const selectedId = ref("amazon");
      return { selectedId, placeholderImage };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.25rem;">
        <DropdownMenuItem
          label="Amazon"
          start="image"
          :start-src="placeholderImage"
          trailing="radio"
          radio-name="company"
          radio-value="amazon"
          :selected="selectedId === 'amazon'"
          @click="selectedId = 'amazon'"
        />
        <DropdownMenuItem
          label="Acme Corp"
          start="image"
          :start-src="placeholderImage"
          trailing="radio"
          radio-name="company"
          radio-value="acme"
          :selected="selectedId === 'acme'"
          @click="selectedId = 'acme'"
        />
      </div>
    `,
  }),
};

export const WithSwitch: Story = {
  name: "Trailing switch only",
  render: () => ({
    components: { DropdownMenuItem },
    setup() {
      const on = ref(false);
      return { on };
    },
    template: `
      <DropdownMenuItem
        label="Dark mode"
        trailing="switch"
        v-model:selected="on"
      />
    `,
  }),
};

export const WithCheckbox: Story = {
  name: "Trailing checkbox",
  render: () => ({
    components: { DropdownMenuItem },
    setup() {
      const on = ref(true);
      return { on };
    },
    template: `
      <DropdownMenuItem
        label="Notifications"
        trailing="checkbox"
        v-model:selected="on"
      />
    `,
  }),
};

export const WithLogo: Story = {
  name: "Start logo (InlineSvg)",
  args: {
    label: "Calculum",
    start: "logo",
    trailing: "none",
    startSrc: "logo-calculum",
  },
};

export const WithChevron: Story = {
  name: "Trailing chevron (submenu affordance)",
  args: {
    label: "CF Opp. Plan",
    start: "none",
    startSrc: "",
    trailing: "chevron",
    active: true,
  },
};

export const CustomLabelSlot: Story = {
  name: "Custom default slot (badge)",
  args: {
    start: "none",
    startSrc: "",
    trailing: "check",
    selected: true,
  },
  render: (args) => ({
    components: { DropdownMenuItem, CustomBadge },
    setup() {
      return { args };
    },
    template: `
      <DropdownMenuItem v-bind="args">
        <CustomBadge text="F1, Base + 1.20%" variant="danger" />
      </DropdownMenuItem>
    `,
  }),
};
