<template>
<CalculumLoading v-if="loadingPatch" :modal="true"></CalculumLoading>
<CalculumMoveBetweenModal v-if="displayModelForMoveBetween" @close="userRejectedMoveBetween" @approve="userApprovedMoveBetween" @cancel="userRejectedMoveBetween"></CalculumMoveBetweenModal>
<CalculumCreditRatingTableModal v-if="isModalEntityCreditRatingShowing" @close="() => isModalEntityCreditRatingShowing = false" @userHitEscapeKey="() => isModalEntityCreditRatingShowing = false" :creditModal="creditData ?? []"></CalculumCreditRatingTableModal>
<ModalBuyerLeverage v-if="isModalShowing" @close="() => isModalShowing = false" :entity-characteristics="entityCharacteristics"></ModalBuyerLeverage>
<div class="row" v-if="loading">
  <div class="col-12">
    <FinancingSkeleton></FinancingSkeleton>
  </div>
</div>
<div class="row" v-if="!loading && !belongtoProgram">
  <div class="col-12 mb-2">
    <div class="entity container-entitycard">
      <div class="row row-100">
        <div class="card shadow-none w-100">
          <div class="card-body d-flex flex-column"></div>
          <div class="card-body-disabled-custom"><span>{{ $t('home.entityCard.warningNoBelongToProgram') }}</span></div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="row" v-if="!loading && belongtoProgram">
  <div class="col-12 mb-2">
    <TabStrip v-if="tabs.length > 1" @select="entityCardNegotiationTabsOnTabSelect" :selected="selectedTabIndex" :tabs="tabs" id="kendo-k-tabstrib-items-entiticard-negotiation">
      <template v-slot:program="{ props }"><span class="inProgram results-tabs">{{ props.title }}</span></template>
      <template v-slot:noBelongProgram="{ props }">                       <span class="outProgram results-tabs" :title="'This Spend does not belong to a program'">{{ props.title }}</span></template>
    </TabStrip>
  </div>
</div>
<div class="row" v-if="!loading && dontHaveSCF">
  <div class="col-12 mb-2">
    <div class="entity container-entitycard">
      <div class="row row-100">
        <div class="card shadow-none w-100">
          <div class="card-body d-flex flex-column"></div>
          <div class="card-body-disabled-custom"><span>{{ 'No SCF analysis available' }}</span></div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="row" v-if="!loading && belongtoProgram && !dontHaveSCF">
  <div class="col-3">
    <div class="row">
      <div class="col-6">
        <div class="card financing-card d-flex flex-column justify-content-between">
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="text-sm font-bold ellipsis_texts" :title="$t('global.spendVolume')">{{ $t('global.spendVolume') }}
              <CalculumTooltipIcon class="ml-2" :infoText="$t('global.financingTab.spendVolumeTooltip')">  </CalculumTooltipIcon></span></Tooltip><span class="text-4xl font-bold ellipsis_texts mb-2">{{ StringUtils.formatBigNumbers(scfAnalysisResponse.volume) }}</span>
        </div>
      </div>
      <div class="col-6">
        <div class="card financing-card d-flex flex-column justify-content-between">
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="text-sm font-bold" :title="$t('home.entityCard.buyerLeverageMateriality')">{{ $t('home.entityCard.buyerLeverageMateriality') }}                            </span></Tooltip><span class="text-4xl font-bold ellipsis_texts mb-2" :title="scfAnalysisResponse.buyerLeverageDescription">{{ scfAnalysisResponse.buyerLeverageDescription ?? '-' }}</span>
          <div class="d-flex text-sm text-capitalize text-gray-500 end-justify-content details-section-button">             <span @click="() => isModalShowing = true">{{ $t('home.entityCard.showDetails') }}</span>
            <InformationCircleSvg class="mr-0 icon-svg fill-current my-auto"></InformationCircleSvg>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-6">
    <div class="row">
      <div class="col-6">
        <div class="card financing-card">
          <div class="row">
            <div class="col-6 d-flex flex-column bg-gray-50">
              <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="text-sm font-bold ellipsis_texts mb-4" :title="$t('global.financingTab.buyingEntities')">{{ $t('global.financingTab.buyingEntities') }}                                    </span></Tooltip>
              <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="text-lg font-bold ellipsis_texts" :title="scfAnalysisResponse.entityDetails.buyerName">{{ scfAnalysisResponse.entityDetails.buyerName ?? '-' }}                                    </span></Tooltip>
            </div>
            <div class="col-6 d-flex flex-column bg-white">
              <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="mb-2 text-sm font-bold ellipsis_texts mb-4" :title="$t('global.financingTab.categoryManager')">{{ $t('global.financingTab.categoryManager') }}                                    </span></Tooltip>
              <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="text-lg font-bold ellipsis_texts" :title="scfAnalysisResponse.entityDetails.team">{{ scfAnalysisResponse.entityDetails.team ?? '-' }}</span></Tooltip>
            </div>
          </div>
        </div>
      </div>
      <div class="col-6">
        <div class="card financing-card">
          <div class="row">
            <div class="col-6 d-flex flex-column bg-white">
              <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="text-sm font-bold ellipsis_texts mb-4" :title="$t('global.financingTab.commodity')">{{ $t('global.financingTab.commodity') }}                                    </span></Tooltip>
              <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="text-lg font-bold ellipsis_texts" :title="scfAnalysisResponse.industryDetails.commodity">{{ scfAnalysisResponse.industryDetails.commodity ?? '-' }}</span></Tooltip>
            </div>
            <div class="col-6 d-flex flex-column bg-gray-50">
              <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="mb-2 text-sm font-bold ellipsis_texts mb-4" :title="$t('home.analyze.industry')">{{ $t('home.analyze.industry') }}</span></Tooltip>
              <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="text-lg font-bold ellipsis_texts" :title="scfAnalysisResponse.industryDetails.industryName">{{ scfAnalysisResponse.industryDetails.industryName ?? '-' }}</span></Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-3">
    <div class="row">
      <div class="col-5">
        <div class="card financing-card d-flex flex-column justify-content-between">
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="text-sm font-bold" :title="$t('global.financingTab.invoiceCurrency')">{{ $t('global.financingTab.invoiceCurrency') }}                            </span></Tooltip>
          <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="text-4xl font-bold ellipsis-texts-currency" :title="scfAnalysisResponse.entityDetails.currencies ?? '-'">{{ scfAnalysisResponse.entityDetails.currencies ?? '-' }}</span></Tooltip>
        </div>
      </div>
      <div class="col-7">
        <div class="card financing-card">
          <div class="row">
            <div class="col-12 d-flex flex-column bg-white">
              <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="mb-2 text-sm font-bold ellipsis_texts mb-4" :title="$t('global.financingTab.parentOrganization')">{{ $t('global.financingTab.parentOrganization') }}
                  <CalculumTooltipIcon class="ml-2" :infoText="$t('global.financingTab.parentOrganizationTooltip')">  </CalculumTooltipIcon></span></Tooltip>
              <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="text-lg font-bold ellipsis_texts" :title="scfAnalysisResponse.entityDetails.ultimateParentCompanyName">{{ scfAnalysisResponse.entityDetails.ultimateParentCompanyName ?? '-' }}</span></Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="row mt-2" v-if="!loading && belongtoProgram && !dontHaveSCF">
  <div class="col-3">
    <div class="row">
      <div class="col-12">
        <div class="card side-card-container"><span class="text-base font-bold">{{ $t('global.paymentTermsD') }}</span>
          <div class="row text-center side-bar-content p-4">
            <div class="col-5 d-flex flex-column bg-for-values"><span class="text-sm font-bold side-bar-subtitle text-sm text-gray-400">{{ $t('global.current') }}</span><span class="font-bold text-4xl">{{ scfAnalysisResponse.currentPaymentTerms ?? '-' }}</span></div>
            <div class="col-2 d-flex flex-column text-center align-items-center bg-for-values"><span class="text-base font-bold side-bar-subtitle text-sm text-gray-400">{{ '' }}</span>
              <ArrowFinancing></ArrowFinancing>
            </div>
            <div class="col-5 d-flex flex-column bg-for-values" :class="{'bg-for-values-green-target': Number(scfAnalysisResponse.targetPaymentTerms) > Number(scfAnalysisResponse.currentPaymentTerms)}"><span class="text-sm font-bold side-bar-subtitle text-sm text-gray-400">{{ $t('global.target') }}</span><span class="font-bold text-4xl">{{ scfAnalysisResponse.targetPaymentTerms ?? '-' }}</span></div>
          </div>
        </div>
      </div>
      <div class="col-12 mt-2">
        <div class="card side-card-container"><span class="text-base font-bold">{{ $t('global.buyerImpact9box') }}</span>
          <div class="row text-center side-bar-content p-4">
            <div class="col-5 d-flex flex-column"><span class="text-sm font-bold side-bar-subtitle text-sm text-gray-400">{{ $t('global.cashFlow') }}</span><span class="font-bold text-4xl">{{ StringUtils.formatBigNumbers(scfAnalysisResponse.buyerImpactCashFlow) }}</span></div>
            <div class="col-2 d-flex flex-column"><span class="text-base font-bold side-bar-subtitle text-sm text-gray-400">{{ '' }}</span></div>
            <div class="col-5 d-flex flex-column"><span class="text-sm font-bold side-bar-subtitle text-sm text-gray-400">{{ $t('global.economicProfit') }}</span><span class="font-bold text-4xl">{{ StringUtils.formatBigNumbers(scfAnalysisResponse.buyerImpactEconomicProfit) }}</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-6">
    <div class="card radar-chart-container">
      <div class="row">
        <div class="col-12"><span class="text-base font-bold">{{ $t('global.financingTab.financingOpportunity') }}</span></div>
        <div class="col-5 mt-2">
          <RadarChart :radarData="scfAnalysisResponse.dataToChart"></RadarChart>
        </div>
        <div class="col-7">
          <div class="row">
            <div class="col-4">
              <LevelCards :title="'priority'" :level="scfAnalysisResponse.priority" :fontSize="'text-5xl'"></LevelCards>
            </div>
            <div class="col-4">
              <LevelCards :title="'valueofSCFtoSupplier'" :level="scfAnalysisResponse.scfValue" :fontSize="'text-xl'"></LevelCards>
            </div>
            <div class="col-4">
              <LevelCards :title="'cashFlowImpact'" :level="scfAnalysisResponse.cashFlowImpact" :fontSize="'text-xl'"></LevelCards>
            </div>
            <div class="col-12 script-bg-gray-50-first show-scroll mt-2">
              <template v-for="radarText in scfAnalysisResponse.dataToChart">
                <p class="text-justify" v-if="!StringUtils.isNullUndefinedOrEmpty(radarText.text)"><span class="font-semibold">{{ radarText.name+ " - " }}</span><span class="text-justify" v-html="radarText.text"></span></p>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-3">
    <div class="row">
      <div class="col-12">
        <div class="card side-card-container"><span class="text-base font-bold">{{ $t('global.supplierStatus') }}</span>
          <div class="row mt-2">
            <div class="col-12 d-flex flex-column mb-6">
              <PillLabelNumberBadge v-if="showPillComponentByconditions" :labelClasses="negotiationStatusPillColorClasses" :label="negotiationStatusFormatted" :hasDropdown="true" :hasHoverStyle="true" :validateBelongToAplan="validateBelongToAplan" :customDropdownPosition="true" :key="keyPillComponent" @toggle-contacted="negotiationStatusIsContactedOnToggle"></PillLabelNumberBadge>
              <PillLabelNumberBadgeParentSupplierLevel v-if="!showPillComponentByconditions" :labelClasses="negotiationStatusPillColorClasses" :label="negotiationStatusFormatted" :labels="negotiationStatusCodes" :hasDropdown="true" :hasHoverStyle="true" :validateBelongToAplan="validateBelongToAplan" :customDropdownPosition="true" :key="keyPillComponent" @toggle-change-status="negotiationStatusIsContactedOnToggleParentSupplierLevel"></PillLabelNumberBadgeParentSupplierLevel>
            </div>
          </div><span class="text-base font-bold" v-if="modulePlanIsAvailable">{{ $t('global.financingTab.plans') }}</span>
          <div class="row mt-2" v-if="modulePlanIsAvailable">
            <div class="col-12 d-flex flex-column justify-content-between gap-1" @mouseleave="() => showMoveBetween = false">
              <div class="d-flex box-badges"><img class="img-icon plan-icon" :src="fontIcons.plan" alt="plan icon"/>
                <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'"><span class="data-plan-status" @click="() => showMoveBetween = !showMoveBetween" :title="setPlanName">{{ `${setPlanName}` }}</span></Tooltip>
              </div>
              <div class="nested-popover-container" @mouseleave="() => showMoveBetween = false">
                <CalculumNested class="popover-nested" :items="planPhasesData" @selected-phase="getDataMoveBetweenModal" v-if="showMoveBetween && planPhasesData.length > 0"></CalculumNested><span class="popover-nested" v-else-if="showMoveBetween && planPhasesData.length === 0">{{ $t('home.analyze.moveBetweenPlanPhasesEmptyList') }}    </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 mt-2">
        <div class="card side-card-container"><span class="text-base font-bold">{{ $t('global.financingTab.rateComparison') }}</span>
          <div class="row side-bar-content text-center">
            <div class="col-6 script-bg-gray-50 d-flex flex-column justify-content-between"><span class="text-base font-bold side-bar-subtitle text-sm text-gray-400">{{ $t('global.financingTab.scfRate') }}
                <CalculumTooltipIcon class="ml-2" :infoText="$t('global.financingTab.scfRateTooltip')">  </CalculumTooltipIcon></span><span class="font-bold text-4xl opportunity-rebate">{{ scfAnalysisResponse.scfRate ? getNumberWithDecimals(scfAnalysisResponse.scfRate, 2) + '%' : '-' }}</span></div>
            <div class="col-6 script-bg-white d-flex flex-column justify-content-between"><span class="text-base font-bold side-bar-subtitle text-sm text-gray-400">{{ $t('global.financingTab.costOfDebs') }}
                <CalculumTooltipIcon class="ml-2" :infoText="$t('global.financingTab.costOfDebsTooltip')">  </CalculumTooltipIcon></span><span class="font-bold text-4xl opportunity-rebate">{{ scfAnalysisResponse.costOfDebs ?getNumberWithDecimals(scfAnalysisResponse.costOfDebs, 2) + '%' : '-' }}</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="row mt-2" v-if="!loading && belongtoProgram && !dontHaveSCF">
  <div class="col-12">
    <div class="card"><span class="text-base font-bold">{{ $t('global.financingTab.supplierImpact') }}</span>
      <div class="row custom-gap">
        <div class="col-custom-left">
          <SupplierImpactTable :data="scfAnalysisResponse.supplierImpact"></SupplierImpactTable>
        </div>
        <div class="col-custom-right script-bg-gray-50">
          <template v-for="adabotText in scfAnalysisResponse.supplierImpactText">
            <p class="text-justify" v-html="adabotText"></p>
          </template>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import StatusBadgeContainer from "@/modules/components/badge/StatusBadgeContainer.vue";
import { defineComponent, ref, computed, onMounted, onActivated, reactive, toRefs, ComputedRef, watch } from 'vue';
import {Tooltip} from "@progress/kendo-vue-tooltip";
import RadarChart from "@/modules/components/charts/kendo/RadarChart.vue";
import LevelCards from "@/modules/components/cards/LevelCards.vue";
import SupplierImpactTable from "@/modules/components/table/SupplierImpactTable.vue";
import InformationCircleSvg from '@/resources/assets/images/icons/svg/nav/InformationCircleSvg.vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import type { PropType } from 'vue';
import { EntityCard, NegotiationStatus, SpendLine } from '@/types';
import PillLabelNumberBadge from "@/modules/components/PillLabelNumberBadge.vue";
import useNegotiationStatus from "@/modules/negotiationStatus/composables/useNegotiationStatus";
import { TabStrip } from "@progress/kendo-vue-layout";
import {useI18n} from "vue-i18n";
import {  
  ENTITY_SPENDFILE_LEVEL_TYPE,
  StringUtils,
  isNullOrUndefined,
  NumberUtils  
} from "@/utils";
import { useEntityCardStore } from '@/stores/entityCard'
import { shouldRefreshFinancingTab } from '@/utils/EntityCardUtils'
import FinancingSkeleton from "@/modules/home/components/skeletons/FinancingSkeleton.vue";
import type { ScfAnalysisResponse } from '@/modules/home/entityCard/types';
import ArrowFinancing from '@/modules/components/icons/ArrowFinancing.vue'
import ModalBuyerLeverage from "@/modules/home/entityCard/components/modals/ModalBuyerLeverage.vue";
import CalculumCreditRatingTableModal from "@/modules/components/CalculumCreditRatingTableModal.vue";
import PillLabelNumberBadgeParentSupplierLevel from "@/modules/components/PillLabelNumberBadgeParentSupplierLevel.vue";
import { useNegotiationStatusStore } from '@/stores/negotiationStatus';
import { useUser, useSpendFile, useCompany, useModulePlan } from "@/composables";
import { useToast } from 'vue-toastification';
import { fontIcons } from "@/resources/assets/assets";
import { CalculumTreeItem } from "@/modules/components/types";
import { usePlanStore } from '@/stores/plan';
import CalculumNested from '@/modules/components/tree/CalculumNested.vue';
import CalculumMoveBetweenModal from "@/modules/components/CalculumMoveBetweenModal.vue";
import { useAnalyzeStore } from '@/stores/analyze';
import { CalculumLoading } from '@ada/design-system'
import { getNumberWithDecimals } from '@/utils/FormatData';

export default defineComponent({
  name: "EntityCardFinancing",
  components: { Tooltip, RadarChart, LevelCards, StatusBadgeContainer, SupplierImpactTable, InformationCircleSvg, CalculumTooltipIcon, PillLabelNumberBadge, TabStrip, FinancingSkeleton, ArrowFinancing, ModalBuyerLeverage,
    CalculumCreditRatingTableModal, PillLabelNumberBadgeParentSupplierLevel, CalculumNested, CalculumMoveBetweenModal, CalculumLoading },
  props: {
    entityDetails: { type: Object as PropType<EntityCard.EntityDetails>, required: true },
    companyId: { type: String, required: true },
    companyType: { type: String, required: true },    
    programUuid: { type: String, required: true },
    creditData: { type: Object, required: true },
    entityCharacteristics: { type: Object, required: true },
    retrieveAllSpends: { type: Object, required: true },
  },
  emits: ["change-data"],
  setup(props: any, { emit }) {

    /**
     * ModalBuyerLeverage
     * 
     * CalculumCreditRatingTableModal
     */

    const entityCardStore = useEntityCardStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const negotiationStatusStore = useNegotiationStatusStore();
    const { spendFileVersionActiveId } = useSpendFile();
    const toast = useToast()
    const planStore = usePlanStore();
    const analyzeStore = useAnalyzeStore();

    const {
      negotiationStatusGetStatusTranslated,
      negotiationStatusGetPillColorClasses      
    } = useNegotiationStatus();

    interface DataInterface {
        industryCommodity: {
            industryName: string,
            industryNaics: string,
            industryIsic: string,
            commodity: string,
            unspsc: string
        },
        selectedTabIndex: number,
        tabs: Array<any>,
        levelType: string,
        tabsData: Array<any>,
        belongtoProgram: boolean,
        spendUuid: string,
        spendConfigurationUuid: string,
        loading: boolean,
        scfAnalysisResponse: ScfAnalysisResponse,
        isModalEntityCreditRatingShowing: boolean,
        isModalShowing: boolean,
        planPhasesData: CalculumTreeItem[],
        showMoveBetween: boolean,
        displayModelForMoveBetween: boolean,
        emitParamsFromCalculumTreeSelect: any | null,
        loadingPatch: boolean,
        dontHaveSCF: boolean,
        keyPillComponent: number
    }
    const data = reactive<DataInterface>({
        industryCommodity: {
            industryName: '-',
            industryNaics: '-',
            industryIsic: '-',
            commodity: '-',
            unspsc: '-'
        },
        selectedTabIndex: 0,
        tabs: [],
        levelType: '',
        tabsData: [],
        belongtoProgram: false,
        spendUuid: '',
        spendConfigurationUuid: '',
        loading: true,
        scfAnalysisResponse: {} as ScfAnalysisResponse,
        isModalEntityCreditRatingShowing: false,
        isModalShowing: false,
        planPhasesData: [],
        showMoveBetween: false,
        displayModelForMoveBetween: false,
        emitParamsFromCalculumTreeSelect: null,
        loadingPatch: false,
        dontHaveSCF: false,
        keyPillComponent: NumberUtils.getRandomInt()
    })


    const {
      modulePlanIsAvailable,
    } = useModulePlan();

    const negotiationStatusFormatted = computed(() => {
      try {
        if (StringUtils.isNullUndefinedOrEmpty(data.scfAnalysisResponse.negotiationStatus)) {
          return '-'
        }
        return negotiationStatusGetStatusTranslated(
          data.scfAnalysisResponse.negotiationStatus,
        );
      } catch (error) {
        return "";
      }
    });


    const negotiationStatusPillColorClasses = computed(() => {
      try {
        
        if (StringUtils.isNullUndefinedOrEmpty(data.scfAnalysisResponse.negotiationStatus)) {
          return '-'
        }

        return negotiationStatusGetPillColorClasses(
          data.scfAnalysisResponse.negotiationStatus,
        );
      } catch (error) {
        return "";
      }
    });

    const entityParentCompanyName = computed(() => {
        if (StringUtils.isNullUndefinedOrEmpty(props.entityDetails.ultimateParentCompanyName)) {
          return null
        }

      return props.entityDetails.ultimateParentCompanyName
    })


    const getPlan = computed(() => {
        if (StringUtils.isNullUndefinedOrEmpty(props.entityDetails.planNamePhaseStatus)) {
          return '-'
        }
        return props.entityDetails.planNamePhaseStatus.split('-')[0]
    })

    const getPhase = computed(() => {
        if (StringUtils.isNullUndefinedOrEmpty(props.entityDetails.planNamePhaseStatus)) {
          return '-'
        }
        return props.entityDetails.planNamePhaseStatus.split('-')[1]
    })

    const getCurrency = computed(() => {
        if (StringUtils.isNullUndefinedOrEmpty(props.entityDetails.currencies)) {
          return '-'
        }
        return props.entityDetails.currencies
    })

     
    function tabsGetTabTitleByAlias({ alias, forRows, i, }: {
      alias: string;
      forRows: number;
      i: number;
    }): string {
      // Only one tab
      if (forRows === 1) {
        return translate.t("global.allSpendLines");
      }

      // More than one
      // Default title
      if (StringUtils.isNullUndefinedOrEmpty(alias)) {
        return "Spend " + (i + 1);
      }

      // Has alias
      return alias;
    }

    function setTabs(): void {
      

      let forRows = 0;
      if (props.companyType === 'parent') {
        forRows = 1;
      } else if (data.tabsData.length > 0) {
        forRows = data.tabsData.length;
      }
      const newTabs: any[] = []
      for (let i = 0; i < forRows; i++) {


        
        let tabTitle: string = tabsGetTabTitleByAlias({
          alias: data.tabsData[i].alias ?? "",
          forRows,
          i,
        });

        let titleRender = "";

        if (data.tabsData[i].uuid) {
          titleRender = data.tabsData[i].disabled || StringUtils.isNullUndefinedOrEmpty(data.tabsData[i].financingGroup)
            ? "noBelongProgram"
            : "program";
        } else {
          titleRender = "noBelongProgram";
        }

        const newTab = {
          id: data.tabsData[i].id,
          title: tabTitle,
          tabIndex: i,          
          hasResults: data.tabsData[i].hasResults,
          contentClassName: "classContentHide",
          titleRender,
          disabled: data.tabsData[i].disabled || StringUtils.isNullUndefinedOrEmpty(data.tabsData[i].financingGroup)
        };
        newTabs.push(newTab);
        
      }
      const supplier = newTabs[0]
      const sortedArray = newTabs.slice(1).sort((a, b) => b.volume - a.volume);
      data.tabs = [supplier, ...sortedArray];
    }

    function entityCardNegotiationTabsOnTabSelect(
      e: any,
    ) {
      data.selectedTabIndex = e.selected;
    }


    const tabsDataTabSelected: ComputedRef<EntityCard.TabsData | null> =
      computed(() => {
        try {
          // Validate
          return data.tabsData[data.selectedTabIndex];
        } catch (error) {
          return null;
        }
      });

      watch(tabsDataTabSelected, () => {
      // Validate
      if (
        isNullOrUndefined(data.tabsData) ||
        isNullOrUndefined(tabsDataTabSelected.value)
      ) {
        return;
      }
      // Check if the tab belongs to a program
      data.belongtoProgram = tabsDataTabSelected.value.uuid
        ? !data.tabsData[data.selectedTabIndex].disabled
        : false;

      // Return if the tab does not belong to a program
      if (!data.belongtoProgram) {
        return;
      }

      // Spend configuration uuid
      data.spendUuid = tabsDataTabSelected.value.uuid;
      data.spendConfigurationUuid = tabsDataTabSelected.value.spendUUID;
      // The level type for first tab is the company type. The level type for the rest of tabs is spend
      data.levelType = data.selectedTabIndex === 0 ? props.companyType : "spend";
      getEntityFinancingTabbyLevel()

    });


    onMounted(() => {
        getAllPlans()
        postSpendsBySupplierAndButProgram()
    })

    /**
     * US-18713: keep the SCF figures in sync with Target/Agreed saves.
     *
     * The tab is cached by the <KeepAlive> in EntityCardOverview, so switching away and
     * back does NOT remount it and onMounted never runs again. The refetch is deferred to
     * the moment the tab becomes visible instead of firing on the token itself, which:
     *  - AC-04: costs nothing when no Target/Agreed change happened
     *  - AC-06: collapses several saves in a row into a single fetch
     *  - AC-10: reads props.programUuid at fetch time, so it follows the selected program
     * Saves always happen from the Opportunity tab, so the SCF tab is never the visible
     * one when the token moves (AF-2).
     */
    // Plain variable, not a ref: comparing the token on activation needs no watcher at all,
    // and it cannot be missed while the component sits deactivated inside the KeepAlive.
    let lastSeenScfRefreshToken = entityCardStore.getScfRefreshToken

    onActivated(() => {
      if (!shouldRefreshFinancingTab(lastSeenScfRefreshToken, entityCardStore.getScfRefreshToken, data.spendUuid)) {
        return
      }
      lastSeenScfRefreshToken = entityCardStore.getScfRefreshToken
      getEntityFinancingTabbyLevel()
    })


    //* api calls

    function postSpendsBySupplierAndButProgram(): void {

      
      // Validate
      if (StringUtils.isNullUndefinedOrEmpty(props.programUuid)) {
        if (import.meta.env.DEV)
          console.error("data.programUuid is null, undefined or empty");
        return;
      }

      data.loading = true

      

      const params = {
        companyId: props.companyId,
        programId: props.programUuid,
        callbackSuccess: (
          callbackSuccessData: EntityCard.SpendProgramConfigByProviderAPIResponse[],
        ) => {
          
          // Move to module and watch for spend program config changes
          // Add an id for each spend program config starting from 0
          data.tabsData = callbackSuccessData.map(
            (item, index: number) => {
              return {
                ...item,
                cashDiscountEnabled:
                  "cashDiscountEnabled" in item
                    ? item.cashDiscountEnabled
                    : false,
                cashDiscounts:
                  "cashDiscounts" in item ? item.cashDiscounts : null,
                hasResults: item.negotiationId,
                id: index.toString(),
              };
            },
          );


          // if (callbackSuccessData.length === 1) {
          //   data.tabsData = data.tabsData.filter((item) => !StringUtils.isNullUndefinedOrEmpty(item.financingGroup))
          // }
          

          // If the company is a parent, set the level type to parent
          if (props.companyType === 'parent') {
            data.levelType = props.companyType;            
          }
          // If there is only one spend line, set the level type to spend
          else if (callbackSuccessData.length === 1) {
            data.levelType = "spend";            
          }
          // If there are more than one spend line, set the level type
          // for the first tab to parent / supplier
          else if (callbackSuccessData.length === 0) {
            data.levelType = props.companyType;            
          }
          // and the rest to spend
          else {
            data.levelType = "spend";            
          }

          // If there are more than one spend line
          // Or if the company is a parent
          if (
            callbackSuccessData.length > 1 ||
            props.companyType === 'parent'
          ) {
            // Activate the all spends tab

            // Prepend the first tab to the tabs
            data.tabsData = [
              // Set first tab data
              {
                id: callbackSuccessData.length.toString(),
                alias: translate.t("global.allSpendLines"),
                disabled: false,
                spendUUID: callbackSuccessData[0].spendUUID, // Use the first id for spend
                uuid: callbackSuccessData[0].uuid, // Use the first id for spend configuration
                financingGroup: true                
              },
              // Append the rest
              ...data.tabsData,
            ];

        }

        // Check if the tab belongs to a program
        data.belongtoProgram = false;

        if (!isNullOrUndefined(tabsDataTabSelected.value)) {
          data.belongtoProgram = !tabsDataTabSelected.value.disabled;
        }

        if (!isNullOrUndefined(tabsDataTabSelected.value)) {
            // Spend configuration uuid
            data.spendUuid = tabsDataTabSelected.value.uuid;
          }

        
       

        data.tabs = [];
        if (data.tabs.length === 0) {
          setTabs();
        }
       
        },
        callbackError: (callbackErrorData: any) => {
          if (import.meta.env.DEV) {
            console.error(
              "** Error on getSpendsBySupplierAndButProgram: ",
              callbackErrorData,
            );
          }          
          data.loading = false
        },
      };
      entityCardStore.postSpendsBySupplierAndButProgram(params);
    }

    

   


    function getEntityFinancingTabbyLevel() {
      data.dontHaveSCF = false
      data.loading = true
      const params = {     
        companyId: props.companyId,
        programUUID: props.programUuid,
        configUUID: data.spendUuid,
        level: data.levelType,        
        callbackSuccess: (callbackSuccessData: ScfAnalysisResponse) => {
          data.loading = false  
          data.scfAnalysisResponse = callbackSuccessData

        },
        callbackError: () => {
          data.loading = false  
          data.dontHaveSCF = true
          
        }
      }
      entityCardStore.getEntityFinancingTabbyLevel(params)
    }
    function extractIdFromUrl(url: string): string {
      return url.split("/").pop() || '';
    }

    function deepSortByLabel(data: CalculumTreeItem[]): CalculumTreeItem[] {
    // Order current pla by `label`
    const sorted = [...data].sort((a, b) => a.label.localeCompare(b.label));
    return sorted.map(item => ({
        ...item,
        children: item.children ? deepSortByLabel(item.children) : undefined,
    }));
}

  

    function getAllPlans() {


      if (!modulePlanIsAvailable.value) {
        return;
      }
      const globalParams = { spendFileVersion: spendFileVersionActiveId.value }
      data.planPhasesData = []
      const params1 = {
        marked: false,
        callbackSuccess: (callbackSuccessData: any) => {
          const gettingPlanPhases = callbackSuccessData
            .filter((planElement: any) => planElement) // Filters null/undefined elements
            .map((planElement: any) => {
              const idPlan = extractIdFromUrl(planElement['@id']);
              const level=1
              const phases = planElement.planPhases?.filter((phaseElement: any) => phaseElement) // Filters null phases
                .map((phaseElement: any) => ({
                  id: extractIdFromUrl(phaseElement['@id']),
                  label: phaseElement.name ? phaseElement.name:`${translate.t("home.plan.planPhase.phase")} ${phaseElement.number}`,
                  level:level+1
                })) || []; // Safe handling if planPhases is undefined

              return {
                id: idPlan,
                level:level,
                label: planElement.title,
                children: phases
              };
            });            
            gettingPlanPhases.value = deepSortByLabel(gettingPlanPhases)
            data.planPhasesData = gettingPlanPhases
          }
      }
      planStore.getAllPlans({ ...globalParams, ...params1 })
    }


    const negotiationStatusCodes = computed(() => {
      return props.entityDetails.negotiationStatusCodes;
    });

    function negotiationStatusIsContactedOnToggle(status: NegotiationStatus): void {
      
      // Toggle the negotiation status
      const newNegotiationStatus = status
      data.keyPillComponent++
      negotiationStatusAPIUpdate({
        negotiationStatus: newNegotiationStatus,
        spendId: props.companyType === ENTITY_SPENDFILE_LEVEL_TYPE.PARENT ? props.companyId : data.spendConfigurationUuid,
        level: props.companyType === ENTITY_SPENDFILE_LEVEL_TYPE.PARENT ? 'parent' : 'spend'
      });
    }

    function negotiationStatusIsContactedOnToggleParentSupplierLevel(status: NegotiationStatus): void {
      
      // Toggle the negotiation status
      const newNegotiationStatus = status
      data.keyPillComponent++
      negotiationStatusAPIUpdate({
        negotiationStatus: newNegotiationStatus,
        spendId: props.companyId,
        level: props.companyType === ENTITY_SPENDFILE_LEVEL_TYPE.SUPPLIER ? 'supplier' : 'parent'
      });
    }


    function negotiationStatusAPIUpdate({
      negotiationStatus,
      spendId,
      level
    }: {
      negotiationStatus: NegotiationStatus;
      spendId: string;
      level: string;
    }): void {
      try {
        // Validate
        if (StringUtils.isNullUndefinedOrEmpty(negotiationStatus)) {
          
          throw new Error("negotiationStatus is null, undefined or empty");
        }

        if (StringUtils.isNullUndefinedOrEmpty(spendId)) {
          
          throw new Error("spendId is null, undefined or empty");
        }

        if (StringUtils.isEmpty(spendFileVersionActiveId.value)) {
          
          throw new Error("spendFileVersionIdActive is empty");
        }

        
        data.loadingPatch = true;
        
        const params = {
          spendsIds: [spendId],
          negotiationStatus,
          spendFileVersionUuid: StringUtils.removeIRI(
            spendFileVersionActiveId.value,
          ),
          level,
          callbackSuccess: (callbackSuccessData: {
            result: "success" | "failed" | "warning";
            subject: string;
            summary: {
              changesCount: number;
              changedCount: number;
              suppliersCount: number;
            };
          }) => {
            const { result, subject, summary } = callbackSuccessData;
            // API call failed
            if (result === 'failed') {              
              throw new Error(`API call failed. Message: ${subject}`);
            }

            // API call succeeded
            
            // No changes
            if (summary.changedCount === 0) {
              toast.warning("No changes were applied.");
              
            }
            // All changes were applied
            else {
              toast.success("Your changes have been applied successfully.");

              
              // emit("change-data", data.selectedTabIndex);
            }
            data.loadingPatch = false;

            
          },
          callbackError: (callbackErrorData: unknown) => {
            // Disable loading
            data.loadingPatch = false;
          },
        };

        negotiationStatusStore.negotiationStatusAPIUpdate(params);
      } catch (error) { 
        data.loadingPatch = false;
      }
    }
    
    const setPlanName = computed(() => {
      if (
        data.selectedTabIndex !== 0
      ) {
        const spendData = props.retrieveAllSpends.find(
          (x: any) =>
            x.spendUUID ===
            data.spendConfigurationUuid
        );

        console.log("** props.retrieveAllSpends: ", props.retrieveAllSpends);
        console.log("** data.spendConfigurationUuid: ", data.spendConfigurationUuid);
        console.log("** spendData: ", spendData);


        if (spendData) {
          return spendData.planName
            ? `${spendData.planName} - ${spendData.planPhase} - ${spendData.planStatus}`
            : translate.t("global.doesNotBelongToAnyPlan");
        } else {
          return translate.t("global.doesNotBelongToAnyPlan");
        }
      } else {
        return (
          props.entityDetails.planNamePhaseStatus ??
          translate.t("global.doesNotBelongToAnyPlan")
        );
      }
    });


    const validateBelongToAplan: ComputedRef<boolean> = computed(() => {
      if (        
        data.selectedTabIndex !== 0
      ) {        
        const spendData = props.retrieveAllSpends.find(
          (x: SpendLine) =>
            x.spendUUID ===
            data.spendConfigurationUuid
        );
        if (spendData) {
          return StringUtils.isNullUndefinedOrEmpty(spendData.planName)
            ? false
            : true;
        } else {
          return false;
        }
      } else {
        return (
          StringUtils.isNullUndefinedOrEmpty(props.entityDetails.planNamePhaseStatus) ? false : true
        );
      }
    });

    function getDataMoveBetweenModal(emitParamsFromCalculumTreeSelect: any) {
      data.displayModelForMoveBetween = true
      data.emitParamsFromCalculumTreeSelect = emitParamsFromCalculumTreeSelect
    }

    function userApprovedMoveBetween() {
      data.displayModelForMoveBetween = !data.displayModelForMoveBetween; 
      const changed = data.emitParamsFromCalculumTreeSelect
      const params = {
        program: StringUtils.removeIRI(props.programUuid),
        changed,
      };
      let spend_uuid = ''
      let set_level = ''

      if (data.levelType === ENTITY_SPENDFILE_LEVEL_TYPE.SPEND_LINE) {
        spend_uuid = data.spendConfigurationUuid;
        set_level = 'spends'
      } else {
        spend_uuid = props.companyId;
        set_level =  data.levelType === ENTITY_SPENDFILE_LEVEL_TYPE.SUPPLIER ? 'suppliers' :  'parents'
      }      
      postByGroup(params, "moveSpendToPhases",[spend_uuid],set_level);   
    }

    function postByGroup(getParams: any, type: string,items:any,level:string='') {
      data.loadingPatch = true;
      
      let uuids: Array<any> = [];
      uuids = items
      const params = {
        program: getParams.program,
        changed: getParams.changed,
        uuids: uuids,
        level:level || null,
        callbackSuccess: (callbackSuccessData: any) => {
          data.loadingPatch = false;
          // emit("change-data", data.selectedTabIndex);
        },
        callbackError: () => {
          data.loadingPatch = false;
          toast.error("ERROR updating data");
        },
      };
      analyzeStore.postProgramSpendConfigurationbyGroups(params);
    }
    
    function userRejectedMoveBetween() {
      data.displayModelForMoveBetween = !data.displayModelForMoveBetween;
    }

    const showPillComponentByconditions = computed(() => {
      
      if (data.levelType === ENTITY_SPENDFILE_LEVEL_TYPE.PARENT) {
        return true;
      }

      else if (data.levelType === ENTITY_SPENDFILE_LEVEL_TYPE.SUPPLIER && data.tabsData.length === 1)  {
        return true;
      }

      else if (data.levelType === ENTITY_SPENDFILE_LEVEL_TYPE.SPEND_LINE)  {
        return true;
      }

      else if (data.levelType === ENTITY_SPENDFILE_LEVEL_TYPE.SUPPLIER && data.tabsData.length > 1)  {
        return false;
      } 
      
      else {
        return false;
      }

    });


    return {
        ...toRefs(data),        
        negotiationStatusPillColorClasses,
        negotiationStatusFormatted,
        entityParentCompanyName,
        getPlan,
        getPhase,
        getCurrency,
        entityCardNegotiationTabsOnTabSelect,
        StringUtils,
        negotiationStatusCodes,
        negotiationStatusIsContactedOnToggleParentSupplierLevel,
        negotiationStatusIsContactedOnToggle,
        setPlanName,
        validateBelongToAplan,
        fontIcons,
        getDataMoveBetweenModal,
        userApprovedMoveBetween,
        userRejectedMoveBetween,
        showPillComponentByconditions,
        getNumberWithDecimals,
        modulePlanIsAvailable
        
    }
  }
  ,
})



</script>

<style scoped lang="scss">

@import "src/resources/assets/styles/variables/_colors";

.side-bar-subtitle{
    height: 30px !important;
}

.side-bar-content {
    height: 188px !important;
    align-content: center;
}

.radar-chart-container {
    min-height: 450px !important;
    max-height: 450px !important;
    margin-bottom: 0px !important;
}


.ellipsis-texts-currency {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ellipsis_texts {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.side-card-container {
    min-height: 221px !important;
    max-height: 221px !important;
    margin-bottom: 0px !important;
}


.financing-card {
    max-height: 130px !important;
    min-height: 130px !important;
    justify-content: center;
    margin-bottom: 0px !important;
}

.bg-gray-50 {
    padding: 9px 9px !important;
    background-color: $color-gray-50 !important;    
    min-height: 100px !important;
    border-radius: 8px;
}

.bg-white {
    padding: 9px 9px !important;
    min-height: 100px !important;

}

.script-bg-gray-50-first {
    padding: 16px 16px !important;
    background-color: $color-gray-50 !important;    
    min-height: 100px !important;
    max-height: 300px !important;
    border-radius: 8px;
}


.script-bg-gray-50 {
    padding: 16px 16px !important;
    background-color: $color-gray-50 !important;    
    min-height: 100px !important;
    border-radius: 8px;
}

.table-bg-white {
    padding: 16px 6px !important;
    background-color: #fff !important;    
    min-height: 100px !important;
    border-radius: 8px;
}


.script-bg-white {
    padding: 9px 6px !important;
    background-color: #fff !important;    
    min-height: 100px !important;
    border-radius: 8px;
}

@media screen and (max-width: 1408px) {
    .text-5xl {
        font-size: 1.50rem !important;
    }
}


.icon-svg {
  height: 15px;
}

.details-section-button {
    position: absolute;
    bottom: 10px;
    right: 5px;
    cursor: pointer;
}



.col-custom-left {
  width: 45%;
}

.col-custom-right {
  width: 54%;
}

.custom-gap {
  gap: 1% !important;
}


.align-items-center {
  align-items: center !important;
  justify-content: center !important;
}

.bg-for-values {

  background: white;
  padding: 20px;
  border-radius: 8px;
  // color: white !important;

  &-green-target {
    background: #20C997;

    color: white !important;
    .text-gray-400 {
      color: white !important;
    }

    .text-gray-700 {
      color: white !important;
    }

  }

}

img.img-icon.plan-icon {
  width: 14px !important;
}

</style>