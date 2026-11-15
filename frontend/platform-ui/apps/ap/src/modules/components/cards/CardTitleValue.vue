<template>
<div
    class="w-100 min-h-32 mb-4 rounded-lg custom-card border border-solid"
    :class="[bgColorClass, { 'has-countries': countries && countries.length }]"
  >
    <div class="row">
      <div class="col-12 text-center">
        <!-- Title -->
        <h6 class="mb-0 min-h-10 text-sm text-center text-gray-700">
          <div class="d-flex align-items-center justify-content-center">
            <span>{{ title }}</span>
            <CalculumTooltipIcon
              v-if="toolTip !== ''"
              class="tooltip-absolute"
              :info-text="toolTip"
            />
          </div>
        </h6>
      </div>

      <div class="col-12">
        <!-- Value -->
        <div
          v-if="financingRateCard"
          class="mb-0 text-center text-gray-700 financing-options-container"
          :class="`${valueClasses}`"          
        >
          <div class="d-flex flex-column">
            <span>{{ getValue() }}</span>
            <div v-if="!hideControls" class="d-flex w-100 cursor-pointer" :style="'justify-content: center'" @click="showOptionsGroups = !showOptionsGroups">
              <div class="text-sm font-medium font-semibold cursor-pointer">
                <button v-if="groupAssigned" class="buttons_group_item_cards" :style="'--color: '+formatData.colorText(setGroupsFinancingTabs(groupAssigned))+'; color: '+formatData.colorText(setGroupsFinancingTabs(groupAssigned))+';background: '+setGroupsFinancingTabs(groupAssigned)">
                  {{ groupAssigned }}
                  <CalculumChevronDown v-if="!showOptionsGroups && !hideControls" />
                  <CalculumChevronUp v-if="showOptionsGroups && !hideControls" />          
                </button>
                <span v-else class="cursor-pointer">
                  {{ '+ Group'  }}
                  <CalculumChevronDown v-if="!showOptionsGroups && !hideControls" />
                  <CalculumChevronUp v-if="showOptionsGroups && !hideControls" />          
                </span>
              </div>              
            </div>            
          </div>

          <div v-if="financingRateCard && showOptionsGroups && !hideControls" class="set_levels_financing">
            <ul class="list-options-modal">
              <li v-for="group in groupsFinan" :key="group.name" class="harmonization_group_container">
                <button class="buttons_group_item" :style="'--color: '+formatData.colorText(group.color)+'; color: '+formatData.colorText(group.color)+';background: '+group.color" @click="$emit('change-groups',group,'financingGroup',null)">{{ group.name }}</button>
              </li>
              <li v-if="valueRate" class="d-flex align-item-start remove_group_container cursor-pointer justify-content-between" @click="$emit('change-groups' ,null,'financingGroup',null)">
                <span class="remove_group d-flex align-items-center">{{$t('home.entityCard.negotiation.removeGroup')}}</span>
                <iconTrash class="trash_icon"></iconTrash>                
              </li>
            </ul>
          </div>
        </div>
        <div
          v-if="harmonizationLevelCard"
          class="mb-0 text-center text-gray-700"
          :class="` ${valueClasses} ${ hideControls === false ? 'cursor-pointer' : ''} `"
          @click="showOptionsGroups = !showOptionsGroups"
        >
          {{ getValue() === 'N/A' && !hideControls ? '+ Group' : getValue() }}
          
          <CalculumChevronDown v-if="!showOptionsGroups && !hideControls" />
          <CalculumChevronUp v-if="showOptionsGroups && !hideControls" />          
          <div v-if="harmonizationLevelCard && showOptionsGroups && !hideControls" class="set_levels_harmonization">
            <ul class="list-options-modal">               
              <li @click="$emit('change-groups' ,null,'harmonizationGroup','spend')">
                <button class="categoryLevelBtn align-items-center text-sm">{{ $t('home.entityCard.negotiation.harmonizationLevelSpend') }}</button>
              </li>
              <li @click="$emit('change-groups' ,null,'harmonizationGroup','supplier')">
                <button class="categoryLevelBtn align-items-center text-sm">{{$t('home.entityCard.negotiation.harmonizationLevelSupplier')}}</button>
              </li>
              <li class="divider" @click="$emit('change-groups' ,null,'harmonizationGroup','parent')" >
                <button class="categoryLevelBtn align-items-center text-sm">{{$t('home.entityCard.negotiation.harmonizationLevelParent')}}</button>
              </li>
              <li v-if="getValue() !== 'N/A' && !hideControls" class="d-flex align-item-start remove_group_container cursor-pointer justify-content-between" @click="$emit('change-groups' ,null,'harmonizationGroup',null)">
                <span class="remove_group d-flex align-items-center">{{$t('home.entityCard.negotiation.removeLevel')}}</span>
                <iconTrash class="trash_icon"></iconTrash>
              </li>
            </ul>
          </div>
        </div>    
      

        <p
          v-if="!groupBehaviorRelated && !harmonizationLevelCard && !financingRateCard"
          class="mb-0 text-center text-gray-700 text-capitalize"
          :class="valueClasses"
        >
          {{ getValue() }}
        </p>

        <Tooltip
          v-if="groupBehaviorRelated && !harmonizationLevelCard && !financingRateCard"
          :open-delay="100"
          :anchor-element="'target'"
          :position="'top'"
        >
          <p
            class="mb-0 text-center text-gray-700 text-truncate"
            :class="valueClasses"
            :title="getValue()"
          >
            {{ getValue() }}
          </p>
        </Tooltip>
        <div v-if="percentValue" class="d-flex align-items-center justify-content-center text-center gap-2"> 
          <span class="text-gray-500 text-sm font-medium"> {{ $t('global.percentage') }}</span>
          <span class="text-gray-700 text-sm font-bold"> {{ formatData.converToPercentage(percentValue) }}   </span>
        </div>
        <div v-if="floatDays" class="d-flex align-items-center justify-content-center text-center gap-2">
          <span class="text-gray-500 text-sm font-medium"> {{ $t('global.floatDays') }}</span>
          <span class="text-gray-700 text-sm font-bold"> {{ floatDays }} </span>
        </div>
        <div v-if="countries && countries.length === 1" class="d-flex justify-content-center flex-wrap mt-1" style="gap: 4px">
          <div v-for="c in countries" :key="c.source" class="d-flex align-items-center" style="gap: 4px">
            <span class="flag-country my-auto" :style="`background-image: url('${c.countryFlagUrl}') !important;`" />
            <span class="text-xs text-gray-500">{{ c.countryName }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import { computed, defineComponent, ref, PropType } from "vue";
import { useI18n } from "vue-i18n";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import iconTrash from "@/resources/assets/images/icons/iconTrash.vue";
import { useAnalyzeStore } from '@/stores/analyze';
import * as formatData from '@/utils/FormatData'
import CalculumChevronDown from '@/modules/components/CalculumChevronDown.vue'
import CalculumChevronUp from '@/modules/components/CalculumChevronUp.vue'
import { StringUtils } from "@/utils";

export default defineComponent({
  name: "CardTitleValue",
  components: { CalculumTooltipIcon, Tooltip, iconTrash, CalculumChevronDown, CalculumChevronUp },
  props: {
    bgColorClass: { type: String, required: false, default: "bg-white" },
    floatDays: { type: Number, required: false, default: null },
    groupAssigned: { type: String, required: false, default: "" },
    hideControls: { type: Boolean, default: false },
    infoKey: { type: String, required: false, default: "" },
    percentValue: { type: Number, required: false, default: null }, 
    title: { type: String, required: false, default: "" },
    toolTip: { type: String, required: false, default: "" },
    value: { type: String, required: false, default: "" },
    valueClasses: { type: String, required: false, default: "" },
    valueRate: { type: String, required: false, default: "" },
    countries: {
      type: Array as PropType<Array<{ source: string; countryName: string; countryFlagUrl: string }>>,
      required: false,
      default: undefined,
    },
  },
  emits: ['change-groups'],
  setup(props, { emit}) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    const showOptionsGroups = ref(false)

    const analyzeStore = useAnalyzeStore();
    const groupsFinan = analyzeStore.getAllFinancing.length > 0 ? analyzeStore.getAllFinancing : null

    const groupBehaviorRelated = computed(() => {
      return (
        props.title === "Group Behavior" || props.title === "Group Assigned"
      );
    });

    const harmonizationLevelCard = computed(() => {
      return (
        props.infoKey === "harmonizationLevel"
      );
    });

    const financingRateCard = computed(() => {
      return (
        props.infoKey === "financingRate"
      );
    });

    /**
     * returns the value for the corresponding title
     */
    const getValue = () => {

      //- To suplplier and peer group 2.0
      if (props.value === 'true') {
        return 'Yes'
      }

      if (props.value === 'false') {
        return 'No'
      }

      if ((props.title === "Harmonization Level" || props.title === "Rounding Rules") && props.value !== 'N/A') {
        return props.title === "Harmonization Level"
          ? translate.t("home.entityCard.levelHarmonization." + props.value)
          : translate.t("home.entityCard.roundingRules." + props.value);
      }
      else if (props.infoKey === "vCardRebate" || props.infoKey === 'vCardCashFlowGain' || props.infoKey === 'vCardEconomicProfit' ) {
        return StringUtils.formatBigNumbers(Number(props.value ?? 0));
      }
      else if (props.infoKey === "numberOfOccurrences") {
        return formatData.getNumberWithDecimals(props.value ?? 0, 0);
      }

      return props.value;
    };


    function setGroupsFinancingTabs(groupName: string) {
      if (groupsFinan){
        const indexGroup = groupsFinan.find(
          (x: any) => x.name === groupName
        );

        if (indexGroup){
          return indexGroup.color
        }
        return null
      }
      return null
    }


    return {
      groupBehaviorRelated,
      getValue,
      showOptionsGroups,
      harmonizationLevelCard,
      financingRateCard,
      groupsFinan,
      formatData,
      setGroupsFinancingTabs
    };
  }
});
</script>

<style lang="scss" scoped>

@import "src/resources/assets/styles/variables/colors";

.divider {
  border-bottom: 1px solid #eaecf0 !important;
}

.set_levels_harmonization {
    flex-direction: column;
    width: 174px;
    height: auto;
    background: #ffffff;
    border-radius: 10px;
    position: absolute;
    top: 3vh;
    left: 3.5vh;
    z-index: 96;
    transition: all 0.3s ease-in;
    box-shadow: 0px 0px 8px 0px rgba(34, 60, 80, 0.2);
}

.set_levels_financing {
    flex-direction: column;
    width: 250px;
    height: auto;
    background: #ffffff;
    border-radius: 10px;
    position: absolute;
    top: 7vh;
    right: 0vh;
    z-index: 96;
    transition: all 0.3s ease-in;
    box-shadow: 0px 0px 8px 0px rgba(34, 60, 80, 0.2);
    padding: 10px;
}

ul.list-options-modal {
  li:first-child {
    &:hover {
      .arrow {
        color: red;
      }

      .spend_list_options {
        display: block;
      }
    }
  }

  svg {
    fill: gray !important;
  }
}

.set_levels_harmonization ul.list-options-modal li {
    padding: 10px;
}

.categoryLevelBtn {
    background-color: transparent !important;
    width: 100% !important;
    outline: none !important;
    border: none !important;
    font-size: 1.1rem !important;
    display: flex !important;
}


.custom-card.has-countries {
  max-height: none;
}

.custom-card {
  max-height: 6.5rem;
  padding: 0.8rem 0.375rem 0.625rem;

  // Add little space between title and value
  .row {
    gap: 0.25rem;
  }

  // Truncate title string if it's too long
  h6 {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // Truncate value string if it's too long
  p {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
}

.tooltip-absolute {
  position: absolute;
  top: 0.1rem;
  right: 7px;
}

.term_group_title,
.remove_group {
  white-space: nowrap;
  background: transparent !important;
  color: $color-gray-400;
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
  cursor: pointer;
}

li.harmonization_group_container {
  height: 40px;
}

li.harmonization_group_container:last-of-type {
  margin-bottom: 12px;
}

li.harmonization_group_container,
.dynamic_badge_li {
  display: flex;
  align-items: center;
  justify-content: center;
}


.financing-options-container {    
  display: flex !important;
  justify-content: center;
}

</style>
