<template>
  <div class="p-4">
    <!-- Header -->
    <slot name="header"></slot>

    <div class="row">
      <div class="col-12">
        <div class="d-flex mb-2">
          <label for="search" class="mr-2"><i class="fa-brands fa-sistrix"></i></label>
          <input id="search" v-model="searchText" type="text" name="search" autocomplete="new-password"
            class="w-96 bg-transparent border-bottom border-t-0 border-r-0 border-l-0" />
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">

        <!-- Check all items -->
        <div v-if="hasMoreThanOneItem" class="checkbox-wrapper rounded-sm mb-1 py-1">
          <kcheckbox :checked="checkAllSelectorGetter" :default-checked="checkAllSelectorGetter"
            :label="$t('global.globalFilters.checkAll')" :rounded="'medium'" :size="'medium'"
            @change="checkAllController" />
        </div>

        <!-- Show less items -->
        <template v-if="!isShowMoreActive">
          <div v-for="(item, index) in itemsComputed.slice(0, 10)" :key="index"
            class="checkbox-wrapper rounded-sm mb-1 py-1">
            <kcheckbox :checked="item.checked" :default-checked="item.checked" :label="isEmptyOption(item) ? $t('global.globalFilters.emptyValue') : optionLabel(item)" :rounded="'medium'"
              :size="'medium'" @change="$emit('checked-items-changed', item.key)" />
          </div>
        </template>

        <!-- Show more items -->
        <template v-if="isShowMoreActive">
          <div v-for="(item, index) in itemsComputed" :key="index" class="checkbox-wrapper rounded-sm mb-1 py-1">
            <kcheckbox :checked="item.checked" :default-checked="item.checked" :label="isEmptyOption(item) ? $t('global.globalFilters.emptyValue') : optionLabel(item)" :rounded="'medium'"
              :size="'medium'" @change="$emit('checked-items-changed', item.key)" />
          </div>
        </template>
      </div>
    </div>

    <!-- Show more. List of more than 10 items -->
    <div v-if="itemsComputed.length > 10" class="row">
      <div class="col-12">
        <div class="d-flex justify-content-start">
          <button :class="btnShowMoreHovered ? 'bg-gray-100' : 'bg-transparent'"
            class="btn-text btn-show-more btn-text px-2 py-2.5 w-100 text-left" type="button"
            @click="isShowMoreActive = !isShowMoreActive" @mouseover="btnShowMoreHovered = true"
            @mouseleave="btnShowMoreHovered = false">
            <span>{{ isShowMoreActive ? $t("global.showLess") : $t("global.showMore") }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Checkbox } from "@progress/kendo-vue-inputs";
import type { CheckboxItem } from "@/types";
import { defineComponent, reactive, toRefs, computed, PropType } from 'vue';
// Imported from their own modules rather than the `@/utils` barrel: the barrel pulls in
// `@/modules/paymentTermsAndTermsStrategies/utils`, whose cycle back through the app leaves
// `NumberUtils` undefined when this component is mounted on its own in a unit test.
import StringUtils from '@/utils/StringUtils';
import { GLOBAL_FILTER_EMPTY_VALUE, sortEmptyValueFirst } from '@/utils/globalFilterEmptyValue';

export default defineComponent({
  name: "MultipleCheckboxes",
  components: {
    kcheckbox: Checkbox,
  },
  props: {
    items: {
      type: Object as PropType<CheckboxItem[]>,
      required: false,
      default: []
    },
    options: {
      type: Object,
      required: false,
      default: {
        isLevelSelectorVisible: false,
        isAllItemsChecked: false
      },      
    },
    isBoxFilter: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  emits: ["checked-items-changed", "all-items-checked-changed"],
  setup(props, { emit }) {
    interface MultipleCheckboxes {
      btnShowMoreHovered: boolean;
      checkAllSelector: boolean
      isItemContentShowing: boolean;
      isItemContentShowMoreActive: boolean;
      isShowingAllItems: boolean;
      isShowMoreActive: boolean;
      searchText: string;
      somekey: number,
    }

    const data = reactive<MultipleCheckboxes>({
      btnShowMoreHovered: false,
      checkAllSelector: false,
      isItemContentShowing: false,
      isItemContentShowMoreActive: false,
      isShowingAllItems: false,
      isShowMoreActive: false,
      searchText: "",
      somekey: new Date().getUTCMilliseconds(),
    });

    /**
     * computes if there are more than 1 item
     * if one item than check all is hidden
     */
    const hasMoreThanOneItem = computed(() => {
      return itemsComputed.value.length > 1
    })

    /**
     * Check if all items are checked
     */
    const checkAllSelectorGetter = computed(() => {
      return props.items.every((item: any) => item.checked);
    })

    const itemsComputed = computed(() => {
      if (!StringUtils.isEmpty(data.searchText)) {
        // If label is defined, then search by label. This is a case insensitive search
        // The marker stays out of search results on purpose: typing in the box is a search
        // for a real value, and the marker's own text is the sentinel, not the label the
        // user sees. Clearing the search brings the "no value" option back at the top.
        return props.items.filter((i) => i.value ? i.value.toLowerCase().includes(data.searchText.toLowerCase()) : false)
          .filter((i) => i.value !== GLOBAL_FILTER_EMPTY_VALUE);
      }

      /**
       * Clean up items. It checks if the item.key or item.label is null.
       * If so, it does not return this item.
       * The "-(empty)-" marker is kept and hoisted to the top (AB#20086).
       */
      return sortEmptyValueFirst(
        props.items.filter((item: any) => item !== null && item.key !== null && item.label !== null)
      );
    });

    /**
     * True for the back end's null marker, which is rendered as a translated
     * "no value" option instead of the raw sentinel (AB#20086).
     */
    const isEmptyOption = (item: any) => item?.value === GLOBAL_FILTER_EMPTY_VALUE;

    /** Label for a normal option; box filters read as "Box 3" rather than "3". */
    const optionLabel = (item: any) =>
      props.isBoxFilter ? 'Box ' + item.value : item.value;

    const getIsAllCheckedLabelComputed = computed(() => {
      return isAllItemsChecked.value ? "Uncheck All" : "Check All"; // todo use dictionary
    });

    /**
     * Check all items
     */
    const isAllItemsChecked = computed<boolean>({
      get: () => {
        return props.options.isAllItemsChecked;
      },
      set: (value) => {
        emit("all-items-checked-changed", value);
      }
    });


    const checkAllController = () => {
      if (checkAllSelectorGetter.value) {
        data.checkAllSelector = false
        checkAllHelper(data.checkAllSelector)
      } else {
        data.checkAllSelector = true
        checkAllHelper(data.checkAllSelector)
      }
      //call an event for all items checked
      emit("all-items-checked-changed", data.checkAllSelector)
    }

    const checkAllHelper = (checkAll: boolean) => {
      if (checkAll) {
        props.items.forEach((item: any) => {
          item.checked = true
        })
      } else {
        props.items.forEach((item: any) => {
          item.checked = false
        })
      }
    }

    return {
      ...toRefs(data),
      checkAllController,
      checkAllHelper,
      checkAllSelectorGetter,
      getIsAllCheckedLabelComputed,
      hasMoreThanOneItem,
      isAllItemsChecked,
      isEmptyOption,
      itemsComputed,
      optionLabel,
    };
  },
});
</script>