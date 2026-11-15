<template>
  <div
    class="searchable-dropdown-wrapper"
    ref="wrapperRef"
  >
    <label
      class="small dropdown-label text-capitalize"
      v-if="label"
      >{{ label }}</label
    >
    <div
      class="custom-searchable-dropdown"
      :class="{ 'dropdown-active': isOpen }"
      :disabled="disabled"
      @click="!disabled && toggleDropdown()"
    >
      <div class="dropdown-selected">
        <div class="dropdown-selected-content">
          <slot
            name="selected"
            :selectedLabel="selectedLabel"
            :selectedItem="selectedItem"
            ><span :title="selectedLabel">{{
              selectedLabel || placeholder
            }}</span></slot
          >
        </div>
        <iconArrowDown class="dropdown-arrow"></iconArrowDown>
      </div>
      <div
        class="dropdown-options"
        v-if="isOpen"
        @click.stop
      >
        <div
          v-if="mostUsedItems.length"
          class="dropdown-most-used"
        >
          <div class="text-xs text-gray-700">{{ mostUsedLabel }}</div>
          <div
            v-for="item in mostUsedItems"
            :key="'most-used-' + getItemValue(item)"
            class="dropdown-item"
            :class="{ selected: isSelected(item) }"
            @click="selectItem(item)"
          >
            <span
              class="name"
              :title="getItemLabel(item)"
              >{{ getItemLabel(item) }}</span
            >
            <iconCheck
              v-if="isSelected(item)"
              class="check-svg"
            ></iconCheck>
          </div>
        </div>
        <div class="dropdown-search-header">
          <div
            v-if="mostUsedItems.length"
            class="text-xs text-gray-700"
          >
            <hr />
            {{ allLabel }}
          </div>
          <div
            class="input-group input-search mb-2 mt-2"
            v-if="showSearch"
          >
            <input
              class="form-control"
              type="text"
              v-model="searchQuery"
              :placeholder="searchPlaceholder"
              autocomplete="off"
              @keydown="handleKeydown"
              @input="onSearchInput"
              ref="searchInputRef"
            />
            <div
              class="input-group-icon-search"
              id="icon-search"
            >
              <iconSearch></iconSearch>
            </div>
          </div>
        </div>
        <div class="dropdown-list">
          <div
            class="dropdown-item"
            v-if="showClearOption"
            :class="{ selected: !modelValue }"
            @click="clearSelection"
          >
            <span class="name">{{ clearLabel }}</span>
            <iconCheck
              class="check-svg"
              v-if="!modelValue"
            ></iconCheck>
          </div>
          <div
            class="dropdown-item"
            v-for="(item, index) in filteredList"
            :key="getItemValue(item)"
            :class="{
              selected: isSelected(item),
              highlighted: index === highlightedIndex,
            }"
            @click="selectItem(item)"
            @mouseenter="highlightedIndex = index"
          >
            <span
              class="name"
              :title="getItemLabel(item)"
              >{{ getItemLabel(item) }}</span
            >
            <iconCheck
              class="check-svg"
              v-if="isSelected(item)"
            ></iconCheck>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, ref, watch } from "vue";
import type { SetupContext } from "vue";
import iconCheck from "../assets/icons/iconCheck.vue";
import iconArrowDown from "../assets/icons/iconArrowDown.vue";
import iconSearch from "../assets/icons/iconSearch.vue";

interface SearchableDropdownProps {
  modelValue?: string | number;
  items?: any[];
  valueKey?: string;
  labelKey?: string;
  searchPlaceholder?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  showClearOption?: boolean;
  clearLabel?: string;
  /** Value-keys (matching `valueKey` on `items`) pinned above the searchable list as quick picks -
   * e.g. `['USD', 'EUR', 'CHF']` for a currency dropdown. Rendered in the order given, not the
   * order they appear in `items`. Omitted/empty means no "Most Used" section at all, so every
   * existing caller is unaffected. */
  mostUsedValues?: (string | number)[];
  mostUsedLabel?: string;
  allLabel?: string;
}

export default {
  name: "SearchableDropdown",
  components: { iconCheck, iconArrowDown, iconSearch },
  props: {
    modelValue: { type: [String, Number], default: "" },
    items: { type: Array, default: () => [] },
    valueKey: { type: String, default: "value" },
    labelKey: { type: String, default: "label" },
    searchPlaceholder: { type: String, default: "Search..." },
    placeholder: { type: String, default: "Select..." },
    label: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    showClearOption: { type: Boolean, default: false },
    clearLabel: { type: String, default: "All" },
    showSearch: { type: Boolean, default: true },
    mostUsedValues: { type: Array, default: () => [] },
    mostUsedLabel: { type: String, default: "Most Used" },
    allLabel: { type: String, default: "All" },
  },
  emits: ["update:modelValue"],
  setup(
    props: SearchableDropdownProps,
    { emit }: SetupContext<["update:modelValue"]>,
  ) {
    const isOpen = ref(false);
    const searchQuery = ref("");
    const highlightedIndex = ref(-1);
    const searchInputRef = ref<HTMLInputElement | null>(null);
    const wrapperRef = ref<HTMLElement | null>(null);
    let searchTimeout: ReturnType<typeof setTimeout> | null = null;

    function getItemValue(item: any) {
      if (item === null || item === undefined) return "";
      const key = props.valueKey ?? "value";
      if (key === "@id") return item["@id"];
      return item[key];
    }

    function getItemLabel(item: any) {
      if (item === null || item === undefined) return "";
      const key = props.labelKey ?? "label";
      if (key === "nameFormatted") return item.nameFormatted ?? item.name ?? "";
      return item[key] ?? "";
    }

    const selectedLabel = computed(() => {
      if (!props.modelValue) return "";
      const items = props.items ?? [];
      const found = items.find(
        (it: any) => getItemValue(it) === props.modelValue,
      );
      return found ? getItemLabel(found) : "";
    });

    const selectedItem = computed(() => {
      if (!props.modelValue) return null;
      const items = props.items ?? [];
      return (
        items.find((it: any) => getItemValue(it) === props.modelValue) ?? null
      );
    });

    // Pinned quick picks, in the order `mostUsedValues` gives rather than `items`' own order -
    // a currency picker wants USD/EUR/... first regardless of where they fall in the full catalog.
    // Not filtered by `searchQuery`: it's a fixed shortcut list, separate from the searchable one
    // below it.
    const mostUsedItems = computed(() => {
      const values = props.mostUsedValues ?? [];
      if (!values.length) return [];
      const items = props.items ?? [];
      const byValue = new Map(items.map((item: any) => [getItemValue(item), item]));
      return values
        .map((value) => byValue.get(value))
        .filter((item): item is any => item !== undefined);
    });

    const filteredList = computed(() => {
      const items = props.items ?? [];
      const mostUsedValues = new Set(props.mostUsedValues ?? []);
      // Excludes whatever is already pinned above, so a "Most Used" entry never shows twice -
      // once as a shortcut and once again in the searchable list underneath it.
      const pool = mostUsedValues.size
        ? items.filter((item: any) => !mostUsedValues.has(getItemValue(item)))
        : items;
      const term = searchQuery.value.trim().toLowerCase();
      if (!term) return pool;
      return pool.filter((item: any) =>
        getItemLabel(item).toLowerCase().includes(term),
      );
    });

    function isSelected(item: any) {
      return getItemValue(item) === props.modelValue;
    }

    function toggleDropdown() {
      isOpen.value = !isOpen.value;
      if (isOpen.value) {
        searchQuery.value = "";
        highlightedIndex.value = -1;
        setTimeout(() => searchInputRef.value?.focus(), 100);
      } else {
        searchQuery.value = "";
        highlightedIndex.value = -1;
      }
    }

    function onSearchInput() {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        highlightedIndex.value = -1;
      }, 300);
    }

    function handleKeydown(event: KeyboardEvent) {
      const list = filteredList.value ?? [];
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          highlightedIndex.value = Math.min(
            highlightedIndex.value + 1,
            list.length - 1,
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1);
          break;
        case "Enter":
          event.preventDefault();
          if (highlightedIndex.value >= 0 && list[highlightedIndex.value]) {
            selectItem(list[highlightedIndex.value]);
          }
          break;
        case "Escape":
          event.preventDefault();
          isOpen.value = false;
          searchQuery.value = "";
          highlightedIndex.value = -1;
          break;
      }
    }

    function selectItem(item: any) {
      const value = getItemValue(item);
      emit("update:modelValue", value);
      isOpen.value = false;
      searchQuery.value = "";
      highlightedIndex.value = -1;
    }

    function clearSelection() {
      emit("update:modelValue", "");
      isOpen.value = false;
      searchQuery.value = "";
      highlightedIndex.value = -1;
    }

    function closeOnClickOutside(e: MouseEvent) {
      const el = e.target as HTMLElement;
      // Only stay open if click is inside this instance (so opening another dropdown closes this one)
      if (wrapperRef.value?.contains(el)) return;
      isOpen.value = false;
      searchQuery.value = "";
      highlightedIndex.value = -1;
    }

    watch(isOpen, (open) => {
      if (open) {
        document.addEventListener("click", closeOnClickOutside);
      } else {
        document.removeEventListener("click", closeOnClickOutside);
      }
    });

    return {
      isOpen,
      searchQuery,
      highlightedIndex,
      searchInputRef,
      wrapperRef,
      selectedLabel,
      selectedItem,
      filteredList,
      mostUsedItems,
      getItemValue,
      getItemLabel,
      isSelected,
      toggleDropdown,
      onSearchInput,
      handleKeydown,
      selectItem,
      clearSelection,
    };
  },
};
</script>

<style lang="scss" scoped>
@use "variables/colors" as *;

.searchable-dropdown-wrapper {
  width: 100%;
}

.dropdown-label {
  color: map-get(map-get($colors, "gray"), 600);
}

.custom-searchable-dropdown {
  position: relative;
  width: 100%;
  cursor: pointer;
  border: 1px solid #ced4da;
  border-radius: 8px;
  background: white;
  transition:
    border-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out;
  min-width: 80px;

  &:hover:not(:disabled) {
    border-color: #000000;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.dropdown-active {
    border: 1px solid $color-primary-300;
    box-shadow: 0px 0px 0px 4px #ffdfe4;
  }

  .dropdown-selected {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.375rem 0.75rem;
    min-height: 38px;
    max-height: 38px;
    line-height: normal;
    background: white;
    border-radius: 0.375rem;
    overflow: hidden;

    .dropdown-selected-content {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow: hidden;
    }

    :deep(.dropdown-selected-content > span) {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.875rem;
      line-height: normal;
      color: #495057;
      font-weight: 400;
      text-transform: capitalize;
    }

    :deep(.dropdown-selected-content > span:first-child:not(:only-child)) {
      flex-shrink: 0;
    }

    :deep(.dropdown-selected-content > span:last-child) {
      flex: 1;
    }

    .dropdown-arrow {
      flex-shrink: 0;
      width: 10px;
      height: 10px;
      transition: transform 0.2s ease;
      margin-left: 8px;
      color: #6c757d;
    }
  }

  &.dropdown-active .dropdown-arrow {
    transform: rotate(180deg);
  }

  .dropdown-options {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #eaecf0;
    border-radius: 0 0 0.375rem 0.375rem;
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
    z-index: 1000;
    overflow-x: hidden;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 0.625rem;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: 10px;
      background-color: $scrollbar-thumb !important;
    }

    // Shared by both containers below - `.dropdown-most-used` (fixed, never scrolls) and
    // `.dropdown-list` (the searchable "All" section, which does). Kept at this level rather than
    // nested under `.dropdown-list` alone, which is what `.dropdown-most-used`'s own rows need to
    // pick the same styling up.
    .dropdown-section-label {
      padding: 6px 12px 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      color: map-get(map-get($colors, "gray"), 500);
    }

    .dropdown-item {
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.15s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px;
      width: 100%;
      color: #000;

      &:hover {
        background: $color-gray-100;
      }

      &.highlighted {
        background: $color-gray-100;
      }

      &.dropdown-item-clear {
        border-bottom: 1px solid $color-gray-100;
        margin-bottom: 0.25rem;
        font-style: italic;
        color: #6c757d;
      }

      span.name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.875rem;
      }

      :deep(.check-svg) {
        margin-left: 8px;
      }
    }

    // Neither this nor `.dropdown-search-header` below ever scroll - only `.dropdown-list` does.
    .dropdown-most-used {
      padding: 0.5rem;
    }

    // The "All" label plus the search input, both static - a caller typing a search term must
    // not have the box itself scroll out of view along with the results underneath it.
    .dropdown-search-header {
      padding: 0 0.5rem;
    }

    .dropdown-list {
      max-height: 320px;
      overflow-x: hidden;
      overflow-y: auto;
      padding: 0.5rem;

      &::-webkit-scrollbar {
        width: 0.625rem;
      }

      &::-webkit-scrollbar-thumb {
        border-radius: 10px;
        background-color: $scrollbar-thumb !important;
      }
    }
  }
}

.input-group.input-search {
  position: relative;
  display: block;

  input.form-control {
    display: block;
    width: 100%;
    padding-left: 2rem;
    padding-right: 0.75rem;
    padding-top: 0.375rem;
    padding-bottom: 0.375rem;
    font-size: 0.875rem;
    border: 1px solid #ced4da;
    border-radius: 0.375rem;
  }

  .input-group-icon-search {
    position: absolute;
    top: 50%;
    left: 10px;
    transform: translateY(-50%);
    z-index: 10;
    cursor: pointer;
    color: #6c757d;
    transition: color 0.2s ease;

    svg {
      width: 0.875rem;
      height: 0.875rem;
    }
  }
}
</style>
