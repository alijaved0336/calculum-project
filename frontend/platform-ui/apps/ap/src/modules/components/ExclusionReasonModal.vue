<template>
<CalculumModal v-if="store.isOpen" :size="'sm'" @close="store.cancel()">
  <template v-slot:modalContent>
    <div class="manage-team-container">
      <div v-if="isLoading" class="loader-container"><span class="spinner-border spinner-border-sm"></span></div>

      <div class="header-container-titles">
        <div class="d-flex flex-column"><span class="modal-title-text">{{ $t('home.analyze.reason.modalTitle') }}</span></div>
        <div class="add-team">
          <i v-if="!isAddingNew" class="fa-solid fa-plus add_icon cursor-pointer" :title="$t('home.analyze.reason.addNew')" @click.stop="toggleAddNew"></i>
          <i v-if="isAddingNew" class="fa-solid fa-xmark cursor-pointer text-danger" @click.stop="toggleAddNew"></i>
        </div>
      </div>

      <div v-if="!isAddingNew" class="header-container">
        <input v-model="searchQuery" class="form-control w-100" type="text" :placeholder="$t('button.search')" autofocus/>
      </div>
      <div v-if="isAddingNew" class="header-container">
        <input v-model="newReasonText" class="form-control" type="text" :placeholder="$t('home.analyze.reason.typeNewReason')" autofocus @keyup.enter="applyNewReason" @keyup.esc="cancelAddNew"/>
        <div class="actions-box mx-3"><i class="fa-solid fa-check cursor-pointer text-success" :title="$t('home.entityCard.details.tooltipSaveEdit')" @click.stop="applyNewReason"></i><i class="fa-solid fa-xmark cursor-pointer text-danger" :title="$t('home.entityCard.details.tooltipCancelEdit')" @click.stop="cancelAddNew"></i></div>
      </div>

      <div v-if="!isAddingNew" ref="recordsContainer" class="records-container">
        <div v-for="item in filteredItems" :key="item" class="records-div cursor-pointer" @click="applyExisting(item)">
          <InitialLettersText :text="item"></InitialLettersText>
        </div>
        <div v-if="!isLoading && filteredItems.length === 0" class="no-results">{{ $t('home.analyze.reason.noExistingReasons') }}</div>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="store.cancel()"><span>{{ $t('global.cancel') }}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  computed,
  watch,
  watchEffect,
  nextTick,
} from "vue";
import CalculumModal from "@/modules/components/CalculumModal.vue";
import InitialLettersText from "@/modules/components/utils/InitialLettersText.vue";
import { useAnalyzeStore } from "@/stores/analyze";
import { useExclusionReasonStore } from "@/stores/exclusionReason";

/**
 * AB#20307: the reason-for-exclusion popup. Excluding a row - single or bulk - opens this (see
 * ExcludeColumn.vue / ListsCFEdit.vue's gridExclude, both of which call
 * useExclusionReasonStore().requestReason() before proceeding) instead of a separate toolbar
 * action: submitting always requires a non-blank reason (existing, picked from the list, or newly
 * typed); Cancel/close aborts the exclude entirely.
 *
 * Layout/styling deliberately mirrors ManageCommodityAction.vue / ManageCustomColumnAction.vue
 * (title row with a +/x toggle, search-or-add row with an input + inline check/x icons revealed on
 * hover, scrollable records list) for visual consistency with the rest of the Edit Mode toolbar
 * popups, minus their rename/delete/edit-mode machinery - this one only ever picks or creates a
 * reason, never manages the list itself.
 *
 * Mounted once, globally, in ListsCFEdit.vue - driven entirely by useExclusionReasonStore's state
 * so both entry points can reach it without a prop/emit chain through every component in between.
 */
export default defineComponent({
  name: "ExclusionReasonModal",
  components: { CalculumModal, InitialLettersText },
  setup() {
    const store = useExclusionReasonStore();
    const analyzeStore = useAnalyzeStore();

    const localItems = ref<string[]>([]);
    const isLoading = ref<boolean>(false);
    const PAGE_SIZE = 20;
    const visibleCount = ref(PAGE_SIZE);
    const recordsContainer = ref<HTMLElement | null>(null);

    const searchQuery = ref<string>("");
    const isAddingNew = ref<boolean>(false);
    const newReasonText = ref<string>("");

    function getExclusionReasons() {
      if (!store.programId) return;
      isLoading.value = true;
      analyzeStore.getProgramExclusionReasons({
        programId: store.programId,
        callbackSuccess: (data: any) => {
          const values = data?.values;
          localItems.value = Array.isArray(values) ? values.map(String) : [];
          isLoading.value = false;
        },
        callbackError: (error: any) => {
          if (import.meta.env.DEV) {
            console.error("** Error on getProgramExclusionReasons: ", error);
          }
          isLoading.value = false;
        },
      });
    }

    // Re-fetch and reset local UI state each time the popup opens for a new request.
    watch(
      () => store.isOpen,
      (open) => {
        if (!open) return;
        searchQuery.value = "";
        isAddingNew.value = false;
        newReasonText.value = "";
        visibleCount.value = PAGE_SIZE;
        getExclusionReasons();
      },
    );

    const itemsList = computed(() => {
      const sorted = [...localItems.value].sort((a, b) => a.localeCompare(b));
      return sorted.filter(
        (item, index, self) =>
          index === self.map((t) => t.toLowerCase()).indexOf(item.toLowerCase()),
      );
    });

    const filteredAllItems = computed<string[]>(() => {
      if (!searchQuery.value.trim()) return itemsList.value;
      const query = searchQuery.value.toLowerCase();
      return itemsList.value.filter((item) => item.toLowerCase().includes(query));
    });

    const filteredItems = computed<string[]>(() =>
      filteredAllItems.value.slice(0, visibleCount.value),
    );
    const hasMore = computed(() => visibleCount.value < filteredAllItems.value.length);

    watch(searchQuery, () => {
      visibleCount.value = PAGE_SIZE;
    });

    function getMoreItems() {
      if (recordsContainer.value) {
        const div = recordsContainer.value;
        const isAtEnd = div.scrollTop >= div.scrollHeight - div.clientHeight - 2;
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

    function toggleAddNew() {
      isAddingNew.value = !isAddingNew.value;
      if (isAddingNew.value) {
        newReasonText.value = "";
      }
    }

    function cancelAddNew() {
      isAddingNew.value = false;
      newReasonText.value = "";
    }

    function applyNewReason() {
      const cleaned = newReasonText.value.trim();
      if (cleaned === "") return; // blank never submits - BR-04
      store.confirm(cleaned);
    }

    function applyExisting(reason: string) {
      store.confirm(reason);
    }

    return {
      store,
      isLoading,
      recordsContainer,
      searchQuery,
      isAddingNew,
      newReasonText,
      filteredItems,
      toggleAddNew,
      cancelAddNew,
      applyNewReason,
      applyExisting,
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
  min-height: 260px;
  width: auto;
  display: flex;
  flex-direction: column;
}
// CalculumModal wraps `modalContent` in its own `.inner-modal` (padding: 16px) on top of the
// card's own 1.5rem padding - a padding neither `.container-buttons` (the Cancel button's row)
// nor the title row goes through, which left content sitting further from the edge than Cancel/
// the close X. Zeroed out here (rather than touching the shared CalculumModal.vue, used by every
// other modal) so every row below aligns on the same edge, using only its own padding (10px 14px)
// for inset.
:deep(.inner-modal) {
  padding: 0;
}
.modal-title-text {
  font-weight: 700;
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
  margin-bottom: 8px;
  &:hover {
    background-color: $color-gray-100;
    cursor: pointer;
  }
}
.no-results {
  color: $color-gray-400;
  font-size: 0.85rem;
  padding: 8px 0;
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
.actions-box {
  display: none;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.text-success {
  color: #28a745;
}
.text-danger {
  color: #dc3545;
}
</style>
