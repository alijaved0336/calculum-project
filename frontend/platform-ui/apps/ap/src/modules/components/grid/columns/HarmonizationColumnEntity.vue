<template>
  <td class="td-columns-kendo">
    <div class="div-columns-kendo">
      <span v-if="(dataItem.harmonizationGroup['@id'])"
          class="options-cell-no-cursor" :style="'float:left; text-align:center; width:150px; font-size: 0.8em; border-radius: 20px; padding: 5px 15px; color: '+formatData.colorText(dataItem.harmonizationGroup.color)+'; background: '+dataItem.harmonizationGroup.color"
          @click="showhideTooltip">
          {{ dataItem.harmonizationGroup.name }}
       
      </span>
      <span v-else class="text-center">
          <span v-if="(groups)" class="options-cell-no-cursor"  @click="showhideTooltip">
              <span
              :style="'float:left; text-align:center; width:150px; font-size: 0.8em; border-radius: 20px; padding: 5px 15px; color: #000000; text-transform: capitalize;'" :class="dataItem.hasDynamicHarmonization ? 'button-gray' : null ">
              {{ dataItem.hasDynamicHarmonization ? dataItem.harmonizationLevel : '-' }}             
              </span>
          </span>
          <span v-else > - </span>
      </span>
    </div>
  </td>
</template>
<script lang="ts" scoped>

import { defineComponent } from 'vue'
import { useAnalyzeStore } from '@/stores/analyze'
import { useToast } from "vue-toastification";
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
import * as formatData from '@/utils/FormatData'


export default defineComponent({
  name: 'HarmonizationColumn',
  components: {
    iconTrash
  },
  props: {
    dataItem: { type: Object, required: true },
    editableHarmonization: { type: Boolean, default: true },
    levelOfGrid: { type: String, required: false, default: 'spends' },
  },
  emits: ['update-row-data', 'close-loading', 'show-recalculation', 'show-harmonization-modal','filter-harmonization-by-row'],
  setup(props, { emit }) {
    const analyzeStore = useAnalyzeStore()
    const toast = useToast()
    
    const groups = analyzeStore.getAllGroups.length > 0 ? analyzeStore.getAllGroups.sort((a: any, b: any) => a.paymentTermsWithoutCashDiscountDays - b.paymentTermsWithoutCashDiscountDays) : false


    function showModalForChangingHarmonization(e: any) {

      if (props.levelOfGrid === 'suppliers') {        
        emit('show-harmonization-modal', e, props.dataItem.providerUuid, null)      
      }
      else if (props.levelOfGrid === 'parents') {        
        emit('show-harmonization-modal', e, props.dataItem.providerUuid, props.dataItem.entityType)      
      } else {        
        emit('show-harmonization-modal', e, props.dataItem.configUuid, null)      
      }      
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
      if (props.levelOfGrid === 'suppliers') {
        emit('filter-harmonization-by-row', harmonizationGroup, level, props.dataItem.providerUuid, null)      
      }
      else if (props.levelOfGrid === 'parents') {
        emit('filter-harmonization-by-row', harmonizationGroup, level, props.dataItem.providerUuid, props.dataItem.entityType)      
      }      
      else {
        emit('close-loading')
        let idHarmo
        if (harmonizationGroup) {
          idHarmo = harmonizationGroup['@id'].split('/')
          idHarmo = idHarmo[4]
        } else {
          idHarmo = level
        }
        const idProgram = props.dataItem.programUuid.split('/')
        const idRow = props.dataItem.configUuid.split('/')
        const changed = {
          key: 'harmonizationGroup',
          value: idHarmo
        }
        const uuids = [idRow[4]]
        const params = {
          program: idProgram[4],
          changed,
          uuids,
          callbackSuccess: (callbackSuccessData: any) => {            
            emit('close-loading')
            emit('update-row-data', callbackSuccessData, 'harmonizationGroup')
          },
          callbackError: () => {
            emit('close-loading')
            toast.error('ERROR updating data')
          }
        }
        analyzeStore.postProgramSpendConfigurationbyGroups(params)
      }
    }
    
    return {
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

.divider{
  border-bottom: 1px solid #EAECF0 !important;
}


.harmonization_group_item{
  display: flex;
  border-radius: 16px;
  height: 30px !important;
  align-items:center;
  justify-content:center;
  padding: 5px 35px;
  width: 248px;
  border: none;
}

li.harmonization_group_container{
  height: 40px;
}

li.harmonization_group_container:last-child{
  margin-bottom: 12px;
}

li.dynamic_badge_li {
      .dynamic_badge{
        background: $color-gray-100 !important;
        color: $color-gray-700 !important;
      }

      &:hover{
          .dynamic_badge{
            color: $color-gray-700 !important;
          }
      }
    }

li.harmonization_group_container, .dynamic_badge_li{
  display: flex;
  align-items:center;
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
      .arrow{
        color:$color-red;
      }
      .spend_list_options{
        display: block;
      }
    }
  }
}

.red_text{
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

.tooltip-options{
  left: 155px !important;
}

.level_harmonization_container{
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
  ul.list-options{
    z-index: 90;
    li{
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
