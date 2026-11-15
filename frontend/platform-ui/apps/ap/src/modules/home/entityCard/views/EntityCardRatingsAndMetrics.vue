<template>
<CalculumModalConfirmAction v-if="showConfirmAllSpendModal" :actionDescription="$t('home.entityCard.details.confirmAllSpendChange')" @confirm-action="confirmAllSpendAction" @hide-modal="cancelAllSpendAction"></CalculumModalConfirmAction>
<CalculumCreditRatingTableModal v-if="isModalEntityCreditRatingShowing" @close="() => isModalEntityCreditRatingShowing = false" :creditModal="creditData ?? []"></CalculumCreditRatingTableModal>
<!--Financing WACC modal table-->
<CalculumFinancingTableModal v-if="isModalEntityWaccShowing" @close="() => isModalEntityWaccShowing = false" :financingModal="detailFinancialMetrics"></CalculumFinancingTableModal>
<ModalBuyerLeverage v-if="buyerLeverage.isModalShowing" @close="() => buyerLeverage.isModalShowing = false" :entity-characteristics="entityCharacteristics"></ModalBuyerLeverage>
<ModalCountryRating v-if="country.isModalShowing" @close="() => country.isModalShowing = false" :country="country"></ModalCountryRating>
<ModalDataDepth v-if="dataDepth.isModalShowing" @close="() => dataDepth.isModalShowing = false" :data-depth="dataDepth"></ModalDataDepth>
<ModalESG v-if="isModalESGShowing" @close="isModalESGShowing = false" :data="esg"></ModalESG>
<ModalDEI v-if="isModalDEIShowing" @close="isModalDEIShowing = false"></ModalDEI>
<div class="row mt-10">
  <div class="col-xl-4 col-lg-4" v-if="useFeatureCreditRating">
    <div class="card shadow-none" v-if="loading.creditScore || loadingCreditRating">
      <div class="card-body">
        <Skeleton shape="rectangle" style="width: 100%; height: 180px; border-radius: 4px;"></Skeleton>
      </div>
    </div>
    <EntityCardTextArc v-else @show-modal-details="() => isModalEntityCreditRatingShowing = true" @open-edit="toggleManageCreditRating" :grade-level-text="creditData?.supplier?.adaScoreDescription ?? ''" :letter-grade="creditRatingLetterGrade" :level="entityCRlevelByGradeLevelText" :loading="loading.creditScore" :show-edit-option="isSuperAdmin" :source="creditData?.supplier?.source ?? ''" :is-internal-override="isInternalOverride" :title="$t('global.companyCreditRating')" :tooltip-text="$t('home.overview.overallCreditScore')" :uniqueIdentifier="'popover-entitycard-country-ratings-creditRating'" :keyPopOver="'entityRatingsCountryCreditRating'" :useFeatureCreditRating="useFeatureCreditRating"></EntityCardTextArc>
    <Popup :anchor="'popover-entitycard-country-ratings-creditRating-pencil'" :show="showManageCreditRating" popup-class="credit-rating-edit-popup">
      <ManageCreditRatingAction v-if="showManageCreditRating" :currentValue="creditRatingLetterGrade" :option="'supplierCreditRating'" @call-action="handleCreditRatingChange"></ManageCreditRatingAction>
    </Popup>
  </div>
  <div class="col-xl-4 col-lg-4">
    <BigNumberTwoCols v-if="!isLoadingFundingCost && detailFinancialMetrics?.fundingCosts?.entity !== null && detailFinancialMetrics?.fundingCosts?.entity !== undefined" :title="$t('global.supplierFinancingRate')" :tooltip-text="$t('global.supplierFinancingRateTooltip')" :big-number-value="setBigNumberToSupplierfinancing" :number-left-title="$t('global.baseRate')" :number-left-title-tooltip="$t('global.baseRateTooltip')" :number-left-value="formatPercentage(detailFinancialMetrics?.fundingCosts?.entity?.baseRate)" :number-right-title="$t('global.creditSpread')" :number-right-title-tooltip="$t('global.creditSpreadTooltip')" :number-right-value="formatPercentage(detailFinancialMetrics?.fundingCosts?.entity?.finalSpread)" :is-loading="isLoadingFundingCost" :waccFinancing="true" :detailFinancialMetrics="detailFinancialMetrics" @show-modal-details="() => isModalEntityWaccShowing = true"></BigNumberTwoCols>
    <div class="card shadow-none" v-else>
      <CalculumLoading v-if="isLoadingFundingCost" block="block"></CalculumLoading>
      <div class="card-body d-flex flex-column">
        <div class="row">
          <div class="col-12 d-flex flex-column"></div><span class="text-base font-bold">{{ $t('global.supplierFinancingRate') }}</span>
          <CalculumTooltipIcon infoText="$t('global.supplierFinancingRateTooltip')" :advancedTooltipClass="true" :uniqueIdentifier="'entity-ratings-financing-rate'" :keyPopOver="'entityRatingsFinancingRate'"></CalculumTooltipIcon>
        </div>
        <div class="row mt-5"></div>
        <div class="row mt-5"></div>
        <div class="row mt-5">
          <div class="col-12 d-flex flex-column">
            <p class="text-4xl font-bold text-center">N/A</p>
            <p class="text-capitalize font-md font-semibold text-gray-400 text-center">{{ $t('global.noDataAvailable') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-xl-4 col-lg-4">
    <CalculumLoading v-if="buyerLeverage.isLoading" block="block"></CalculumLoading>
    <EntityCardTextDashes @show-modal-details="() => buyerLeverage.isModalShowing = true" :gradeLevelText="entityCharacteristics.buyerLeverage.description" :level="buyerLeverageMlevelByGradeLevelText" :levelColor="entityCharacteristics.buyerLeverage.color" :loading="buyerLeverage.isLoading" :showDetails="true" :title="$t('home.entityCard.buyerLeverageMateriality')" :tooltipText="$t('home.entityCard.buyerLeverageTooltip')" :totalLevels="3" :uniqueIdentifier="'popover-entitycard-buyer-leverage-materiality'" :keyPopOver="'entityRatingsBuyerLeverage'"></EntityCardTextDashes>
  </div>
  <div class="col-xl-4">
    <CalculumLoading v-if="loading.detailFinancialMetrics" block="block"></CalculumLoading>
    <EntityCardMetrics :loading="loading.detailFinancialMetrics" :metric-one-value="dsoDisplayValue" :metric-one="entityCRMetricDSOLabelComputed" :metric-two-value="revenueGrowthDisplayValue" :metric-two="$t('home.entityCard.rating.revenueGrowth')" :title="$t('global.financialMetrics')" :tooltip-text="$t('home.entityCard.rating.metricsTooltip')" :uniqueIdentifier="'popover-entitycard-metrics'" :keyPopOver="'entityRatingsMetrics'" :show-edit-option-metric-one="isSuperAdmin" :pencil-id-metric-one="'entity-metrics-dso-pencil'" :show-edit-option-metric-two="isSuperAdmin" :pencil-id-metric-two="'entity-metrics-revenue-growth-pencil'" @open-edit-metric-one="toggleManageDSO" @open-edit-metric-two="toggleManageRevenueGrowth"></EntityCardMetrics>
    <Popup :anchor="'entity-metrics-dso-pencil'" :show="showManageDSO" popup-class="dso-edit-popup">
      <ManageDSOAction v-if="showManageDSO" :option="'supplierDso'" :initialDso="initialDSOValue" @call-action="handleDSOChange"></ManageDSOAction>
    </Popup>
    <Popup :anchor="'entity-metrics-revenue-growth-pencil'" :show="showManageRevenueGrowth" popup-class="revenue-growth-edit-popup">
      <ManageRevenueGrowthAction v-if="showManageRevenueGrowth" @call-action="handleRevenueGrowthChange" :initialRevenueY="customRevenueY" :initialRevenueYMinus1="customRevenueY1"></ManageRevenueGrowthAction>
    </Popup>
  </div>
  <div class="col-xl-4 col-lg-4">
    <CalculumLoading v-if="dataDepth.isLoading" block="block"></CalculumLoading>
    <EntityCardTextDashes @show-modal-details="dataDepth.isModalShowing = true" :gradeLevelText="dataDepth.overallDataDepth.description" :level-color="dataDepth.overallDataDepth.color" :level="dataDepthlevelByGradeLevelText" :loading="dataDepth.isLoading" :showDetails="true" :title="$t('home.entityCard.rating.dataDepth')" :tooltipText="$t('home.entityCard.rating.dataDepthTooltip')" :totalLevels="3" :uniqueIdentifier="'popover-entitycard-data-depth'" :keyPopOver="'entityRatingsDataDepth'"></EntityCardTextDashes>
  </div>
  <div class="col-xl-4 col-lg-4" v-if="useFeatureCreditRating">
    <CalculumLoading v-if="loading.countryRatingInfo" block="block"></CalculumLoading>
    <EntityCardTextArc @show-modal-details="() => country.isModalShowing = true" :country="country" :grade-level-text="countryCRgradeLevelText" :letter-grade="country.spRating" :level="countryCRlevelByGradeLevelText" :loading="loading.countryRatingInfo" :show-country-and-flag="true" :show-details="true" :source="country.source" :title="$t('global.countryRating')" :tooltip-text="$t('home.entityCard.rating.countryTooltip')" :uniqueIdentifier="'popover-entitycard-country-rating'" :keyPopOver="'entityRatingsCountryRating'" :useFeatureCreditRating="useFeatureCreditRating"></EntityCardTextArc>
  </div>
  <div class="col-xl-4 col-lg-4">
    <CalculumLoading v-if="isLoadingESG" block="block"></CalculumLoading>
    <EntityCardTextArc @show-modal-details="() => isModalESGShowing = true" :grade-level-text="esg.ratingLabel ?? $t('global.notAvailable')" :letter-grade="esg.rating ?? $t('global.notAvailable')" :level="esgLevelComputed" :loading="isLoadingESG" :source="esg.rating ? $t('global.parent') : $t('global.notAvailable')" :title="$t('global.esgRating')" :tooltip-text="$t('home.entityCard.rating.esgTooltip')" :uniqueIdentifier="'popover-entitycard-ratings-esg-rating'" :keyPopOver="'entityRatingsESGRating'"></EntityCardTextArc>
  </div>
  <div class="col-xl-8 col-lg-8">
    <FloatingNestedCard :title="$t('home.entityCard.rating.dei')" :tooltip-text="$t('home.entityCard.rating.deiTooltip')" :uniqueIdentifier="'popover-entitycard-ratings-dei'" :advancedTooltipClass="true" :keyPopOver="'entityRatingsDEI'">
      <template v-slot:headerRightSide>
        <div class="col d-flex"><a class="ml-auto" href="https://www.denominator.one/" target="_blank" data-toggle="tooltip" :title="$t('home.entityCard.rating.deiPoweredByTooltip')"><span class="text-xxs ml-auto mr-2 text-gray-400">{{ $t('global.poweredBy') }}</span>
            <DenominatorLogo class="w-36"></DenominatorLogo></a></div>
      </template>
      <template v-slot:floatingCardContent>
        <p class="mt-4 text-4xl font-bold">{{ entityDetails.denominatorScoreLabel ?? $t('global.notAvailable') }}</p>
        <LevelDashesChart :level="denominatorScoreLevelComputed" :gap="4"></LevelDashesChart>
      </template>
      <template v-slot:floatingCardWrapperContent>
        <div class="row py-3">
          <div class="col-4 d-flex flex-column justify-content-between align-items-center">
            <div class="d-flex justify-content-center align-items-center w-12 h-12 mb-1 rounded-lg bg-gray-100 py-2 px-2.5">
              <IconWomanOwned class="min-w-3.5 fill-current"></IconWomanOwned>
            </div><span class="mb-2 text-center">{{ $t('global.womenOwned') }}</span><span class="text-4xl font-bold">{{ formattedWomenOwnedComputed }}</span>
          </div>
          <div class="col-4 d-flex flex-column justify-content-between align-items-center">
            <div class="d-flex justify-content-center align-items-center w-12 h-12 mb-1 rounded-lg bg-gray-100 py-2 px-2.5">
              <IconEthnicMinorityOwned class="min-w-3.5 fill-current"></IconEthnicMinorityOwned>
            </div><span class="mb-2 text-center">{{ $t('global.ethnicMinoriyOwned') }}</span><span class="text-4xl font-bold">{{ formattedEthnicMinorityOwnedComputed }}</span>
          </div>
          <div class="col-4 d-flex flex-column justify-content-between align-items-center">
            <div class="d-flex justify-content-center align-items-center w-12 h-12 mb-1 rounded-lg bg-gray-100 py-2 px-2.5">
              <IconVeteranOwned class="min-w-3.5 fill-current"></IconVeteranOwned>
            </div><span class="mb-2 text-center">{{ $t('global.veteranOwned') }}</span><span class="text-4xl font-bold">{{ formattedVeteranOwnedComputed }}</span>
          </div>
        </div>
      </template>
      <template v-slot:footer>
        <div class="row mt-2">
          <div class="col-6"><span class="mb-0 text-capitalize font-md font-semibold text-gray-400">{{ $t('global.source') + ': ' + $t('global.external') }}</span></div>
          <div class="col-6 d-flex">
            <button class="btn-text d-flex ml-auto text-sm text-capitalize text-gray-500" @click="isModalDEIShowing = true" type="button"><span class="mr-1 my-auto">{{ $t('home.entityCard.showDetails') }}</span>
              <InformationCircleSvg class="fill-current my-auto h-3.5"></InformationCircleSvg>
            </button>
          </div>
        </div>
      </template>
    </FloatingNestedCard>
  </div>
  <div class="col-xl-4 col-lg-4" v-if="!useFeatureCreditRating">
    <CalculumLoading v-if="loading.countryRatingInfo" block="block"></CalculumLoading>
    <EntityCardTextArc @show-modal-details="() => isModalEntityCreditRatingShowing = true" :grade-level-text="creditData?.supplier?.adaScoreDescription ?? ''" :letter-grade="creditRatingLetterGrade" :level="entityCRlevelByGradeLevelText" :loading="loading.creditScore" :source="creditData?.supplier?.source ?? ''" :is-internal-override="isInternalOverride" :title="$t('global.companyCreditRating')" :tooltip-text="$t('home.overview.overallCreditScore')" :uniqueIdentifier="'popover-entitycard-country-ratings-creditRating'" :keyPopOver="'entityRatingsCountryCreditRating'" :useFeatureCreditRating="useFeatureCreditRating"></EntityCardTextArc>
  </div>
</div>
</template>

<script lang="ts">
import {
  defineComponent,
  computed,
  reactive,
  toRefs,
  ref,
  onMounted,
  onBeforeUnmount,
  PropType,
} from "vue";

// Types
import { EntityCard } from "@/types";
import { ESG, RatingsAndMetrics } from "../types";

import { formatBooleanOrNull, formatPercentage, getNumberWithDecimals, convertFiltersToREST } from "@/utils/FormatData";
import { getLevelNumber, getLevelStandardLabel, removeIRI } from "@/utils";
import { mapCompanyTypeToLevel } from "@/utils/levelOfGrid";
import { computeRevenueGrowthPercent } from "@/utils/revenueGrowth";
import { images } from "@/resources/assets/assets";
import { useI18n } from "vue-i18n";
import { useEntityCardStore } from "@/stores/entityCard";
import { useAnalyzeStore } from "@/stores/analyze";
import { useGlobalFiltersStore } from "@/stores/globalFilters";
import { useAppStore } from "@/stores/app";
import { useToast } from "vue-toastification";
import { ActionFromEditProgram } from "@/modules/components/types";
import * as fundingCostLevel from "@/utils/fundingCostLevel";
import BigNumberTwoCols from "@/modules/components/cards/BigNumberTwoCols.vue";
import CalculumCreditRatingTableModal from "@/modules/components/CalculumCreditRatingTableModal.vue";
import CalculumFinancingTableModal from "@/modules/components/CalculumFinancingTableModal.vue";
import { CalculumLoading } from '@ada/design-system'
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import { Skeleton } from "@progress/kendo-vue-indicators";
import DenominatorLogo from "@/resources/assets/images/DenominatorLogo.vue";
import EntityCardMetrics from "@/modules/home/entityCard/components/EntityCardMetrics.vue";
import EntityCardTextArc from "@/modules/home/entityCard/components/EntityCardTextArc.vue";
import EntityCardTextDashes from "@/modules/home/entityCard/components/EntityCardTextDashes.vue";
import FloatingNestedCard from "@/modules/components/cards/FloatingNestedCard.vue";
import IconEthnicMinorityOwned from "@/resources/assets/images/icons/iconEthnicMinorityOwned.vue";
import IconVeteranOwned from "@/resources/assets/images/icons/iconVeteranOwned.vue";
import IconWomanOwned from "@/resources/assets/images/icons/iconWomenOwned.vue";
import InformationCircleSvg from "@/resources/assets/images/icons/svg/nav/InformationCircleSvg.vue";
import { LevelDashesChart } from "@ada/design-system";
import ModalBuyerLeverage from "@/modules/home/entityCard/components/modals/ModalBuyerLeverage.vue";
import ModalCountryRating from "@/modules/home/entityCard/components/modals/ModalCountryRating.vue";
import ModalDataDepth from "@/modules/home/entityCard/components/modals/ModalDataDepth.vue";
import ModalDEI from "@/modules/home/entityCard/components/modals/ModalDEI.vue";
import ModalESG from "@/modules/home/entityCard/components/modals/ModalESG.vue";
import * as clickOutsideRelated from "@/utils/clickOutsideRelated";
import CreditScoreTeaser from "@/resources/assets/images/icons/iconCreditScoreTeaser.vue";
import ManageCreditRatingAction from "@/modules/components/grid/menuActions/ManageCreditRatingAction.vue";
import ManageDSOAction from "@/modules/components/grid/menuActions/ManageDSOAction.vue";
import ManageRevenueGrowthAction from "@/modules/components/grid/menuActions/ManageRevenueGrowthAction.vue";
import CalculumModalConfirmAction from "@/modules/components/CalculumModalConfirmAction.vue";
import { useConfirmAllSpendModal } from "@/composables/useConfirmAllSpendModal";
import { Popup } from "@progress/kendo-vue-popup";

import $ from "jquery";

function computeLevel3(value: number, low: number, high: number): number {
  if (value <= low) return 30;
  if (value <= high) return 60;
  return 90;
}

function computeRevenueGrowthLevel(value: number): number {
  if (value <= -0.11) return 25;
  if (value <= -0.06) return 45;
  if (value <= 0.05) return 65;
  if (value <= 0.1) return 80;
  return 90;
}

function applyMetric(
  target: any,
  source: any,
  scale: number,
  low: number,
  high: number,
): void {
  if (source == null) {
    target.valueToDisplay = "N/A";
    return;
  }
  target.description = source.description;
  target.color = source.color;
  target.valueToDisplay = getNumberWithDecimals(`${source.valueToDisplay * scale}`, 2) + "%";
  target.value = computeLevel3(source.valueToDisplay, low, high);
}

function applyRevenueGrowthMetric(target: any, source: any): void {
  if (source == null) {
    target.valueToDisplay = "N/A";
    return;
  }
  target.description = source.description;
  target.color = source.color;
  target.valueToDisplay = getNumberWithDecimals(`${source.valueToDisplay * 100}`, 2) + "%";
  target.value = computeRevenueGrowthLevel(source.valueToDisplay);
}

export default defineComponent({
  name: "EntityCardRatingsAndMetrics",
  components: {
    BigNumberTwoCols,
    CalculumCreditRatingTableModal,
    CalculumFinancingTableModal,
    CalculumLoading,
    CalculumTooltipIcon,
    CreditScoreTeaser,
    Skeleton,
    DenominatorLogo,
    EntityCardMetrics,
    EntityCardTextArc,
    EntityCardTextDashes,
    FloatingNestedCard,
    IconEthnicMinorityOwned,
    IconVeteranOwned,
    IconWomanOwned,
    InformationCircleSvg,
    LevelDashesChart,
    ModalBuyerLeverage,
    ModalCountryRating,
    ModalDataDepth,
    ModalDEI,
    ModalESG,
    ManageCreditRatingAction,
    ManageDSOAction,
    ManageRevenueGrowthAction,
    CalculumModalConfirmAction,
    Popup,
  },
  props: {
    companyId: { type: String, required: true },
    companyType: { type: String, required: false, default: "" },
    creditData: { type: Object, required: true },
    isSuperAdmin: { type: Boolean, required: false, default: false },
    entityCharacteristics: { type: Object, required: true },
    entityDetails: {
      type: Object as PropType<EntityCard.EntityDetails>,
      default: () => {},
    },
    programUuid: { type: String, required: true },
    retrieveAllSpends: { type: Object, required: true },
    useFeatureCreditRating: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const entityCardStore = useEntityCardStore();
    const analyzeStore = useAnalyzeStore();
    const globalFiltersStore = useGlobalFiltersStore();
    const appStore = useAppStore();
    const toast = useToast();
    const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });

    const { showConfirmAllSpendModal, confirmAllSpendAction, cancelAllSpendAction, requestConfirmation } = useConfirmAllSpendModal();

    const showManageCreditRating = ref(false);
    const loadingCreditRating = ref(false);
    let creditRatingToggleLocked = false;
    const localLetterGrade = ref<string | null>(null);
    const showManageDSO = ref(false);
    const localDSOValue = ref<number | null>(null);
    const showManageRevenueGrowth = ref(false);
    const localRevenueGrowthDisplay = ref<string | null>(null);

    const PENCIL_ID = "popover-entitycard-country-ratings-creditRating-pencil";
    const DSO_PENCIL_ID = "entity-metrics-dso-pencil";
    const REVENUE_PENCIL_ID = "entity-metrics-revenue-growth-pencil";

    function unlockCreditRatingToggle() {
      setTimeout(() => { creditRatingToggleLocked = false; }, 300);
    }

    function toggleManageCreditRating() {
      if (creditRatingToggleLocked) return;
      showManageCreditRating.value = !showManageCreditRating.value;
    }
    function closeManageCreditRating() {
      showManageCreditRating.value = false;
    }
    function toggleManageDSO() {
      showManageDSO.value = !showManageDSO.value;
    }
    function closeManageDSO() {
      showManageDSO.value = false;
    }
    function toggleManageRevenueGrowth() {
      showManageRevenueGrowth.value = !showManageRevenueGrowth.value;
    }
    function closeManageRevenueGrowth() {
      showManageRevenueGrowth.value = false;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        !target.closest?.(".credit-rating-edit-popup") &&
        target.id !== PENCIL_ID
      )
        closeManageCreditRating();
      if (!target.closest?.(".dso-edit-popup") && target.id !== DSO_PENCIL_ID)
        closeManageDSO();
      if (
        !target.closest?.(".revenue-growth-edit-popup") &&
        target.id !== REVENUE_PENCIL_ID
      )
        closeManageRevenueGrowth();
    };

    onMounted(() => document.addEventListener("click", handleClickOutside));
    onBeforeUnmount(() =>
      document.removeEventListener("click", handleClickOutside),
    );

    function handleCreditRatingChange(
      keyId: ActionFromEditProgram,
      isEmit: boolean,
      payload: any,
    ) {
      if (!isEmit) return;
      const selectedValue: string | null = payload.param ?? null;
      const programUuid = removeIRI(props.programUuid);
      const levelOfGrid = mapCompanyTypeToLevel(props.companyType);
      const changed = { key: keyId, value: selectedValue };
      const filters = {
        telerikFilter: null,
        targetProgramUuid: programUuid,
        globalFilter: convertFiltersToREST(
          globalFiltersStore.getFiltersApplied,
        ),
        currencyRate: appStore.getCurrencyAmount,
      };
      closeManageCreditRating();
      requestConfirmation(() => {
        creditRatingToggleLocked = true;
        loadingCreditRating.value = true;
        analyzeStore.postProgramSpendConfigurationbyGroups({
          program: programUuid,
          changed,
          uuids: [removeIRI(props.companyId)],
          level: levelOfGrid,
          filters,
          all: false,
          callbackSuccess: () => {
            loadingCreditRating.value = false;
            localLetterGrade.value = selectedValue ?? "";
            toast.success(translate.t("home.entityCard.details.creditRatingUpdated"));
            unlockCreditRatingToggle();
          },
          callbackError: (error: any) => {
            loadingCreditRating.value = false;
            if (import.meta.env.DEV) console.error("handleCreditRatingChange error:", error);
            toast.error(translate.t("home.entityCard.details.creditRatingUpdateFailed"));
            unlockCreditRatingToggle();
          },
        });
      });
    }

    function handleDSOChange(
      keyId: ActionFromEditProgram,
      isEmit: boolean,
      payload: any,
    ) {
      if (!isEmit) return;
      const selectedValue: number | null = payload.param ?? null;
      const programUuid = removeIRI(props.programUuid);
      const levelOfGrid = mapCompanyTypeToLevel(props.companyType);
      const changed = { key: keyId, value: selectedValue };
      const filters = {
        telerikFilter: null,
        targetProgramUuid: programUuid,
        globalFilter: convertFiltersToREST(
          globalFiltersStore.getFiltersApplied,
        ),
        currencyRate: appStore.getCurrencyAmount,
      };
      closeManageDSO();
      requestConfirmation(() => {
        analyzeStore.postProgramSpendConfigurationbyGroups({
          program: programUuid,
          changed,
          uuids: [removeIRI(props.companyId)],
          level: levelOfGrid,
          filters,
          all: false,
          callbackSuccess: () => {
            localDSOValue.value = selectedValue;
            toast.success(translate.t("home.entityCard.details.dsoUpdated"));
          },
          callbackError: (error: any) => {
            if (import.meta.env.DEV) console.error("handleDSOChange error:", error);
            toast.error(translate.t("home.entityCard.details.dsoUpdateFailed"));
          },
        });
      });
    }

    function handleRevenueGrowthChange(
      keyId: ActionFromEditProgram,
      isEmit: boolean,
      payload: any,
    ) {
      if (!isEmit) return;
      const revenueY: number | null = payload.paramY ?? null;
      const revenueY1: number | null = payload.paramY1 ?? null;
      data.customRevenueY = revenueY;
      data.customRevenueY1 = revenueY1;
      const programUuid = removeIRI(props.programUuid);
      const levelOfGrid = mapCompanyTypeToLevel(props.companyType);
      const filters = {
        telerikFilter: null,
        targetProgramUuid: programUuid,
        globalFilter: convertFiltersToREST(
          globalFiltersStore.getFiltersApplied,
        ),
        currencyRate: appStore.getCurrencyAmount,
      };

      closeManageRevenueGrowth();
      requestConfirmation(() => {
        let successCount = 0;
        let errorShown = false;

        const onSuccess = () => {
          successCount++;
          if (successCount < 2) return;
          const growth = computeRevenueGrowthPercent(revenueY, revenueY1);
          if (growth !== null) {
            localRevenueGrowthDisplay.value = growth.toFixed(2) + "%";
          } else if (revenueY === null && revenueY1 === null) {
            localRevenueGrowthDisplay.value = null;
          }
          toast.success(translate.t("home.entityCard.details.revenueGrowthUpdated"));
        };

        const onError = (error: any) => {
          if (errorShown) return;
          errorShown = true;
          if (import.meta.env.DEV) console.error("handleRevenueGrowthChange error:", error);
          toast.error(translate.t("home.entityCard.details.revenueGrowthUpdateFailed"));
        };

        analyzeStore.postProgramSpendConfigurationbyGroups({
          program: programUuid,
          changed: { key: "supplierRevenueY", value: revenueY },
          uuids: [removeIRI(props.companyId)],
          level: levelOfGrid,
          filters,
          all: false,
          callbackSuccess: onSuccess,
          callbackError: onError,
        });
        analyzeStore.postProgramSpendConfigurationbyGroups({
          program: programUuid,
          changed: { key: "supplierRevenueY1", value: revenueY1 },
          uuids: [removeIRI(props.companyId)],
          level: levelOfGrid,
          filters,
          all: false,
          callbackSuccess: onSuccess,
          callbackError: onError,
        });
      });
    }

    const data = reactive<RatingsAndMetrics>({
      customRevenueY: null,
      customRevenueY1: null,
      showChartOptions: false,
      showIndustryDetails: false,
      loading: {
        countryRatingInfo: false,
        creditScore: false,
        detailFinancialMetrics: false,
        industryRatingInfo: false,
        parentCreditScore: false,
      },
      isLoadingFundingCost: false,
      isLoadingESG: false,
      selectedProgramUri: null,
      creditScore: {
        value: 0,
        description: "",
        color: "#2E9D58",
        realValue: 0,
        spScore: "N/A",
        moodysScore: "N/A",
        estimatedCredit: {
          moodysScore: "N/A",
          spScore: "N/A",
        },
      },
      parentCreditScore: {
        value: 0,
        description: "",
        color: "#2E9D58",
        realValue: 0,
        parentName: "",
        spScore: "N/A",
        moodysScore: "N/A",
        estimatedCredit: {
          moodysScore: "N/A",
          spScore: "N/A",
        },
      },
      dataDepth: {
        overallDataDepth: {
          value: 0,
          description: "",
          color: "#2E9D58",
        },
        generalInfoDataDepth: {
          value: 0,
          description: "",
          color: "#2E9D58",
        },
        paymentTermsDataDepth: {
          value: 0,
          description: "",
          color: "#2E9D58",
        },
        financialMetricsDataDepth: {
          value: 0,
          description: "",
          color: "#2E9D58",
        },
        isLoading: false,
        isModalShowing: false,
      },
      detailFinancialMetrics: {
        entityType: "",
        fundingCosts: null,
        financingStrategyMethod: "",
        leverage: {
          value: 0,
          description: "",
          color: "#2E9D58",
          valueToDisplay: null,
        },
        leverageParent: {
          value: 0,
          description: "",
          color: "#2E9D58",
          valueToDisplay: null,
        },
        returnOnAssets: {
          value: 0,
          description: "",
          color: "#2E9D58",
          valueToDisplay: null,
        },
        returnOnAssetsParent: {
          value: 0,
          description: "",
          color: "#2E9D58",
          valueToDisplay: null,
        },
        interestCoverage: {
          value: 0,
          description: "",
          color: "#2E9D58",
          valueToDisplay: null,
        },
        interestCoverageParent: {
          value: 0,
          description: "",
          color: "#2E9D58",
          valueToDisplay: null,
        },
        revenueGrowth: {
          value: 0,
          description: "",
          color: "#2E9D58",
          valueToDisplay: null,
        },
        revenueGrowthParent: {
          value: 0,
          description: "",
          color: "#2E9D58",
          valueToDisplay: null,
        },
        wacc: {
          afterTax: null,
          preTax: null,
          source: "",
        },
      },
      country: {
        businessEnvironmentRisk: "-",
        color: "#E9EAEC",
        colorTitle: "#FFFFFF",
        description: "",
        economicRisk: "-",
        financingSystemRisk: "-",
        fiscalPolicy: "-",
        fitchRating: "-",
        flagImgSrc: "",
        governmentStability: "-",
        internationalTransactionsPolicy: "-",
        isModalShowing: false,
        laborFlexibility: "-",
        legalSystem: "-",
        monetaryPolicy: "-",
        moodysRating: "-",
        name: "-",
        overallReference: "-",
        politicalRisk: "-",
        regionalStability: "-",
        socialStability: "-",
        source: "-",
        spRating: "-",
        value: 0,
      },
      industry: {
        active: false,
        industryName: "",
        cofaceScore: "-",
        ehScore: "-",
        atradiusScore: "-",
        industryInfo: {
          active: false,
          industryDetails: "",
          forecast: "",
          description: "",
        },
      },
      percentFundingCost: "",
      showInfoModal: false,
      isModalEntityCreditRatingShowing: false,
      isModalDEIShowing: false,
      strategyDSO: {
        isParentDSO: false,
        value: null,
      },
      esg: {},
      isModalESGShowing: false,
      buyerLeverage: {
        isLoading: false,
        isModalShowing: false,
      },
      isModalEntityWaccShowing: false,
      currentAdvancedTootlip: "",
    });

    /**
     * Entity Credit Rating
     */

    const setBigNumberToSupplierfinancing = computed(() => {
      switch (data.detailFinancialMetrics.financingStrategyMethod) {
        case "fr":
          return formatPercentage(
            data.detailFinancialMetrics?.fundingCosts?.entity?.value,
          );
        case "at":
          return formatPercentage(data.detailFinancialMetrics?.wacc.afterTax);
        case "bt":
          return formatPercentage(data.detailFinancialMetrics?.wacc.preTax);
        default:
          return "-";
      }
    });

    /**
     * Get level given grade level text
     */
    const entityCRlevelByGradeLevelText = computed(() => {
      return getLevelNumber(
        props.creditData?.supplier?.adaScoreDescription ?? "",
      );
    });

    const creditRatingLetterGrade = computed(() => {
      if (localLetterGrade.value !== null) return localLetterGrade.value;
      return (
        props.creditData?.supplier?.collateralCreditRating ||
        props.creditData?.supplier?.adaScoreRef ||
        ""
      );
    });

    const isInternalOverride = computed(() => {
      if (localLetterGrade.value === "") return false;
      if (localLetterGrade.value !== null) return true;
      return !!props.creditData?.supplier?.collateralCreditRating;
    });

    const dsoDisplayValue = computed(() => {
      const v =
        localDSOValue.value === null
          ? data.strategyDSO.value
          : localDSOValue.value;
      return v ? v.toString() : translate.t("global.notAvailable");
    });

    const initialDSOValue = computed<number | null>(
      () => localDSOValue.value ?? data.strategyDSO.value ?? null,
    );

    const revenueGrowthDisplayValue = computed(() => {
      if (localRevenueGrowthDisplay.value !== null)
        return localRevenueGrowthDisplay.value;
      return (
        data.detailFinancialMetrics.revenueGrowth.valueToDisplay ??
        translate.t("global.notAvailable")
      );
    });

    /**
     * Buyer Leverage / Materiality
     */

    /**
     * Get level given grade level text
     */
    const buyerLeverageMlevelByGradeLevelText = computed(() => {
      switch (props.entityCharacteristics.buyerLeverage.description) {
        case "Low":
          return 1;
        case "Medium":
          return 2;
        case "High":
          return 3;
        default:
          return 0;
      }
    });

    /**
     * Country Credit Rating
     */

    // ? - Change value coming from API
    /**
     * Parse country credit rating grade level text coming from parent component
     */
    const countryCRgradeLevelText = computed(() => {
      return getLevelStandardLabel(data.country.description);
    });

    /**
     * Get level given grade level text
     */
    const countryCRlevelByGradeLevelText = computed(() => {
      return getLevelNumber(countryCRgradeLevelText.value);
    });

    /**
     * Metrics
     */

    //
    const entityCRMetricDSOLabelComputed = computed(() => {
      return data.strategyDSO.isParentDSO
        ? translate.t("home.entityCard.rating.metricsDSOParent")
        : translate.t("home.entityCard.rating.metricsDSO");
    });

    /**
     * Data Depth
     */

    /**
     * Get level given grade level text
     */
    const dataDepthlevelByGradeLevelText = computed(() => {
      if (!data.dataDepth.overallDataDepth.description) return 0;

      switch (data.dataDepth.overallDataDepth.description) {
        case "Limited":
          return 1;
        case "Adequate":
          return 2;
        case "Substantial":
          return 3;
        default:
          return 0;
      }
    });

    /**
     * Get data depth
     */
    function getDataDepth() {
      // Enable loading
      data.dataDepth.isLoading = true;

      const params = {
        companyId: props.companyId,
        callbackSuccess: (callbackSuccessData: any) => {
          /**
           * Overall
           */
          // Value
          data.dataDepth.overallDataDepth.value = Math.round(
            callbackSuccessData.overallDataDepth.valueToDisplay,
          );

          // Description
          data.dataDepth.overallDataDepth.description =
            callbackSuccessData.overallDataDepth.description;

          // Color
          data.dataDepth.overallDataDepth.color =
            callbackSuccessData.overallDataDepth.color;

          /**
           * General info
           */
          // Color
          data.dataDepth.generalInfoDataDepth.color =
            callbackSuccessData.generalInfoDataDepth.color;

          // Value
          data.dataDepth.generalInfoDataDepth.value = Math.round(
            callbackSuccessData.generalInfoDataDepth.valueToDisplay,
          );

          // Description
          data.dataDepth.generalInfoDataDepth.description =
            callbackSuccessData.generalInfoDataDepth.description;

          /**
           * Payment terms
           */
          // Color
          data.dataDepth.paymentTermsDataDepth.color =
            callbackSuccessData.paymentTermsDataDepth.color;

          // Description
          data.dataDepth.paymentTermsDataDepth.description =
            callbackSuccessData.paymentTermsDataDepth.description;

          // Value
          data.dataDepth.paymentTermsDataDepth.value = Math.round(
            callbackSuccessData.paymentTermsDataDepth.valueToDisplay,
          );

          /**
           * Financial metrics
           */
          // Color
          data.dataDepth.financialMetricsDataDepth.color =
            callbackSuccessData.financialMetricsDataDepth.color;

          // Description
          data.dataDepth.financialMetricsDataDepth.description =
            callbackSuccessData.financialMetricsDataDepth.description;

          // Value
          data.dataDepth.financialMetricsDataDepth.value = Math.round(
            callbackSuccessData.financialMetricsDataDepth.valueToDisplay,
          );

          // Disable loading
          data.dataDepth.isLoading = false;
        },
        callbackError: (callbackErrorData: any) => {
          data.dataDepth.isLoading = false;
        },
      };
      entityCardStore.getDataDepth(params);
    }

    /**
     * ESG
     */

    /**
     * Get grade level text given level
     */
    const esgLevelComputed = computed(() => {
      return getLevelNumber(data.esg.ratingLabel);
    });

    /**
     * Get entity ESG rating
     */
    function getSupplierESG() {
      // Enable loading
      data.isLoadingESG = true;

      const params = {
        companyId: props.companyId,

        callbackSuccess: (callbackSuccessData: ESG) => {
          // Disable loading
          data.isLoadingESG = false;

          data.esg = callbackSuccessData;
        },

        callbackError: (callbackErrorData: any) => {
          // Disable loading
          data.isLoadingESG = false;
        },
      };

      entityCardStore.getSupplierESG(params);
    }

    /**
     * Get the country rating info
     */
    function getCountryRatingInfo() {
      // Enable loading
      data.loading.countryRatingInfo = true;

      const params = {
        companyId: props.companyId,
        callbackSuccess: (d: any) => {
          data.country.name = d.countryName;
          data.country.flagImgSrc = d.flagUrl;
          data.country.description = d.description;
          data.country.source = d.source;
          data.country.spRating = d.spRating;

          const ab = d.countryAmBestInfo;
          data.country.socialStability = ab?.socialStability?.description ?? "";
          data.country.regionalStability = ab?.regionalStability?.description ?? "";
          data.country.politicalRisk = ab?.politicalRisk?.description ?? "";
          data.country.overallReference = ab?.overallReference?.description ?? "";
          data.country.monetaryPolicy = ab?.monetaryPolicy?.description ?? "";
          data.country.legalSystem = ab?.legalSystem?.description ?? "";
          data.country.laborFlexibility = ab?.laborFlexibility?.description ?? "";
          data.country.internationalTransactionsPolicy = ab?.internationalTransactionsPolicy?.description ?? "";
          data.country.governmentStability = ab?.governmentStability?.description ?? "";
          data.country.fiscalPolicy = ab?.fiscalPolicy?.description ?? "";
          data.country.financingSystemRisk = ab?.financingSystemRisk?.description ?? "";
          data.country.economicRisk = ab?.economicRisk?.description ?? "";
          data.country.businessEnvironmentRisk = ab?.businessEnvironmentRisk?.description ?? "";

          data.loading.countryRatingInfo = false;
        },
        callbackError: (_callbackErrorData: any) => {
          data.loading.countryRatingInfo = false;
        },
      };
      entityCardStore.getCountryRatingInfo(params);
    }

    /**
     * Get detail financial metrics from API
     * Used for getting the funding cost and the financial metrics
     *
     * @returns void
     *
     * ? - Add type
     */
    function getDetailFinancialMetrics(): void {
      data.loading.detailFinancialMetrics = true;
      data.isLoadingFundingCost = true;

      const params = {
        companyId: props.companyId,

        callbackSuccess: (d: any) => {
          if (d.fundingCosts?.entity) {
            data.detailFinancialMetrics.fundingCosts = d.fundingCosts;
          }

          applyMetric(data.detailFinancialMetrics.leverageParent, d.parentLeverage, 1, 4, 10);
          applyMetric(data.detailFinancialMetrics.leverage, d.leverage, 1, 4, 10);
          applyMetric(data.detailFinancialMetrics.revenueGrowthParent, d.parentRevenueGrowth, 100, 0.02, 0.06);
          applyMetric(data.detailFinancialMetrics.returnOnAssetsParent, d.parentReturnOnAssets, 100, 0.02, 0.06);
          applyMetric(data.detailFinancialMetrics.returnOnAssets, d.returnOnAssets, 100, 0.02, 0.06);
          applyMetric(data.detailFinancialMetrics.interestCoverageParent, d.parentInterestCoverage, 1, 1.5, 3);
          applyMetric(data.detailFinancialMetrics.interestCoverage, d.interestCoverage, 1, 1.5, 3);
          applyRevenueGrowthMetric(data.detailFinancialMetrics.revenueGrowth, d.revenueGrowth);

          data.detailFinancialMetrics.financingStrategyMethod = d.financingStrategyMethod;
          data.detailFinancialMetrics.wacc.afterTax = d.wacc.afterTax.valueToDisplay;
          data.detailFinancialMetrics.wacc.preTax = d.wacc.preTax.valueToDisplay;
          data.detailFinancialMetrics.wacc.source = d.wacc.source;

          if (d.strategyDSO !== null) {
            data.strategyDSO.value = d.dsoStrategy.terms;
            data.strategyDSO.isParentDSO = d.dsoStrategy.byParent;
          }

          data.customRevenueY = d.customRevenueY;
          data.customRevenueY1 = d.customRevenueY1;

          data.loading.detailFinancialMetrics = false;
          data.isLoadingFundingCost = false;
        },

        callbackError: (_callbackErrorData: any) => {
          data.loading.detailFinancialMetrics = false;
          data.isLoadingFundingCost = false;
        },
      };

      entityCardStore.getDetailFinancialMetrics(params);
    }

    /**
     * Get industry rating info
     */
    function getIndustryRatingInfo() {
      // Enable loading
      data.loading.industryRatingInfo = true;

      const params = {
        companyId: props.companyId,
        callbackSuccess: (callbackSuccessData: any) => {
          if (callbackSuccessData.industryName !== null) {
            data.industry.active = true;
            data.industry.industryName = callbackSuccessData.industryName;
            if (callbackSuccessData.atradiusScore !== null) {
              data.industry.atradiusScore = callbackSuccessData.atradiusScore;
            }

            if (callbackSuccessData.industryInfo !== null) {
              data.industry.industryInfo.active = true;
              data.industry.industryInfo.industryDetails =
                callbackSuccessData.industryInfo.industryDetails;
              data.industry.industryInfo.forecast =
                callbackSuccessData.industryInfo.performanceForecast.forecast;
              data.industry.industryInfo.description =
                callbackSuccessData.industryInfo.performanceForecast.description;
            }
          }

          // Disable loading
          data.loading.industryRatingInfo = false;
        },
        callbackError: (callbackErrorData: any) => {
          data.loading.industryRatingInfo = false;
        },
      };
      entityCardStore.getIndustryRatingInfo(params);
    }

    function selectProgram(newValue: string | null) {
      if (data.selectedProgramUri !== newValue || newValue === null) {
        data.selectedProgramUri = newValue;

        if (newValue !== null) {
          // ? - Fill with functions that need program
        }
      }
    }

    /** END METHODS */

    /*** Computed ***/
    const denominatorScoreLevelComputed = computed(() => {
      return getLevelNumber(props.entityDetails.denominatorScoreLabel);
    });

    // Women Owned
    const formattedWomenOwnedComputed = computed(() => {
      return formatBooleanOrNull(
        props.entityDetails.supplierWomanOwnedBusiness,
        {
          yes: translate.t("global.yes"),
          no: translate.t("global.no"),
          notAvailable: translate.t("global.notAvailable"),
        },
      );
    });

    // Ethnic Minority
    const formattedEthnicMinorityOwnedComputed = computed(() => {
      return formatBooleanOrNull(
        props.entityDetails.supplierEthnicMinorityOwnedBusiness,
        {
          yes: translate.t("global.yes"),
          no: translate.t("global.no"),
          notAvailable: translate.t("global.notAvailable"),
        },
      );
    });

    // Veteran Owned
    const formattedVeteranOwnedComputed = computed(() => {
      return formatBooleanOrNull(
        props.entityDetails.supplierVeteranOwnedBusiness,
        {
          yes: translate.t("global.yes"),
          no: translate.t("global.no"),
          notAvailable: translate.t("global.notAvailable"),
        },
      );
    });
    /*** END Computed */

    /**
     * Fetch data from API
     */

    // Get country rating info
    getCountryRatingInfo();

    // Get data depth
    getDataDepth();

    // Get detail financial metrics
    // ? - Add description
    getDetailFinancialMetrics();

    // Get industry rating info
    getIndustryRatingInfo();

    // Get ESG rating info
    getSupplierESG();

    // Initialize tooltips
    $(function () {
      $('[data-toggle="tooltip"]').tooltip();
    });

    return {
      ...toRefs(data),
      buyerLeverageMlevelByGradeLevelText,
      clickOutsideRelated,
      countryCRgradeLevelText,
      countryCRlevelByGradeLevelText,
      dataDepthlevelByGradeLevelText,
      denominatorScoreLevelComputed,
      entityCRlevelByGradeLevelText,
      entityCRMetricDSOLabelComputed,
      esgLevelComputed,
      formatPercentage,
      formattedEthnicMinorityOwnedComputed,
      formattedVeteranOwnedComputed,
      formattedWomenOwnedComputed,
      fundingCostLevel,
      images,
      selectProgram,
      setBigNumberToSupplierfinancing,
      showConfirmAllSpendModal,
      confirmAllSpendAction,
      cancelAllSpendAction,
      showManageCreditRating,
      loadingCreditRating,
      creditRatingLetterGrade,
      isInternalOverride,
      toggleManageCreditRating,
      closeManageCreditRating,
      handleCreditRatingChange,
      showManageDSO,
      toggleManageDSO,
      closeManageDSO,
      handleDSOChange,
      dsoDisplayValue,
      initialDSOValue,
      showManageRevenueGrowth,
      toggleManageRevenueGrowth,
      closeManageRevenueGrowth,
      handleRevenueGrowthChange,
      revenueGrowthDisplayValue,
    };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

// Set the height of all cards at the top to the same value
.row > [class*="col-"]:has(> .card) {
  display: flex;
}

.row > [class*="col-"]:has(> .card) > .card {
  width: 100%;
}

// END Set the height ...

// ? - Remove this when all views are updated
.card {
  padding: 0;
  margin-bottom: 16px;
  min-height: 220px;

  .card-body {
    padding: 24px 24px 16px 24px;
  }
}

.teaser-image-container {
  display: flex;
  justify-content: center; // Center the image horizontally
  align-items: center; // Align vertically if needed
  overflow: hidden; // Prevent any overflow
  max-width: 100%; // Ensure it respects column size
}

.teaser-image-container svg,
.teaser-image-container img {
  width: 100%; // Image scales within its parent column
  height: auto; // Maintain aspect ratio
  max-width: 100%; // Ensure it never overflows
}
</style>
