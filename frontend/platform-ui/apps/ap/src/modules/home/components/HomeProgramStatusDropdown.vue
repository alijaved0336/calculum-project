<template>
<div class="custom-dropdown d-flex" v-if="listOptions && listOptions?.length > 1" @blur="open = false" @click.self="open = !open" :class="{'no-program-show' : listOptions?.length === 0  }" :style="'width: '+widthDropdownPercent" :tabindex="tabindex" data-testid="active-program-dropdown">
  <div class="custom-dropdown-selected" id="program-dropdown-options" :class="{ open: open, 'custom-dropdown-items-selected' : isActiveProgram, 'custom-dropdown-items-program' : !isActiveProgram  }" @click="open = !open">
    <div class="d-flex justify-content-between w-100 program-dropdown-container">
      <div class="text-dropdown">
        <!-- span.label-text Select Program-->
        <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'">
          <div class="title-dropdown-parent"><span class="mr-1" :title="selectedName"> {{ selectedName }}        </span></div>
        </Tooltip>
      </div>
      <div class="d-flex"><span class="icons-list-dropdown icon-svg-30"></span></div>
    </div>
  </div>
  <div class="custom-dropdown-items program-dropdown-list-section show-scroll" :class="{ selectHide: !open }" v-if="listOptions?.length > 0" :style="'height: '+dropdownHeight">
    <div class="item-dropdown cursor-pointer" v-for="(option, i) of options" :key="'program-'+i">
      <div class="d-flex justify-content-between program-dropdown-container w-100 cursor-pointer" @click="changeElement(option['@id'])" :key="i">
        <div class="d-flex cursor-pointer" :style="{ width: '10%' }" v-if="option.isActive">
          <iconActiveProgram class="icon-svg-16" v-if="option.isActive"></iconActiveProgram>
        </div>
        <div class="text-dropdown cursor-pointer">
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'">
            <div class="title-dropdown-parent cursor-pointer"><span class="mr-1 text-option cursor-pointer" :title="option.name"> {{ option.name }} </span></div>
          </Tooltip>
        </div>
        <iconCheck class="check-svg cursor-pointer" v-if="selectedProgramUri ===  StringUtils.removeIRI(option['@id'])"></iconCheck>
      </div>
    </div>
  </div>
</div>
<div class="custom-dropdown min-w-72" v-if="skeletonIsShowing">
  <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '90%', height: '28px' }"></Skeleton>
</div>
</template>
  
<script lang="ts">
import { defineComponent, toRefs, reactive, onMounted } from "vue";

import { Tooltip } from "@progress/kendo-vue-tooltip";
import * as formatData from "@/utils/FormatData";
import OverviewCharts from "@/modules/home/overview/components/OverviewCharts.vue";
import OverviewList from "@/modules/home/overview/components/OverviewList.vue";
import { Skeleton } from "@progress/kendo-vue-indicators";
import iconActiveProgram from "@/resources/assets/images/icons/iconActiveProgram.vue";
import iconProgram from "@/resources/assets/images/icons/iconProgram.vue";
import iconCheck from "@/resources/assets/images/icons/iconCheck.vue";
import { StringUtils } from "@/utils";

export default defineComponent({
  name: "HomeProgramStatusDropdown",
  components: {
    iconActiveProgram,
    iconCheck,
    iconProgram,
    OverviewCharts,
    OverviewList,
    Skeleton,
    Tooltip,
  },
  props: {
    listOptions: { type: Array, required: false, default: () => [] },
    selectedProgramUri: { type: String, required: true },
    widthDropdownPercent: { type: String, default: "100%" },
    skeletonIsShowing: { type: Boolean, default: false }
  },
  emits: ['select-program-dropdown'],
  setup(props, { emit }) {


    interface HomeOverviewInterface {
      selected: string,
      selectedName: string,
      selectedTarget: string,
      options: Array<any>,
      open: boolean,
      tabindex: number,
      isActiveProgram: boolean
      dropdownHeight: string
    }

    const homeOverview = reactive<HomeOverviewInterface>({
      selected: props.selectedProgramUri,
      selectedName: '',
      selectedTarget: '',
      options: props.listOptions,
      open: false,
      tabindex: 1,
      isActiveProgram: false,
      dropdownHeight: '500px'
    })


    onMounted(() => {
      if (homeOverview.options?.length > 0) {
        const index = homeOverview.options.findIndex((x: any) => x['@id'] === "/api/analyze/programs/" + props.selectedProgramUri)

        if (index === -1) {
          return
        }

        homeOverview.selectedName = homeOverview.options[index].name
        homeOverview.selectedTarget = homeOverview.options[index].programTarget ?? homeOverview.options[index].target
        homeOverview.isActiveProgram = homeOverview.options[index].isActive

        if (props.listOptions && props.listOptions?.length > 0 && props.listOptions?.length < 15) {
          homeOverview.dropdownHeight = 'auto'
        } else {
          homeOverview.dropdownHeight = '400px'
        }
      }
    })

    
    function changeElement(program: any) {
      formatData.closeProgramOptions()
      emit('select-program-dropdown', program)
      
    }

    function getColor(selectedTarget: string): string {
      switch (selectedTarget) {
        case 'cashFlow':
          return 'cashFlow elements-cashFlow'
        case 'harmonization':
          return 'harmonization elements-harmonization'
        default:
          return 'cashFlow elements-cashFlow'  
      }
    }

    return {
      ...toRefs(homeOverview),
      changeElement,
      getColor,
      StringUtils
    }
  }
})
</script>
  
<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/variables/dimensions";
@import "src/resources/assets/styles/variables/globals";


span.tag-name {
  margin: 0px auto;
  border-radius: 20px;
  width: 32px;
  text-align: center;
  font-size: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  height: 28px;
}

span.tag-name.cashFlow {
  background: $color-green-100;
  color: $color-green-800;

  &.elements-cashFlow {
    &:hover {
      background-color: $color-green-100;
      color: $color-green-800;
    }
  }
}

span.tag-name.harmonization {
  background: $color-orange-100;
  color: $color-orange-700;

  &.elements-harmonization {
    &:hover {
      background: $color-orange-200;
      color: $color-orange-700;
    }
  }
}

.name-program {
  width: 70%;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  flex-wrap: wrap;
  align-items: center;
}



.selectHide {
  display: none;
}

/** Overwrite this css because the dropdown have more than 2 elements */
.text-dropdown {
  width: 100%;
}

.custom-dropdown {
  min-width: 300px !important;
}


.program-dropdown-container {
  align-items: center;
}

.check-svg {
  height: 15px;
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



</style>
  