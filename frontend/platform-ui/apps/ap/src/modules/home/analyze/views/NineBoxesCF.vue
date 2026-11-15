<template>
<div class="card">
  <div class="card-body">
    <div class="row">
      <div class="col-12 d-flex justify-content-between row-100">
        <h4 class="font-semibold ml-3">{{ '9 Boxes ' + title9box }}</h4>
        <CalculumDropdownOptions v-if="vCardEnabled || financingEnabled || financingEnabledSCFProvider" :selectedChart="currentTab" :listOptions="options" :widthDropdownPercent="'20%'" @selectMetricDropdown="change9box"></CalculumDropdownOptions>
      </div>
      <div class="col-12 mt-4">
        <HomeAnalyzeProgramNineBoxes v-if="currentTab === 'cashFlow'" :selectedProgramId="selectedProgramId" :programData="programData" :forceReload="forceReload" :yAxisTitle="$t('home.plan.planPhase.probabilitySuccess')" :xAxisTitle="$t('global.buyerImpactXaxis')" :boxTitle="$t('global.cashFlowOpportunity')" :typeOf9Boxes="'cashFlow'" :inRecalculation="programInrecalculation" :nineBoxTitle="$t('home.analyze.analyzeProgramOverview.nineBoxesButton')" @change-tab="$emit('change-tab', $event)"> </HomeAnalyzeProgramNineBoxes>
        <HomeAnalyzeProgramNineBoxes v-if="currentTab === 'vcard' && vCardEnabled" :selectedProgramId="selectedProgramId" :programData="programData" :forceReload="forceReload" :yAxisTitle="$t('home.analyze.analyzeProgramOverview.probabilityofAcceptance')" :xAxisTitle="$t('home.analyze.analyzeProgramOverview.economicProfit')" :boxTitle="$t('global.cashFlow')" :typeOf9Boxes="'vcard'" :inRecalculation="programInrecalculation" :nineBoxTitle="$t('home.analyze.analyzeProgramOverview.nineBoxesButtonVcard')" @change-tab="$emit('change-tab', $event)"></HomeAnalyzeProgramNineBoxes>
        <HomeAnalyzeProgramNineBoxes v-if="currentTab === 'financing' && financingEnabledSCFProvider" :selectedProgramId="selectedProgramId" :programData="programData" :forceReload="forceReload" :yAxisTitle="$t('global.valueToSupplier')" :xAxisTitle="$t('global.potentialScfRevenue')" :boxTitle="$t('global.potentialRevenue')" :typeOf9Boxes="'financing'" :inRecalculation="programInrecalculation" :nineBoxTitle="$t('home.analyze.analyzeProgramOverview.nineBoxesButtonFinancing')" @change-tab="$emit('change-tab', $event)"></HomeAnalyzeProgramNineBoxes>
        <HomeAnalyzeProgramNineBoxes v-if="currentTab === 'scf9Box' && financingEnabled" :selectedProgramId="selectedProgramId" :programData="programData" :forceReload="forceReload" :yAxisTitle="$t('global.valueToSupplier')" :xAxisTitle="$t('global.buyerImpact9boxAxis')" :boxTitle="$t('global.buyerImpact9box')" :typeOf9Boxes="'scf9Box'" :inRecalculation="programInrecalculation" :nineBoxTitle="$t('home.analyze.analyzeProgramOverview.nineBoxesButtonFinancing')" @change-tab="$emit('change-tab', $event)"> </HomeAnalyzeProgramNineBoxes>
      </div>
    </div>
  </div>
</div>
</template>
<script lang="ts">
import { defineComponent, ref, watch, reactive, toRefs } from 'vue'
import HomeAnalyzeProgramNineBoxes from '@/modules/home/analyze/views/HomeAnalyzeProgramNineBoxes.vue'
import type { PropType } from 'vue';
import { Program } from '../types';
import iconCheckCircleFill from "@/resources/assets/images/icons/checkDefault.vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import CalculumDropdownOptions from '@/modules/home/components/CalculumDropdownOptions.vue'
import { useI18n } from 'vue-i18n'
import { Skeleton } from '@progress/kendo-vue-indicators';
import { ProgramSelectedAndStatus } from '@/types';
import { useUserStore } from '@/stores/user';
import { useUser } from '@/composables';

export default defineComponent({
    name: 'NineBoxesCF',
    components: { HomeAnalyzeProgramNineBoxes, iconCheckCircleFill, CalculumTooltipIcon, CalculumDropdownOptions, Skeleton },
    props: {
        showTeaserView: { type: Boolean, required: false },
        selectedProgramId: { type: String, required: true },
        programData: { type: Object as PropType<Program>, required: true },
        forceReload: { type: Boolean, required: false, default: false },
        inRecalculation: { type: Boolean, required: true, default: false },
        vCardEnabled: { type: Boolean, required: true, default: false },
        programValues: { type: Object as PropType<ProgramSelectedAndStatus>, required: true }
    },
    emits: ['change-tab'],
    setup(props) {
        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
        const {
            userPartnerRoleEnabled,
            useFeature9BoxesFinancing
        } = useUser();
        const userStore = useUserStore();
        interface Data9box {
            currentTab: string,
            options: any,
            title9box: string,
            financingEnabled: boolean,
            financingEnabledSCFProvider: boolean
        }

        //- SCF
        const isFinancingEnabled = () => {
            const teaserFinancing = !props.showTeaserView && props.programData.externalFinancingEnabled
            return teaserFinancing && useFeature9BoxesFinancing.value
        }

        //- SCF (Provider)
        const isFinancingEnabledSCFProvider = () => {
            const teaserFinancing = !props.showTeaserView && props.programData.externalFinancingEnabled
            return teaserFinancing && userPartnerRoleEnabled.value && useFeature9BoxesFinancing.value
        }



        const getTitleBox = () => {
            switch (setActiveTab()) {
                case 'vcard':
                    return translate.t('home.homeCompanySettings.cardGroups.cardGroupsTitleTab')
                case 'financing':
                    return translate.t('global.scfProvider')
                case 'scf9Box':
                    return translate.t('global.scf9BoxTitle')
                default:
                    return translate.t('global.termExtension')
            }
        }
        const data = reactive<Data9box>({
            currentTab: setActiveTab(),
            options: getOptionsAvailable(),
            title9box: getTitleBox(),
            financingEnabled: isFinancingEnabled(),
            financingEnabledSCFProvider: isFinancingEnabledSCFProvider()
        })

        function setActiveTab() {
            if (userStore.getLast9boxOptionVisited) {
                const vcard = userStore.getLast9boxOptionVisited === 'vcard' && props.vCardEnabled
                const financing = userStore.getLast9boxOptionVisited === 'financing' && isFinancingEnabledSCFProvider()
                const scf9Box = userStore.getLast9boxOptionVisited === 'scf9Box' && isFinancingEnabled()
                if (vcard || financing || scf9Box) {
                    return userStore.getLast9boxOptionVisited
                }
            } else if (isFinancingEnabledSCFProvider()) {
                return 'financing'
            } 
            else if (isFinancingEnabled()) {
                return 'scf9Box'
            }
            else if (props.vCardEnabled) {
                return 'vcard'
            }
            return 'cashFlow'
        }

        function getOptionsAvailable() {
            const options = [
                { title: translate.t('global.termExtension'), value: 'cashFlow' },

            ]
            if (isFinancingEnabledSCFProvider()) {
                options.push({ title: translate.t('global.scfProvider'), value: 'financing'})                
            }
            
            if (isFinancingEnabled()) {                
                options.push({ title: translate.t('global.scf9BoxTitle'), value: 'scf9Box'})
            }

            if (props.vCardEnabled) {
                options.push({ title: translate.t('home.homeCompanySettings.cardGroups.cardGroupsTitleTab'), value: 'vcard'})
            }
            return options
        }

        function selectTab(tab: string) {
            data.currentTab = tab
        }

        const programInrecalculation = ref(props.inRecalculation)

        watch(() => props.inRecalculation, () => {
            programInrecalculation.value = props.inRecalculation
        }, { deep: true })

        function change9box(tab: string, title: string) {

            userStore.setLast9boxOptionVisited(tab);

            data.currentTab = tab
            data.title9box = title
        }



        return {
            ...toRefs(data),
            programInrecalculation,
            selectTab,
            change9box
        }
    }
})
</script>
<style lang="scss" scoped>
.card {
    padding: 0px !important;
}
</style>