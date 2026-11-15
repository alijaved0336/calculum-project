<template>
  <span
    ref="rootEl"
    class="graphql-grid-column-menu"
  >
    <Tooltip
      v-if="headerTooltip"
      class="graphql-grid-column-menu__title-tooltip"
      :open-delay="100"
      :anchor-element="'target'"
      :position="'top'"
    >
      <span
        class="graphql-grid-column-menu__title"
        :title="headerTooltip"
      >{{ displayTitle }}</span>
    </Tooltip>
    <span
      v-else
      class="graphql-grid-column-menu__title"
    >{{ displayTitle }}</span>
    <span
      v-if="ctx"
      class="graphql-grid-column-menu__action"
      @click.stop
      @mousedown.stop
      @mouseup.stop
      @pointerdown.stop
    >
      <DropdownPanel
        v-model:open="open"
        align="end"
        panel-width="14rem"
      >
        <template #trigger="{ toggle, open: isOpen }">
          <button
            type="button"
            class="graphql-grid-column-menu__trigger"
            :aria-expanded="isOpen"
            aria-haspopup="menu"
            :aria-label="menuLabel"
            :title="menuLabel"
            @click.stop="toggle"
            @mousedown.stop
            @pointerdown.stop
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle
                cx="8"
                cy="3"
                r="1.25"
              />
              <circle
                cx="8"
                cy="8"
                r="1.25"
              />
              <circle
                cx="8"
                cy="13"
                r="1.25"
              />
            </svg>
          </button>
        </template>
        <ul
          class="ds-dropdown-surface__list"
          role="listbox"
        >
          <template v-if="sortable">
            <li>
              <DropdownMenuItem
                label="Sort Ascending"
                trailing="check"
                :selected="sortDir === 'asc'"
                @click="onSort('asc')"
              />
            </li>
            <li>
              <DropdownMenuItem
                label="Sort Descending"
                trailing="check"
                :selected="sortDir === 'desc'"
                @click="onSort('desc')"
              />
            </li>
          </template>
          <li>
            <DropdownPanel
              v-model:open="filterOpen"
              placement="side"
              block
              panel-width="18rem"
            >
              <template #trigger="{ toggle }">
                <DropdownMenuItem
                  label="Filter"
                  trailing="chevron"
                  :active="filterOpen"
                  :selected="hasFieldFilter"
                  @click="toggle"
                />
              </template>
              <div class="graphql-grid-column-menu__filter-body">
                <CustomSelect
                  :model-value="operatorLabel"
                  :data-items="operatorLabels"
                  label="Operator"
                  @update:model-value="operatorLabel = $event"
                />
                <CustomSelect
                  v-if="filterType === 'boolean' && needsValue"
                  :model-value="booleanLabel"
                  :data-items="booleanLabels"
                  label="Value"
                  @update:model-value="onBooleanLabel"
                />
                <TextInput
                  v-else-if="needsValue"
                  :model-value="valueText"
                  :type="valueInputType"
                  :placeholder="valuePlaceholder"
                  @update:model-value="valueText = $event"
                />
              </div>
              <template #footer>
                <div class="graphql-grid-column-menu__filter-actions">
                  <CustomButton
                    text="Clear"
                    @click="onClearFilter"
                  />
                  <CustomButton
                    text="Apply"
                    variant="accent"
                    :disabled="!canApply"
                    @click="onApplyFilter"
                  />
                </div>
              </template>
            </DropdownPanel>
          </li>
        </ul>
      </DropdownPanel>
    </span>
  </span>
</template>

<script lang="ts">
import { computed, defineComponent, inject, onUnmounted, ref, watch } from "vue";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { CustomButton } from "../primitives/custom-button";
import { CustomSelect } from "../primitives/custom-select";
import { TextInput } from "../primitives/kendo-inputs/text-input";
import { DropdownPanel } from "../primitives/dropdown-panel";
import { DropdownMenuItem } from "../primitives/dropdown-menu-item";
import {
  GRAPHQL_GRID_BOOLEAN_FILTER_VALUES,
  GRAPHQL_GRID_COLUMN_MENU_KEY,
  GRAPHQL_GRID_FILTER_OPERATORS,
  findFieldFilter,
} from "./column-menu";

const OVERFLOW_SCROLL_RE = /(auto|scroll|overlay)/;
const POPUP_SCROLL_IGNORE_SELECTOR =
  ".k-popup, .ds-dropdown-surface, .k-animation-container";

// Prop docs are plain text: angle-bracket type syntax in this file's script
// makes Storybook Vue docgen corrupt the SFC (same as ColumnSelector).
export default defineComponent({
  name: "GraphqlGridColumnMenu",
  inheritAttrs: false,
  components: {
    CustomButton,
    CustomSelect,
    TextInput,
    DropdownPanel,
    DropdownMenuItem,
    Tooltip,
  },
  props: {
    field: { type: String, default: "" },
    title: { type: String, default: "" },
    customTooltip: { type: String, default: "" },
  },
  setup(props) {
    const ctx = inject(GRAPHQL_GRID_COLUMN_MENU_KEY, null);
    const rootEl = ref<HTMLElement | null>(null);
    const open = ref(false);
    const filterOpen = ref(false);
    const scrollTargets: EventTarget[] = [];
    const operatorLabel = ref("Contains");
    const valueText = ref("");
    const booleanLabel = ref<(typeof GRAPHQL_GRID_BOOLEAN_FILTER_VALUES)[number]>(
      "True",
    );

    const displayTitle = computed(() => props.title || props.field || "\u00a0");
    const headerTooltip = computed(() => {
      const fromCtx =
        ctx && props.field ? ctx.columnCustomTooltip(props.field) : undefined;
      const raw = (fromCtx ?? props.customTooltip ?? "").trim();
      return raw || "";
    });
    const menuLabel = computed(
      () => `Column menu for ${displayTitle.value}`,
    );
    const booleanLabels = [...GRAPHQL_GRID_BOOLEAN_FILTER_VALUES];

    const sortable = computed(() =>
      Boolean(ctx && props.field && ctx.isColumnSortable(props.field)),
    );
    const sortDir = computed(() => {
      if (!ctx || !props.field) {
        return undefined;
      }
      return ctx.sort.value.find((item) => item.field === props.field)?.dir;
    });
    const filterType = computed(() =>
      ctx && props.field ? ctx.columnFilterType(props.field) : "text",
    );
    // Narrowed to the column's own allow-list when it declares one, and in the TYPE's order rather
    // than the allow-list's: the menu should read the same way from column to column.
    const operators = computed(() => {
      const all = GRAPHQL_GRID_FILTER_OPERATORS[filterType.value];
      const allowed =
        ctx && props.field ? ctx.columnFilterOperators(props.field) : undefined;
      return allowed === undefined
        ? all
        : all.filter((item) => allowed.includes(item.operator));
    });
    const operatorLabels = computed(() =>
      operators.value.map((item) => item.label),
    );
    const activeOperator = computed(
      () =>
        operators.value.find((item) => item.label === operatorLabel.value) ??
        operators.value[0],
    );
    const needsValue = computed(() => activeOperator.value?.needsValue !== false);
    const hasFieldFilter = computed(() =>
      Boolean(
        ctx && props.field && findFieldFilter(ctx.filter.value, props.field),
      ),
    );
    const valueInputType = computed(() => {
      if (filterType.value === "numeric") {
        return "number";
      }
      if (filterType.value === "date") {
        return "date";
      }
      return "text";
    });
    const valuePlaceholder = computed(() => {
      if (filterType.value === "numeric") {
        return "Value";
      }
      if (filterType.value === "date") {
        return undefined;
      }
      return "Value";
    });
    const canApply = computed(() => {
      if (!needsValue.value) {
        return true;
      }
      if (filterType.value === "boolean") {
        return Boolean(booleanLabel.value);
      }
      return valueText.value.trim() !== "";
    });

    function seedFilterDraft() {
      const options = operators.value;
      const existing =
        ctx && props.field
          ? findFieldFilter(ctx.filter.value, props.field)
          : undefined;
      const match =
        options.find((item) => item.operator === existing?.operator) ??
        options[0];
      operatorLabel.value = match.label;

      if (filterType.value === "boolean") {
        booleanLabel.value =
          existing?.value === false || existing?.value === "False"
            ? "False"
            : "True";
        valueText.value = "";
        return;
      }

      if (existing?.value == null) {
        valueText.value = "";
        return;
      }
      if (filterType.value === "date" && existing.value instanceof Date) {
        valueText.value = existing.value.toISOString().slice(0, 10);
        return;
      }
      valueText.value = String(existing.value);
    }

    watch(open, (isOpen) => {
      if (!isOpen) {
        filterOpen.value = false;
        detachScrollListeners();
        return;
      }
      attachScrollListeners();
    });

    watch(filterOpen, (isOpen) => {
      if (isOpen) {
        seedFilterDraft();
      }
    });

    function isOverflowScrollable(el: Element): boolean {
      if (!(el instanceof HTMLElement)) {
        return false;
      }
      const style = getComputedStyle(el);
      return (
        OVERFLOW_SCROLL_RE.test(style.overflow) ||
        OVERFLOW_SCROLL_RE.test(style.overflowX) ||
        OVERFLOW_SCROLL_RE.test(style.overflowY)
      );
    }

    function isInsideOpenPopup(target: EventTarget | null): boolean {
      if (!(target instanceof Node)) {
        return false;
      }
      const el = target instanceof Element ? target : target.parentElement;
      return Boolean(el?.closest(POPUP_SCROLL_IGNORE_SELECTOR));
    }

    function onScrollClose(event: Event) {
      if (isInsideOpenPopup(event.target)) {
        return;
      }
      open.value = false;
    }

    function detachScrollListeners() {
      for (const target of scrollTargets) {
        const capture = target !== window;
        target.removeEventListener("scroll", onScrollClose, capture);
      }
      scrollTargets.length = 0;
    }

    function collectOverflowAncestors(start: Element | null): Element[] {
      const nodes: Element[] = [];
      let current = start?.parentElement ?? null;
      while (current) {
        if (isOverflowScrollable(current)) {
          nodes.push(current);
        }
        if (current === document.documentElement) {
          break;
        }
        current = current.parentElement;
      }
      return nodes;
    }

    function attachScrollListeners() {
      detachScrollListeners();
      const trigger = rootEl.value;
      if (!trigger) {
        return;
      }

      const grid = trigger.closest(".graphql-grid");
      const scope: Element = grid ?? trigger;
      const unique = new Set<EventTarget>();

      const content = scope.querySelector(".k-grid-content");
      if (content) {
        unique.add(content);
      }
      const tableWrap = scope.querySelector(".graphql-grid__table-wrap");
      if (tableWrap) {
        unique.add(tableWrap);
      }

      for (const ancestor of collectOverflowAncestors(grid ?? trigger)) {
        unique.add(ancestor);
      }

      unique.add(window);

      for (const target of unique) {
        const capture = target !== window;
        target.addEventListener("scroll", onScrollClose, capture);
        scrollTargets.push(target);
      }
    }

    onUnmounted(() => {
      detachScrollListeners();
    });

    function onBooleanLabel(value: string) {
      booleanLabel.value = value === "False" ? "False" : "True";
    }

    function onSort(dir: "asc" | "desc") {
      if (!ctx || !props.field) {
        return;
      }
      ctx.applySort(props.field, dir);
      open.value = false;
    }

    function resolvedFilterValue(): unknown {
      if (!needsValue.value) {
        return undefined;
      }
      if (filterType.value === "boolean") {
        return booleanLabel.value === "True";
      }
      const raw = valueText.value.trim();
      if (filterType.value === "numeric") {
        return Number(raw);
      }
      return raw;
    }

    function onApplyFilter() {
      if (!ctx || !props.field || !canApply.value) {
        return;
      }
      ctx.applyFilter(
        props.field,
        activeOperator.value.operator,
        resolvedFilterValue(),
      );
      filterOpen.value = false;
      open.value = false;
    }

    function onClearFilter() {
      if (!ctx || !props.field) {
        return;
      }
      ctx.clearFilter(props.field);
      filterOpen.value = false;
      open.value = false;
    }

    return {
      ctx,
      rootEl,
      open,
      filterOpen,
      operatorLabel,
      valueText,
      booleanLabel,
      booleanLabels,
      displayTitle,
      headerTooltip,
      menuLabel,
      sortable,
      sortDir,
      filterType,
      operatorLabels,
      needsValue,
      hasFieldFilter,
      valueInputType,
      valuePlaceholder,
      canApply,
      onBooleanLabel,
      onSort,
      onApplyFilter,
      onClearFilter,
    };
  },
});
</script>

<style lang="scss" scoped>
.graphql-grid-column-menu {
  display: contents;

  &__title-tooltip {
    display: contents;
  }

  // Wraps onto a second line when the column is too narrow, then ellipsis (line clamp).
  &__title {
    flex: 1 1 auto;
    min-width: 0;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    white-space: normal;
    overflow-wrap: anywhere;
    line-height: 1.25;
  }

  &__action {
    order: 2;
    flex-shrink: 0;
    margin-left: auto;
  }

  &__trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border: 0;
    border-radius: var(--border-radius-2);
    background: transparent;
    color: var(--color-text-2);
    cursor: pointer;

    &:hover,
    &[aria-expanded="true"] {
      background: var(--bg-surface-subtle-2);
      color: var(--color-text-1);
    }

    &:focus-visible {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
  }

  &__filter-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 14rem;
  }

  &__filter-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
}
</style>
