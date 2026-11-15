<template>
<div class="manage-team-container">
  <div v-if="isLoading" class="loader-container"><span class="spinner-border spinner-border-sm"></span></div>
  <div class="header-container-titles">
    <div class="d-flex flex-column"><span>{{ columnName }}</span>
      <div class="all-spendlines-btn"><span v-if="isAdmin && entityCardMode && !isNumeric" class="cursor-pointer" :title="$t('home.entityCard.details.tooltipSpendLinesCustomField')" @click.stop="$emit('open-advanced-mode')">{{ $t('global.viewAllSpendLines') }}</span></div>
    </div>
    <div v-if="!isNumeric" class="add-team"><i v-if="isSuperAdmin && !isAddingNew && isEditMode" class="fa-solid fa-plus add_icon cursor-pointer" :title="$t('home.entityCard.details.tooltipAddCustomField')" @click.stop="toggleAddNew"></i><i v-if="isSuperAdmin && isAddingNew" class="fa-solid fa-xmark cursor-pointer text-danger" @click.stop="toggleAddNew"></i><i v-if="isSuperAdmin" class="fa-solid fa-gear add_icon cursor-pointer" :title="$t('home.entityCard.details.tooltipGearCustomField')" @click.stop="toggleEditMode()"></i></div>
  </div>
  <template v-if="isNumeric">
    <div v-if="currentValue" class="selected-container"><span class="selected-label">{{ $t('global.selected') }}</span>
      <div class="selected-item-readonly"><span>{{ currentValue }}</span></div>
    </div>
    <div class="header-container">
      <input v-model="numericInput" class="form-control w-100" type="number" :step="columnType === 'days' ? 1 : 0.0001" :placeholder="currentValue ?? 'Search'" autofocus/>
    </div>
    <div v-if="filteredItems.length" ref="recordsContainer" class="records-container">
      <div v-for="item in filteredItems" :key="item" class="records-div cursor-pointer" @click="numericInput = item">
        <span>{{ formatNumericItem(item) }}</span>
      </div>
    </div>
    <span v-if="numericValidationError" class="text-danger small">{{ numericValidationError }}</span>
    <div class="header-container-end">
      <div class="d-flex gap-2 mt-2">
        <button class="btn btn-sm btn-primary" :disabled="!!numericValidationError || numericInput === ''" @click="submitNumeric">{{ $t('global.apply') }}</button>
        <button v-if="isAdmin" class="btn btn-sm outline-secondary-btn" @click="moveTo(null)">{{ $t('home.analyze.customColumn.clear') }}</button>
      </div>
    </div>
  </template>
  <template v-else>
    <div v-if="!isAddingNew" class="header-container">
      <input v-model="searchQuery" class="form-control w-100" type="text" :placeholder="$t('button.search')"/>
    </div>
    <div v-if="isAddingNew" class="header-container">
      <input v-model="newItemName" class="form-control" type="text" placeholder="Enter name and press Enter..." autofocus="autofocus" @keyup.enter="addNewItem" @keyup.esc="cancelAddNew"/>
      <div class="actions-box mx-3"><i class="fa-solid fa-check cursor-pointer text-success" :title="$t('home.entityCard.details.tooltipSaveEdit')" @click.stop="addNewItem"></i><i class="fa-solid fa-xmark cursor-pointer text-danger" :title="$t('home.entityCard.details.tooltipCancelEdit')" @click.stop="cancelAddNew"></i></div>
    </div>
    <div v-if="currentValue" class="selected-container"><span class="selected-label">{{ $t('global.selected') }}</span>
      <div class="selected-item-readonly">
        <Tooltip :anchor-element="'target'" :position="'top'" :open-delay="300"><span :title="currentValue">{{ currentValue }}</span></Tooltip>
      </div>
    </div>
    <div ref="recordsContainer" class="records-container">
      <div v-for="item in filteredItems" :key="item" class="records-div">
        <template v-if="isEditMode && editingItemId === item">
          <input v-model="editingItemName" class="form-control" type="text" @keyup.enter="saveEdit" @keyup.esc="cancelEdit"/>
          <div class="actions-box"><i class="fa-solid fa-check cursor-pointer text-success" :title="$t('home.entityCard.details.tooltipSaveEdit')" @click.stop="saveEdit"></i><i class="fa-solid fa-xmark cursor-pointer text-danger" :title="$t('home.entityCard.details.tooltipCancelEdit')" @click.stop="cancelEdit"></i></div>
        </template>
        <template v-else>
          <div class="select-box cursor-pointer" @click="moveTo(item)">
            <InitialLettersText class="cursor-pointer" :text="item"></InitialLettersText>
          </div>
          <div class="actions-box"><i v-if="isEditMode" class="fa-solid fa-pencil cursor-pointer" :title="$t('home.entityCard.details.tooltipEditName')" @click.stop="startEdit(item)"></i><i v-if="isEditMode" class="fa-solid fa-trash-can cursor-pointer text-danger" :title="$t('home.entityCard.details.tooltipDeleteCustomField')" @click.stop="deleteItem(item)"></i></div>
        </template>
      </div>
    </div>
    <div v-if="!isLoading" class="header-container-end">
      <button v-if="isAdmin" id="clear-selection" class="btn btn-sm outline-secondary-btn font-md btn-clear-action" :title="$t('home.entityCard.details.tooltipClearCustomField')" @click="moveTo(null)">{{ $t("home.analyze.customColumn.clear") }}</button>
    </div>
  </template>
</div>
</template>

<script lang="ts">
import {
  PropType,
  defineComponent,
  ref,
  computed,
  onMounted,
  watch,
  watchEffect,
  nextTick,
} from "vue";
import { ActionFromEditProgram } from "@/modules/components/types";
import InitialLettersText from "@/modules/components/utils/InitialLettersText.vue";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useAnalyzeStore } from "@/stores/analyze";
import { getNumberWithDecimals } from "@/utils/FormatData";
import { useUser } from "@/composables";
import { useI18n } from "vue-i18n";

export default defineComponent({
  name: "ManageCustomColumnAction",
  components: { InitialLettersText, Tooltip },
  props: {
    option: {
      type: String as PropType<ActionFromEditProgram>,
      required: true,
    },
    selectedProgramId: { type: String, required: true },
    columnUuid: { type: String, required: true },
    columnName: { type: String, required: true },
    entityCardMode: { type: Boolean, required: false, default: false },
    currentValue: { type: String as PropType<string | null>, default: null },
    columnType: {
      type: String as PropType<"text" | "number" | "days" | "money">,
      default: "text",
    },
  },
  emits: [
    "call-action",
    "call-action-edit",
    "request-confirm",
    "open-advanced-mode",
  ],
  setup(props, { emit }) {
    const analyzeStore = useAnalyzeStore();
    const { t } = useI18n({ useScope: "global" });
    const { userIsAdmin, userIsSuperAdmin } = useUser();
    const isSuperAdmin = computed(() => userIsSuperAdmin.value);
    const isAdmin = computed(() => userIsAdmin.value);
    const isEditMode = ref<boolean>(false);

    const isNumeric = computed(() => props.columnType !== "text");
    const numericInput = ref<string>("");

    const localItems = ref<string[]>([]);
    const isLoading = ref<boolean>(false);
    // Paginated: when getProgramCustomColumnValues supports q/page params, replace
    // visibleCount slicing below with server-side calls (see ManageCommodityAction.vue)
    const PAGE_SIZE = 20;
    const visibleCount = ref(PAGE_SIZE);
    const recordsContainer = ref<HTMLElement | null>(null);

    const getColumnValues = () => {
      isLoading.value = true;
      const params = {
        programId: props.selectedProgramId,
        columnUuid: props.columnUuid,
        callbackSuccess: (callbackSuccessData: any) => {
          const resultData = callbackSuccessData.values;
          localItems.value = Array.isArray(resultData) ? resultData.map(String) : [];
          isLoading.value = false;
        },
        callbackError: (callbackErrorData: any) => {
          if (import.meta.env.DEV) {
            console.error(
              "** Error on getProgramCustomColumnValues: ",
              callbackErrorData,
            );
          }
          isLoading.value = false;
        },
      };
      analyzeStore.getProgramCustomColumnValues(params);
    };

    const numericValidationError = computed<string | null>(() => {
      if (numericInput.value === "") return null;
      if (props.columnType === "days") {
        return /^\d+$/.test(numericInput.value)
          ? null
          : t("home.analyze.customColumn.integerValueRequired");
      }
      return /^-?\d+(\.\d{1,4})?$/.test(numericInput.value)
        ? null
        : t("home.analyze.customColumn.numericValueRequired");
    });

    function submitNumeric() {
      if (numericValidationError.value !== null || numericInput.value === "") return;
      moveTo(numericInput.value);
    }

    function formatNumericItem(item: string): string {
      const decimals = props.columnType === 'days' ? 0 : 1
      return getNumberWithDecimals(item, decimals)
    }

    onMounted(() => {
      getColumnValues();
    });

    const itemsList = computed(() => {
      const sorted = [...localItems.value].sort(
        isNumeric.value
          ? (a, b) => parseFloat(a) - parseFloat(b)
          : (a: string, b: string) => a.localeCompare(b),
      );
      return sorted.filter(
        (item, index, self) =>
          index ===
          self.map((t: string) => t.toLowerCase()).indexOf(item.toLowerCase()),
      );
    });

    const searchQuery = ref<string>("");
    const editingItemId = ref<string | null>(null);
    const editingItemName = ref<string>("");
    const isAddingNew = ref<boolean>(false);
    const newItemName = ref<string>("");

    const filteredAllItems = computed<string[]>(() => {
      const cv = props.currentValue?.toLowerCase();
      const baseList = cv
        ? itemsList.value.filter((item: string) => item.toLowerCase() !== cv)
        : itemsList.value;
      if (!searchQuery.value.trim()) return baseList;
      const query = searchQuery.value.toLowerCase();
      return baseList.filter((item: string) =>
        item.toLowerCase().includes(query),
      );
    });

    const filteredItems = computed<string[]>(() =>
      filteredAllItems.value.slice(0, visibleCount.value),
    );
    const hasMore = computed(
      () => visibleCount.value < filteredAllItems.value.length,
    );

    watch(searchQuery, () => {
      visibleCount.value = PAGE_SIZE;
    });

    function getMoreItems() {
      if (recordsContainer.value) {
        const div = recordsContainer.value;
        const isAtEnd =
          div.scrollTop >= div.scrollHeight - div.clientHeight - 2;
        if (isAtEnd && hasMore.value) {
          visibleCount.value += PAGE_SIZE;
        }
      }
    }

    watchEffect(async () => {
      if (filteredItems.value.length > 0) {
        await nextTick();
        if (recordsContainer.value) {
          recordsContainer.value.addEventListener("scroll", getMoreItems);
        }
      } else if (recordsContainer.value) {
        recordsContainer.value.removeEventListener("scroll", getMoreItems);
      }
    });

    function toggleEditMode() {
      isEditMode.value = !isEditMode.value;
      if (!isEditMode.value) {
        cancelEdit();
      }
    }

    function toggleAddNew() {
      isAddingNew.value = !isAddingNew.value;
      if (isAddingNew.value) {
        newItemName.value = "";
        cancelEdit();
      }
    }

    function addNewItem() {
      const cleanedValue = newItemName.value.trim();
      if (newItemName.value.trim() === "") return;
      localItems.value.push(cleanedValue);
      moveTo(cleanedValue);
      newItemName.value = "";
      isAddingNew.value = false;
    }

    function cancelAddNew() {
      isAddingNew.value = false;
      newItemName.value = "";
    }

    function startEdit(item: string) {
      editingItemId.value = item;
      editingItemName.value = item;
      isAddingNew.value = false;
    }

    const editDeleteItem = (
      valueOld: string | null,
      valueNew: string | null,
      type: "edit" | "delete",
    ) => {
      isLoading.value = true;
      const params = {
        programId: props.selectedProgramId,
        columnNumber: props.columnUuid,
        previousValue: valueOld,
        newValue: valueNew,
        callbackSuccess: () => {
          if (type === "edit" && valueOld !== null) {
            const index = localItems.value.indexOf(valueOld);
            if (index !== -1) {
              localItems.value[index] = valueNew ?? "";
            }
          } else if (type === "delete" && valueOld !== null) {
            localItems.value = localItems.value.filter((c) => c !== valueOld);
          }
          moveTo(valueNew);
          isLoading.value = false;
        },
        callbackError: (callbackErrorData: any) => {
          if (import.meta.env.DEV) {
            console.error(
              "** Error on renameCustomColumnValue: ",
              callbackErrorData,
            );
          }
          isLoading.value = false;
        },
      };
      analyzeStore.renameCustomColumnValue(params);
    };

    function saveEdit() {
      if (editingItemName.value.trim() === "" || !editingItemId.value) return;
      const index = localItems.value.indexOf(editingItemId.value);
      if (index !== -1) {
        emit("request-confirm", {
          valueOld: localItems.value[index],
          valueNew: editingItemName.value.trim(),
          type: "edit",
        });
      }
      cancelEdit();
    }

    function cancelEdit() {
      editingItemId.value = null;
      editingItemName.value = "";
    }

    function deleteItem(itemId: string) {
      const index = localItems.value.indexOf(itemId);
      if (index !== -1) {
        emit("request-confirm", {
          valueOld: localItems.value[index],
          valueNew: null,
          type: "delete",
        });
      }
    }

    const moveTo = (item: string | null) => {
      const payload = { param: item, columnUuid: props.columnUuid };
      const removeG = !item;
      emit("call-action", props.option, true, {
        ...payload,
        removeGroup: removeG,
      });
    };

    return {
      isSuperAdmin,
      isAdmin,
      isEditMode,
      recordsContainer,
      itemsList,
      searchQuery,
      editingItemId,
      editingItemName,
      isAddingNew,
      newItemName,
      filteredItems,
      isLoading,
      toggleEditMode,
      toggleAddNew,
      addNewItem,
      cancelAddNew,
      startEdit,
      saveEdit,
      cancelEdit,
      deleteItem,
      editDeleteItem,
      moveTo,
      isNumeric,
      numericInput,
      numericValidationError,
      submitNumeric,
      formatNumericItem,
    };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";
.manage-team-container {
  position: relative;
  min-height: 300px;
  width: 340px;
  display: flex;
  flex-direction: column;
}
.loader-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 97;
}
.header-container-titles {
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  &:hover {
    .actions-box {
      display: flex;
    }
  }
}
.header-container {
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  &:hover {
    .actions-box {
      display: flex;
    }
  }
}
.header-container-end {
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  align-items: end;
  justify-content: end;
  gap: 8px;
  margin-top: auto;
}
.selected-container {
  padding: 6px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid $color-gray-200;
}
.selected-label {
  font-size: 0.7rem;
  color: $color-gray-400;
  font-weight: 600;
  white-space: nowrap;
}
.selected-item-readonly {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  overflow: hidden;
  min-width: 0;
  cursor: default;
  :deep(> *) {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
  :deep(span) {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
}
.records-container {
  padding: 10px 14px;
  padding-right: 8px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: 238px;
  margin-right: 4px;
  &::-webkit-scrollbar {
    width: 0.3rem;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: $scrollbar-thumb !important;
    &:hover {
      cursor: pointer;
    }
  }
}
.records-div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 32px;
  &:hover {
    .actions-box {
      display: flex;
    }
    background-color: $color-gray-100;
    cursor: pointer;
  }
}
.add-team {
  display: flex;
  padding-top: 4px;
  justify-content: center;
  gap: 4px;
}
.add_icon {
  color: $color-gray-700;
  width: 18px;
  height: 13px;
}
.select-box {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.actions-box {
  display: none;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.del {
  color: $color-primary-500;
}
.text-success {
  color: #28a745;
}
.text-danger {
  color: #dc3545;
}
.class-width {
  width: 100%;
}
.all-spendlines-btn {
  font-size: 0.8rem;
  color: $color-blue-700;
}
</style>
