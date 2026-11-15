<template>
  <div class="p-4">
    <!-- Header -->
    <slot name="header"></slot>
    <div class="row">
      <div class="col-12">
        <!-- Show less items -->
        <template v-if="!isShowMoreActive">
          <div v-for="(item, index) in itemsComputed.slice(0, 10)" :key="index"
            class="checkbox-wrapper rounded-sm mb-1 px-2 py-1 d-flex align-items-center">
            <label class="custom-radio">
              <input v-model="itemSelected" class="input-radio" type="radio" :value="item.value" :checked="item.checked"
                @change="emitCheckedItemsChanged(item)" />
              <span class="radio" :class="{
                'disabled-radio': item.checked,
              }"></span>
              <span class="radio-text">{{
                setLabel(item.value)
              }}
                &nbsp;</span>
            </label>
          </div>
        </template>

        <!-- Show more items -->
        <template v-if="isShowMoreActive">
          <div v-for="(item, index) in itemsComputed" :key="index" class="checkbox-wrapper rounded-sm mb-1 px-2 py-1">
            <label class="custom-radio">
              <input v-model="itemSelected" class="input-radio" type="radio" :value="item.value" :checked="item.checked"
                @change="emitCheckedItemsChanged(item)" />
              <span class="radio" :class="{
                'disabled-radio': item.checked,
              }"></span>
              <span class="radio-text">{{
                setLabel(item.value)
              }}
                &nbsp;</span>
            </label>
          </div>
        </template>
      </div>
    </div>

    <!-- Show more. List of more than 10 items -->
    <div v-if="itemsComputed.length > 10" class="row">
      <div class="col-12">
        <div class="d-flex justify-content-start">
          <button class="btn-text btn-show-more btn-text px-2 py-2.5 w-100 text-left"
            :class="btnShowMoreHovered ? 'bg-gray-100' : 'bg-transparent'" type="button"
            @click="isShowMoreActive = !isShowMoreActive" @mouseover="btnShowMoreHovered = true"
            @mouseleave="btnShowMoreHovered = false">
            <span>{{
              isShowMoreActive ? $t("global.showLess") : $t("global.showMore")
            }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, computed, PropType } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  name: "RadioButtonSelection",

  props: {
    items: {
      type: Array as PropType<any[]>,
      required: false,
      default: () => [],
    },
    field: {
      type: String,
      required: true,
      default: "",
    }
  },
  emits: ["checked-items-changed", "all-items-checked-changed"],
  setup(props, { emit }) {

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    interface Selection {
      checked: boolean;
      key: string | number | null;
      value: string | number | null;
    }

    interface RadioButtonInterface {
      btnShowMoreHovered: boolean;
      isItemContentShowing: boolean;
      isItemContentShowMoreActive: boolean;
      isShowingAllItems: boolean;
      isShowMoreActive: boolean;
      searchText: string;
      somekey: number;
      itemSelected: Selection;
    }

    const data = reactive<RadioButtonInterface>({
      btnShowMoreHovered: false,
      isItemContentShowing: false,
      isItemContentShowMoreActive: false,
      isShowingAllItems: false,
      isShowMoreActive: false,
      searchText: "",
      somekey: new Date().getUTCMilliseconds(),
      itemSelected: {
        checked: false,
        key: null,
        value: null,
      },
    });

    const itemsComputed = computed(() => {
      return props.items.filter(
        (item: any) =>
          item !== null && item.key !== null && item.label !== null && item.value !== "-(empty)-",
      );
    });

    function emitCheckedItemsChanged(item: any) {
      emit("checked-items-changed", item.key);
    }


    function setLabel(value: any) {
      if (props.field === 'isSME') {
        return translate.t(`global.globalFilters.radioButtons.${props.field}Label.${value}`);
      }

      // Handle boolean values
      if (typeof value === 'boolean') {
        switch (value) {
          case true:
            return translate.t(`global.globalFilters.radioButtons.${props.field}.true`);
          case false:
            return translate.t(`global.globalFilters.radioButtons.${props.field}.false`);
          default:
            return '';
        }
      }

      // Handle string values (like "No", "Yes")
      if (typeof value === 'string') {
        return value;
      }

      // Handle other types
      return String(value);
    }

    return {
      ...toRefs(data),
      emitCheckedItemsChanged,
      itemsComputed,
      setLabel
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";

.custom-radio {
  display: flex;
  align-items: center;
  cursor: pointer;

  .input-radio {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;

    // Combine background-color into one rule to avoid repetition
    &:checked+.radio::before,
    .input-radio:checked+.radio::before {
      background-color: $color-primary-600;
    }

    &:checked+.radio::before {
      border: 1px solid $color-primary-600;
    }

    &:checked+.radio {
      border: 1px solid $color-primary-600; // Border color when checked
      background: $color-primary-50;
    }
  }

  .radio {
    position: relative;
    display: inline-block;
    width: 1.1rem;
    height: 1.1rem;
    background: $basewhite;
    border: 1px solid $color-gray-300;
    border-radius: 50%;
    margin-right: 0.5rem;
    transition:
      background-color 0.3s,
      border-color 0.3s;
    box-sizing: border-box;

    &::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 0.4rem; // Reduced size
      height: 0.4rem; // Reduced size
      background-color: transparent;
      border-radius: 50%;
      transition: background-color 0.3s;
    }
  }

  .radio:hover {
    background: $color-primary-100;
    border: 1px solid $color-primary-600;
  }

  .disabled-radio {
    background: $basewhite;
    border: 1px solid $color-gray-300;
  }
}
</style>
