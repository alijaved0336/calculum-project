<!--
Opportunity Section - CF Program
-->

<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRef, watch } from "vue";

// Utils
import { isNullOrUndefined } from "@/utils";
import { joinPaymentTermsDescriptions } from "@/modules/home/entityCard/utils";

import type { NegotiationHeaderLoading } from "@/modules/home/entityCard/types";
import type { NegotiationTabsSlice } from "@/modules/home/entityCard/components/opportunity/negotiation-view-types";
import { SpendLine } from "@/types";
import { CalculumLoading } from "@ada/design-system";
import { useI18n } from "vue-i18n";

import { useEntityCardStore } from "@/stores/entityCard";
import { useUser } from "@/composables";
import useNegotiationSpendTabs from "@/modules/home/entityCard/composables/useNegotiationSpendTabs";
import useNegotiationCashFlow from "@/modules/home/entityCard/composables/useNegotiationCashFlow";
import useEntityNegotiationStatus from "@/modules/home/entityCard/composables/useEntityNegotiationStatus";
import useNegotiationPlan from "@/modules/home/entityCard/composables/useNegotiationPlan";
import useNegotiationPaymentTermsTarget from "@/modules/home/entityCard/composables/useNegotiationPaymentTermsTarget";
import useNegotiationSpendGrid from "@/modules/home/entityCard/composables/useNegotiationSpendGrid";
import useNegotiationHarmonization from "@/modules/home/entityCard/composables/useNegotiationHarmonization";
import CalculumCreditRatingTableModal from "@/modules/components/CalculumCreditRatingTableModal.vue";
import CalculumHarmonizationModal from "@/modules/components/CalculumHarmonizationModal.vue";
import CalculumMoveBetweenModal from "@/modules/components/CalculumMoveBetweenModal.vue";
import CalculumRemovePlanModal from "@/modules/components/CalculumRemovePlanModal.vue";
import ForeCastModal from "@/modules/home/entityCard/components/modals/ForeCastModal.vue";
import ModalBuyerLeverage from "@/modules/home/entityCard/components/modals/ModalBuyerLeverage.vue";
import ModalCreditRatingAndBuyerLeverage from "@/modules/home/entityCard/components/modals/ModalCreditRatingAndBuyerLeverage.vue";
import ModalPTTarget from "@/modules/home/entityCard/components/modals/ModalPTTarget.vue";
import ModalResults from "@/modules/home/entityCard/components/modals/ModalResults.vue";
import EntityPaymentTermsStrategies from "@/modules/home/entityCard/components/opportunity/EntityPaymentTermsStrategies.vue";
import NegotiationSpendHeader from "@/modules/home/entityCard/components/opportunity/NegotiationSpendHeader.vue";
import NegotiationCashFlowCards from "@/modules/home/entityCard/components/opportunity/NegotiationCashFlowCards.vue";
import NegotiationContextCards from "@/modules/home/entityCard/components/opportunity/NegotiationContextCards.vue";
import ListNegotiation from "@/modules/home/entityCard/components/ListNegotiation.vue";

import useApolloClient from "@/services/graphql/useApolloClient";
import { useToast } from "vue-toastification";

const props = withDefaults(
  defineProps<{
    companyId: string;
    companyType: string;
    creditData: Record<string, any>;
    entityCharacteristics: Record<string, any>;
    entityDetails: Record<string, any>;
    isLoadingEntityCard?: boolean;
    overviewTabEventUUID?: string;
    programData: Record<string, any>;
    programIsPendingRecalculation?: boolean;
    programIsRecalculating?: boolean;
    programUuid: string;
    retrieveAllSpends: any;
    programTarget?: string;
    useFeatureCreditRating?: boolean;
    potentialTheme?: boolean;
  }>(),
  {
    isLoadingEntityCard: false,
    overviewTabEventUUID: "",
    programIsPendingRecalculation: false,
    programIsRecalculating: false,
    programTarget: "",
    useFeatureCreditRating: false,
    potentialTheme: false,
  },
);

const emit = defineEmits<{
  "change-data": [tabIndex: number];
  "refresh-tabs": [];
  changeTab: [tabName: string];
}>();

const entityCardStore = useEntityCardStore();
const {
  user,
  userPartnerRoleEnabled,
  useFeature9BoxesFinancing,
  userIsAdmin,
  useFeatureForecastVolume,
} = useUser();
const translate = useI18n({ warnHtmlMessage: false, useScope: "global" });
const toast = useToast();
const { apolloClientResetStore } = useApolloClient();

const NAME = import.meta.env.VITE_NAME;

const selectedTabIndex = ref(0);

const tabsSlice = reactive<NegotiationTabsSlice>({
  tabsData: [],
  belongtoProgram: true,
  spendConfigurationUuid: "",
  spendUUID: "",
  levelType: "",
  levelTypeForStrategies: "",
  allSpendsTab: false,
  hideControls: false,
  inRecalculation: false,
  keyTermsStrategies: new Date().getUTCMilliseconds(),
  showStrategies: false,
});

const listSpend = ref<SpendLine[]>([]);

const isModalResultsShowing = ref(false);
const vcardTerms = ref(0);
const opportunityTerms = ref(0);

const isModalCreditRatingAndBuyerLeverageShowing = ref(false);
const isModalEntityCreditRatingShowing = ref(false);
const buyerLeverage = reactive({
  isLoading: false,
  isModalShowing: false,
});

const checkbox = reactive({
  termHarmonization: false,
  externalFinancing: false,
});

const spendFileVersionIdActive = computed(() => {
  // Validate
  if (isNullOrUndefined(user.value)) {
    return "";
  }

  if (isNullOrUndefined(user.value.activeSpendFileVersion)) {
    return "";
  }

  return user.value.activeSpendFileVersion["@id"];
});

const harm = reactive(
  useNegotiationHarmonization({
    props,
    spendConfigurationUuid: toRef(tabsSlice, "spendConfigurationUuid"),
  }),
);

const grid = reactive(
  useNegotiationSpendGrid({
    listSpend,
    props,
    translate,
  }),
);

// Call order: harm → grid → status (owns nineBoxes / statusPill) → cash
// (needs status.nineBoxes + selected spend) → plan → tabs (needs cash
// loaders + plan) → PT target.
// Shared belong-to-plan ref: plan writes the formula, status reads it live.
const validateBelongToAplan = ref(false);

const status = reactive(
  useEntityNegotiationStatus({
    props,
    selectedTabIndex,
    spendFileVersionIdActive,
    tabsData: toRef(tabsSlice, "tabsData"),
    listSpend,
    levelType: toRef(tabsSlice, "levelType"),
    loadingApi: toRef(harm, "loadingApi"),
    validateBelongToAplan,
  }),
);

const cashFlow = reactive(
  useNegotiationCashFlow({
    props,
    selectedSpendId: computed(
      () => status.entityCardNegotiationSpendsSelectedId,
    ),
    spendUUID: toRef(tabsSlice, "spendUUID"),
    levelType: toRef(tabsSlice, "levelType"),
    nineBoxes: status.nineBoxes,
    showExistsTarget: toRef(status, "showExistsTarget"),
    showExistsTargetValue: toRef(status, "showExistsTargetValue"),
    selectedTabIndex,
    spendFileVersionIdActive,
  }),
);

const isFinancingEnabled = computed(() => {
  return (
    props.programData.externalFinancingEnabled &&
    useFeature9BoxesFinancing.value
  );
});

const isFinancingEnabledSCFProvider = computed(() => {
  return (
    props.programData.externalFinancingEnabled &&
    userPartnerRoleEnabled.value &&
    useFeature9BoxesFinancing.value
  );
});

const plan = reactive(
  useNegotiationPlan({
    props,
    translate,
    selectedTabIndex,
    spendFileVersionIdActive,
    entityCardNegotiationSpendsSelectedId: computed(
      () => status.entityCardNegotiationSpendsSelectedId,
    ),
    entityCardNegotiationSpendsSpendSelected: computed(
      () => status.entityCardNegotiationSpendsSpendSelected,
    ),
    levelType: toRef(tabsSlice, "levelType"),
    postByGroup: harm.postByGroup,
    nineBoxes: status.nineBoxes,
    keyTermsStrategies: toRef(tabsSlice, "keyTermsStrategies"),
    isFinancingEnabled,
    isFinancingEnabledSCFProvider,
    validateBelongToAplan,
  }),
);

const tabs = reactive(
  useNegotiationSpendTabs({
    tabsSlice,
    props,
    translate,
    moveToPhaseData: plan.moveToPhaseData,
    selectedTabIndex,
    loaders: {
      fetchCalculatedCashFlow: cashFlow.fetchCalculatedCashFlow,
      retrieveSpendInk: cashFlow.retrieveSpendInk,
      retrieveSupplierSpendInK: cashFlow.retrieveSupplierSpendInK,
      retrieveSavings: cashFlow.retrieveSavings,
      getEntityDetails: cashFlow.getEntityDetails,
      getSpends: grid.getSpends,
      retrieveHarmonizationGroupsArray: harm.retrieveHarmonizationGroupsArray,
      retrieveFinancingGroupsArray: harm.retrieveFinancingGroupsArray,
      beginCashFlowLoad: cashFlow.beginCashFlowLoad,
      failVCardInfoLoad: cashFlow.failVCardInfoLoad,
    },
    paymentTermsDescriptions: toRef(cashFlow, "paymentTermsDescriptions"),
    keyGrid: toRef(grid, "keyGrid"),
  }),
);

const pt = reactive(
  useNegotiationPaymentTermsTarget({
    props,
    selectedTabIndex,
    spendFileVersionIdActive,
    spendProgramConfigs: toRef(tabs, "spendProgramConfigs"),
    tabsDataTabSelected: computed(() => tabs.tabsDataTabSelected),
    loadingApi: toRef(harm, "loadingApi"),
    columnsGrid: toRef(grid, "columnsGrid"),
  }),
);

/**
 * Buying entity country label, pluralized when entityDetails.buyerCountries has more than one country
 */
const buyingEntityCountryLabelEntity = computed(() => {
  const countries = props.entityDetails?.buyerCountries;
  return countries && countries.split(",").length > 1
    ? translate.t("global.buyingEntityCountries")
    : translate.t("global.buyingEntityCountry");
});

/**
 * Buying entity country label, pluralized when spendDetails.country has more than one country
 */
const buyingEntityCountryLabelSpend = computed(() => {
  const country = cashFlow.spendDetails.country;
  return country && country.split(",").length > 1
    ? translate.t("global.buyingEntityCountries")
    : translate.t("global.buyingEntityCountry");
});

const forPotentialTheme = computed(() => {
  return entityCardStore.getSelectedEntity?.companyTypeForTheme;
});

function setProgramData() {
  checkbox.termHarmonization = props.programData.termHarmonizationEnabled;
  checkbox.externalFinancing = props.programData.externalFinancingEnabled;
  tabs.postSpendsBySupplierAndButProgram();
}

onMounted(() => {
  setProgramData();
  plan.getAllPlans();
});

function updaterowDataParent() {
  apolloClientResetStore();
}

/**
 * US-18713 AC-02: ModalResults only emits change-data on a successful Agreed save,
 * so this is the single place that covers every Agreed path. It keeps the existing
 * change-data bubble untouched and only adds the SCF signal on top.
 */
function agreedTermsSaved() {
  entityCardStore.bumpScfRefreshToken();
  emit("change-data", selectedTabIndex.value);
}

// *** Agreed Terms ***

/**
 * Clear Agreed Terms when the user
 * clicks on the clear button
 */

function clearResultsValue(
  myValues: Array<string>,
  filters: any,
  allChecked: boolean = false,
) {
  harm.loadingApi = true;
  const params = {
    spendsConfig: allChecked ? [] : myValues,
    all: allChecked,
    filters,
    entity: props.companyId,
    callbackSuccess: () => {
      toast.success(translate.t("home.entityCard.success.cleared"));
      // WI#19180: clearing an Agreed term changes the negotiation inputs just like
      // saving one, so the SCF tab has to learn its figures are stale (US-18713 AC-02).
      entityCardStore.bumpScfRefreshToken();
      isModalResultsShowing.value = false;
      harm.loadingApi = false;
    },
    callbackError: () => {
      toast.error(
        translate.t("home.entityCard.negotiation.agreedTerms.error.message"),
      );
      harm.loadingApi = false;
    },
  };
  entityCardStore.deleteAgreedTerms(params);
}

// *** END Agreed Terms ***

watch(
  () => props.programIsRecalculating,
  (isRecalculating) => {
    if (isRecalculating === false) {
      cashFlow.forecastProcess = false;
      tabs.postSpendsBySupplierAndButProgram();
      cashFlow.showExistsAgreedValue = null;
    }
  },
);

function sendDataSpends(spends: any) {
  status.dataSpends = spends;
  status.validateDataSpends();
}

const paymentTermsDescriptionsComputed = computed(() => {
  return joinPaymentTermsDescriptions(cashFlow.paymentTermsDescriptions);
});

const headerLoading = computed<NegotiationHeaderLoading>(() => ({
  isLoadingEntityCard: props.isLoadingEntityCard,
  inRecalculation: tabsSlice.inRecalculation,
  loadingPatchGrid: grid.patchGrid,
  programIsRecalculatingComputedValue: props.programIsRecalculating,
  forecastProcess: cashFlow.forecastProcess,
}));
</script>

<template>
  <CalculumLoading
    v-if="harm.loadingApi"
    :block="true"
  ></CalculumLoading>
  <CalculumHarmonizationModal
    v-if="harm.displayModelForHarmonization"
    @close="harm.closeHarmonizationModal"
    @approve="harm.userApprovedHarmonization"
    @cancel="harm.closeHarmonizationModal"
    @clickedoutside="harm.closeHarmonizationModal"
  ></CalculumHarmonizationModal>
  <CalculumMoveBetweenModal
    v-if="plan.moveToPhaseData.displayModelForMoveBetween"
    @close="plan.userRejectedMoveBetween"
    @approve="plan.userApprovedMoveBetween"
    @cancel="plan.userRejectedMoveBetween"
  ></CalculumMoveBetweenModal>
  <CalculumRemovePlanModal
    v-if="plan.removePlanData.displayModelForRemovePlan"
    :data="plan.removePlanData.dataForRemovePlan"
    @close="plan.userRejectedRemovePlan"
    @approve="plan.userApprovedRemovePlan"
    @cancel="plan.userRejectedRemovePlan"
  ></CalculumRemovePlanModal>
  <ModalBuyerLeverage
    v-if="buyerLeverage.isModalShowing"
    :entity-characteristics="entityCharacteristics"
    @close="buyerLeverage.isModalShowing = false"
  ></ModalBuyerLeverage>
  <ModalCreditRatingAndBuyerLeverage
    v-if="isModalCreditRatingAndBuyerLeverageShowing"
    :credit-modal="creditData ?? []"
    :entity-characteristics="entityCharacteristics"
    @close="isModalCreditRatingAndBuyerLeverageShowing = false"
  ></ModalCreditRatingAndBuyerLeverage>
  <CalculumCreditRatingTableModal
    v-if="isModalEntityCreditRatingShowing"
    :credit-modal="creditData ?? []"
    @close="isModalEntityCreditRatingShowing = false"
    @user-hit-escape-key="isModalEntityCreditRatingShowing = false"
  ></CalculumCreditRatingTableModal>
  <ForeCastModal
    v-if="cashFlow.isModalForeCastShowing"
    :program-uuid="cashFlow.forecastModal.programUuid"
    :company-id="cashFlow.forecastModal.companyId"
    :company-type="cashFlow.forecastModal.companyType"
    :selected-index="cashFlow.forecastModal.selectedTabIndex"
    :spend-file-version-id-active="cashFlow.forecastModal.spendFileVersionIdActive"
    @close="cashFlow.closeForecast"
    @send-forecast="cashFlow.setForecast"
  ></ForeCastModal>
  <ModalResults
    v-if="isModalResultsShowing"
    :company-id="cashFlow.forecastModal.companyId"
    :company-type="cashFlow.forecastModal.companyType"
    :feedback-labels="tabs.resultsFeedback.feedbackLabels"
    :feedback-rating="tabs.resultsFeedback.feedbackRating ?? 0"
    :additional-feedback="tabs.resultsFeedback.additionalFeedback ?? ''"
    :program-data="programData"
    :program-uuid="cashFlow.forecastModal.programUuid"
    :retrieve-all-spends="retrieveAllSpends"
    :selected-index="cashFlow.forecastModal.selectedTabIndex"
    :selected-spend-uuid="
      cashFlow.forecastModal.selectedTabIndex > 0
        ? (tabs.tabs[cashFlow.forecastModal.selectedTabIndex]?.spendUUID ?? '')
        : ''
    "
    :spends="listSpend"
    :tabs-data="tabsSlice.tabsData"
    :selected-tab-index="cashFlow.forecastModal.selectedTabIndex"
    :all-spends-tab="tabsSlice.allSpendsTab"
    :in-recalculation="tabsSlice.inRecalculation"
    :patch-grid="grid.patchGrid"
    :vcard-terms="vcardTerms"
    :opportunity-terms="opportunityTerms"
    :loading-api="harm.loadingApi"
    :scf-accepted="cashFlow.scfAcceptedForModal"
    :on-s-c-f="cashFlow.onSCF"
    @close="isModalResultsShowing = false"
    @change-data="agreedTermsSaved"
    @update-feedback-rating="
      (newFeedbackRating: any) =>
        (tabs.resultsFeedback.feedbackRating = newFeedbackRating)
    "
    @update-feedback-labels="
      (newFeedbackLabels: any) =>
        (tabs.resultsFeedback.feedbackLabels = newFeedbackLabels)
    "
    @btn-clear-clicked="clearResultsValue"
  ></ModalResults>
  <ModalPTTarget
    v-if="pt.paymentTermsTargetModalIsShowing"
    :columns-grid="pt.ptTargetModal.columnsGrid"
    :grid-data="JSON.parse(JSON.stringify(listSpend))"
    :input-value-initial="pt.ptTargetModal.paymentTermsTargetModalInputValue ?? -1"
    :input-value-placeholder="$t('global.targetPaymentTermsD')"
    :is-loading-grid-data="grid.patchGrid"
    :selected-tab-index="cashFlow.forecastModal.selectedTabIndex"
    :tabs-data="tabsSlice.tabsData"
    :title="$t('global.targetPaymentTermsD')"
    :loading-api="harm.loadingApi"
    @close="pt.paymentTermsTargetModalHandleCloseButtonClicked"
    @input-value-changed="pt.paymentTermsModalHandleInputValueChange"
    @grid-row-selection-changed="
      pt.paymentTermsModalHandleGridRowSelectionChange
    "
    @btn-save-clicked="pt.paymentTermsModalHandleSaveButtonClicked"
    @btn-clear-clicked="pt.paymentTermsModalHandleClearButtonClicked"
  ></ModalPTTarget>
  <NegotiationSpendHeader
    :tabs="tabs.tabs"
    :selected-tab-index="selectedTabIndex"
    :company-type="companyType"
    :belongto-program="tabsSlice.belongtoProgram"
    :header-loading="headerLoading"
    :status-pill="status.statusPill"
    :plan-header="plan.planHeader"
    @select="tabs.entityCardNegotiationTabsOnTabSelect"
    @toggle-change-status="
      status.negotiationStatusIsContactedOnToggleParentSupplierLevel
    "
    @toggle-contacted="status.negotiationStatusIsContactedOnToggle"
    @toggle-show-move-between="plan.toggleShowMoveBetween"
    @update:show-move-between="
      (value: boolean) => (plan.showMoveBetween = value)
    "
    @get-data-move-between-modal="plan.getDataMoveBetweenModal"
    @remove-plan-from-badge="plan.removePlanFromBadge"
  ></NegotiationSpendHeader>
  <div
    v-if="tabsSlice.belongtoProgram"
    class="row"
  >
    <NegotiationCashFlowCards
      :v-card="cashFlow.vCard"
      :loading="cashFlow.loading"
      :cash-flow-display="cashFlow.cashFlowDisplay"
      :program-is-recalculating-computed-value="programIsRecalculating"
      :forecast-process="cashFlow.forecastProcess"
      :user-is-admin="userIsAdmin"
      :use-feature-forecast-volume="useFeatureForecastVolume"
      :potential-theme="potentialTheme"
      :env-name="NAME"
      @show-modal-forecast="cashFlow.showModalForecast"
    ></NegotiationCashFlowCards>
    <NegotiationContextCards
      :v-card="cashFlow.contextVCard"
      :use-feature-credit-rating="useFeatureCreditRating"
      :credit-data="creditData"
      :entity-characteristics="entityCharacteristics"
      :entity-details="entityDetails"
      :spend-details="cashFlow.spendDetails"
      :buyer-leverage="buyerLeverage"
      :is-loading-entity-details="cashFlow.loading.isLoadingEntityDetails"
      :selected-tab-index="selectedTabIndex"
      :company-type="companyType"
      :buying-entity-country-label-entity="buyingEntityCountryLabelEntity"
      :buying-entity-country-label-spend="buyingEntityCountryLabelSpend"
      @show-modal-buyer-leverage="() => (buyerLeverage.isModalShowing = true)"
      @show-modal-credit-rating="
        () => (isModalEntityCreditRatingShowing = true)
      "
      @show-modal-credit-rating-and-buyer-leverage="
        () => (isModalCreditRatingAndBuyerLeverageShowing = true)
      "
    ></NegotiationContextCards>
  </div>
  <div
    v-if="
      tabsSlice.belongtoProgram &&
      tabsSlice.spendConfigurationUuid !== '' &&
      !grid.patchGrid
    "
    class="row"
  >
    <div class="col">
      <EntityPaymentTermsStrategies
        :key="tabsSlice.keyTermsStrategies"
        :company-id="companyId"
        :config-id="tabsSlice.spendConfigurationUuid"
        :feedback-rating="tabs.resultsFeedback.feedbackRating ?? 0"
        :feedback-labels="tabs.resultsFeedback.feedbackLabels"
        :level-type="tabsSlice.levelType"
        :level-type-for-strategies="tabsSlice.levelTypeForStrategies"
        :selected-program-uri="programUuid ? programUuid : ''"
        :selected-index="selectedTabIndex"
        :payment-terms-target-tracking-number="
          pt.paymentTermsTargetTrackingNumber
        "
        :for-potential-theme="forPotentialTheme"
        :program-is-recalculating="
          programIsRecalculating && !cashFlow.forecastProcess
        "
        :on-s-c-f="cashFlow.onSCF"
        :scf-accepted="cashFlow.scfAcceptedForModal"
        :hide-controls="tabsSlice.hideControls"
        :buyer-leverage-distribution="
          entityCharacteristics.buyerLeverage.description
        "
        :payment-terms-descriptions="paymentTermsDescriptionsComputed"
        :spend-uuid="tabsSlice.spendUUID"
        @add-results-shortcut="isModalResultsShowing = true"
        @show-strategies="tabsSlice.showStrategies = true"
        @show-results="isModalResultsShowing = true"
        @update-feedback="isModalResultsShowing = true"
        @reload-apis="updaterowDataParent"
        @chart-line-btn-shortcut-clicked="pt.handleChartLineBtnShortcutClick"
        @payment-terms-target-changed="
          pt.paymentTermsModalHandleInputValueChange
        "
        @change-groups="harm.sendGroups"
        @set-exists-target="status.setSshowExistsTarget"
        @change-tab="(tabName: string) => emit('changeTab', tabName)"
        @get-vcard-value="cashFlow.getVcardValue"
        @get-vcard-terms="(e: number) => (vcardTerms = e)"
        @get-opportunity-terms="(e: number) => (opportunityTerms = e)"
      ></EntityPaymentTermsStrategies>
    </div>
  </div>
  <div
    v-if="tabsSlice.showStrategies"
    class="row mt-4"
    :class="{ 'hide-grid': !tabsSlice.hideControls }"
  >
    <div class="col-12">
      <div class="card shadow-none mb-0">
        <div class="card-body">
          <ListNegotiation
            :key="grid.keyGrid"
            :selected-program-id="programUuid"
            :entity-uuid="companyId"
            :has-financing="checkbox.externalFinancing"
            :has-harmonization="checkbox.termHarmonization"
            :company-type="companyType"
            :program-inrecalculating="
              programIsRecalculating && !cashFlow.forecastProcess
            "
            :selected-tab-index="selectedTabIndex"
            :all-spends-tab="tabsSlice.allSpendsTab"
            :in-recalculation="tabsSlice.inRecalculation"
            :patch-grid="grid.patchGrid"
            :show-options="true"
            :is-selectable="false"
            :potential-theme="potentialTheme"
            @change-data="updaterowDataParent"
            @send-data-spends="sendDataSpends"
            @remove-plan-suppliers="plan.removePlanFromBadge"
          ></ListNegotiation>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.card {
  padding: 0;
  margin-bottom: 16px;
  min-height: 240px;
}

.card-body {
  padding: 24px;
}

// Set the height of all cards at the top to the same value

.row > [class*="col-"]:has(> .card) {
  display: flex;
}

.row > [class*="col-"]:has(> .card) > .card {
  width: 100%;
}

.hide-grid {
  display: none;
}
</style>
