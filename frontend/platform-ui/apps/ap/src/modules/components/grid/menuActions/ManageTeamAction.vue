<template>
<div class="manage-team-container">
  <div class="loader-container" v-if="isLoading"><span class="spinner-border spinner-border-sm"></span></div>
  <div class="header-container-titles">
    <div class="d-flex flex-column"><span>{{ $t('home.analyze.manageTeam.filter') }}</span>
      <div class="all-spendlines-btn"><span class="cursor-pointer" v-if="isAdmin && entityCardMode" :title="$t('home.entityCard.details.tooltipSpendLinesTeam')" @click.stop="$emit('open-advanced-mode')">{{ $t('global.viewAllSpendLines') }}</span></div>
    </div>
    <div class="add-team"><i class="fa-solid fa-plus text-sm add_icon cursor-pointer" v-if="isSuperAdmin && !isAddingNew  && isEditMode" :title="$t('home.entityCard.details.tooltipAddTeam')" @click.stop="toggleAddNew"></i><i class="fa-solid fa-xmark cursor-pointer text-danger" v-if="isSuperAdmin && isAddingNew" @click.stop="toggleAddNew"></i><i class="fa-solid fa-gear add_icon cursor-pointer" v-if="isSuperAdmin" :title="$t('home.entityCard.details.tooltipGearTeam')" @click.stop="toggleEditMode()"></i></div>
  </div>
  <div class="header-container" v-if="!isAddingNew">
    <input class="form-control w-100" id="search-team" type="text" :placeholder="$t('button.search')" v-model="searchQuery"/>
  </div>
  <div class="header-container" v-if="isAddingNew">
    <input class="form-control" type="text" placeholder="Enter name and press Enter..." v-model="newItemName" @keyup.enter="addNewItem" @keyup.esc="cancelAddNew" :disabled="isCreating" autofocus="autofocus"/>
    <div class="actions-box mx-3"><i class="fa-solid fa-check cursor-pointer text-success" :title="$t('home.entityCard.details.tooltipSaveEdit')" @click.stop="addNewItem" :class="{ 'disabled': isCreating }"></i><i class="fa-solid fa-xmark cursor-pointer text-danger" :title="$t('home.entityCard.details.tooltipCancelEdit')" @click.stop="cancelAddNew" :class="{ 'disabled': isCreating }"></i></div>
  </div>
  <div class="selected-container" v-if="currentValue"><span class="selected-label">{{ $t('global.selected') }}</span>
    <div class="selected-item-readonly">
      <Tooltip :anchor-element="'target'" :position="'top'" :open-delay="300"><span :title="currentValue">{{ currentValue }}</span></Tooltip>
    </div>
  </div>
  <div class="records-container" ref="recordsContainer">
    <div class="records-div" v-for="item in filteredItems" :key="item['@id']" @click="editingItemId !== item['@id'] && selectItem(item)">
      <template v-if="isEditMode && editingItemId === item['@id']">
        <input class="form-control" type="text" v-model="editingItemName" @keyup.enter="saveEdit" @keyup.esc="cancelEdit" :disabled="isUpdating"/>
        <div class="actions-box"><i class="fa-solid fa-check cursor-pointer text-success" :title="$t('home.entityCard.details.tooltipSaveEdit')" @click.stop="saveEdit" :class="{ 'disabled': isUpdating }"></i><i class="fa-solid fa-xmark cursor-pointer text-danger" :title="$t('home.entityCard.details.tooltipCancelEdit')" @click.stop="cancelEdit" :class="{ 'disabled': isUpdating }"></i></div>
      </template>
      <template v-else>
        <div class="select-box">
          <InitialLettersText :text="item.name"></InitialLettersText>
        </div>
        <div class="actions-box"><i class="fa-solid fa-pencil text-sm cursor-pointer" v-if="isEditMode" :title="$t('home.entityCard.details.tooltipEditName')" @click.stop="editItem(item)" :class="{ 'disabled': deletingItems.has(item['@id']) }"></i><i class="fa-solid fa-trash-can text-sm cursor-pointer text-danger" v-if="isEditMode" :title="$t('home.entityCard.details.tooltipDeleteTeam')" @click.stop="deleteItem(item['@id'])" :class="{ 'disabled': deletingItems.has(item['@id']) }"></i></div>
      </template>
    </div>
  </div>
  <div class="header-container-end" v-if="!isLoading">
    <button class="btn btn-sm outline-secondary-btn font-md btn-clear-action" id="clear-selection" v-if="isAdmin" :title="$t('home.entityCard.details.tooltipClearTeam')" @click="moveTo(null)">{{ $t("home.analyze.manageTeam.clear") }}</button>
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
import { getInitialLetters } from "@/modules/components/utils/organizeValues";
import InitialLettersText from "@/modules/components/utils/InitialLettersText.vue";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useToast } from "vue-toastification";
import { useGridMenuActionsStore } from "@/stores/gridMenuActions";
import { storeToRefs } from "pinia";
import { UserSessionActiveCompanyTeam } from "@/types";
import { useCompany, useUser } from "@/composables";
import {
  postCompanyTeam,
  patchCompanyTeam,
} from "@/modules/adminBackend/api/company";


export default defineComponent({
  name: "ManageTeamAction",
  components: { InitialLettersText, Tooltip },
  props: {
    option: {
      type: String as PropType<ActionFromEditProgram>,
      required: true,
    },
    currentValue: { type: String as PropType<string | null>, default: null },
    entityCardMode: { type: Boolean, required: false, default: false },
  },
  emits: ["call-action", "open-advanced-mode", "request-confirm"],
  setup(props, { emit }) {
    const toast = useToast();
    const gridMenuActionsStore = useGridMenuActionsStore();
    const { activeTeams } = storeToRefs(gridMenuActionsStore);
    const { companyActiveTeams, companyActiveIri } = useCompany();
    const { userIsAdmin, userIsSuperAdmin } = useUser();
    const isSuperAdmin = computed(() => userIsSuperAdmin.value);
    const isAdmin = computed(() => userIsAdmin.value);

    const isEditMode = ref<boolean>(false);

    onMounted(() => {
      if (companyActiveTeams.value) {
        gridMenuActionsStore.initializeTeams(companyActiveTeams.value);
      }
    });

    const items = computed(() => activeTeams.value);
    const itemsList = computed(() => {
      const sortedAlphabetically = [...items.value].sort(
        (a: UserSessionActiveCompanyTeam, b: UserSessionActiveCompanyTeam) =>
          a.name.localeCompare(b.name),
      );

      return sortedAlphabetically.filter(
        (item, index, self) =>
          index ===
          self.findIndex(
            (t: UserSessionActiveCompanyTeam) =>
              t.name.toLowerCase() === item.name.toLowerCase(),
          ),
      );
    });

    const searchQuery = ref<string>("");
    const editingItemId = ref<string | null>(null);
    const editingItemName = ref<string>("");
    const isAddingNew = ref<boolean>(false);
    const newItemName = ref<string>("");
    const selectedItems = ref<UserSessionActiveCompanyTeam[]>([]);
    const isCreating = ref<boolean>(false);
    const isUpdating = ref<boolean>(false);
    const deletingItems = ref<Set<string>>(new Set());
    // Paginated: when teams support server-side search/pagination, replace
    // visibleCount slicing below with API calls (see ManageCommodityAction.vue)
    const PAGE_SIZE = 20;
    const visibleCount = ref(PAGE_SIZE);
    const recordsContainer = ref<HTMLElement | null>(null);

    function handleCheckboxChange(
      event: Event,
      item: UserSessionActiveCompanyTeam,
    ) {
      const checkbox = event.target as HTMLInputElement;
      if (checkbox.checked) {
        selectedItems.value.push(item);
      } else {
        selectedItems.value = selectedItems.value.filter(
          (i) => i["@id"] !== item["@id"],
        );
      }
    }

    const filteredAllItems = computed<UserSessionActiveCompanyTeam[]>(() => {
      const cv = props.currentValue?.toLowerCase();
      const baseList = cv
        ? itemsList.value.filter((item) => item.name.toLowerCase() !== cv)
        : itemsList.value;
      if (!searchQuery.value.trim()) return baseList;
      const query = searchQuery.value.toLowerCase();
      return baseList.filter((item) => item.name.toLowerCase().includes(query));
    });

    const filteredItems = computed<UserSessionActiveCompanyTeam[]>(() =>
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

    const isLoading = computed<boolean>(() => {
      return (
        isCreating.value || isUpdating.value || deletingItems.value.size > 0
      );
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

    async function addNewItem() {
      if (newItemName.value.trim() === "") {
        toast.error("Team name cannot be empty");
        return;
      }

      isCreating.value = true;
      try {
        const response = await postCompanyTeam(
          newItemName.value.trim(),
          companyActiveIri.value,
        );

        if (response.success && response.data) {
          gridMenuActionsStore.addTeam(response.data);
          newItemName.value = "";
          isAddingNew.value = false;
          toast.success("Team added successfully");
        } else {
          toast.error("Failed to create team. Please try again.");
        }
      } catch (error: any) {
        console.error("Error creating team:", error);
        toast.error("Network error. Please check your connection.");
      } finally {
        isCreating.value = false;
      }
    }

    function cancelAddNew() {
      isAddingNew.value = false;
      newItemName.value = "";
    }

    function startEdit(item: UserSessionActiveCompanyTeam) {
      editingItemId.value = item["@id"];
      editingItemName.value = item.name;
      isAddingNew.value = false;
    }

    async function saveEdit() {
      if (editingItemName.value.trim() === "") {
        toast.error("Team name cannot be empty");
        return;
      }

      if (!editingItemId.value) return;

      isUpdating.value = true;
      try {
        const response = await patchCompanyTeam(
          editingItemId.value,
          editingItemName.value.trim(),
        );

        if (response.success) {
          gridMenuActionsStore.updateTeam(editingItemId.value, {
            name: editingItemName.value.trim(),
          });
          cancelEdit();
          toast.success("Team updated successfully");
        } else {
          toast.error("Failed to update team. Please try again.");
        }
      } catch (error: any) {
        console.error("Error updating team:", error);
        toast.error("Network error. Please check your connection.");
      } finally {
        isUpdating.value = false;
      }
    }

    function cancelEdit() {
      editingItemId.value = null;
      editingItemName.value = "";
    }

    function deleteItem(itemId: string) {
      emit("request-confirm", { itemId, type: "delete" });
    }

    const moveTo = (item: UserSessionActiveCompanyTeam | null) => {
      const payload = {
        param: item,
      };
      const removeG = !item;
      callStoreMenuAction(props.option, true, removeG, payload);
    };

    function clearSelection() {
      const checkboxes = document.querySelectorAll(".k-checkbox");
      checkboxes.forEach((checkbox: any) => {
        checkbox.checked = false;
      });
    }

    const callStoreMenuAction = (
      keyId: ActionFromEditProgram,
      isEmit: boolean,
      removeGroup: boolean,
      payload: any,
    ) => {
      const newPayload = { ...payload, removeGroup };
      emit("call-action", keyId, isEmit, newPayload);
    };

    // Template bridge functions — keep TypeScript casts out of template expressions
    function selectItem(item: any) {
      moveTo(item as UserSessionActiveCompanyTeam);
    }

    function editItem(item: any) {
      startEdit(item as UserSessionActiveCompanyTeam);
    }

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
      isCreating,
      isUpdating,
      deletingItems,
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
      clearSelection,
      callStoreMenuAction,
      getInitialLetters,
      handleCheckboxChange,
      moveTo,
      selectItem,
      editItem,
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
  &:hover {
    color: $color-primary-500;
  }
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
.all-spendlines-btn {
  font-size: 0.8rem;
  color: $color-blue-700;
}
</style>
