<template>
  <div
    v-if="item.isLoading"
    class="p-4"
  >
    <template v-if="config.body === 'cardsOption'">
      <SkeletonNTextLines
        :lines-count="1"
        :lines-width="40"
        class="mb-2"
      />
      <SkeletonNCardsOptions :number-of-cards="3" />
    </template>
    <SkeletonNTextLines
      v-else
      :lines-count="3"
    />
  </div>

  <CardsOption
    v-else-if="
      config.body === 'cardsOption' && !ArrayUtils.isEmpty(item.itemData?.items)
    "
    :items="item.itemData?.items ?? []"
    @checked-items-changed="(key) => $emit('checkbox-item-changed', key)"
  >
    <template #header>
      <PanelBarLevelSelector
        :levels="getLevels(item.field)"
        :button-group-options="getButtonGroupOptions(item.field)"
        @level-changed="(key) => $emit('level-changed', key)"
      />
    </template>
  </CardsOption>

  <RadioButtonSelection
    v-else-if="
      config.body === 'radioButtonSelection' &&
      !ArrayUtils.hasOneValueAndIsEmpty(item.itemData?.items ?? [])
    "
    :items="item.itemData?.items ?? []"
    :field="item.field"
    @checked-items-changed="(key) => $emit('radio-item-changed', key)"
  >
    <template #header>
      <PanelBarLevelSelector
        :levels="getLevels(item.field)"
        :button-group-options="getButtonGroupOptions(item.field)"
        @level-changed="(key) => $emit('level-changed', key)"
      />
    </template>
  </RadioButtonSelection>

  <TreeView
    v-else-if="
      config.body === 'treeView' && !ArrayUtils.isEmpty(item.itemData?.items)
    "
    :items="item.itemData?.items ?? []"
    :checked-items-keys="item.itemData?.checkedItemsKeys"
    @checked-items-changed="
      (checkedItemKeys) => $emit('tree-view-checked-changed', checkedItemKeys)
    "
  >
    <template #header>
      <PanelBarLevelSelector
        :levels="getLevels(item.field)"
        :button-group-options="getButtonGroupOptions(item.field)"
        @level-changed="(key) => $emit('level-changed', key)"
      />
    </template>
  </TreeView>
  <div
    v-else-if="config.body === 'treeView'"
    class="d-flex flex-column text-center"
  >
    <h5 class="my-6">
      {{ $t("globalFilters.planNoPlansTitle") }}
    </h5>
    <p>{{ $t("globalFilters.planNoPlansBody") }}</p>
  </div>

  <RangeSliderKendo
    v-else-if="
      config.body === 'rangeSlider' && !ArrayUtils.isEmpty(item.itemData?.items)
    "
    :items="item.itemData?.items ?? []"
    :min-value="item.itemData?.minValue ?? 0"
    :max-value="item.itemData?.maxValue ?? undefined"
    :min-value-selected="item.itemData?.minValueSelected ?? undefined"
    :max-value-selected="item.itemData?.maxValueSelected ?? undefined"
    @include-exclude-null="
      (e) => $emit('range-slider-include-exclude-null', e)
    "
    @min-max-selected-values-changed="
      (minMaxSelectedValues) =>
        $emit('range-slider-min-max-changed', minMaxSelectedValues)
    "
  >
    <template #header>
      <PanelBarLevelSelector
        variant="rangeSlider"
        :levels="getLevels(item.field)"
        :button-group-options="getButtonGroupOptions(item.field)"
        :show-clear-button="!!config.showClearButton"
        :clear-disabled="isClearDisabled(item.field)"
        @level-changed="(key) => $emit('level-changed', key)"
        @clear="$emit('clear-filter')"
      />
    </template>
  </RangeSliderKendo>

  <MultipleCheckboxes
    v-else-if="config.body === 'multipleCheckboxes' && passesMultipleCheckboxesGuard"
    :id="config.id"
    :is-box-filter="config.isBoxFilter"
    :items="item.itemData?.items ?? []"
    :options="{ isAllItemsChecked: item.itemData?.isAllItemsChecked ?? false }"
    @checked-items-changed="(key) => $emit('checkbox-item-changed', key)"
    @all-items-checked-changed="
      (isAllItemsChecked) => $emit('all-items-checked-changed', isAllItemsChecked)
    "
  >
    <template #header>
      <PanelBarLevelSelector
        :levels="getLevels(item.field)"
        :button-group-options="getButtonGroupOptions(item.field)"
        @level-changed="(key) => $emit('level-changed', key)"
      />
    </template>
  </MultipleCheckboxes>

  <PanelBarItemEmpty v-else />
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue";

import CardsOption from "@/modules/components/CardsOption.vue";
import MultipleCheckboxes from "@/modules/components/MultipleCheckboxes.vue";
import RadioButtonSelection from "@/modules/components/RadioButtonSelection.vue";
import RangeSliderKendo from "@/modules/components/RangeSliderKendo.vue";
import TreeView from "@/modules/components/TreeView.vue";
import type { ButtonsGroupOptions } from "@/modules/components/types";
import PanelBarItemEmpty from "@/modules/globalFilters/components/PanelBarItemEmpty.vue";
import PanelBarLevelSelector from "@/modules/globalFilters/components/PanelBarLevelSelector.vue";
import { getPanelBarItemFieldConfig } from "@/modules/globalFilters/config/panelBarItemFieldConfig";
import SkeletonNCardsOptions from "@/modules/home/components/skeletons/SkeletonNCardsOptions.vue";
import SkeletonNTextLines from "@/modules/home/components/skeletons/SkeletonNTextLines.vue";
import { ArrayUtils } from "@/utils";
import { Field, GlobalFiltersPanelBarItem, KeyValue, TargetView } from "@/types";

/**
 * Generic PanelBar filter-item body. Replaces the 33 near-identical
 * `<template #field="{ props }">` slots that used to live in MainLayoutFilters.vue - which of
 * MultipleCheckboxes/RadioButtonSelection/RangeSliderKendo/TreeView/CardsOption renders, and with
 * which guard/id/clear-button variant, is resolved per-field by getPanelBarItemFieldConfig (see
 * docs/context/change-mainlayoutfilters-panelbaritem-refactor.md for the full field-by-field map).
 */
export default defineComponent({
  name: "GlobalFilterPanelBarItem",
  components: {
    CardsOption,
    MultipleCheckboxes,
    PanelBarItemEmpty,
    PanelBarLevelSelector,
    RadioButtonSelection,
    RangeSliderKendo,
    SkeletonNCardsOptions,
    SkeletonNTextLines,
    TreeView,
  },
  props: {
    item: {
      type: Object as PropType<GlobalFiltersPanelBarItem>,
      required: true,
    },
    getLevels: {
      type: Function as PropType<(field: Field) => KeyValue<TargetView, string>[]>,
      required: true,
    },
    getButtonGroupOptions: {
      type: Function as PropType<(field: Field) => Partial<ButtonsGroupOptions>>,
      required: true,
    },
    isClearDisabled: {
      type: Function as PropType<(field: Field) => boolean>,
      required: true,
    },
  },
  emits: [
    "level-changed",
    "clear-filter",
    "checkbox-item-changed",
    "all-items-checked-changed",
    "radio-item-changed",
    "tree-view-checked-changed",
    "range-slider-include-exclude-null",
    "range-slider-min-max-changed",
  ],
  setup(props) {
    const config = computed(() => getPanelBarItemFieldConfig(props.item.field));

    const passesMultipleCheckboxesGuard = computed(() => {
      const items = props.item.itemData?.items;

      if (config.value.strictEmptyGuard) {
        return (
          !ArrayUtils.hasOneValueAndIsEmpty(items ?? []) &&
          !ArrayUtils.isEmpty(items)
        );
      }

      if (config.value.excludeEmptyValues) {
        return (
          !ArrayUtils.isEmpty(items) && !ArrayUtils.hasEmptyValues(items ?? [])
        );
      }

      return !ArrayUtils.isEmpty(items);
    });

    return {
      ArrayUtils,
      config,
      passesMultipleCheckboxesGuard,
    };
  },
});
</script>
