<template>
<div class="manage-team-container">
  <div class="loader-container" v-if="isLoading"><span class="spinner-border spinner-border-sm"></span></div>
  <div class="header-container"><span>{{ $t('home.analyze.creditRatings.filterCreditRatings') }}</span></div>
  <div class="header-container">
    <input class="form-control" type="text" :placeholder="$t('button.search')" v-model="searchQuery"/>
  </div>
  <div class="selected-container" v-if="currentValue"><span class="selected-label">{{ $t('global.selected') }}</span>
    <div class="selected-item-readonly">
      <Tooltip :anchor-element="'target'" :position="'top'" :open-delay="300"><span :title="currentValue">{{ currentValue }}</span></Tooltip>
    </div>
  </div>
  <div class="records-container">
    <div class="records-div" v-for="item in filteredItems" :key="item" @click="moveTo(item)">
      <div class="select-box">
        <InitialLettersText :text="item"></InitialLettersText>
      </div>
    </div>
  </div>
  <div class="header-container-end" v-if="!isLoading">
    <button class="btn btn-sm outline-secondary-btn font-md btn-clear-action" id="clear-selection" @click="moveTo(null)">{{ $t("home.analyze.commodities.clear") }}</button>
  </div>
</div>
</template>

<script lang="ts">
import { PropType, defineComponent, ref, computed, onMounted } from "vue";
import { ActionFromEditProgram } from "@/modules/components/types";
import InitialLettersText from "@/modules/components/utils/InitialLettersText.vue";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useHomeStore } from "@/stores/home";

export default defineComponent({
  name: "ManageCreditRatingAction",
  components: { InitialLettersText, Tooltip },
  props: {
    currentValue: { type: String, required: false, default: '' },
    option: {
      type: String as PropType<ActionFromEditProgram>,
      required: true,
    },
  },
  emits: ["call-action"],
  setup(props, { emit }) {
    const homeStore = useHomeStore();

    const localItems = ref<string[]>([]);
    const isLoading = ref<boolean>(false);
    const searchQuery = ref<string>("");

    const getRatings = () => {
      isLoading.value = true;

      homeStore.getValuesForCreditRating({
        callbackSuccess: (data: any) => {
          localItems.value = Array.isArray(data["hydra:member"])
            ? data["hydra:member"]
            : [];
          isLoading.value = false;
        },
        callbackError: (error: any) => {
          if (import.meta.env.DEV) console.error("** Error on getValuesForCreditRating:", error);
          isLoading.value = false;
        },
      });
    };

    onMounted(() => {
      getRatings();
    });

    const filteredItems = computed<string[]>(() => {
      const cv = props.currentValue?.toLowerCase();
      const query = searchQuery.value.trim().toLowerCase();
      return localItems.value.filter((item) => {
        if (cv && item.toLowerCase() === cv) return false;
        if (query) return item.toLowerCase().includes(query);
        return true;
      });
    });

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
      isLoading,
      searchQuery,
      filteredItems,
      moveTo,
      callStoreMenuAction,
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
}
.header-container-end {
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  align-items: end;
  justify-content: end;
  gap: 8px;
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
.records-div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 32px;
  &:hover {
    background-color: $color-gray-100;
    cursor: pointer;
  }
}
.select-box {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.class-width {
  width: 100%;
}
</style>
