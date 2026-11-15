<template>
<CalculumModal @close="$emit('close')" :size="'xl'" :title="title" :showClose="true">
  <template v-slot:modalContent>
    <CalculumLoading v-if="isLoadingValues" block="block"></CalculumLoading>
    <div class="row mb-4">
      <div class="col-lg-4">
        <div class="form-group">
          <label>
            <select class="form-control" v-model="selectedValue">
              <option :value="null" disabled="disabled" selected="selected">{{ title }}</option>
              <option v-for="item in availableValues" :key="teamKey(item)" :value="item">{{ teamLabel(item) }}</option>
            </select><span>{{ title }}</span>
          </label>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-12">
        <ListNegotiation ref="listNegotiationRef" :selectedProgramId="programId" :entityUuid="entityUuid" :companyType="companyType" :isSelectable="true" :hasFinancing="false" :hasHarmonization="false" :selectedTabIndex="0" :allSpendsTab="false" :inRecalculation="false" :patchGrid="false" :showOptions="false" @select-all-row="onSelectAll" @select-row="onSelectRow" @send-filters="() => {}"></ListNegotiation>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md text-capitalize" @click="$emit('close')" style="z-index: 1; width: fit-content">{{ $t('global.cancel') }}</button>
    <button class="btn outline-secondary-btn font-md text-capitalize" @click="clearSelection" style="z-index: 1; width: fit-content">{{ $t('global.clear') }}</button>
    <button class="btn btn-primary font-md text-capitalize" @click="save" :disabled="isSaving || !selectedValue || selectedRows.length === 0" style="z-index: 1; width: fit-content">{{ $t('global.save') }}</button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "vue-toastification";
import { useAnalyzeStore } from "@/stores/analyze";
import { useGridMenuActionsStore } from "@/stores/gridMenuActions";
import { storeToRefs } from "pinia";
import { UserSessionActiveCompanyTeam } from "@/types";
import CalculumModal from "@/modules/components/CalculumModal.vue";
import { CalculumLoading } from '@ada/design-system'
import ListNegotiation from "../ListNegotiation.vue";

function isFirstCaseInsensitive(item: string, index: number, self: string[]): boolean {
  return index === self.map((t) => t.toLowerCase()).indexOf(item.toLowerCase())
}

export default defineComponent({
  name: "ModalAdvancedMode",
  components: { CalculumModal, CalculumLoading, ListNegotiation },
  props: {
    programId: { type: String, required: true },
    entityUuid: { type: String, required: true },
    companyType: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String as () => "commodity" | "customColumn" | "team", required: true },
    columnUuid: { type: String, required: false, default: null },
    columnNumber: { type: Number, required: false, default: null },
    initialValue: { type: String as () => string | null, required: false, default: null },
  },
  emits: ["close", "saved"],
  setup(props, { emit }) {
    const analyzeStore = useAnalyzeStore();
    const gridMenuActionsStore = useGridMenuActionsStore();
    const { activeTeams } = storeToRefs(gridMenuActionsStore);
    const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });
    const toast = useToast();

    const listNegotiationRef = ref<InstanceType<typeof ListNegotiation> | null>(null);
    const isLoadingValues = ref(false);
    const isSaving = ref(false);
    const selectedValue = ref<string | UserSessionActiveCompanyTeam | null>(props.initialValue);
    const availableValues = ref<(string | UserSessionActiveCompanyTeam)[]>([]);
    const selectedRows = ref<any[]>([]);

    onMounted(() => {
      fetchAvailableValues();
    });

    function teamKey(item: string | UserSessionActiveCompanyTeam): string {
      if (typeof item === "string") return item;
      return item["@id"];
    }

    function teamLabel(item: string | UserSessionActiveCompanyTeam): string {
      if (typeof item === "string") return item;
      return item.name;
    }

    function fetchAvailableValues() {
      isLoadingValues.value = true;
      if (props.type === "commodity") {
        analyzeStore.getProgramCommodityValues({
          programId: props.programId,
          callbackSuccess: (data: any) => {
            const sorted = (Array.isArray(data.values) ? data.values : []).sort(
              (a: string, b: string) => a.localeCompare(b),
            );
            availableValues.value = sorted.filter(isFirstCaseInsensitive);
            isLoadingValues.value = false;
          },
          callbackError: () => {
            isLoadingValues.value = false;
          },
        });
      } else if (props.type === "team") {
        const sorted = [...activeTeams.value].sort(
          (a, b) => a.name.localeCompare(b.name),
        );
        availableValues.value = sorted.filter(
          (item, index, self) =>
            index === self.findIndex((t) => t.name.toLowerCase() === item.name.toLowerCase()),
        );
        if (props.initialValue) {
          const match = availableValues.value.find(
            (t) => typeof t !== "string" && t.name === props.initialValue,
          );
          if (match) selectedValue.value = match;
        }
        isLoadingValues.value = false;
      } else {
        analyzeStore.getProgramCustomColumnValues({
          programId: props.programId,
          columnUuid: props.columnUuid,
          callbackSuccess: (data: any) => {
            const sorted = (Array.isArray(data.values) ? data.values : []).sort(
              (a: string, b: string) => a.localeCompare(b),
            );
            availableValues.value = sorted.filter(isFirstCaseInsensitive);
            isLoadingValues.value = false;
          },
          callbackError: () => {
            isLoadingValues.value = false;
          },
        });
      }
    }

    function onSelectRow(items: any[]) {
      selectedRows.value = items ?? [];
    }

    function onSelectAll(rowData: any[], _selectedItems: any[], checked: boolean) {
      selectedRows.value = checked ? rowData : [];
    }

    function clearSelection() {
      selectedValue.value = null;
      selectedRows.value = [];
      listNegotiationRef.value?.clearSelection();
    }

    function save() {
      if (!selectedValue.value || selectedRows.value.length === 0) return;

      const uuids = selectedRows.value.map((r) => r.uuid);
      const list = listNegotiationRef.value;
      if (!list) return;

      isSaving.value = true;

      const onSuccess = () => {
        isSaving.value = false;
        if (props.type === "commodity") {
          toast.success(translate.t("home.entityCard.details.commodityUpdated"));
        } else if (props.type === "team") {
          toast.success(translate.t("home.entityCard.details.spendLinesTeamUpdated"));
        } else {
          toast.success(translate.t("home.entityCard.details.customColumnUpdated"));
        }
        emit("saved");
        emit("close");
      };

      const onError = (error?: any) => {
        isSaving.value = false;
        if (import.meta.env.DEV) console.error("ModalAdvancedMode save error:", error);
        if (props.type === "commodity") {
          toast.error(translate.t("home.entityCard.details.commodityUpdateFailed"));
        } else if (props.type === "team") {
          toast.error(translate.t("home.entityCard.details.spendLinesTeamUpdateFailed"));
        } else {
          toast.error(translate.t("home.entityCard.details.customColumnUpdateFailed"));
        }
      };

      if (props.type === "commodity") {
        list.gridManageCommodity(selectedValue.value as string, uuids, onSuccess, onError);
      } else if (props.type === "team") {
        const team = selectedValue.value as UserSessionActiveCompanyTeam;
        list.gridManageTeam(team["@id"], uuids, onSuccess, onError);
      } else {
        list.gridManageCustomColumn(props.columnNumber!, selectedValue.value as string, uuids, onSuccess, onError);
      }
    }

    return {
      listNegotiationRef,
      isLoadingValues,
      isSaving,
      selectedValue,
      availableValues,
      selectedRows,
      teamKey,
      teamLabel,
      onSelectRow,
      onSelectAll,
      clearSelection,
      save,
    };
  },
});
</script>
