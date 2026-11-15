<template>
<div class="custom-dropdown d-flex" @blur="open = false" @click.self="open = !open" :style="'width: '+widthDropdownPercent" :tabindex="tabindex" data-testid="active-options-dropdown">
  <div class="custom-dropdown-selected" id="available-dropdown-options" @click="open = !open">
    <div class="d-flex flex-column justify-content-between text-dropdown"><span class="label-topbar">{{  $t('global.selectChartData') }}</span>
      <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'">
        <div class="title-dropdown-parent"><span class="mr-1" :title="selectedNames"> {{ selectedNames }}</span></div>
      </Tooltip>
    </div>
    <div class="d-flex"><span class="icons-list-dropdown icon-svg-30"></span></div>
  </div>
  <div class="custom-dropdown-items metrics-dropdown-list-section show-scroll" id="custom-dropdown-items-options-showing" :class="{ selectHide: !open }" :style="'height: '+dropdownHeight">
    <div class="item-dropdown" v-for="option in optionsAvailable">
      <div class="form-checkout">
        <div class="d-flex align-items-center">
          <label :for="option.id">
            <input v-model="option.value" type="checkbox" :id="option.id" :name="option.id"/><span class="custom"></span><span class="cursor-pointer text-option" :class="{ 'truncate-name': option.id === 'myCompany' }">{{ option.translation }}          </span>
          </label>
        </div>
      </div>
    </div>
    <div class="compare-dropdown-buttons"><span class="btn outline-secondary-btn font-md fix-width-btns" @click="resetChartOptionsAvailable" style="z-index: 1; width: fit-content">{{  $t('button.reset') }}</span><span class="btn btn-primary font-md fix-width-btns" @click="closeDropdownAndMakeActions" style="z-index: 1; width: fit-content">{{  $t('button.apply') }}</span></div>
  </div>
</div>
</template>
  
<script lang="ts">
import { defineComponent, toRefs, reactive, computed } from "vue";

import { Tooltip } from "@progress/kendo-vue-tooltip";
import * as formatData from "@/utils/FormatData";
import { Skeleton } from "@progress/kendo-vue-indicators";
import { useI18n } from 'vue-i18n'
import iconCheck from "@/resources/assets/images/icons/iconCheck.vue";
interface OptionItem {
  id: string;
  translation: string;
  value: boolean;
}

interface OptionsAvailable {
  myCompany: OptionItem;
  peerGroupAverage: OptionItem;
  peerGroupFirstQuartile: OptionItem;
  peerGroupThirdQuartile: OptionItem;
  peerGroupMin: OptionItem;
  peerGroupMedian: OptionItem;
  peerGroupMax: OptionItem;
  averageIndustry: OptionItem;
  averageCountry: OptionItem;
  averageRegion: OptionItem;
}  

export default defineComponent({
  name: "CompareDropdownOptions",
  components: {
    Tooltip,
    Skeleton,    
    iconCheck
  },
  props: {
    widthDropdownPercent: { type: String, default: "100%" },
    skeletonIsShowing: { type: Boolean, default: false },
    chartOptionsAvailable: { type: Array as () => OptionsAvailable[], required: false, default: () => [] },
  },
  emits: ['select-metric-dropdown','apply-changes','reset-changes'],
  setup(props, { emit }) {

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    interface HomeOverviewInterface {
      selectedName: string,      
      open: boolean,      
      dropdownHeight: string,
      tabindex: number,    
      
    }

    const data = reactive<HomeOverviewInterface>({      
      selectedName: '',
      open: false,      
      dropdownHeight: 'auto',
      tabindex: 1,    
    })


    const optionsAvailable = computed(() => {
      return props.chartOptionsAvailable
    })

    const selectedNames = computed(() => {

      const translationsLength = Object.values(props.chartOptionsAvailable)
        .filter((option: any) => option.value)
        .length;

      if (translationsLength >= 1 && translationsLength <= 2) {
        const translations = Object.values(props.chartOptionsAvailable)
        .filter((option: any) => option.value)
        .map((option: any) => option.translation);
        const joinedTranslations = translations.join(', ');
        return joinedTranslations
      } 
      else if (translationsLength > 2){
        const translations = Object.values(props.chartOptionsAvailable)
        .filter((option: any) => option.value)
        .map((option: any) => {
          const replacementMap: Record<string, string> = {
            "Average": "Avg",
            "1st Quartile": "Q1",
            "3rd Quartile": "Q3",
            "Industry Average": "Ind. Avg",
            "Country Average": "Cntry. Avg",
            "Region Average": "Rgn. Avg",
          };
          return replacementMap[option.translation] || option.translation;
        });

        const joinedTranslations = translations.join(', ');
        return joinedTranslations;

      } else {
        return 'Select Chart Options'
      }
      
    })


    function resetChartOptionsAvailable() {
      emit('reset-changes')
      formatData.closeAvailableOptions()      
      
    }

    function closeDropdownAndMakeActions() {
      emit('apply-changes')
      formatData.closeAvailableOptions()
    }

    function infoButtonGraphics(item: any) {
      return translate.t('home.compare.chartOptions.' + item)
    } 
    
    
  
    return {
      ...toRefs(data),      
      infoButtonGraphics,
      optionsAvailable,
      resetChartOptionsAvailable,
      closeDropdownAndMakeActions,
      selectedNames
    }
  }
})
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

.selectHide {
  display: none;
}


label {
    display: inline-block;
    margin-bottom: 0px !important; 
    width: 100%;

    span {
      font-size: 14px;
    }
}

.form-checkout {
    position: relative;
    margin-bottom: 0px !important;
}

.truncate-name {
  width: 90%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}

.fix-width-btns {
    max-width: 20% !important;
}

// .custom-dropdown-items {
//   width: 325px;
// }

</style>
  