<template>
  <td class="td-columns-kendo">
    <div class="div-columns-kendo">
      <tooltip v-if="dataItem.financingGroup['@id']" :open-delay="100" :anchor-element="'target'" :position="'top'">
        <span
          class="options-cell-no-cursor finan-style"
          :style="'float:left; text-align:center; width:150px; font-size: 0.8em; border-radius: 20px; padding: 5px 15px; color: '+formatData.colorText(dataItem.financingGroup.color)+'; text-transform: capitalize; background: ' + dataItem.financingGroup.color"
          :title="dataItem.financingGroup.name"
          @click="showhideTooltip"
        >
          {{ dataItem.financingGroup.name }}
          
        </span>
      </tooltip>
      <tooltip v-else :open-delay="100" :anchor-element="'target'" :position="'top'">
        <span v-if="groupsFinan" class="options-cell-no-cursor" @click="showhideTooltip">
          <span
              :style="'float:left; text-align:center; width:150px; font-size: 0.8em; border-radius: 20px; padding: 5px 15px; color: '+formatData.colorText(dataItem.financingGroup.color)+'; text-transform: capitalize;'">
              {{ '-' }}
          </span>          
        </span>
        <span v-else> - </span>
      </tooltip>
    </div>
  </td>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useAnalyzeStore } from '@/stores/analyze'
import { useToast } from "vue-toastification";
import { Tooltip } from '@progress/kendo-vue-tooltip'
import iconTrash from '@/resources/assets/images/icons/iconTrash.vue'
import * as formatData from '@/utils/FormatData'

export default defineComponent({
  name: 'FinancingColumn',
  components: {
    iconTrash,
    tooltip: Tooltip
  },
  props: {
    dataItem: { type: Object, required: true },
    removeGroup: { type: Boolean, required: false, default: true },
    levelOfGrid: { type: String, required: false, default: 'spends' },
  },
  emits: ['update-row-data', 'close-loading', 'show-recalculation', 'show-harmonization-modal','filter-financing-by-row'],
  setup(props, { emit }) {
    const analyzeStore = useAnalyzeStore()
    const toast = useToast()
    const groupsFinan = analyzeStore.getAllFinancing.length > 0 ? analyzeStore.getAllFinancing : false as any
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

      if (props.levelOfGrid === 'suppliers') {
        emit('filter-financing-by-row', financingGroup, props.dataItem.providerUuid, null)
      }
      else if (props.levelOfGrid === 'parents') {
        emit('filter-financing-by-row', financingGroup, props.dataItem.providerUuid, props.dataItem.entityType)      
      }
      else {
        emit('close-loading')
        let idFinan
        if (financingGroup) {
          idFinan = financingGroup['@id'].split('/')
          idFinan = idFinan[4]
        } else {
          idFinan = null
        }
        const idProgram = props.dataItem.programUuid.split('/')
        const idRow = props.dataItem.configUuid.split('/')
        const changed = {
          key: 'financingGroup',
          value: idFinan
        }
        const uuids = [idRow[4]]
        const params = {
          program: idProgram[4],
          changed,
          uuids,
          callbackSuccess: (callbackSuccessData: any) => {            
            emit('close-loading')
            emit('update-row-data', callbackSuccessData, 'financingGroup')            
          },
          callbackError: () => {
            emit('close-loading')
            toast.error('ERROR updating data');
          }
        }
        analyzeStore.postProgramSpendConfigurationbyGroups(params)
      }
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

.divider{
  border-bottom: 1px solid #EAECF0 !important;
}

li.financing_group_container{
  height: 40px;
}

li.financing_group_container:last-child{
  margin-bottom: 12px;
}

li.dynamic_badge_li{
  &:hover{
    .dynamic_badge{
      color: $color-white !important;
    }
  }
}

.trash_icon {
        color: $color-gray-700;
    }

li.financing_group_container, .dynamic_badge_li{
  display: flex !important;
  align-items:center !important;
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

.level_financing_container{
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
</style>
