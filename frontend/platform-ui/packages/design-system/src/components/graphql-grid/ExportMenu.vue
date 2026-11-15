<template>
  <div class="graphql-grid-export-menu">
    <DropdownPanel
      v-model:open="open"
      align="end"
    >
      <template #trigger="{ toggle, open: isOpen }">
        <button
          type="button"
          class="graphql-grid-export-menu__trigger"
          :title="triggerLabel"
          :aria-label="triggerLabel"
          aria-haspopup="listbox"
          :aria-expanded="isOpen"
          @click="toggle"
        >
          <InlineSvg
            :src="optionsSrc"
            width="16"
            height="16"
            aria-hidden="true"
          />
        </button>
      </template>
      <ul
        class="ds-dropdown-surface__list"
        role="listbox"
        :aria-label="triggerLabel"
      >
        <!-- role="none": DropdownMenuItem renders role="option", and a listbox must own its options
             directly, so the wrapper must not add a listitem in between. -->
        <li role="none">
          <DropdownMenuItem
            :label="exportLabel"
            @click="onExport"
          />
        </li>
      </ul>
    </DropdownPanel>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import InlineSvg from "vue-inline-svg";
import { resolveSvgAsset } from "../../utils/svgAssets";
import { DropdownPanel } from "../primitives/dropdown-panel";
import { DropdownMenuItem } from "../primitives/dropdown-menu-item";

// Prop docs below are plain text on purpose, same as ColumnSelector.vue: literal Tag-looking text
// anywhere in this file's script - even inside a comment - makes Storybook's Vue docgen corrupt
// the SFC before Vue's compiler sees it. Describe components/props in prose, no angle brackets.
export default defineComponent({
  name: "GraphqlGridExportMenu",
  components: {
    DropdownPanel,
    DropdownMenuItem,
    InlineSvg,
  },
  props: {
    // aria-label/title on the icon-only trigger button.
    triggerLabel: { type: String, default: "Options" },
    // Label of the single menu entry. Choosing it emits "export" and closes the panel.
    exportLabel: { type: String, default: "Export Excel" },
  },
  emits: ["export"],
  setup(_props, { emit }) {
    // The panel is a DS DropdownPanel, which owns positioning, the outside click and Escape;
    // this component only owns the open state and closes it after an entry is chosen.
    const optionsSrc = resolveSvgAsset("vertical-ellipsis");
    const open = ref(false);

    function onExport() {
      open.value = false;
      emit("export");
    }

    return {
      optionsSrc,
      open,
      onExport,
    };
  },
});
</script>

<style lang="scss" scoped>
.graphql-grid-export-menu {
  display: inline-flex;

  // Same boxed icon button as GraphqlGridColumnSelector's __trigger (ColumnSelector.vue) - kept
  // identical to it so the two sit side by side in the grid toolbar.
  &__trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    min-height: 2rem;
    padding-inline: 0.45rem;
    border: 1px solid var(--border-color-default-2);
    border-radius: var(--border-radius-2);
    background: var(--bg-surface);
    color: var(--color-text-interactive-button-default);
    cursor: pointer;
    transition: var(--transition-default);

    &:hover {
      background: var(--bg-page);
      color: var(--color-text-interactive-button-hover);
    }

    &:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }

    svg {
      display: block;
      width: 1rem;
      height: 1rem;
    }
  }
}
</style>
