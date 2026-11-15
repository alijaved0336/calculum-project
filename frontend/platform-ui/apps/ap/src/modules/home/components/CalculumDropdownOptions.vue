<template>
<div class="custom-dropdown d-flex" @blur="open = false" @click.self="open = !open" :style="'width: '+widthDropdownPercent" :tabindex="tabindex" data-testid="active-metrics-dropdown">
  <div class="custom-dropdown-selected" id="metric-dropdown-options" @click="open = !open">
    <div class="d-flex flex-column justify-content-between text-dropdown"><span class="label-topbar">{{ topTitle }}</span>
      <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <div class="title-dropdown-parent"><span class="mr-1" :title="nameSelected"> {{ nameSelected }}</span></div>
      </Tooltip>
    </div>
    <div class="d-flex"><span class="icons-list-dropdown icon-svg-30"></span></div>
  </div>
  <div class="custom-dropdown-items metrics-dropdown-list-section show-scroll" id="custom-dropdown-items-metrics-showing" :class="{ selectHide: !open }" :style="'height: '+dropdownHeight">
    <div class="item-dropdown" v-for="(option, i) of options" :key="'metric-'+i">
      <div class="d-flex align-items-center justify-content-between cursor-pointer" @click="changeElement(option.value,  option.title)" :key="i">
        <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'"> <span class="text-option cursor-pointer" :title="option.title"> {{ option.title }} </span></Tooltip>
        <iconCheck class="check-svg" v-if="option.value === selectedChart">       </iconCheck>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, toRefs, reactive, onMounted, computed } from "vue";

import { Tooltip } from "@progress/kendo-vue-tooltip";
import * as formatData from "@/utils/FormatData";
import { Skeleton } from "@progress/kendo-vue-indicators";
import iconCheck from "@/resources/assets/images/icons/iconCheck.vue";

interface ChartOption {
  title: string;
  value: string;  
}

export default defineComponent({
  name: "CompareDropdownMetrics",
  components: {
    Tooltip,
    Skeleton,
    iconCheck,
  },
  props: {
    listOptions: {
      type: Array as () => ChartOption[],
      required: false,
      default: () => [],
    },
    selectedChart: { type: String, required: true },
    widthDropdownPercent: { type: String, default: "100%" },
    skeletonIsShowing: { type: Boolean, default: false },
    topTitle: { type: String, required: false, default: null }
  },
  emits: ["select-metric-dropdown"],
  setup(props, { emit }) {
    interface HomeOverviewInterface {
      selectedName: string;
      selectedTarget: string;
      options: Array<any>;
      open: boolean;
      tabindex: number;
      dropdownHeight: string;
    }

    const homeOverview = reactive<HomeOverviewInterface>({
      selectedName: "",
      selectedTarget: "",
      options: props.listOptions,
      open: false,
      tabindex: 1,
      dropdownHeight: "auto",
    });

    const nameSelected = computed(() => {
      if (props.listOptions.length > 0) {
        const findTitle = props.listOptions.find(
          (x: any) => x.value === props.selectedChart,
        );
        if (findTitle) {
          return findTitle.title;
        }
        return "";
      }
    });

    function changeElement(metric: any, title: any) {
      formatData.closeMetricOptions();
      emit("select-metric-dropdown", metric, title);
    }

    return {
      ...toRefs(homeOverview),
      changeElement,
      nameSelected,
      iconCheck,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

span.label-topbar {
  font-style: normal;
  font-weight: 400 !important;
  font-size: 12px !important;
  line-height: 18px !important;
  color: $color-gray-400 !important;
  flex: none;
  order: 0;
  flex-grow: 0;
  margin-bottom: unset !important;
}

.info-svg,
.check-svg {
  height: 15px;
}

.check-svg {
  &:hover {
    color: $color-primary-500;
  }
}

.item-dropdown {
  &:hover {
    .check-svg {
      color: $color-primary-500;
    }
  }
}

.selectHide {
  display: none;
}
</style>
