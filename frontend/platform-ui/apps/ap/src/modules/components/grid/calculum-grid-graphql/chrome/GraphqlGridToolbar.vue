<script setup lang="ts">
import { Button } from "@progress/kendo-vue-buttons";
import { Loader } from "@progress/kendo-vue-indicators";
import { TabStrip } from "@progress/kendo-vue-layout";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import CalculumDeleteIcon from "@/modules/components/CalculumDeleteIcon.vue";
import ClearGridFilters from "@/modules/components/icons/IconClearFilters.vue";
import ExportExcelIcon from "@/modules/components/icons/IconDownload.vue";
import GridColumnSelector from "@/modules/components/grid/columns/GridColumnSelector.vue";
import SendRejectedDataBTN from "@/modules/components/grid/columns/SendRejectedDataBTN.vue";
import iconEllipsisVertical from "@/resources/assets/images/icons/iconEllipsisVertical.vue";
import type { GraphqlGridTab } from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridTabs";

/**
 * Presentational toolbar body for CalculumGridGraphql.
 * Mount inside Kendo `GridToolbar` on the facade so the toolbar stays a
 * direct Grid child (Kendo contract). Ids `toolbarTabsFilterOptions` /
 * `options-exportcsv` stay on the facade shell and this markup respectively.
 */
defineOptions({ name: "GraphqlGridToolbar" });

export interface GraphqlGridToolbarTabsBag {
  show: boolean;
  selectedIndex: number;
  items: GraphqlGridTab[];
}

export interface GraphqlGridToolbarMatchBag {
  show: boolean;
  selectable: boolean;
  allSelected: boolean;
  rejectedData: unknown[];
}

export interface GraphqlGridToolbarColumnSelectorBag {
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
  tabs: GraphqlGridToolbarTabsBag;
  match: GraphqlGridToolbarMatchBag;
  columnSelector: GraphqlGridToolbarColumnSelectorBag;
}>();

const emit = defineEmits<{
  select: [event: unknown];
  "clear-filters": [];
  "grid-match-remove": [];
  "match-edit-list": [];
  "submit-columns-menu": [payload: unknown];
  "reset-default-columns": [];
  "export-excel": [];
}>();
</script>

<template>
  <div :class="'row'" :style="{ width: '100%' }">
    <div class="ml-4 text-base font-semibold uppercase">
      {{ title }}
    </div>

    <div v-if="loadingExtra" class="row" :style="{ width: '50%' }">
      <div class="ml-3">
        <Loader :size="'small'" :type="'pulsing'" />
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
        <div v-if="match.show" class="mr-3 d-flex delete-button-match">
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'">
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
        <div v-if="match.show" class="mr-2">
          <Button
            class="btn outline-secondary-btn font-md"
            :size="'small'"
            :fill-mode="null"
            :rounded="null"
            :shape="null"
            @click="emit('match-edit-list')"
          >
            {{
              match.selectable
                ? $t("home.overview.unDeleteRows")
                : $t("home.overview.deleteRows")
            }}
          </Button>
        </div>

        <div v-if="isFilterApplied" class="mr-2">
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'">
            <div
              class="icons-grid-container"
              :title="'Clear all filters'"
              @click="emit('clear-filters')"
            >
              <ClearGridFilters :title="'Clear all filters'" />
            </div>
          </Tooltip>
        </div>
        <GridColumnSelector
          v-if="!columnSelector.hide"
          :key="columnSelector.chooseColumnsKey"
          :columns="columnSelector.columns"
          :children-columns="columnSelector.childrenColumns"
          :target-operation="columnSelector.targetOperation"
          @callback-on-submit="emit('submit-columns-menu', $event)"
          @reset-default-columns="emit('reset-default-columns')"
        />

        <div v-if="showExcelToolbar">
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'">
            <div
              class="icons-grid-container open-grid-options"
              :title="'Options'"
              data-toggle="collapse"
              data-target="#options-exportcsv"
            >
              <iconEllipsisVertical class="three-dots-icon my-auto" />
            </div>
          </Tooltip>
        </div>

        <div id="options-exportcsv" class="float-menu collapse mr-2">
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'">
            <div
              class="export-grid-button d-flex cursor-pointer"
              :title="'Export Excel'"
              data-toggle="collapse"
              data-target="#options-exportcsv"
              @click="emit('export-excel')"
            >
              <ExportExcelIcon class="cursor-pointer" :title="'Export Excel'" />
              <span class="cursor-pointer">Export Excel</span>
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  </div>
</template>
