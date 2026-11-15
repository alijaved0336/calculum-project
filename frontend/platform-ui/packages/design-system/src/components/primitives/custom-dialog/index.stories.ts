import type { Meta, StoryObj } from "@storybook/vue3";
import { ref, watch } from "vue";
import { propDoc } from "@ds-storybook/argTypes";
import CustomButton from "../custom-button/Index.vue";
import CustomDialog from "./Index.vue";

const meta: Meta<typeof CustomDialog> = {
  title: "Primitives/CustomDialog",
  component: CustomDialog,
  tags: ["autodocs"],
  argTypes: {
    visible: propDoc({
      description:
        "Controlled open state. Bind with `v-model:visible` (or `:visible` + `@update:visible`). The dialog does not keep its own open state — parent owns it. Closing via X, Esc, overlay, or actions emits `update:visible` with `false` (and `close`).",
      type: "boolean",
      defaultValue: "false",
    }),
    title: propDoc({
      description:
        "Dialog title. Shown in the titlebar by default, or in the content when `showLogo`. Required for accessibility (`aria-labelledby`).",
      type: "string",
      required: true,
    }),
    width: propDoc({
      description: "Dialog width in px (number) or CSS size string.",
      type: "string | number",
      defaultValue: "450",
      control: "number",
    }),
    closeIcon: propDoc({
      description:
        "Show the overlay close button (uses the `cross` SVG asset). Rendered above the titlebar, not inside it.",
      type: "boolean",
      defaultValue: "true",
    }),
    modal: propDoc({
      description:
        'Modal overlay + `aria-modal="true"`. Keep `true` for accessible modals. Focus moves into the dialog on open, restores on close; Tab is trapped inside.',
      type: "boolean",
      defaultValue: "true",
    }),
    closeOnOverlayClick: propDoc({
      description: "Close when the dimmed overlay is clicked.",
      type: "boolean",
      defaultValue: "true",
    }),
    showLogo: propDoc({
      description:
        "Centered Calculum logo and wrapping title in the content. The Kendo titlebar is hidden; close stays as a top-right overlay; action buttons stack full-width.",
      type: "boolean",
      defaultValue: "false",
    }),
    icon: propDoc({
      description:
        "Design-system icon name shown in a rounded badge, left-aligned next to the title, in place of the native titlebar (which is hidden). Independent of `showLogo` - unlike it, content and actions stay left-aligned/horizontal, not centered or stacked.",
      type: "string",
      defaultValue: "undefined",
    }),
  },
  args: {
    visible: false,
    title: "Please confirm",
    width: 450,
    closeIcon: true,
    modal: true,
    closeOnOverlayClick: true,
    showLogo: false,
    icon: undefined,
  },
  parameters: {
    docs: {
      description: {
        component: `
Controlled modal dialog. There is no default trigger — pass one via the \`#trigger\` slot (\`{ open }\`), or open programmatically with \`v-model:visible\`.

\`\`\`vue
<CustomDialog v-model:visible="open" title="Please confirm">
  <template #trigger="{ open }">
    <CustomButton text="Open" @click="open" />
  </template>
  <p>Body</p>
  <template #actions>…</template>
</CustomDialog>
\`\`\`
        `.trim(),
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CustomDialog>;

function useDialogState(args: { visible?: boolean }) {
  const visible = ref(args.visible ?? false);

  watch(
    () => args.visible,
    (next) => {
      visible.value = next ?? false;
    },
  );

  function onUpdateVisible(value: boolean) {
    visible.value = value;
  }

  return { visible, onUpdateVisible };
}

const dialogContent = `
  <p style="margin: 0; text-align: center;">
    Are you sure you want to continue?
  </p>
  <template #actions>
    <CustomButton
      text="No"
      variant="plain"
      @click="onUpdateVisible(false)"
    />
    <CustomButton
      text="Yes"
      variant="accent"
      @click="onUpdateVisible(false)"
    />
  </template>
`;

function renderDialogStory(options?: { customTrigger?: boolean }): Story {
  const customTrigger = options?.customTrigger ?? false;

  return {
    render: (args) => ({
      components: { CustomDialog, CustomButton },
      setup() {
        const { visible, onUpdateVisible } = useDialogState(args);
        return { args, visible, onUpdateVisible };
      },
      template: `
        <CustomDialog
          :visible="visible"
          :title="args.title"
          :width="args.width"
          :close-icon="args.closeIcon"
          :modal="args.modal"
          :close-on-overlay-click="args.closeOnOverlayClick"
          :show-logo="args.showLogo"
          :icon="args.icon"
          @update:visible="onUpdateVisible"
        >
          <template #trigger="{ open }">
            ${
              customTrigger
                ? `<CustomButton text="Open Dialog" @click="open" />`
                : `<CustomButton
              text="Expand the information in a modal window."
              variant="plain"
              icon="expand"
              :show-label="false"
              @click="open"
            />`
            }
          </template>
          ${dialogContent}
        </CustomDialog>
      `,
    }),
  };
}

export const Default: Story = {
  name: "Default trigger (expand)",
  ...renderDialogStory(),
};

export const CustomTrigger: Story = {
  name: "Custom trigger slot",
  ...renderDialogStory({ customTrigger: true }),
};

export const WithLogo: Story = {
  name: "Logo header (stacked actions)",
  args: {
    visible: true,
    title: "Are you sure you want to remove the Active",
    showLogo: true,
  },
  render: (args) => ({
    components: { CustomDialog, CustomButton },
    setup() {
      const { visible, onUpdateVisible } = useDialogState(args);
      return { args, visible, onUpdateVisible };
    },
    template: `
      <CustomDialog
        :visible="visible"
        :title="args.title"
        :width="args.width"
        :close-icon="args.closeIcon"
        :modal="args.modal"
        :close-on-overlay-click="args.closeOnOverlayClick"
        :show-logo="args.showLogo"
        @update:visible="onUpdateVisible"
      >
        <template #trigger="{ open }">
          <CustomButton text="Open Dialog" @click="open" />
        </template>
        <template #actions>
          <CustomButton
            text="Yes"
            variant="accent"
            @click="onUpdateVisible(false)"
          />
          <CustomButton
            text="No"
            variant="default"
            @click="onUpdateVisible(false)"
          />
        </template>
      </CustomDialog>
    `,
  }),
};

export const WithIcon: Story = {
  name: "Icon header (left-aligned)",
  args: {
    visible: true,
    title: "Credit ratings and limits are estimates",
    icon: "calculate",
  },
  render: (args) => ({
    components: { CustomDialog, CustomButton },
    setup() {
      const { visible, onUpdateVisible } = useDialogState(args);
      return { args, visible, onUpdateVisible };
    },
    template: `
      <CustomDialog
        :visible="visible"
        :title="args.title"
        :width="args.width"
        :close-icon="args.closeIcon"
        :modal="args.modal"
        :close-on-overlay-click="args.closeOnOverlayClick"
        :icon="args.icon"
        @update:visible="onUpdateVisible"
      >
        <template #trigger="{ open }">
          <CustomButton text="Open Dialog" @click="open" />
        </template>
        <p style="margin: 0;">
          They're derived from the parent company's credit profile and are for information only.
        </p>
        <template #actions>
          <CustomButton
            text="Continue"
            variant="accent"
            @click="onUpdateVisible(false)"
          />
        </template>
      </CustomDialog>
    `,
  }),
};
