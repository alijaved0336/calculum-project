<template>
  <div
    ref="triggerRef"
    class="graphql-grid-column-selector me-2"
  >
    <button
      type="button"
      class="graphql-grid-column-selector__trigger"
      :title="triggerLabel"
      :aria-label="triggerLabel"
      @click="toggleOpen"
    >
      <InlineSvg
        :src="filtersSrc"
        width="16"
        height="16"
        aria-hidden="true"
      />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelRef"
        class="graphql-grid-column-selector__panel"
        :style="{ top: panelPosition.top, right: panelPosition.right }"
      >
        <div class="graphql-grid-column-selector__header">
          <span>{{ panelTitle }}</span>
          <CustomButton
            text="Close"
            variant="plain"
            icon="cross"
            :show-label="false"
            @click="open = false"
          />
        </div>

        <input
          v-model="searchTerm"
          class="graphql-grid-column-selector__search"
          type="text"
          aria-label="Search columns"
          :placeholder="searchPlaceholder"
        />

        <label
          v-if="filteredDraft.length > 0"
          class="graphql-grid-column-selector__row graphql-grid-column-selector__row--all"
        >
          <CheckBox
            :model-value="allFilteredVisible"
            aria-label="Select all columns"
            size="small"
            @update:model-value="toggleAllFiltered"
          />
          <span>Select all</span>
        </label>

        <p v-else class="graphql-grid-column-selector__empty">
          No columns found.
        </p>

        <ul class="graphql-grid-column-selector__list">
          <li
            v-for="column in filteredDraft"
            :key="column.field"
          >
            <label class="graphql-grid-column-selector__row">
              <CheckBox
                :model-value="!column.hidden"
                :disabled="column.allowHide === false"
                :aria-label="column.title ?? column.field"
                size="small"
                @update:model-value="toggleColumn(column)"
              />
              <span>{{ column.title ?? column.field }}</span>
            </label>
          </li>
        </ul>

        <div class="graphql-grid-column-selector__actions">
          <CustomButton
            text="Reset"
            variant="default"
            @click="onReset"
          />
          <CustomButton
            text="Save"
            variant="accent"
            :disabled="!hasAtLeastOneVisible"
            @click="onSave"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, ref, watch, type PropType } from "vue";
import InlineSvg from "vue-inline-svg";
import { resolveSvgAsset } from "../../utils/svgAssets";
import { CustomButton } from "../primitives/custom-button";
import { CheckBox } from "../primitives/kendo-inputs/check-box";
import {
  flattenGraphqlGridColumns,
  isGraphqlGridColumnGroup,
  type GraphqlGridColumn,
  type GraphqlGridColumnOrGroup,
} from "./types";

// Prop docs below are plain text on purpose: literal Tag-looking text anywhere in
// this file's script - even inside a comment - makes Storybook's Vue docgen corrupt
// the SFC before Vue's compiler sees it (same root cause as the generic-type-in-a-type-alias
// issue documented in ./types.ts). Describe components/props in prose, no angle brackets.
export default defineComponent({
  name: "GraphqlGridColumnSelector",
  components: {
    CustomButton,
    CheckBox,
    InlineSvg,
  },
  props: {
    // Full column list - the same array bound to GraphqlGrid's "columns" prop. May be a flat
    // GraphqlGridColumn[], or mix in GraphqlGridColumnGroup parent headers - either way, only
    // the leaf columns (see flattenGraphqlGridColumns) ever show up as a row here.
    columns: { type: Array as PropType<GraphqlGridColumnOrGroup[]>, required: true },
    // Snapshot Reset restores to. Omit to make Reset show every column instead.
    defaultColumns: { type: Array as PropType<GraphqlGridColumnOrGroup[]>, default: undefined },
    panelTitle: { type: String, default: "Columns" },
    // aria-label/title on the icon-only trigger button.
    triggerLabel: { type: String, default: "Columns" },
    searchPlaceholder: { type: String, default: "Search columns..." },
  },
  emits: ["update:columns"],
  setup(props, { emit }) {
    // Teleport the panel to body so overflow/clipping on ancestors cannot cut it
    // off. Position from the trigger's bounding rect.
    const filtersSrc = resolveSvgAsset("filters");
    const triggerRef = ref<HTMLElement | null>(null);
    const panelRef = ref<HTMLElement | null>(null);
    const panelPosition = ref({ top: "0px", right: "0px" });
    const open = ref(false);
    const searchTerm = ref("");
    // Local working copy so closing without saving can't leak partial toggles back
    // onto the caller's array - only "Save" ever emits.
    const draft = ref<GraphqlGridColumnOrGroup[]>([]);

    // A group's `children` array/objects need their own clone too - otherwise toggling a
    // checkbox here would mutate the caller's own column objects before Save is even clicked.
    function cloneColumn(column: GraphqlGridColumnOrGroup): GraphqlGridColumnOrGroup {
      return isGraphqlGridColumnGroup(column)
        ? { ...column, children: column.children.map((child) => ({ ...child })) }
        : { ...column };
    }

    function updatePanelPosition() {
      const trigger = triggerRef.value;
      if (!trigger) {
        return;
      }
      const rect = trigger.getBoundingClientRect();
      panelPosition.value = {
        top: `${rect.bottom + 6}px`,
        right: `${window.innerWidth - rect.right}px`,
      };
    }

    function onDocumentMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.value?.contains(target) || panelRef.value?.contains(target)) {
        return;
      }
      open.value = false;
    }

    watch(open, (isOpen) => {
      if (isOpen) {
        draft.value = props.columns.map(cloneColumn);
        searchTerm.value = "";
        updatePanelPosition();
        document.addEventListener("mousedown", onDocumentMouseDown);
        window.addEventListener("resize", updatePanelPosition);
        window.addEventListener("scroll", updatePanelPosition, true);
      } else {
        document.removeEventListener("mousedown", onDocumentMouseDown);
        window.removeEventListener("resize", updatePanelPosition);
        window.removeEventListener("scroll", updatePanelPosition, true);
      }
    });

    onBeforeUnmount(() => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    });

    function toggleOpen() {
      open.value = !open.value;
    }

    function sortByLabel(columns: GraphqlGridColumn[]) {
      return [...columns].sort((a, b) =>
        (a.title ?? a.field).localeCompare(b.title ?? b.field),
      );
    }

    // Parent/group headers are pure visual grouping (see GraphqlGridColumnGroup) - only their
    // children are ever individually shown/hidden, so this is what the list actually renders.
    const leafColumns = computed(() => flattenGraphqlGridColumns(draft.value));

    const filteredDraft = computed(() => {
      const term = searchTerm.value.trim().toLowerCase();
      if (!term) {
        return sortByLabel(leafColumns.value);
      }
      return sortByLabel(
        leafColumns.value.filter((column) =>
          (column.title ?? column.field).toLowerCase().includes(term),
        ),
      );
    });

    const allFilteredVisible = computed(() =>
      filteredDraft.value.length > 0 &&
      filteredDraft.value.every((column) => !column.hidden),
    );

    const hasAtLeastOneVisible = computed(() =>
      leafColumns.value.some((column) => !column.hidden),
    );

    function toggleColumn(column: GraphqlGridColumn) {
      if (column.allowHide === false) {
        return;
      }
      column.hidden = !column.hidden;
    }

    function toggleAllFiltered() {
      const nextHidden = allFilteredVisible.value;
      filteredDraft.value.forEach((column) => {
        if (column.allowHide !== false) {
          column.hidden = nextHidden;
        }
      });
    }

    // Recurses into a group's children instead of touching the group itself - its own
    // `hidden` is never read (see GraphqlGridColumnGroup), only its children are toggled.
    function resetColumn(column: GraphqlGridColumnOrGroup, forceVisible: boolean): GraphqlGridColumnOrGroup {
      if (isGraphqlGridColumnGroup(column)) {
        return { ...column, children: column.children.map((child) => resetColumn(child, forceVisible) as GraphqlGridColumn) };
      }
      return forceVisible ? { ...column, hidden: false } : { ...column };
    }

    // Independent from Save: applies immediately rather than just priming the
    // draft for a later Save click.
    function onReset() {
      const source = props.defaultColumns ?? props.columns;
      const nextColumns = source.map((column) => resetColumn(column, !props.defaultColumns));
      draft.value = nextColumns;
      emit("update:columns", nextColumns);
      open.value = false;
    }

    function onSave() {
      emit("update:columns", draft.value);
      open.value = false;
    }

    return {
      filtersSrc,
      triggerRef,
      panelRef,
      panelPosition,
      open,
      searchTerm,
      filteredDraft,
      allFilteredVisible,
      hasAtLeastOneVisible,
      toggleOpen,
      toggleColumn,
      toggleAllFiltered,
      onReset,
      onSave,
    };
  },
});
</script>

<style lang="scss" scoped>
.graphql-grid-column-selector {
  display: inline-flex;

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

  // Teleported to body - top/right come from the trigger's real bounding rect
  // (see updatePanelPosition), position: fixed so it isn't clipped by any
  // scrollable/overflow:hidden ancestor the trigger happens to live inside.
  //
  // z-index matches kendo-grid.scss's own .k-animation-container (1070) rather than a plain
  // 1000: a GraphqlGrid rendered inside a modal (AR's CalculumModal starts at 1050 and climbs
  // per nested instance; AP's own CalculumModal sits at 1060, with a dedicated
  // .calculum-modal-zindex-popover utility at 1070 for exactly this "float above the modal"
  // need) teleports this panel to <body> right alongside that modal's own teleported content,
  // so whichever one has the higher z-index wins the stacking order regardless of DOM/mount
  // order. 1000 lost to both; 1070 sits at the same "always above a modal" tier every other
  // popover in this codebase already uses.
  &__panel {
    position: fixed;
    z-index: 1070;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 20rem;
    padding: 0.75rem;
    border: 1px solid var(--border-color-default-2);
    border-radius: var(--border-radius-2);
    background: var(--bg-surface);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-weight: 600;
    color: var(--color-text-1);
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color-default-2);
  }

  &__search {
    width: 100%;
    padding: 0.5rem 0.625rem;
    border: 1px solid var(--border-color-default-2);
    border-radius: var(--border-radius-2);
    background: var(--bg-surface);
    color: var(--color-text-1);

    &:focus {
      outline: 2px solid var(--focus-ring);
      outline-offset: 1px;
    }
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    cursor: pointer;
    padding-block: 0.25rem;

    &--all {
      font-weight: 600;
      border-bottom: 1px solid var(--border-color-default-2);
      padding-bottom: 0.5rem;
    }
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 16rem;
    overflow-y: auto;
  }

  &__empty {
    color: var(--color-text-2);
    margin: 0;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-color-default-2);
  }
}
</style>
