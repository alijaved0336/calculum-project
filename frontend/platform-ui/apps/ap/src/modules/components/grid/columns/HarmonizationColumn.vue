<template>
  <CalculumHarmonizationModal v-if="displayModelForHarmonization" @close="displayModelForHarmonization = false"
    @cancel="displayModelForHarmonization = false" @clickedoutside="displayModelForHarmonization = false"
    @approve="patchData(null, levelSelected)" />
  <td class="td-columns-kendo">


    <Skeleton v-if="programInrecalculation" class="skeletons-bg" :shape="'text'"
      :style="{ width: '100%', height: '25px' }" />

    <div v-else class="div-columns-kendo">
      <span v-if="(dataItem.disabled)" class="text-center">
        -
      </span>
      <span v-else-if="(dataItem.harmonizations)" class="options-cell"
        :style="'float:left; text-align:center; width:150px; font-size: 0.8em; border-radius: 20px; padding: 5px 15px; color: ' + formatData.colorText(dataItem.harmColors) + '; background: ' + dataItem.harmColors"
        @click="showhideTooltip">
        {{ dataItem.harmonizations }}
        <div class="level_harmonization_container">
          <ul class="list-options">
            <li @click="patchData(null, 'spend')">
              <button class="categoryLevelBtn">{{ $t('home.entityCard.negotiation.harmonizationLevelSpend') }} </button>
            </li>
            <li @click="showModalForChangingHarmonization('supplier')">
              <button class="categoryLevelBtn">{{ $t('home.entityCard.negotiation.harmonizationLevelSupplier') }}
              </button>
            </li>
            <li class="divider" @click="showModalForChangingHarmonization('parent')">
              <button class="categoryLevelBtn">{{ $t('home.entityCard.negotiation.harmonizationLevelParent') }} </button>
            </li>
            <li class="d-flex align-items-center justify-content-start justify-content-between"
              @click="patchData(null, null)">
              <span
                class="remove_group_main cursor-pointer d-flex align-items-center">{{ $t('home.entityCard.negotiation.removeLevel') }}</span>
              <iconTrash class="trash_icon" />
            </li>
          </ul>
        </div>
      </span>
      <span v-else class="text-center">
        <span v-if="(groups)" class="options-cell" @click="showhideTooltip">
          <span
            :style="'float:left; text-align:center; width:150px; font-size: 0.8em; border-radius: 20px; padding: 5px 15px; color: #000000; text-transform: capitalize;'"
            :class="dataItem.hasDynamic ? 'button-gray' : null">
            {{ dataItem.hasDynamic ? dataItem.harmonizationLevels : $t('home.entityCard.negotiation.groupPlus') }}
            <div class="level_harmonization_container">
              <ul class="list-options">
                <li @click="patchData(null, 'spend')">
                  <button class="categoryLevelBtn">{{ $t('home.entityCard.negotiation.harmonizationLevelSpend') }}
                  </button>
                </li>
                <li @click="showModalForChangingHarmonization('supplier')">
                  <button class="categoryLevelBtn"
                    :class="dataItem.harmonizationLevels === 'suppliers' ? 'red_text' : null">{{ $t('home.entityCard.negotiation.harmonizationLevelSupplier') }}
                  </button>
                </li>
                <li class="divider" @click="showModalForChangingHarmonization('parent')">
                  <button class="categoryLevelBtn"
                    :class="dataItem.harmonizationLevels === 'parents' ? 'red_text' : null">{{ $t('home.entityCard.negotiation.harmonizationLevelParent') }}
                  </button>
                </li>
                <li v-if="dataItem.hasDynamic"
                  class="d-flex align-items-center justify-content-start justify-content-between"
                  @click="patchData(null, null)">
                  <span
                    class="remove_group_main cursor-pointer d-flex align-items-center">{{ $t('home.entityCard.negotiation.removeLevel') }}</span>
                  <iconTrash class="trash_icon" />
                </li>
              </ul>
            </div>
          </span>
        </span>
        <span v-else> - </span>
      </span>
    </div>
  </td>
</template>
<script lang="ts" scoped>

import { defineComponent, reactive, toRefs } from 'vue'
import { useGlobalFiltersStore } from '@/stores/globalFilters'
import { useAnalyzeStore } from '@/stores/analyze'
import { useToast } from "vue-toastification";
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
import * as formatData from '@/utils/FormatData'
import CalculumHarmonizationModal from '@/modules/components/CalculumHarmonizationModal.vue'
import { Skeleton } from '@progress/kendo-vue-indicators';
import { useAppStore } from '@/stores/app'


export default defineComponent({
  name: 'HarmonizationColumn',
  components: {
    iconTrash,
    CalculumHarmonizationModal,
    Skeleton
  },
  props: {
    dataItem: { type: Object, required: true },
    levelOfGrid: { type: String, required: false, default: 'spends' },
    selectedProgramId: { type: String, required: false, default: '' },
    filter: { type: Object, required: true },
    programInrecalculation: { type: Boolean, required: false, default: false }
  },
  emits: ['update-row-data', 'close-loading', 'show-recalculation', 'show-harmonization-modal', 'filter-harmonization-by-row'],
  setup(props, { emit }) {
    const data = reactive({
      displayModelForHarmonization: false,
      levelSelected: ''
    })
    const globalFiltersStore = useGlobalFiltersStore()
    const analyzeStore = useAnalyzeStore()
    const groups = analyzeStore.getAllGroups.length > 0 ? analyzeStore.getAllGroups.sort((a: any, b: any) => a.paymentTermsWithoutCashDiscountDays - b.paymentTermsWithoutCashDiscountDays) : false
    let filters = {
      telerikFilter: formatData.convertFiltersToREST(props.filter),
      targetProgramUuid: props.selectedProgramId,
      globalFilter: formatData.convertFiltersToREST(globalFiltersStore.getFiltersApplied),
      currencyRate: useAppStore().getCurrencyAmount
    }
    const toast = useToast();

    function showModalForChangingHarmonization(e: any) {
      data.levelSelected = e
      data.displayModelForHarmonization = true
    }

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

    function patchData(harmonizationGroup: any | null, level: string | null) {
      emit('close-loading')
      data.displayModelForHarmonization = false
      let idHarmo
      if (harmonizationGroup) {
        idHarmo = harmonizationGroup['@id'].split('/')
        idHarmo = idHarmo[4]
      } else {
        idHarmo = level
      }
      const changed = {
        key: 'harmonizationGroup',
        value: idHarmo
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
          data.levelSelected = ''
          emit('update-row-data', callbackSuccessData, 'harmonizationGroup')
        },
        callbackError: () => {
          data.levelSelected = ''
          toast.error('ERROR updating data');
        }
      }
      analyzeStore.postProgramSpendConfigurationbyGroups(params)
    }

    return {
      ...toRefs(data),
      showModalForChangingHarmonization,
      showhideTooltip,
      groups,
      patchData,
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
  margin-left: 40px;
  margin-top: 5px;
}

.divider {
  border-bottom: 1px solid #EAECF0 !important;
}


.harmonization_group_item {
  display: flex;
  border-radius: 16px;
  height: 30px !important;
  align-items: center;
  justify-content: center;
  padding: 5px 35px;
  width: 248px;
  border: none;
}

li.harmonization_group_container {
  height: 40px;
}

li.harmonization_group_container:last-child {
  margin-bottom: 12px;
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
}


.trash_icon {
  color: $color-gray-700;
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

.level_harmonization_container {
  display: none;
  flex-direction: column;
  width: 164px;
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
