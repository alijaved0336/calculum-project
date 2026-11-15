<template>
<div class="payment-terms-class mb-5 position-relative">
  <div class="scf-badge" v-if="onSCF === true"><span>{{ $t('global.currentlyOnSCF') }}</span></div><span class="text-base font-bold">{{ $t('global.paymentTerms') + ' (days)' }}</span>
  <EntityTermsChartLine v-for="(paymentTerm) in objDataTerms" :active="false" :barSize="setBarSize(paymentTerm.terms ?? 0)" :chartName="paymentTerm.key" :barColor="PaymentTermsStrategiesUtils.getColorByStrategyKey(paymentTerm.key)" :title="$t('home.entityCard.strategies.' + paymentTerm.key)" :tooltipText="$t('home.entityCard.strategies.' + paymentTerm.key + 'Tooltip')" :usedStrategy="true" :value="paymentTerm.terms" :strategyKey="paymentTerm.key" :terms="objDataTerms" :from-v-p="true"></EntityTermsChartLine>
</div>
<div class="payment-terms-strategies-class"><span class="text-base font-bold mt-1" v-if="objDataTermsVisible.length > 0">{{ $t('global.paymentTermsStrategies') }}</span>
  <EntityTermsChartLine v-for="strategy in objDataTermsVisible" :active="false" :barColor="setColorByStrategyKey(strategy)" :barSize="setBarSize(strategy.terms)" :chartName="strategy.key" :title="$t('home.entityCard.strategies.' + strategy.key)" :tooltipText="$t('home.entityCard.strategies.' + strategy.key + 'Tooltip')" :usedStrategy="true" :value="strategy.terms" :data="strategy" :from-v-p="true"></EntityTermsChartLine>
</div>
<div class="row row-100">
  <div class="col-12 d-flex align-items-center justify-content-center">
    <CustomChartLegend :legendItems="legendItemsArray"></CustomChartLegend>
  </div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, toRefs } from 'vue'
import { isNullOrUndefined, ObjectUtils, PaymentTermsStrategiesUtils, ColorsUtils } from '@/utils';
import { useI18n } from 'vue-i18n';
import EntityTermsChartLine from '@/modules/home/entityCard/components/opportunity/EntityTermsChartLine.vue';
import * as colorsGroups from "@/utils/ColorsGroups";
import { CustomChartLegend } from '@ada/design-system'
import { useUserStore } from '@/stores/user';
export default defineComponent({
    components: {
        EntityTermsChartLine, CustomChartLegend
    },
    props: {
        objData: { type: Object, required: true },
        onSCF: { type: Boolean, required: false, default: null }
    },
    setup(props) {
        const userStore = useUserStore();
        const data = reactive({
            objDataTerms: ObjectUtils.cloneDeep(props.objData.terms),
            objDataStrategies: ObjectUtils.cloneDeep(props.objData.strategies),
        })


        const objDataTermsVisible = computed(() => {
            //- Validate if the strategy has the property isVisible
            const hasIsVisible = data.objDataStrategies.some((strategy: any) => strategy.hasOwnProperty('isVisible'));

            if (hasIsVisible) {
                //- Filter the strategies that are visible and have terms
                return data.objDataStrategies.filter((strategy: any) => strategy.isVisible === true && strategy.terms !== null)
            }
            //- Filter the strategies that have terms
            return data.objDataStrategies.filter((strategy: any) => strategy.terms !== null)
            
        })


        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
        function setBarSize(size: number) {
            const newSize = (size * 100) / 180;
            return newSize > 100 ? 100 : newSize;
        }
        
   
        const hasTargetTermsAppliedComputed = computed(() => {
            let result = data.objDataTerms.some(
                (obj: any) => obj.key === "targetTerms" && obj.terms !== null
            );
            return result;
        });
        
        const termsStrategiesTermsLegendItems = computed(() => {
            // Get list of colors from used strategies
            let colors: string[] = objDataTermsVisible.value.map((i: { color: any; }) =>
                !isNullOrUndefined(i.color) ? i.color.toUpperCase() : ""
            );

            // Remove empty items
            colors = colors.filter((i) => i !== "");

            // Remove duplicates
            colors = [...new Set(colors)];

            const legend: { text: string; color: string }[] = [];

            // Source - Spend File (internal)
            const isSourceSpendFileShowing = colors.some(
                (color) => color === colorsGroups.defaultColor
            );

            if (isSourceSpendFileShowing) {
                legend.push({
                    text: `${userStore.getCompany?.name ?? "Your Company's"} Data`,
                    color: colorsGroups.defaultColor,
                });
            }

            // Source - Ada (external)
            const isSourceAdaShowing = colors.some(
                (color) => color === colorsGroups.supplierStandard
            );

            if (isSourceAdaShowing) {
                legend.push({
                    text: translate.t("global.externalSourceAda"),
                    color: colorsGroups.supplierStandard,
                });
            }

            // No impact
            const isNoImpactShowing = colors.some(
                (color) => color === colorsGroups.negativeColorForStrategies
            );

            if (isNoImpactShowing) {
                legend.push({
                    text: "No Impact",
                    color: colorsGroups.negativeColorForStrategies,
                });
            }

            // Limiting Effect
            const isLimitingEffectShowing = colors.some(
                (color) => color === PaymentTermsStrategiesUtils.STRATEGY_COLOR_LIMITING_EFFECT
            );

            if (isLimitingEffectShowing) {
                legend.push({
                    text: "Limiting Effect",
                    color: PaymentTermsStrategiesUtils.STRATEGY_COLOR_LIMITING_EFFECT,
                });
            }

            return legend;
        });

        const legendItemsArray = computed(() => {
            return termsStrategiesTermsLegendItems.value
        })

        function setColorByStrategyKey(strategy: any) {

            const newStrategy = ObjectUtils.cloneDeep(strategy);

                newStrategy.color ??= PaymentTermsStrategiesUtils.STRATEGY_COLOR_DEFAULT; 

                // Validate. If not passed, set default color.
                if (isNullOrUndefined(strategy.terms)) {
                    return newStrategy.color
                }

                if (!strategy.isApplicable || !strategy.isAllowed) {
                    return newStrategy.color
                }

                if (strategy.key === "regulatoryTermsStrategy") {
                    if (strategy.isRegulated) {              
                    return ColorsUtils.primary[500]                    
                    } else {
                    return newStrategy.color
                    }
                }
                
                if (            
                    strategy.key === "buyerStandardStrategy"
                ) {

                    newStrategy.color = PaymentTermsStrategiesUtils.getColorByStrategyKey(
                    strategy.key,
                    {
                        strategies: objDataTermsVisible.value,
                        paymentTerms: data.objDataTerms,
                    }
                    );

                    return newStrategy.color
                }

                newStrategy.color = PaymentTermsStrategiesUtils.getColorByStrategyKey(
                    strategy.key
                );

                return newStrategy.color
        }


        return {
            ...toRefs(data), setBarSize, PaymentTermsStrategiesUtils, hasTargetTermsAppliedComputed, legendItemsArray, setColorByStrategyKey, objDataTermsVisible
        }
    }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

.container-terms {
    padding-left: 0px !important;
}

.scf-badge {
    position: absolute;
    top: 0;
    right: 0;
    padding: 6px 12px;
    border-radius: 4px;
    background-color: #E5E7EB;
    font-size: 0.75rem;
    font-weight: 400;
    color: #4B5563;
    z-index: 1;
    
    span {
        white-space: nowrap;
    }
}

// Responsive adjustments
@media (max-width: 768px) {
    .scf-badge {
        position: static;
        display: inline-block;
        margin-bottom: 0.5rem;
    }
}
</style>