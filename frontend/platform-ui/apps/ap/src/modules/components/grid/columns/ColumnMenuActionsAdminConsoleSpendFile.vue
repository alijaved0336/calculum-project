<template>
  <div class="options-edit d-flex flex-column">

    <div class="tohide">
      <GridColumnMenuSort :column="column" :sortable="sortable" :sort="sort" @closemenu="closeMenu" />
    </div>

    <span class="option-edit tooltip-main-options options-cell" :size="'large'" :fill-mode="'outline'"
      @click="onClick('recalculate')">
      {{ $t('global.recalculate') }}
    </span>
  </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from 'vue'

import * as formatData from '@/utils/FormatData'

// Kendo
import { GridColumnMenuSort } from '@progress/kendo-vue-grid';

// Types
import type { SortDescriptor } from '@progress/kendo-data-query'
import type { GridColumnMenuColumnProps } from '@progress/kendo-vue-grid/dist/npm/interfaces/GridColumnMenuColumnProps'

export default defineComponent({
  name: 'ColumnMenuActionsAdminConsoleSpendFile',
  components: {
    GridColumnMenuSort,
  },
  props: {
    column: { type: Object as PropType<GridColumnMenuColumnProps>, required: true },
    sort: { type: Object as PropType<SortDescriptor[]>, default: [] },
    sortable: { type: Boolean },
  },
  emits: [
    'action-click',
    'closemenu'
  ],
  setup(props, { emit }) {
    const showhideTooltip = (e: any) => {
      if (e.currentTarget.classList.contains('active')) {
        e.currentTarget.classList.remove('active')
      } else {
        const options: any | null = document.querySelectorAll('.options-cell')
        for (const element of options) {
          element.classList.remove('active')
        }
        e.currentTarget.classList.add('active')
      }
    }

    // Send action to main view
    function onClick(action: "recalculate") {
      emit("action-click", action)
    }

    function closeMenu() {
      emit('closemenu');
    }

    return {
      closeMenu,
      formatData,
      onClick,
      showhideTooltip,
    }
  }
})
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.tohide {
  height: .5px;
  overflow: hidden;
}

.options-edit {
  width: 240px;
  height: auto;
  background: #ffffff;
  border-radius: 10px;
  transition: all 0.3s ease-in;
  box-shadow: 0px 0px 8px 0px rgb(34 60 80 / 20%);

  span.option-edit {
    font-style: normal;
    font-weight: 400;
    font-size: 16px !important;
    padding: 10px 14px;
    color: $color-gray-600;

    &:hover {
      color: $color-gray-900;
      background: $color-gray-50;
    }
  }

}

.moderate-btn {
  background: $color-success-50 !important;
  color: $color-success-500 !important;
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
}

.assertive-btn {
  background: $color-rose-50 !important;
  color: $color-rose-700 !important;
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
}

.conservative-btn {
  background: $color-orange-dark-50 !important;
  color: $color-orange-700 !important;
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
}

.approach_levels {
  display: none;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  width: 225px !important;
  top: 40px !important;
  left: 1px !important;
}

.arrow {
  width: 15px;
  height: 15px;
  transform: rotate(90deg);
  margin-top: 5px;
}


.tooltip-main-options {
  width: 100% !important;
  margin: 0px 0px;
  position: relative;
}


.analize-harmonization-all {
  width: 100% !important;
  margin: 0px 0px;
}

.analize-financing-all {
  width: 100% !important;
  margin: 0px 0px;
}

.analize-exclude-all {
  width: 100% !important;
  margin: 0px 0px;
}

.analize-approach-all {
  width: 100% !important;
  margin: 0px 0px;
}

button.btn.btn-icon.link--icon {
  width: 50px;
}

.categoryLevelBtn {
  background-color: transparent !important;
  width: 100% !important;
  outline: none !important;
  border: none !important;
  font-size: 16px !important;
  color: $color-gray-600;
  display: flex !important;
}

.divider {
  border-bottom: 1px solid #EAECF0 !important;
}

li.financing_group_container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  // margin: 6px 0px !important;        
}


.include_exclude-btn {
  align-items: center;
}

.level_financing_container {
  display: none;
  flex-direction: column;
  width: 296px;
  height: auto;
  background: #ffffff;
  border-radius: 10px;
  position: absolute;
  left: 14.9rem !important;
  top: 0 !important;
  z-index: 96;
  transition: all 0.3s ease-in;
  box-shadow: 0px 0px 8px 0px rgb(34 60 80 / 20%);
}

.level_harmonization_container {
  display: none;
  flex-direction: column;
  width: 139px;
  height: auto;
  background: #ffffff;
  border-radius: 10px;
  position: absolute;
  top: 0 !important;
  left: 14.9rem !important;
  z-index: 96;
  transition: all 0.3s ease-in;
  box-shadow: 0px 0px 8px 0px rgb(34 60 80 / 20%);
}

.term_group_section {
  padding: 10px 14px;
}

ul.list-options {
  width: 100%;
  z-index: 90;

  li.option-level-1 {
    font-style: normal;
    font-weight: 400;
    font-size: 16px;
    margin: 12px 0px;
    padding: 0px 14px;
    color: $color-gray-600;

    // &:hover {
    //   color: $color-gray-900;
    //   background: $color-gray-50;
    // }
  }

  li.option-level-2 {
    font-style: normal;
    font-weight: 400;
    font-size: 16px;
    padding: 10px 14px;
    color: $color-gray-600;

    &:hover {
      color: $color-gray-900;
      background: $color-gray-50;
    }
  }

  li:first-child {
    &:hover {
      .spend_list_options {
        display: block;
      }
    }
  }
}

li.dynamic_badge_li {
  .dynamic_badge {
    background: $color-gray-100 !important;
    color: $color-gray-700 !important;
  }

  &:hover {
    .dynamic_badge {
      color: $color-gray-700 !important;
    }
  }
}

li.harmonization_group_container,
.dynamic_badge_li {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 12px 0px !important;
}


.red_text {
  color: $color-red !important;
}

.spend_list_options {
  display: none;
  position: absolute;
  width: 296px;
  height: auto;
  background: $color-white;
  border-radius: 10px;
  top: 1px;
  left: 8.7rem;
  z-index: 99;
  transition: all 0.3s ease-in;
  box-shadow: 0px 0px 8px 0px rgba(34, 60, 80, 0.2);
}

.trash_icon {
  color: $color-gray-700;
}

.term_group_title {
  background: transparent !important;
  color: $color-gray-700;
  font-style: normal;
  font-weight: 500;
  font-size: 16px;
}

.remove_group {
  background: transparent !important;
  color: $color-gray-500;
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
}

.remove_group_main {
  background: transparent !important;
  color: $color-gray-400;
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
}
</style>
