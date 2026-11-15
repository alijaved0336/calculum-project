<template>
<div class="manage-team-container">
  <div class="loader-container" v-if="isLoading"><span class="spinner-border spinner-border-sm"></span></div>
  <div class="header-container-titles">
    <div class="d-flex flex-column"><span>{{ $t('home.analyze.commodities.filter') }}</span>
      <div class="all-spendlines-btn"><span class="cursor-pointer" v-if="isAdmin && entityCardMode" :title="$t('home.entityCard.details.tooltipSpendLinesCommodity')" @click.stop="$emit('open-advanced-mode')">{{ $t('global.viewAllSpendLines') }}</span></div>
    </div>
    <div class="add-team"><i class="fa-solid fa-plus text-sm add_icon cursor-pointer" v-if="isSuperAdmin && !isAddingNew && isEditMode" :title="$t('home.entityCard.details.tooltipAddCommodity')" @click.stop="toggleAddNew"></i><i class="fa-solid fa-xmark cursor-pointer text-danger" v-if="isSuperAdmin && isAddingNew" @click.stop="toggleAddNew"></i><i class="fa-solid fa-gear add_icon cursor-pointer" v-if="isSuperAdmin" :title="$t('home.entityCard.details.tooltipGearCommodity')" @click.stop="toggleEditMode()"></i></div>
  </div>
  <div class="header-container" v-if="!isAddingNew">
    <input class="form-control w-100" id="search-team" type="text" :placeholder="$t('button.search')" v-model="searchQuery"/>
  </div>
  <div class="header-container" v-if="isAddingNew">
    <input class="form-control" type="text" placeholder="Enter name and press Enter..." v-model="newItemName" @keyup.enter="addNewItem" @keyup.esc="cancelAddNew" autofocus="autofocus"/>
    <div class="actions-box mx-3"><i class="fa-solid fa-check cursor-pointer text-success" :title="$t('home.entityCard.details.tooltipSaveEdit')" @click.stop="addNewItem"></i><i class="fa-solid fa-xmark cursor-pointer text-danger" :title="$t('home.entityCard.details.tooltipCancelEdit')" @click.stop="cancelAddNew"></i></div>
  </div>
  <div class="selected-container" v-if="currentValue"><span class="selected-label">{{ $t('global.selected') }}</span>
    <div class="selected-item-readonly">
      <Tooltip :anchor-element="'target'" :position="'top'" :open-delay="300"><span :title="currentValue">{{ currentValue }}</span></Tooltip>
    </div>
  </div>
  <div class="records-container" ref="recordsContainer">
    <div class="records-div" v-for="item in filteredItems" :key="item" @click="editingItemId !== item && moveTo(item)">
      <template v-if="isEditMode && editingItemId === item">
        <input class="form-control" type="text" v-model="editingItemName" @keyup.enter="saveEdit" @keyup.esc="cancelEdit"/>
        <div class="actions-box"><i class="fa-solid fa-check cursor-pointer text-success" :title="$t('home.entityCard.details.tooltipSaveEdit')" @click.stop="saveEdit"></i><i class="fa-solid fa-xmark cursor-pointer text-danger" :title="$t('home.entityCard.details.tooltipCancelEdit')" @click.stop="cancelEdit"></i></div>
      </template>
      <template v-else>
        <div class="select-box">
          <InitialLettersText :text="item"></InitialLettersText>
        </div>
        <div class="actions-box"><i class="fa-solid fa-pencil text-sm cursor-pointer" v-if="isEditMode" :title="$t('home.entityCard.details.tooltipEditName')" @click.stop="startEdit(item)"></i><i class="fa-solid fa-trash-can text-sm cursor-pointer text-danger" v-if="isEditMode" :title="$t('home.entityCard.details.tooltipDeleteCommodity')" @click.stop="deleteItem(item)"></i></div>
      </template>
    </div>
  </div>
  <div class="header-container-end" v-if="!isLoading">
    <button class="btn btn-sm outline-secondary-btn font-md btn-clear-action" id="clear-selection" v-if="isAdmin" :title="$t('home.entityCard.details.tooltipClearCommodity')" @click="moveTo(null)">{{ $t("home.analyze.commodities.clear") }}</button>
  </div>
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
import IconCustomize from "@ada/design-system/assets/icons/iconCustomize.vue";
import { useAnalyzeStore } from "@/stores/analyze";
import { useUser } from "@/composables";

export default defineComponent({
  name: "ManageCommodityAction",
  components: { InitialLettersText, IconCustomize, Tooltip },
  props: {
    option: {
      type: String as PropType<ActionFromEditProgram>,
      required: true,
    },
    selectedProgramId: { type: String, required: true },
    entityCardMode: { type: Boolean, required: false, default: false },
    currentValue: { type: String as PropType<string | null>, default: null },
  },
  emits: ["call-action", "request-confirm", "open-advanced-mode"],
  setup(props, { emit }) {
    const analyzeStore = useAnalyzeStore();
    const { userIsAdmin, userIsSuperAdmin } = useUser();
    const isSuperAdmin = computed(() => userIsSuperAdmin.value);
    const isAdmin = computed(() => userIsAdmin.value);

    const localItems = ref<string[]>([]);
    const isLoading = ref<boolean>(false);
    const isEditMode = ref<boolean>(false);
    const hasMore = ref<boolean>(false);
    const currentPage = ref<number>(1);
    const searchQuery = ref<string>("");
    const recordsContainer = ref<HTMLElement | null>(null);

    const fetchCommodities = (reset = true) => {
      if (reset) {
        currentPage.value = 1;
        localItems.value = [];
      }
      isLoading.value = true;

      analyzeStore.getProgramCommodityValues({
        programId: props.selectedProgramId,
        q: searchQuery.value.trim() || undefined,
        page: currentPage.value,
        callbackSuccess: (data: any) => {
          const incoming = Array.isArray(data.values) ? data.values : [];
          localItems.value = reset
            ? incoming
            : [...localItems.value, ...incoming];
          hasMore.value = !!data.hasMore;
          isLoading.value = false;
        },
        callbackError: (err: any) => {
          if (import.meta.env.DEV)
            console.error("** Error on getProgramCommodityValues:", err);
          isLoading.value = false;
        },
      });
    };

    function getMoreItems() {
      if (recordsContainer.value) {
        const div = recordsContainer.value;
        const isAtEnd =
          div.scrollTop >= div.scrollHeight - div.clientHeight - 2;
        if (isAtEnd && hasMore.value && !isLoading.value) {
          currentPage.value++;
          fetchCommodities(false);
        }
      }
    }

    watchEffect(async () => {
      if (localItems.value.length > 0) {
        await nextTick();
        if (recordsContainer.value) {
          recordsContainer.value.addEventListener("scroll", getMoreItems);
        }
      } else if (recordsContainer.value) {
        recordsContainer.value.removeEventListener("scroll", getMoreItems);
      }
    });

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    watch(searchQuery, () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchCommodities(true), 300);
    });

    onMounted(() => {
      fetchCommodities(true);
    });

    const filteredItems = computed<string[]>(() => {
      const cv = props.currentValue?.toLowerCase();
      if (!cv) return localItems.value;
      return localItems.value.filter(item => item.toLowerCase() !== cv);
    });

    const editingItemId = ref<string | null>(null);
    const editingItemName = ref<string>("");
    const isAddingNew = ref<boolean>(false);
    const newItemName = ref<string>("");

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
      if (cleanedValue === "") return;
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
              "** Error on renameSpendFieldValue: ",
              callbackErrorData,
            );
          }
          isLoading.value = false;
        },
      };
      analyzeStore.renameSpendFieldValue(params);
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
      const payload = { param: item };
      const removeG = !item;

      callStoreMenuAction(props.option, true, removeG, payload);
    };

    const callStoreMenuAction = (
      keyId: ActionFromEditProgram,
      isEmit: boolean,
      removeGroup: boolean,
      payload: any,
    ) => {
      const newPayload = { ...payload, removeGroup };
      emit("call-action", keyId, isEmit, newPayload);
    };

    return {
      isSuperAdmin,
      isAdmin,
      searchQuery,
      editingItemId,
      editingItemName,
      isAddingNew,
      newItemName,
      filteredItems,
      recordsContainer,
      isLoading,
      isEditMode,
      toggleEditMode,
      hasMore,
      toggleAddNew,
      addNewItem,
      cancelAddNew,
      startEdit,
      saveEdit,
      cancelEdit,
      deleteItem,
      editDeleteItem,
      callStoreMenuAction,
      moveTo,
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
}
.loader-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 97;
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
.header-container-end {
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  align-items: end;
  justify-content: end;
  gap: 8px;
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
.disabled {
  opacity: 0.5;
  cursor: not-allowed !important;
  pointer-events: none;
}
.item-container {
  padding: 10px 14px;
  border-radius: 8px;
  color: $color-gray-600;
  display: flex;
  justify-content: end;
}
.btn-move-action {
  z-index: 1;
  width: 100px;
}
.class-width {
  width: 100%;
}
.all-spendlines-btn{
  font-size: 0.8rem;
  color: $color-blue-700;
}
</style>
