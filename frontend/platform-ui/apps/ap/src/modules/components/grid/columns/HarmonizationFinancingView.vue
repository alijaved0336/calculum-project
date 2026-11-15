<template>
<td :class="columnsLocked ? 'k-grid-content-sticky' : ''" class="text-center">
    <Skeleton 
      v-if="programInrecalculation" 
      class="skeletons-bg" 
      :shape="'text'" 
      :style="{ width: '100%', height: '25px' }"         
    />
    <div 
      v-else
      class="d-flex w-100"     
    >
      <span v-if="field === 'harmonizations'">
        <span
          v-if="dataItem.hasDynamic && dataItem.harmonizationLevels && dataItem.harmonizations === null"
          class="harmonization_item buttons_group_item button-gray"          
        >
          {{ dataItem.harmonizationLevels }}
        </span>
        <span
          v-else-if="
            dataItem.harmonizations"
          :style="
            'float:left; text-align:center; width:140px; font-size: 0.8em; border-radius: 20px; padding: 5px 15px; color: black; background: ' +
            dataItem.harmColors
          ">
           {{ dataItem.harmonizations }}
        </span>      
        <span
          v-else
          class="finan-style"
          :style="'color: black !important;'"
        >
          -
        </span>
      </span>
      <span v-else>
        <tooltip
          :open-delay="100"
          :anchor-element="'target'"
          :position="'top'"
          v-if="
            dataItem.financings">
          <span
            class="finan-style"
            :style="
              'color: black !important; background: ' +
              dataItem.financingColors
            "
            :title="dataItem.financings"
          >
            {{ dataItem.financings }}
          </span>
        </tooltip>
        <tooltip
          :open-delay="100"
          :anchor-element="'target'"
          :position="'top'"
          v-else
        >
          <span
            class="finan-style"
            :style="'color: black !important;'"
            >-</span
          >
        </tooltip>
      </span>
    </div>
  </td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import * as formatData from '@/utils/FormatData'
import { Skeleton } from '@progress/kendo-vue-indicators';

export default defineComponent({
  name: 'HarmonizationFinancingView',
  components: {
    tooltip: Tooltip, Skeleton
  },
  props: {
    dataItem: { type: Object, required: true },
    field: { type: String, required: true },
    columnsLocked: { type: Boolean, required: false, default: false },
    programInrecalculation: { type: Boolean, required: false, default: false }
  },
  setup() {
    return {
      formatData
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.button-gray {
  background: $color-gray-100 !important;
  color: $color-gray-700 !important;
}


.arrow {
  width: 15px;
  height: 15px;
  transform: rotate(90deg);
  margin-left: 10px;
}

.categoryLevelActive {
  border-bottom: 5px solid $color-red;
  button {
    color: $color-red;
  }
}

.categoryLevelBtb {
  background-color: transparent;
  width: 100%;
  outline: none;
  border: none;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  &:hover {
    color: $color-red;
  }
}

ul.list-options > li {
  display: flex;
  align-items: center;
  text-align: center;
}

td.k-grid-content-sticky{
  max-height: 63px !important;
}

td.highlited.highlited--col-2.analyze-table-cell-group {
  border-top: 1px solid #dee2e6;
  text-align: center;
}

.harmonization_item {
  width: 140px !important;
  text-transform: capitalize;
  font-size: 14px;
}

.level_harmonization_container {
  width: 130px;
  height: auto;
  background: $color-white;
  border-radius: 10px;
  position: relative;
  top: 100px;
  left: 15px;
  z-index: 8699;
  transition: all 0.3s ease-in;
  box-shadow: 0px 0px 8px 0px rgba(34, 60, 80, 0.2);
  ul.list-options {
    z-index: 90;
    li {
      padding: 10px;
    }
  }
}
.spend_list_options {
  position: absolute;
  width: 290px;
  height: auto;
  background: $color-white;
  border-radius: 10px;
  top: 1px;
  left: 139px;
  z-index: 99;
  transition: all 0.3s ease-in;
  box-shadow: 0px 0px 8px 0px rgba(34, 60, 80, 0.2);
  // li {
  //   &:hover {
  //     button {
  //       color: $color-white !important;
  //     }
  //   }
  // }
}

.divider {
  border-bottom: 1px solid #eaecf0 !important;
}

.harmonization_group_item {
  display: flex;
  background-color: $color-blue;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  padding: 2px 10px;
  width: 248px;
  border: none;
}

.term_group_title,
.remove_group {
  color: $color-gray-500;
  font-weight: 500;
  white-space: nowrap;
}

.remove_group {
  font-size: 12px;

  &:hover {
    cursor: pointer;
  }
}
</style>
