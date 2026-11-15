<template>
  <div
    v-if="!isLoading"
    class="custom-dropdown d-flex"
    :class="[
      'custom-dropdown-' + id,
      { disabled: disabled },
      { 'container-with-label-height': label },
      { 'container-with-no-label-height': !label },
    ]"
    :style="'width: ' + dropdownWidth"
    @click="!disabled && (showListDropdown = !showListDropdown)"
  >
    <!-- Disabled state should prevent interaction -->
    <div class="custom-dropdown-selected">
      <div class="d-flex align-items-center justify-content-between w-100">
        <div class="text-dropdown">
          <!-- Optional label -->
          <span
            v-if="label"
            class="label-text"
            >{{ label }}</span
          >
          <Tooltip
            v-if="tooltipEnabled"
            :open-delay="100"
            :anchor-element="'target'"
            :position="'bottom'"
          >
            <div class="currently-selected-item">
              <span
                class="mr-1"
                :title="currentlySelected"
                >{{ nameSelected }}</span
              >
            </div>
          </Tooltip>

          <div
            v-else
            class="currently-selected-item"
          >
            <span
              class="mr-1"
              :title="currentlySelected"
              >{{ nameSelected }}</span
            >
          </div>
        </div>
        <div class="d-flex">
          <span class="icons-list-dropdown icon-svg-30"></span>
        </div>
      </div>
    </div>

    <!-- Show dropdown list, even if disabled -->
    <div
      v-if="listComputed?.length > 0"
      class="custom-dropdown-items show-scroll"
      :class="{ selectHide: !showListDropdown }"
      :style="'height: ' + dropdownHeight"
    >
      <div
        v-for="(option, i) of listComputed"
        :key="'item-' + i"
        class="item-dropdown cursor-pointer"
        :class="{ disabledOption: disabled }"
        @click.stop="!disabled && selectedElement(option)"
      >
        <div class="d-flex align-items-center justify-content-between w-100">
          <div
            v-if="option.isActive"
            class="d-flex"
            :style="{ width: '10%' }"
          >
            <iconActiveProgram
              v-if="option.isActive"
              class="icon-svg-16"
            ></iconActiveProgram>
          </div>

          <div class="text-dropdown">
            <Tooltip
              v-if="tooltipEnabled"
              :open-delay="100"
              :anchor-element="'target'"
              :position="'bottom'"
            >
              <div class="title-dropdown-parent">
                <span
                  class="mr-1 text-option"
                  :title="String(option.value)"
                >
                  {{ option.value }}
                </span>
              </div>
            </Tooltip>
            <div
              v-else
              class="title-dropdown-parent"
            >
              <span
                class="mr-1 text-option"
                :title="String(option.value)"
              >
                {{ option.value }}
              </span>
            </div>
          </div>
          <iconCheck
            v-if="currentlySelectedItem === option.key"
            class="check-svg"
          ></iconCheck>
        </div>
      </div>
    </div>
  </div>
  <div v-else>
    <SkeletonRectangle
      v-if="isLoading"
      :size="'sm'"
      :width-percent-as-string="dropdownWidth"
    >
    </SkeletonRectangle>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  computed,
  toRefs,
  reactive,
  onMounted,
  onUnmounted,
  watch,
} from "vue";

import { DropdownOption, KeyValue } from "@/types";

import { Tooltip } from "@progress/kendo-vue-tooltip";
import iconActiveProgram from "@/resources/assets/images/icons/iconActiveProgram.vue";
import iconCheck from "@/resources/assets/images/icons/iconCheck.vue";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";

export default defineComponent({
  name: "Dropdown",
  components: {
    iconActiveProgram,
    iconCheck,
    SkeletonRectangle,
    Tooltip,
  },
  props: {
    disabled: { type: Boolean, default: false },
    currentOptionSelected: { type: [String, Number], default: null },
    dataList: {
      type: Array as () => Array<DropdownOption>,
      required: true,
    },
    dropdownWidth: { type: String, default: "100%" },
    id: { type: [Number, String], required: true },
    label: { type: String, required: false, default: null },
    skeletonShowing: { type: Boolean, default: false },
    tooltipEnabled: { type: Boolean, default: false },
    isLoading: { type: Boolean, default: false },
  },
  emits: ["selected-item"],
  setup(props, { emit }) {
    interface DropdownInterface {
      currentlySelectedItem: string | number;
      dropdownHeight: string;
      list: Array<any>;
      showListDropdown: boolean;
    }

    const dropdown = reactive<DropdownInterface>({
      currentlySelectedItem: props.currentOptionSelected,
      dropdownHeight: "500px",
      list: props.dataList,
      showListDropdown: false,
    });

    watch(
      () => props.currentOptionSelected,
      (newVal) => {
        dropdown.currentlySelectedItem = newVal;
      },
    );

    const listComputed = computed(() => {
      return props.dataList;
    });

    function selectedElement(selectedOption: KeyValue<string, string>) {
      dropdown.showListDropdown = false;
      dropdown.currentlySelectedItem = selectedOption.key;
      emit("selected-item", selectedOption);
    }

    const currentlySelected = computed(() => {
      return props.currentOptionSelected ?? "";
    });

    function handleClickOutside(event: any) {
      // Construct the dynamic class based on the `id` prop
      const dropdownClass = `custom-dropdown-${props.id}`;
      // Find the dropdown element with the specific class
      const dropdownElement = document.querySelector(`.${dropdownClass}`);
      if (dropdownElement && !dropdownElement.contains(event.target)) {
        dropdown.showListDropdown = false;
      }
    }

    onMounted(() => {
      if (
        props.dataList &&
        props.dataList?.length > 0 &&
        props.dataList?.length < 15
      ) {
        dropdown.dropdownHeight = "auto";
      } else {
        dropdown.dropdownHeight = "400px";
      }

      document.body.addEventListener("click", handleClickOutside);
    });

    onUnmounted(() => {
      document.body.removeEventListener("click", handleClickOutside);
    });

    const nameSelected = computed(() => {
      // Check if dataList is not empty
      if (props.dataList.length > 0) {
        // Determine the type of the key in the first item
        const keyType = typeof props.dataList[0].key;

        // Find the matching item based on the type of key
        const findTitle = props.dataList.find((x: any) => {
          if (keyType === "number") {
            // Compare as numbers
            return Number(x.key) === Number(props.currentOptionSelected);
          } else {
            // Compare as strings
            return String(x.key) === String(props.currentOptionSelected);
          }
        });

        // Return the value of the found item or an empty string if not found
        return findTitle ? findTitle.value : "";
      }

      // Return an empty string if dataList is empty
      return "";
    });

    return {
      ...toRefs(dropdown),
      currentlySelected,
      listComputed,
      nameSelected,
      selectedElement,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors";

.selectHide {
  display: none;
}

.item-dropdown {
  &:hover {
    .check-svg {
      color: $color-primary-500;
    }
  }
}

.label-text {
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 18px;
  color: #98a2b3;
  flex: none;
  order: 0;
  flex-grow: 0;
}

.custom-dropdown.disabled {
  opacity: 0.5; /* Grays out the dropdown */
  pointer-events: none; /* Disables interactions */
}

.item-dropdown.disabledOption {
  opacity: 0.5; /* Grays out the dropdown options */
}
</style>
