<template>
<CalculumModal v-if="showPaymentTermsDescriptions" :size="'lg'" :showClose="true" :title="$t('global.paymentTermsDescriptions')" @close="showPaymentTermsDescriptions = false">
  <template v-slot:modalContent><span>{{ paymentTermsDescriptions }}</span></template>
</CalculumModal>
<div class="line-chart d-flex flex-column no-hover" v-if="containsSpecificStrategyKey && programIsRecalculating">
  <div class="line d-flex align-items-baseline justify-content-between">
    <div class="value-bar"></div>
    <div class="title d-flex align-items-center">
      <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '20%', height: '14px', borderRadius:  '8px' }"></Skeleton>
    </div>
  </div>
  <div class="line d-flex align-items-baseline justify-content-between">
    <div class="value-bar">
      <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '14px', borderRadius:  '8px' }"></Skeleton>
    </div>
    <div class="bar">
      <Skeleton class="skeletons-bg mt-2 text-center" :shape="'rectangle'" :style="{ width: '100%', height: '14px', borderRadius:  '8px' }">      </Skeleton>
    </div>
  </div>
</div>
<div class="row w-100" v-else-if="filteredData" @click="() => $emit('change-line', !active && chartName ? chartName : 'snapshot')" :class="[chartName,fromVPComputed.class]">
  <div class="col-12 row-100">
    <div class="d-flex align-items-center" :class="[active ? 'active' : '', setColor === '' ? 'cursor-pointer' : 'no-hover',fromVPComputed.pr,fromVPComputed.noHover]">
      <div class="value-container mr-2" :class="[setColor === '' ? 'cursor-pointer' : ''  ]"> <span class="font-semibold text-gray-600 text-2xl" v-if="chartName === 'contractualTerms'">{{ getContractualValue ?? getActualValue }} </span><span class="font-semibold text-gray-600" v-else :class="value !== null ? 'text-2xl' : 'na-font-size'">{{ value !== null ? value : "N/A" }}</span></div>
      <div class="content-container flex-grow-1 d-flex flex-column" :class="[setColor === '' ? 'cursor-pointer' : ''  ]">
        <!-- Title-->
        <div class="d-flex align-items-center gap-1 title-container" :class="[setColor === '' ? 'cursor-pointer' : ''  ]">
          <div class="d-flex titles-bars justify-content-between w-100 align-items-center" :class="[setColor === '' ? 'cursor-pointer' : ''  ]">
            <div class="d-flex" :class="!StringUtils.isNullUndefinedOrEmpty(paymentTermsDescriptions) ? 'title-left-container' : 'w-100'"><span class="font-medium text-gray-500 d-flex title">{{ title ? title : "N/A" }}<span v-if="chartName === 'proposedTerms' && isCapped">{{ $t( 'global.isCapped') }}</span><span class="font-medium title" v-if="chartName === 'contractualTerms'">{{':'}}</span><span class="font-medium title ml-2" v-if="chartName === 'contractualTerms'">{{ getContractualValue ?? 'N/A' }}</span></span><span class="font-medium text-gray-400 title ml-2 avg-days-paid" v-if="subtitle !== ''"> <span class="font-medium avg-days-paid-value">{{ subtitle }}                            </span></span><span class="font-medium text-gray-400 title ml-2 avg-days-paid" v-if="chartName === 'contractualTerms' && getActualValue !== null && !hideAverageDaysPaid">{{ }}{{ '/ ' + (potentialText ? $t('home.entityCard.strategies.estimatedTerms') : $t('global.averageDaysPaidAcronym'))}}:<span class="font-medium avg-days-paid-value">{{ getActualValue }}                            </span></span><span class="font-medium text-gray-400 title ml-2 payment-float" v-if="(onlyForProposedTerms || onlyForTargetTerms) && paymentCycleFloatIsGreaterThanZero">{{ '/ ' + $t('global.paymentCycleFloat') }}: <span class="font-medium payment-float-value">{{ paymentCycleFloat }} </span></span>
              <div class="d-flex align-items-center gap-1 cursor-pointer" v-if="chartName === 'contractualTerms' ? fromVPComputed.active ? false : true : false">
                <CalculumTooltipIcon :infoText="tooltipText" :advancedTooltipClass="validateTooltipSettings(chartName)" :uniqueIdentifier="'entity-strategies-bars'+chartName" :keyPopOver="chartName"> </CalculumTooltipIcon>
              </div>
            </div>
            <div class="d-flex justify-content-end title-right-container align-items-center" v-if="!StringUtils.isNullUndefinedOrEmpty(paymentTermsDescriptions)">
              <div class="payment-descriptions-tooltip-wrapper mt-2" v-if="chartName === 'contractualTerms'" @click.stop="showPaymentTermsDescriptions = true">
                <Tooltip :open-delay="100" :anchor-element="'anchor'" :position="'top'"><span class="font-medium text-gray-400 title ml-2 payment-descriptions" :title="'Show Payment Term Descriptions'">{{ paymentTermsDescriptions }}</span></Tooltip>
              </div>
            </div>
          </div>
          <div class="d-flex align-items-center cursor-pointer justify-content-end add-results-container" v-if="chartName === 'agreedNewTerms' ? fromVPComputed.active ? false : true : false" @click.stop="() => $emit('add-results-shortcut')" :title="hasAgreedBeenApplied ? $t('home.entityCard.results.editResults') : $t('home.entityCard.results.addResults')">
            <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'">
              <div class="icon-container" :title="hasAgreedBeenApplied ? $t('home.entityCard.results.editResults') : $t('home.entityCard.results.addResults')" v-if="!fromVPComputed.active">
                <iconPencil class="pencil-svg" :title="hasAgreedBeenApplied ? $t('home.entityCard.results.editResults') : $t('home.entityCard.results.addResults')" :class="hasAgreedBeenApplied ? 'pencil-icon-edit-results' : 'pencil-icon-add-results'"></iconPencil>
              </div>
            </Tooltip>
          </div>
          <div class="d-flex gap-2 justify-content-end align-items-center cursor-pointer" v-if="chartName === 'proposedTerms' && !potentialText && paymentCycleFloatIsGreaterThanZero">
            <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'">
              <div class="icon-container" v-if="!hasTargetBeenApplied && !fromVPComputed.active" :title="$t('global.addTarget')">
                <iconPencil class="pencil-svg pencil-icon-add-target" @click.stop="() => $emit('btn-shortcut-clicked')" :title="$t('global.addTarget')"></iconPencil>
              </div>
            </Tooltip>
          </div>
          <div class="d-flex gap-2 justify-content-end w-50 align-items-center cursor-pointer" v-if="onlyForTargetTerms && paymentCycleFloatIsGreaterThanZero">
            <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'">
              <div class="icon-container" :title="hasTargetBeenApplied ? $t('global.editTarget') : $t('global.addTarget')" v-if="!fromVPComputed.active">
                <iconPencil class="pencil-svg" @click.stop="() => $emit('btn-shortcut-clicked')" :class="hasTargetBeenApplied ? 'pencil-icon-edit-target' : 'pencil-icon-add-target'" :title="hasTargetBeenApplied ? $t('global.editTarget') : $t('global.dddTarget')"></iconPencil>
              </div>
            </Tooltip>
          </div>
          <div class="d-flex gap-2 justify-content-end align-items-center cursor-pointer add-results-container" v-if="(onlyForProposedTerms && !potentialText && paymentCycleFloat === 0) ? fromVPComputed.active ? false : true : false" @click.stop="() => $emit('btn-shortcut-clicked')">
            <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'">
              <div class="icon-container" v-if="!hasTargetBeenApplied && !fromVPComputed.active" :title="$t('global.addTarget')">
                <iconPencil class="pencil-svg pencil-icon-add-target" @click.stop="() => $emit('btn-shortcut-clicked')" :title="$t('global.addTarget')"></iconPencil>
              </div>
            </Tooltip>
          </div>
          <div class="d-flex gap-2 justify-content-end align-items-center cursor-pointer add-results-container" v-if="onlyForTargetTerms && paymentCycleFloat === 0 " @click.stop="() => $emit('btn-shortcut-clicked')">
            <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'">
              <div class="icon-container" :title="hasTargetBeenApplied ? $t('global.editTarget') : $t('global.addTarget')" v-if="!fromVPComputed.active">
                <iconPencil class="pencil-svg" @click.stop="() => $emit('btn-shortcut-clicked')" :class="hasTargetBeenApplied ? 'pencil-icon-edit-target' : 'pencil-icon-add-target'" :title="hasTargetBeenApplied ? $t('global.editTarget') : $t('global.addTarget')"></iconPencil>
              </div>
            </Tooltip>
          </div><span class="text-xs font-medium text-gray-400" v-if="!disabled">{{  $t( 'global.disabled') }}</span>
        </div>
        <ChartContractualActualBarComponent v-if="chartName === 'contractualTerms'" :actualValue="actualValueComputed" :contractualValue="contractualValueComputed"></ChartContractualActualBarComponent>
        <div v-else-if="(onlyForProposedTerms || onlyForTargetTerms) && paymentCycleFloatIsGreaterThanZero">
          <ChartHorizontalSingleBar :barBgColorClass="'bg-teal-500'" :value="Number(value ?? 0)" :maxValue="MAX_TERMS_DAYS_CHARTS.toString()"></ChartHorizontalSingleBar>
        </div>
        <div v-else>
          <div class="bar" :class="[setColor === '' ? 'cursor-pointer' : '']">
            <HomeBarLevel :size-result="barSize" :colorDefault="barColorComputed" :class="[setColor === '' ? 'cursor-pointer' : '']"></HomeBarLevel>
          </div>
        </div><span v-if="perSpendLineRangeLabel" class="per-spend-line-range">{{ $t('home.entityCard.strategies.perSpendLineRange', { min: perSpendLineRangeLabel.min, max: perSpendLineRangeLabel.max }) }}</span>        
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, type PropType } from "vue";
import {
  PaymentTermsStrategiesUtils,
  isEmpty,
  MAX_TERMS_DAYS_CHARTS,
} from "@/utils";
import { Skeleton } from "@progress/kendo-vue-indicators";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useEntityCardStore } from '@/stores/entityCard';
import { useUserStore } from '@/stores/user';
import AddIcon from "@/modules/components/icons/IconAdd.vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import ChartHorizontalSingleBar from "@/modules/components/charts/ChartHorizontalSingleBar.vue";
import HomeBarLevel from "@/modules/home/components/HomeBarLevel.vue";
import iconPencil from "@/resources/assets/images/icons/iconPencil.vue";
import SquareShape from "@/modules/components/shapes/SquareShape.vue";
import ChartContractualActualBarComponent from "@/modules/components/ChartContractualActualBarComponent.vue";
import { useI18n } from 'vue-i18n'
import CalculumModal from "@/modules/components/CalculumModal.vue";
import { StringUtils } from "@/utils";

export default defineComponent({
  name: "EntityTermsChartLine",
  components: {
    AddIcon,
    CalculumTooltipIcon,
    ChartContractualActualBarComponent,
    ChartHorizontalSingleBar,
    HomeBarLevel,
    iconPencil,
    Skeleton,
    SquareShape,
    Tooltip,
    CalculumModal,
  },
  props: {
    active: { type: Boolean, default: false },
    barColor: { type: String, default: "" },
    barSize: { type: Number, default: 0 },
    btnShortcutLabel: { type: String, default: "" },
    chartName: { type: String, default: "" },
    disabled: { type: Boolean, default: true },
    hasAgreedBeenApplied: { type: Boolean, default: false },
    hasTargetBeenApplied: { type: Boolean, default: false },
    isCapped: { type: Boolean, required: false, default: null },
    paymentCycleFloat: { type: Number, default: 0 },
    programIsRecalculating: { type: Boolean, default: false },
    setColor: { type: String, default: "" },
    strategyKey: { type: String, required: false, default: null },
    subtitle: { type: String, default: "" },
    terms: { type: Array, default: () => [] },
    title: { type: String, default: "" },    
    tooltipText: { type: String, default: "" },
    usedStrategy: { type: Boolean, default: false },
    value: { type: Number as PropType<number | null>, default: null },
    fromVP:{type: Boolean,default:false},
    paymentTermsDescriptions: { type: String, default: () => '' },
    data: { type: Object, default: null },
  },
  emits: ["change-line", "add-results-shortcut", "btn-shortcut-clicked"],
  setup(props) {
    const entityCardStore = useEntityCardStore();
    const userStore = useUserStore()
    const hideAverageDaysPaid = computed(() => userStore.getHideAverageDaysPaid)
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const showPaymentTermsDescriptions = ref(false);

    const floatBgColor = ref("bg-gray-500");
    /**
     * returns true if the entity is a potential supplier
     * to change the text 'Actual' to 'Estimated'
     */
    const potentialText = computed(() => {

      return (
        entityCardStore.getSelectedEntity?.companyTypeForTheme ===
          "potential-supplier" ||
        entityCardStore.getSelectedEntity?.companyTypeForTheme ===
          "potential-parent"
      );
    });

    const filteredData = computed(() => {
      if (props.strategyKey === 'currentTerms') {
        return false
      }
      return true
    })

    const regulationPerSpendLine = computed(() => props.data?.regulationPerSpendLine ?? null)

    const regulationLines = computed(() => regulationPerSpendLine.value?.lines ?? [])

    const perSpendLineRangeLabel = computed(() => {
      const rps = regulationPerSpendLine.value
      if (!rps) return null
      const min = rps.min
      const max = rps.max
      if (min === null || min === undefined || max === null || max === undefined) return null
      if (min === max) return null
      return { min, max }
    })

    const barColorComputed = computed(() => {
      // The unused strategies have this color in the bar
      if (props.usedStrategy === false) {
        return PaymentTermsStrategiesUtils.STRATEGY_COLOR_DEFAULT;
      }

      if (props.setColor !== "") {
        return props.setColor;
      }

      return props.barColor;
    });

    function validateTooltipSettings(strategyKey: string) {
      const arrayData = [
        "agreedNewTerms",
        "buyerStandardStrategy",
        "cashDiscountConversionStrategy",
        "financingStrategy",
        "industryRegionStandardStrategy",
        "payOnTermsStrategy",
        "peerGroupAvgStrategy",
        "proposedTerms",
        "regulatoryTermsStrategy",
        "parentSupplierMaxStrategy",
        "supplierStandardStrategy",
      ];

      return arrayData.includes(strategyKey);
    }

    const containsSpecificStrategyKey = computed(() => {
      let keys = ["proposedTerms", "harmonization", "financingStrategy", "agreedNewTerms","targetTerms"];
      return keys.includes(props.strategyKey);
    });

    const onlyForProposedTerms = computed(() => {
      return props.chartName === "proposedTerms";
    });

    const onlyForTargetTerms = computed(() => {
      return props.chartName === "targetTerms";
    });

    const paymentCycleFloatIsGreaterThanZero = computed(() => {
      return props.paymentCycleFloat > 0;
    });

    const getContractualValue = computed(() => {
       
      if (props.value !== null && props.value >= 0) {
        return props.value
      }
      return null

    })


    const getActualValue = computed(() => {
      let actualTermValue = 0;

      props?.terms.forEach((term: any) => {
      
        if (term.key === "currentTerms") {
          actualTermValue = term.terms ?? 0;
        }
      });

      if (actualTermValue === null || actualTermValue === 0) {
        return null
      } else {
        return actualTermValue
      }
    });

    const getCircleBgClassBasedOnTermName = computed(() => {
      if (props.chartName === "proposedTerms") {
        return "bg-teal-500";
      }

      if (props.chartName === "contractualTerms") {
        return "bg-coolgray-600";
      }

      return "bg-gray-500";
    });

    const termsComputed = computed(() => {
      return props.terms;
    });

    const actualValueComputed = computed(() => {
      let actualTermValue = null;

      if (termsComputed.value && termsComputed.value.length > 0) {
        termsComputed.value.forEach((term: any) => {
          if (term.key === "currentTerms") {
            actualTermValue = term.terms ?? null;
          }
        });
      }

      return actualTermValue ?? null;
    });

    const contractualValueComputed = computed(() => {
      let contractualTermValue = null;
      if (termsComputed.value && termsComputed.value.length > 0) {
        termsComputed.value.forEach((term: any) => {
          if (term.key === "contractualTerms") {
            contractualTermValue = term.terms ?? null;
          }
        });
      }

      return contractualTermValue ?? null;
    });
 const fromVPComputed=computed(()=>{
  return {
    active:props.fromVP,
    class:props.fromVP?'':'row-100',
    pr:props.fromVP ? 'from-vp-class' : '',
    noHover:props.fromVP ? 'line-chart-from-vp-class':'line-chart'
  }
 })
    

    return {
      actualValueComputed,
      barColorComputed,
      containsSpecificStrategyKey,
      contractualValueComputed,
      filteredData,
      floatBgColor,
      getCircleBgClassBasedOnTermName,
      getActualValue,
      hideAverageDaysPaid,
      isEmpty,
      MAX_TERMS_DAYS_CHARTS,
      onlyForProposedTerms,
      onlyForTargetTerms,
      paymentCycleFloatIsGreaterThanZero,
      potentialText,
      termsComputed,
      validateTooltipSettings,
      getContractualValue,
      fromVPComputed,
      showPaymentTermsDescriptions,
      StringUtils,
      regulationPerSpendLine,
      regulationLines,
      perSpendLineRangeLabel
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
@import "src/resources/assets/styles/utils/_background.scss";

.from-vp-class{
  padding-right: 0px !important;
  padding-left: 0px !important;  
}

.line-chart-from-vp-class {
  width: 100%;
  padding-top: 5px;
  padding-bottom: 5px;
  padding-left: 10px;
  padding-right: 24px;
  border-top: 1px solid #ffffff;
  border-left: 1px solid #ffffff;
  border-bottom: 1px solid #ffffff;

  .no-wrap {
    white-space: nowrap;
    /* Prevent breaking onto a new line */
    z-index: 2;
    /* Set a higher z-index */
  }

  .add-results-shortcut {
    fill: $color-gray-500;

    &:active {
      fill: $color-primary-500;
    }
  }

  &.no-hover {
    padding: 5px 10px 5px 10px !important;
  }

  &.active {
    background: $color-gray-50;
    border-top-left-radius: 9px;
    border-bottom-left-radius: 9px;
    border-top: 1px solid $color-gray-200;
    border-left: 1px solid $color-gray-200;
    border-bottom: 1px solid $color-gray-200;

    .text-gray-500 {
      color: $color-gray-700 !important;
    }
  }

  .line {
    display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-grow: 1;  /* Allow this container to expand */
    height: 20px;
    gap: 0.5rem;

    .value-bar {
      width: 32px;
      text-align: right;
    }

    .bar {
      width: 100%;
    }

    .title {
      height: 20px;
      width: 100%;
    }
  }
}

.line-chart {
  width: 100%;
  padding-top: 5px;
  padding-bottom: 5px;
  padding-left: 10px;
  padding-right: 24px;
  border-top: 1px solid #ffffff;
  border-left: 1px solid #ffffff;
  border-bottom: 1px solid #ffffff;

  .no-wrap {
    white-space: nowrap;
    /* Prevent breaking onto a new line */
    z-index: 2;
    /* Set a higher z-index */
  }

  .add-results-container {
    &:hover {
      svg {
        fill: $color-primary-500 !important;
      }

      span {
        color: $color-primary-500 !important;
      }
    }
  }

  .add-results-shortcut {
    fill: $color-gray-500;

    &:hover {
      fill: $color-primary-500;
    }

    &:active {
      fill: $color-primary-500;
    }
  }

  &.no-hover {
    padding: 5px 10px 5px 10px !important;
  }

  &.active {
    background: $color-gray-50;
    border-top-left-radius: 9px;
    border-bottom-left-radius: 9px;
    border-top: 1px solid $color-gray-200;
    border-left: 1px solid $color-gray-200;
    border-bottom: 1px solid $color-gray-200;

    .text-gray-500 {
      color: $color-gray-700 !important;
    }
  }

  &:hover {
    background: $color-gray-100;
    border-top-left-radius: 9px;
    border-bottom-left-radius: 9px;
    border-top: 1px solid $color-gray-300;
    border-left: 1px solid $color-gray-300;
    border-bottom: 1px solid $color-gray-300;

    .text-gray-500 {
      color: $color-gray-700 !important;
    }

    &.no-hover {
      padding: 5px 10px 5px 10px !important;
      background: #ffffff !important;
      border-radius: 9px !important;
      border: 1px solid #ffffff !important;
    }
  }

  .line {
    display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-grow: 1;  /* Allow this container to expand */
    height: 20px;
    gap: 0.5rem;

    .value-bar {
      width: 32px;
      text-align: right;
    }

    .bar {
      width: 100%;
    }

    .title {
      height: 20px;
      width: 100%;
    }
  }
}

.icon-container {
  padding: 0.3rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  justify-content: center;

  &:hover {
    border-radius: 8px;
    background: $color-brand-light;
    padding: 0.3rem;

    svg {
      color: $color-primary-600;
    }
  }
}

.striped {
  background-image: repeating-linear-gradient(
    -45deg,
    transparent 0,
    #4a5578 10px,
    transparent 10px,
    transparent 20px
  );
}

.square-value-ml {
  margin-left: 2.4rem;
}

.titles-bars {
  .title-left-container {
    width: 45%;
    // flex: 0 0 50%;
  }

  .title-right-container {
    flex: 0 0 55%;
    min-width: 0;

    & * {
      cursor: pointer;
    }

    .payment-descriptions-tooltip-wrapper {
      min-width: 0;
      overflow: hidden;
      text-align: right;
      width: 100%;

      :deep(> *) {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-align: right;
        width: 100%;
      }
    }

    .payment-descriptions {
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.per-spend-line-range {
  font-size: 0.75rem;
  color: $color-primary-500;
  margin-top: 2px;
}

.per-spend-line-list {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.per-spend-line-item {
  font-size: 0.75rem;
  color: $color-gray-600;
}

</style>
