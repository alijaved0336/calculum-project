<template>
  <td class="td-columns-kendo">
    <Skeleton v-if="programInrecalculation" class="skeletons-bg" :shape="'text'"
      :style="{ width: '100%', height: '25px' }" />

    <div v-else class="div-columns-kendo">
      <span v-if="(dataItem.disabled)" class="text-center">
        -
      </span>
      <tooltip v-else-if="dataItem.financings" :open-delay="100" :anchor-element="'target'" :position="'top'">
        <span class="options-cell finan-style" :title="dataItem.financings"
          :style="'float:left; text-align:center; width:150px; font-size: 0.8em; border-radius: 20px; padding: 5px 15px; color: ' + formatData.colorText(dataItem.financingColors) + '; text-transform: capitalize; background: ' + dataItem.financingColors"
          @click="showhideTooltip">
          {{ dataItem.financings }}
          <div class="level_financing_container">
            <ul class="list-options">
              <li class="term_group_section d-flex align-items-baseline justify-content-between"><span
                  class="term_group_title">{{ $t('home.entityCard.negotiation.termGroup') }}</span></li>
              <li v-for="groupF in (groupsFinan || [])" :key="groupF.name" class="financing_group_container">
                <button class="buttons_group_item"
                  :style="'color: ' + formatData.colorText(groupF.color) + '; background: ' + groupF.color + '; --color: ' + formatData.colorText(groupF.color)"
                  @click="patchData(groupF)">{{ groupF.name }}</button>
              </li>
              <li v-if="removeGroup"
                class="d-flex align-items-center justify-content-start remove_group_container justify-content-between"
                @click="patchData(null)">

                <span class="remove_group d-flex align-items-center">{{ $t('home.entityCard.negotiation.removeGroup') }}
                </span>
                <iconTrash class="trash_icon"></iconTrash>
              </li>
            </ul>
          </div>
        </span>
      </tooltip>
      <tooltip v-else :open-delay="100" :anchor-element="'target'" :position="'top'">
        <span v-if="groupsFinan" class="options-cell" @click="showhideTooltip">
          <span
            :style="'float:left; text-align:center; width:150px; font-size: 0.8em; border-radius: 20px; padding: 5px 15px; color: ' + formatData.colorText(dataItem.financingColors) + '; text-transform: capitalize;'">
            {{ $t('home.entityCard.negotiation.groupPlus') }}
          </span>
          <div class="level_financing_container">
            <ul class="list-options">
              <li class="term_group_section d-flex align-items-baseline justify-content-between"><span
                  class="term_group_title">{{ $t('home.entityCard.negotiation.termGroup') }}</span></li>
              <li v-for="groupF in (groupsFinan || [])" :key="groupF.name" class="financing_group_container">
                <button class="buttons_group_item"
                  :style="'color: ' + formatData.colorText(groupF.color) + '; background: ' + groupF.color + '; --color: ' + formatData.colorText(groupF.color)"
                  @click="patchData(groupF)">{{ groupF.name }}</button>
              </li>
            </ul>
          </div>
        </span>
        <span v-else> - </span>
      </tooltip>
    </div>
  </td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useAnalyzeStore } from '@/stores/analyze'
import { useToast } from "vue-toastification";
import { useAppStore } from '@/stores/app'

import { Tooltip } from '@progress/kendo-vue-tooltip'
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
import * as formatData from '@/utils/FormatData'
import { Skeleton } from '@progress/kendo-vue-indicators';


export default defineComponent({
  name: 'FinancingColumn',
  components: {
    iconTrash,
    tooltip: Tooltip,
    Skeleton
  },
  props: {
    dataItem: { type: Object, required: true },
    removeGroup: { type: Boolean, required: false, default: true },
    levelOfGrid: { type: String, required: false, default: 'spends' },
    selectedProgramId: { type: String, required: false, default: '' },
    filter: { type: Object, required: true },
    programInrecalculation: { type: Boolean, required: false, default: false }
  },
  emits: ['update-row-data', 'close-loading', 'show-recalculation', 'show-harmonization-modal', 'filter-financing-by-row'],
  setup(props, { emit }) {
    const globalFiltersStore = useGlobalFiltersStore()
    const analyzeStore = useAnalyzeStore()
    const groupsFinan = analyzeStore.getAllFinancing.length > 0 ? analyzeStore.getAllFinancing : false as any
    const toast = useToast()

    let filters = {
      telerikFilter: formatData.convertFiltersToREST(props.filter),
      targetProgramUuid: props.selectedProgramId,
      globalFilter: formatData.convertFiltersToREST(globalFiltersStore.getFiltersApplied),
      currencyRate: useAppStore().getCurrencyAmount
    }

    const showhideTooltip = (e: any) => {
      if (e.currentTarget.classList.contains('active')) {
        e.currentTarget.classList.remove('active')
      } else {
        const options: any | null = document.querySelectorAll('.options-cell')
        for (const element of options) {
          element.classList.remove('active')
          element.classList.remove('fullname')
        }
        e.currentTarget.classList.remove('fullname')
        e.currentTarget.classList.add('active')
      }
    }

    function patchData(financingGroup: any | null) {
      emit('close-loading')
      let idFinan
      if (financingGroup) {
        idFinan = financingGroup['@id'].split('/')
        idFinan = idFinan[4]
      } else {
        idFinan = null
      }
      const changed = {
        key: 'financingGroup',
        value: idFinan
      }
      const uuids = [props.dataItem.uuid]
      const params = {
        program: props.selectedProgramId,
        changed,
        uuids,
        filters,
        level: props.levelOfGrid,
        all: false,
        callbackSuccess: (callbackSuccessData: any) => {
          emit('update-row-data', callbackSuccessData, 'financingGroup')
        },
        callbackError: () => {
          toast.error('ERROR updating data');
        }
      }
      analyzeStore.postProgramSpendConfigurationbyGroups(params)
    }

    return {
      showhideTooltip,
      groupsFinan,
      patchData,
      formatData
    }
  }
})
</script>
<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.arrow {
  width: 15px;
  height: 15px;
  transform: rotate(90deg);
  margin-left: 10px;
}

.divider {
  border-bottom: 1px solid #EAECF0 !important;
}

li.financing_group_container {
  height: 40px;
}

li.financing_group_container:last-child {
  margin-bottom: 12px;
}

li.dynamic_badge_li {
  &:hover {
    .dynamic_badge {
      color: $color-white !important;
    }
  }
}

.trash_icon {
  color: $color-gray-700;
}

li.financing_group_container,
.dynamic_badge_li {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.remove_group {
  background: transparent !important;
  color: $color-gray-400;
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
}

.term_group_title {
  background: transparent !important;
  color: $color-gray-700;
  font-style: normal;
  font-weight: 500;
  font-size: 16px;
}

.categoryLevelBtn {
  background-color: transparent !important;
  width: 100% !important;
  outline: none !important;
  border: none !important;
  font-size: 1.1rem !important;
  display: flex !important;
}

ul.list-options {
  li:first-child {
    &:hover {
      .arrow {
        color: $color-red;
      }

      .spend_list_options {
        display: block;
      }
    }
  }
}

.red_text {
  color: $color-red !important;
}

.spend_list_options {
  display: none;
  position: absolute;
  width: 290px;
  height: auto;
  background: $color-white;
  border-radius: 10px;
  top: 1px;
  left: 165px;
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

.tooltip-options {
  left: 155px !important;
}

.level_financing_container {
  display: none;
  flex-direction: column;
  width: 290px;
  height: auto;
  background: $color-white;
  border-radius: 10px;
  position: absolute;
  top: 1px;
  left: 155px;
  z-index: 96;
  transition: all 0.3s ease-in;
  box-shadow: 0px 0px 8px 0px rgba(34, 60, 80, 0.2);

  ul.list-options {
    z-index: 90;

    li {
      padding: 10px;
    }
  }
}

td.highlited.highlited--col-2.analyze-table-cell-group {
  border-top: 1px solid #dee2e6;
  text-align: center;
}
</style>
