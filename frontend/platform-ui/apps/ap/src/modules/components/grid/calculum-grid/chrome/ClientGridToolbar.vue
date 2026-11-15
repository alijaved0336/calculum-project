<script setup lang="ts">
import { Loader } from "@progress/kendo-vue-indicators";
import { TabStrip } from "@progress/kendo-vue-layout";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import CalculumDeleteIcon from "@/modules/components/CalculumDeleteIcon.vue";
import ClearGridFilters from "@/modules/components/icons/IconClearFilters.vue";
import ExportExcelIcon from "@/modules/components/icons/IconDownload.vue";
import MeatBallsGrid from "@/modules/components/icons/IconMoreOptionsHorizontal.vue";
import GridColumnSelector from "@/modules/components/grid/columns/GridColumnSelector.vue";
import SendRejectedDataBTN from "@/modules/components/grid/columns/SendRejectedDataBTN.vue";
import type { ClientGridTab } from "@/modules/components/grid/calculum-grid/composables/useClientGridTabs";

/**
 * Presentational toolbar body for CalculumGrid.
 * Mount inside Kendo `GridToolbar` on the facade so the toolbar stays a
 * direct Grid child (Kendo contract). Ids `actions-click-match-options` /
 * `options-match` stay on this markup.
 */
defineOptions({ name: "ClientGridToolbar" });

export interface ClientGridToolbarTabsBag {
  show: boolean;
  selectedIndex: number;
  items: ClientGridTab[];
}

export interface ClientGridToolbarMatchBag {
  show: boolean;
  selectable: boolean;
  allSelected: boolean;
  rejectedData: unknown[];
}

export interface ClientGridToolbarCompareBag {
  show: boolean;
  showClearButton: boolean;
}

export interface ClientGridToolbarColumnSelectorBag {
  hide: boolean;
  chooseColumnsKey: string | number;
  columns: unknown[];
  childrenColumns: boolean;
  targetOperation: string | null;
}

defineProps<{
  title: string;
  loadingExtra: boolean;
  isFilterApplied: boolean;
  showExcelToolbar: boolean;
  tabs: ClientGridToolbarTabsBag;
  match: ClientGridToolbarMatchBag;
  compare: ClientGridToolbarCompareBag;
  columnSelector: ClientGridToolbarColumnSelectorBag;
}>();

const emit = defineEmits<{
  select: [event: unknown];
  "clear-filters": [];
  "grid-match-remove": [];
  "match-edit-list": [];
  "reset-peers": [];
  "submit-columns-menu": [payload: unknown];
  "reset-default-columns": [];
  "export-excel": [];
}>();
</script>

<template>
  <div
    :class="'row'"
    :style="{ width: '100%' }"
  >
    <div class="ml-4 text-base font-semibold">
      {{ title }}
    </div>

    <div
      v-if="loadingExtra"
      :class="'row'"
      :style="{ width: '50%' }"
    >
      <div class="ml-3">
        <Loader
          :size="'small'"
          :type="'pulsing'"
        />
      </div>
      <div class="ml-2">
        {{ $t("label.loadingExtraData") }}
      </div>
    </div>
    <div class="d-flex row-100 justify-content-between">
      <div class="d-flex flex-column">
        <TabStrip
          v-if="tabs.show"
          :selected="tabs.selectedIndex"
          :tabs="tabs.items"
          class="ml-2 mb-2"
          @select="emit('select', $event)"
        />
      </div>
      <div class="d-flex export-buttons">
        <SendRejectedDataBTN
          v-if="match.rejectedData.length"
          class="mr-2"
          :rejected-data="match.rejectedData"
        />
        <div
          v-if="match.show"
          class="mr-3 d-flex delete-button-match"
        >
          <Tooltip
            :open-delay="100"
            :anchor-element="'target'"
            :position="'top'"
          >
            <div :title="$t('global.delete')">
              <CalculumDeleteIcon
                v-if="match.selectable && match.allSelected"
                :title="$t('global.delete')"
                class="delete-match cursor-pointer"
                @click="emit('grid-match-remove')"
              />
            </div>
          </Tooltip>
        </div>
        <div
          v-if="match.show"
          class="mr-2"
        >
          <Tooltip
            :open-delay="100"
            :anchor-element="'target'"
            :position="'top'"
          >
            <div
              id="actions-click-match-options"
              class="icons-grid-container"
              data-toggle="collapse"
              data-target="#options-match"
              :title="'More Options'"
            >
              <MeatBallsGrid :title="'More Options'" />
            </div>
          </Tooltip>
          <div
            id="options-match"
            class="float-menu-match collapse cursor-pointer"
            @click="emit('match-edit-list')"
          >
            {{
              match.selectable
                ? $t("home.overview.unDeleteRows")
                : $t("home.overview.deleteRows")
            }}
          </div>
        </div>

        <div
          v-if="compare.show && compare.showClearButton"
          class="d-flex gap-2"
        >
          <button
            v-if="compare.showClearButton"
            class="btn outline-secondary-btn font-md"
            style="z-index: 1; width: fit-content"
            @click="emit('reset-peers')"
          >
            {{ $t("global.clearSelection") }}
          </button>
        </div>

        <div
          v-if="isFilterApplied"
          class="mr-2"
        >
          <Tooltip
            :open-delay="100"
            :anchor-element="'target'"
            :position="'top'"
          >
            <div
              class="icons-grid-container"
              :title="'Clear Filters'"
              @click="emit('clear-filters')"
            >
              <ClearGridFilters :title="'Clear all filters'" />
            </div>
          </Tooltip>
        </div>

        <div
          v-if="showExcelToolbar"
          class="mr-2"
        >
          <Tooltip
            :open-delay="100"
            :anchor-element="'target'"
            :position="'top'"
          >
            <div
              class="icons-grid-container"
              :title="'Export Excel'"
              @click="emit('export-excel')"
            >
              <ExportExcelIcon :title="'Export Excel'" />
            </div>
          </Tooltip>
        </div>
        <GridColumnSelector
          v-if="!columnSelector.hide"
          :key="columnSelector.chooseColumnsKey"
          :columns="columnSelector.columns"
          :children-columns="columnSelector.childrenColumns"
          :target-operation="columnSelector.targetOperation"
          @reset-default-columns="emit('reset-default-columns')"
          @callback-on-submit="emit('submit-columns-menu', $event)"
        />
      </div>
    </div>
  </div>
</template>
