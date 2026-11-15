import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref, watch } from "vue";
import { propDoc } from "@ds-storybook/argTypes";
import BodyText from "../typography/body-text/Index.vue";
import CustomBadge from "../custom-badge/Index.vue";
import CustomButton from "../custom-button/Index.vue";
import { TextInput } from "../kendo-inputs/text-input";
import DropdownMenuItem from "../dropdown-menu-item/Index.vue";
import DropdownPanel from "./Index.vue";
import {
  DROPDOWN_PANEL_ALIGNS,
  DROPDOWN_PANEL_PLACEMENTS,
} from "./types";

const meta: Meta<typeof DropdownPanel> = {
  title: "Primitives/DropdownPanel",
  component: DropdownPanel,
  tags: ["autodocs"],
  decorators: [
    () => ({
      template: '<div style=""><story /></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: `
Floating panel **shell** on Kendo Popup.

**Slots:** \`#trigger\` · optional \`#header\` · default (flexible mid) · optional \`#footer\`.

Compose rows with \`DropdownMenuItem\`. Mid content (search, select, lists) is free-form — no product logic in the shell.

Nested submenu: child \`DropdownPanel\` with \`placement="side"\` + MenuItem \`trailing="chevron"\` (open on click).

\`\`\`vue
<DropdownPanel v-model:open="open" align="end">
  <template #trigger="{ toggle, disabled }">
    <CustomButton text="Open" :disabled="disabled" @click="toggle" />
  </template>
  <template #header>Title</template>
  <ul class="ds-dropdown-surface__list" role="listbox">
    <li><DropdownMenuItem label="Option" trailing="check" selected /></li>
  </ul>
  <template #footer="{ close }">
    <CustomButton text="Apply" variant="accent" @click="close" />
  </template>
</DropdownPanel>
\`\`\`
        `.trim(),
      },
    },
  },
  argTypes: {
    open: propDoc({
      description: "Controlled open state (`v-model:open`).",
      type: "boolean",
      defaultValue: "false",
    }),
    align: propDoc({
      description:
        "Horizontal alignment when `placement` is `bottom` (`start` = left, `end` = right).",
      type: '"start" | "end"',
      control: "select",
      options: [...DROPDOWN_PANEL_ALIGNS],
      defaultValue: "start",
    }),
    placement: propDoc({
      description:
        "Popup attachment: `bottom` under the trigger, `side` to the right (submenu).",
      type: '"bottom" | "side"',
      control: "select",
      options: [...DROPDOWN_PANEL_PLACEMENTS],
      defaultValue: "bottom",
    }),
    matchTriggerWidth: propDoc({
      description:
        "Force outer panel width to match the trigger (padding and border included). Ignored when `panelWidth` is set.",
      type: "boolean",
      defaultValue: "false",
    }),
    panelWidth: propDoc({
      description:
        "Exact outer panel width (`280`, `\"280px\"`, `\"18rem\"`, …). Overrides `matchTriggerWidth`.",
      type: "string | number",
      defaultValue: "undefined",
    }),
    block: propDoc({
      description:
        "Stretch root + trigger to 100% parent width (list-row submenu triggers).",
      type: "boolean",
      defaultValue: "false",
    }),
    disabled: propDoc({
      description: "Disables opening and closes the panel if already open.",
      type: "boolean",
      defaultValue: "false",
    }),
    closeOnOutsideClick: propDoc({
      description:
        "Close when clicking outside (document pointerdown, including clicks that stopPropagation). Nested child panels stay open; sibling panels close.",
      type: "boolean",
      defaultValue: "true",
    }),
    closeOnEscape: propDoc({
      description: "Close on Escape (topmost open panel only).",
      type: "boolean",
      defaultValue: "true",
    }),
  },
  args: {
    open: false,
    align: "start",
    placement: "bottom",
    matchTriggerWidth: false,
    panelWidth: "",
    block: false,
    disabled: false,
    closeOnOutsideClick: true,
    closeOnEscape: true,
  },
};

export default meta;
type Story = StoryObj<typeof DropdownPanel>;

export const Basic: Story = {
  name: "Shell (start / end)",
  decorators: [
    () => ({
      template: '<div style="display: flex"><story /></div>',
    }),
  ],
  render: (args) => ({
    components: { DropdownPanel, CustomButton, BodyText },
    setup() {
      const open = ref(Boolean(args.open));

      watch(
        () => args.open,
        (value) => {
          open.value = Boolean(value);
        },
      );

      return { args, open };
    },
    template: `
      <DropdownPanel
        v-model:open="open"
        :align="args.align"
        :placement="args.placement"
        :match-trigger-width="args.matchTriggerWidth"
        :panel-width="args.panelWidth"
        :block="args.block"
        :disabled="args.disabled"
        :close-on-outside-click="args.closeOnOutsideClick"
        :close-on-escape="args.closeOnEscape"
      >
        <template #trigger="{ toggle, open: isOpen, disabled }">
          <CustomButton
            :text="isOpen ? 'Close' : 'Open'"
            :disabled="disabled"
            @click="toggle"
          />
        </template>
        <BodyText variant="sm" weight="medium">Arbitrary panel content</BodyText>
      </DropdownPanel>
    `,
  }),
};

export const CurrencySelectPattern: Story = {
  name: "Pattern: currency select",
  render: () => ({
    components: { DropdownPanel, CustomButton, DropdownMenuItem },
    setup() {
      const open = ref(false);
      const options = ["EUR", "USD", "GBP"];
      const selected = ref("USD");

      function choose(next: string) {
        selected.value = next;
        open.value = false;
      }

      return { open, options, selected, choose };
    },
    template: `
      <DropdownPanel v-model:open="open" align="start">
        <template #trigger="{ toggle }">
          <CustomButton :text="selected" icon="chevrons-up-down" @click="toggle" />
        </template>
        <ul class="ds-dropdown-surface__list" role="listbox">
          <li v-for="item in options" :key="item">
            <DropdownMenuItem
              :label="item"
              trailing="check"
              :selected="item === selected"
              @click="choose(item)"
            />
          </li>
        </ul>
      </DropdownPanel>
    `,
  }),
};

export const FieldSelectPattern: Story = {
  name: "Pattern: field select",
  render: () => ({
    components: { DropdownPanel, CustomButton, DropdownMenuItem },
    setup() {
      const open = ref(false);
      const options = ["DPO Comparison", "Spend Volume", "Cash Flow"];
      const selected = ref("DPO Comparison");

      function choose(next: string) {
        selected.value = next;
        open.value = false;
      }

      return { open, options, selected, choose };
    },
    template: `
      <DropdownPanel v-model:open="open" align="start" match-trigger-width>
        <template #trigger="{ toggle }">
          <CustomButton :text="selected" icon="icon-arrow-down" @click="toggle" />
        </template>
        <ul class="ds-dropdown-surface__list" role="listbox">
          <li v-for="item in options" :key="item">
            <DropdownMenuItem
              :label="item"
              :selected="item === selected"
              @click="choose(item)"
            />
          </li>
        </ul>
      </DropdownPanel>
    `,
  }),
};

export const CompanySelectPattern: Story = {
  name: "Pattern: company select",
  render: () => ({
    components: { DropdownPanel, CustomButton, DropdownMenuItem },
    setup() {
      const open = ref(false);
      const placeholder =
        "data:image/svg+xml," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="6" fill="#e2e8f0"/><circle cx="16" cy="16" r="6" fill="#94a3b8"/></svg>`,
        );
      const options = [
        { id: "amazon", label: "Amazon" },
        { id: "acme", label: "Acme Corp" },
      ];
      const selectedId = ref("amazon");
      const selected = computed(
        () =>
          options.find((item) => item.id === selectedId.value) ?? options[0],
      );

      function choose(id: string) {
        selectedId.value = id;
        open.value = false;
      }

      return { open, options, selectedId, selected, choose, placeholder };
    },
    template: `
      <DropdownPanel v-model:open="open" align="start">
        <template #trigger="{ toggle }">
          <CustomButton :text="selected.label" icon="chevrons-up-down" @click="toggle" />
        </template>
        <ul class="ds-dropdown-surface__list" role="listbox">
          <li v-for="item in options" :key="item.id">
            <DropdownMenuItem
              :label="item.label"
              start="image"
              :start-src="placeholder"
              trailing="radio"
              radio-name="company-demo"
              :radio-value="item.id"
              :selected="item.id === selectedId"
              @click="choose(item.id)"
            />
          </li>
        </ul>
      </DropdownPanel>
    `,
  }),
};

export const UserMenuPattern: Story = {
  name: "Pattern: user menu (align end)",
  decorators: [
    () => ({
      template:
        '<div style="display: flex; justify-content: flex-end; padding: 1rem;"><story /></div>',
    }),
  ],
  render: () => ({
    components: { DropdownPanel, CustomButton, DropdownMenuItem },
    setup() {
      const open = ref(false);
      const darkMode = ref(false);
      const items = [
        "Company Info",
        "Preferences",
        "Manage Users",
        "Help & Support",
      ];

      return { open, items, darkMode };
    },
    template: `
      <DropdownPanel v-model:open="open" align="end">
        <template #trigger="{ toggle }">
          <CustomButton text="Account menu" icon="settings" :show-label="false" @click="toggle" />
        </template>
        <ul class="ds-dropdown-surface__list">
          <li v-for="item in items" :key="item">
            <DropdownMenuItem :label="item" @click="open = false" />
          </li>
          <li>
            <DropdownMenuItem
              label="Dark mode"
              trailing="switch"
              v-model:selected="darkMode"
            />
          </li>
        </ul>
        <template #footer="{ close }">
          <CustomButton text="Logout" @click="close" />
        </template>
      </DropdownPanel>
    `,
  }),
};

export const HeaderListFooterPattern: Story = {
  name: "Pattern: header + list + footer",
  render: () => ({
    components: {
      DropdownPanel,
      CustomButton,
      DropdownMenuItem,
      TextInput,
    },
    setup() {
      const open = ref(true);
      const selected = ref("avg");
      const customDays = ref("");
      const options = [
        { id: "avg", label: "Avg. Days Paid" },
        { id: "contractual", label: "Contractual Payment Terms" },
        { id: "opportunity", label: "Payment Terms Opportunity" },
      ];

      return { open, selected, options, customDays };
    },
    template: `
      <DropdownPanel v-model:open="open" panel-width="18rem">
        <template #trigger="{ toggle }">
          <CustomButton text="Target Equal To" icon="icon-arrow-down" @click="toggle" />
        </template>
        <template #header>Target Equal To</template>
        <ul class="ds-dropdown-surface__list" role="listbox">
          <li v-for="item in options" :key="item.id">
            <DropdownMenuItem
              :label="item.label"
              trailing="check"
              :selected="item.id === selected"
              @click="selected = item.id"
            />
          </li>
        </ul>
        <div class="ds-dropdown-surface__section">
          <TextInput v-model="customDays" placeholder="Custom days" />
        </div>
        <template #footer="{ close }">
          <CustomButton text="Apply" variant="accent" @click="close" />
        </template>
      </DropdownPanel>
    `,
  }),
};

export const HeaderSearchListFooterPattern: Story = {
  name: "Pattern: header + search + list + footer",
  render: () => ({
    components: {
      DropdownPanel,
      CustomButton,
      DropdownMenuItem,
      TextInput,
    },
    setup() {
      const open = ref(true);
      const query = ref("");
      const options = ["Brand Label", "Electronics", "FC", "Outsourcing"];
      const filtered = computed(() => {
        const q = query.value.trim().toLowerCase();
        if (!q) {
          return options;
        }
        return options.filter((item) => item.toLowerCase().includes(q));
      });
      const letterAvatar =
        "data:image/svg+xml," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="6" fill="#e2e8f0"/><text x="16" y="21" text-anchor="middle" font-size="14" font-family="sans-serif" fill="#64748b">A</text></svg>`,
        );

      return { open, query, filtered, letterAvatar };
    },
    template: `
      <DropdownPanel v-model:open="open" panel-width="18rem">
        <template #trigger="{ toggle }">
          <CustomButton text="Commodities" icon="icon-arrow-down" @click="toggle" />
        </template>
        <template #header>Commodities</template>
        <div class="ds-dropdown-surface__section">
          <TextInput v-model="query" placeholder="Search" />
        </div>
        <hr class="ds-dropdown-surface__divider" />
        <ul class="ds-dropdown-surface__list" role="listbox">
          <li v-for="item in filtered" :key="item">
            <DropdownMenuItem
              :label="item"
              start="image"
              :start-src="letterAvatar"
              start-alt=""
            />
          </li>
        </ul>
        <template #footer="{ close }">
          <CustomButton text="Apply filter" variant="accent" @click="close" />
          <CustomButton text="Clear" @click="query = ''" />
        </template>
      </DropdownPanel>
    `,
  }),
};

export const HeaderBadgesFooterPattern: Story = {
  name: "Pattern: header + badge rows + footer",
  render: () => ({
    components: {
      DropdownPanel,
      CustomButton,
      DropdownMenuItem,
      CustomBadge,
    },
    setup() {
      const open = ref(true);
      const selected = ref(["a", "b"]);

      function toggleId(id: string) {
        if (selected.value.includes(id)) {
          selected.value = selected.value.filter((x) => x !== id);
        } else {
          selected.value = [...selected.value, id];
        }
      }

      return { open, selected, toggleId };
    },
    template: `
      <DropdownPanel v-model:open="open" panel-width="18rem">
        <template #trigger="{ toggle }">
          <CustomButton text="Term Group" icon="icon-arrow-down" @click="toggle" />
        </template>
        <template #header>Term Group</template>
        <ul class="ds-dropdown-surface__list" role="listbox">
          <li>
            <DropdownMenuItem
              trailing="check"
              :selected="selected.includes('a')"
              @click="toggleId('a')"
            >
              <CustomBadge text="F1, Base + 1.20%" variant="danger" />
            </DropdownMenuItem>
          </li>
          <li>
            <DropdownMenuItem
              trailing="check"
              :selected="selected.includes('b')"
              @click="toggleId('b')"
            >
              <CustomBadge text="F1, Base + 1.20%" variant="warning" />
            </DropdownMenuItem>
          </li>
        </ul>
        <template #footer="{ close }">
          <CustomButton text="Apply" variant="accent" @click="close" />
          <CustomButton text="Remove Group" icon="cross" @click="close" />
        </template>
      </DropdownPanel>
    `,
  }),
};

export const NestedSubmenuPattern: Story = {
  name: "Pattern: nested submenu (click)",
  decorators: [
    () => ({
      template:
        '<div style="min-height: 16rem; padding: 1rem;"><story /></div>',
    }),
  ],
  render: () => ({
    components: { DropdownPanel, CustomButton, DropdownMenuItem },
    setup() {
      const open = ref(true);
      const cfOpen = ref(true);
      const top10Open = ref(false);
      const leaf = ref("10-25");

      return { open, cfOpen, top10Open, leaf };
    },
    template: `
      <DropdownPanel v-model:open="open" panel-width="14rem">
        <template #trigger="{ toggle }">
          <CustomButton text="Plan/Phases" icon="icon-arrow-down" @click="toggle" />
        </template>
        <template #header>Plan/Phases</template>
        <ul class="ds-dropdown-surface__list" role="listbox">
          <li>
            <DropdownPanel
              v-model:open="cfOpen"
              placement="side"
              block
              panel-width="12rem"
            >
              <template #trigger="{ toggle }">
                <DropdownMenuItem
                  label="CF Opp. Plan"
                  trailing="chevron"
                  :active="cfOpen"
                  @click="toggle"
                />
              </template>
              <ul class="ds-dropdown-surface__list" role="listbox">
                <li>
                  <DropdownMenuItem
                    label="10-25 CF Opp."
                    trailing="check"
                    :selected="leaf === '10-25'"
                    @click="leaf = '10-25'"
                  />
                </li>
                <li>
                  <DropdownMenuItem
                    label="Email Negotiation"
                    trailing="check"
                    :selected="leaf === 'email'"
                    @click="leaf = 'email'"
                  />
                </li>
              </ul>
              <template #footer="{ close }">
                <CustomButton text="Apply" variant="accent" @click="close" />
              </template>
            </DropdownPanel>
          </li>
          <li>
            <DropdownPanel
              v-model:open="top10Open"
              placement="side"
              block
              panel-width="12rem"
            >
              <template #trigger="{ toggle }">
                <DropdownMenuItem
                  label="Top 10 CF"
                  trailing="chevron"
                  :active="top10Open"
                  @click="toggle"
                />
              </template>
              <ul class="ds-dropdown-surface__list" role="listbox">
                <li>
                  <DropdownMenuItem label="Option A" @click="top10Open = false" />
                </li>
                <li>
                  <DropdownMenuItem label="Option B" @click="top10Open = false" />
                </li>
              </ul>
            </DropdownPanel>
          </li>
        </ul>
        <template #footer="{ close }">
          <CustomButton text="Remove Plan" icon="cross" @click="close" />
        </template>
      </DropdownPanel>
    `,
  }),
};
