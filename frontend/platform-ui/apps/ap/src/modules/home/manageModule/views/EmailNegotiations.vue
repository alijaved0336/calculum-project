<template>
  <TeaserView
    v-if="showTeaserViewForEmailNegotiations"
    teaser="emailNegotiations"
  />
  <div v-if="!showTeaserViewForEmailNegotiations" class="row mb-3">
    <div class="col-12 d-flex align-items-center justify-content-between">
      <TabStrip
        v-if="!isNullOrUndefined(tabs) && tabs.length > 2"
        :selected="tabSelectedIndex"
        :tabs="tabs"
        @select="tabOnSelect"
      >
      </TabStrip>

      <!-- Upload File -->

      <template v-if="userIsSuperAdmin || userSalesRoleEnabled">
        <input
          id="fileInput"
          ref="fileRef"
          class="d-none"
          type="file"
          accept=".xls, .xlsx"
          @change="fileInputOnChange"
        />

        <button
          type="button"
          class="btn outline-secondary-btn font-md"
          style="z-index: 1; width: fit-content"
          @click="fileUploadBtnOnClick"
        >
          <IconDocument class="mr-1 w-4 h-4" />

          <span>
            {{ $t("global.uploadFile") }}
          </span>
        </button>
      </template>

      <!-- END Upload File -->
    </div>
  </div>

  <div v-if="!showTeaserViewForEmailNegotiations" class="row">
    <!-- Email Negotiations -->

    <div class="col-md-6 col-xl-4">
      <div class="card">
        <div class="card-body d-flex flex-column">
          <div
            class="d-flex justify-content-between align-items-center mb-2"
            style="position: relative;"
          >
            <h6 class="mb-1 font-bold text-base">
              {{ $t("home.emailNegotiations.sectionTitle") }}
              <CalculumTooltipIcon
                :info-text="$t('global.emailStatusTooltip')"
                :advanced-tooltip-class="false"
                :unique-identifier="'email-status-tooltip-manage'"
                :key-pop-over="'emailStatusTooltipManage'"
              />
            </h6>

            <template
              v-if="!isNullOrUndefined(communicationMetricsItemsFormatted)"
            >
              <p
                class="btn-extension"
                @click="communicationMetricsChartIsFullScreen = true"
              >
                <button class="btn btn-simple btn-icon link link--icon">
                  <i class="fa-solid fa-up-right-and-down-left-from-center text-sm" />
                </button>
              </p>
            </template>
          </div>

          <template v-if="statsIsLoading">
            <div class="my-4">
              <SkeletonPieChart />
            </div>
          </template>

          <template
            v-else-if="!isNullOrUndefined(communicationMetricsItemsFormatted)"
          >
            <!-- Total -->
            <p class="mb-1">
              <span>{{ $t("global.total") }}: </span>
              <span class="font-bold">
                {{ communicationMetricsTotalFormatted }}
              </span>
            </p>

            <Chart :style="{ height: '350px' }">
              <ChartSeries>
                <ChartSeriesItem
                  :type="'pie'"
                  :data-items="communicationMetricsItemsFormatted"
                  :field="'value'"
                  :category-field="'category'"
                  :labels="{
                    visible: true,
                    content: chartsGetLabelContentFormatted
                  }"
                  :color-field="'pieSliceColor'"
                />
              </ChartSeries>
              <ChartLegend :position="'bottom'" />
            </Chart>
          </template>

          <!-- No Data -->
          <p
            v-else
            class="my-auto text-capitalize font-md font-semibold text-gray-400 text-center"
          >
            {{ $t("global.noDataAvailable") }}
          </p>
        </div>
      </div>
    </div>

    <!-- Email Metrics - Full Screen -->

    <CalculumFullScreen
      v-if="
        communicationMetricsChartIsFullScreen &&
          !isNullOrUndefined(communicationMetricsItemsFormatted)
      "
      :title="$t('global.emailNegotiations')"
      @closeFullScreen="communicationMetricsChartIsFullScreen = false"
    >
      <template #fullScreenContent>
        <div class="card w-100 bootstrap-card-body-no-hover card-full-width">
          <div class="card-body">
            <div
              class="d-flex justify-content-between align-items-center mb-2"
              style="z-index: 97; position: relative;"
            >
              <h6 class="mb-1 font-bold text-base">
                {{ $t("global.emailMetrics") }}
              </h6>
            </div>

            <div class="row" style="z-index: 1;">
              <div class="col-12 fullScreen">
                <Chart :style="{ height: '900px' }">
                  <ChartLegend :position="'bottom'" />
                  <ChartSeries>
                    <ChartSeriesItem
                      :type="'pie'"
                      :data-items="communicationMetricsItemsFormatted"
                      :field="'value'"
                      :category-field="'category'"
                      :labels="{
                        visible: true,
                        content: chartsGetLabelContentFormatted
                      }"
                      :color-field="'pieSliceColor'"
                    />
                  </ChartSeries>
                </Chart>
              </div>
            </div>
          </div>
        </div>
      </template>
    </CalculumFullScreen>

    <!-- END Email Metrics -->

    <!-- Contact Status -->

    <div class="col-md-6 col-xl-4">
      <div class="card">
        <div class="card-body d-flex flex-column">
          <div
            class="d-flex justify-content-between align-items-center mb-2"
            style="position: relative;"
          >
            <h6 class="mb-1 font-bold text-base">
              {{ $t("global.contactStatus") }}
              <CalculumTooltipIcon
                :info-text="$t('global.contactStatusTooltip')"
                :advanced-tooltip-class="false"
                :unique-identifier="'contact-status-tooltip-manage'"
                :key-pop-over="'contactStatusTooltipManage'"
              />
            </h6>

            <template v-if="!isNullOrUndefined(contactStatusItemsFormatted)">
              <p
                class="btn-extension"
                @click="contactStatusChartIsFullScreen = true"
              >
                <button class="btn btn-simple btn-icon link link--icon">
                  <i class="fa-solid fa-up-right-and-down-left-from-center text-sm" />
                </button>
              </p>
            </template>
          </div>

          <template v-if="statsIsLoading">
            <div class="my-4">
              <SkeletonPieChart />
            </div>
          </template>

          <template v-else-if="!isNullOrUndefined(contactStatusItemsFormatted)">
            <!-- Total -->
            <p class="mb-1">
              <span>{{ $t("global.total") }}: </span>
              <span class="font-bold">
                {{ contactStatusTotalFormatted }}
              </span>
            </p>

            <Chart :style="{ height: '350px' }">
              <ChartSeries>
                <ChartSeriesItem
                  :type="'pie'"
                  :data-items="contactStatusItemsFormatted"
                  :field="'value'"
                  :category-field="'category'"
                  :labels="{
                    visible: true,
                    content: chartsGetLabelContentFormatted
                  }"
                  :color-field="'pieSliceColor'"
                />
              </ChartSeries>
              <ChartLegend :position="'bottom'" />
            </Chart>
          </template>

          <!-- No Data -->
          <p
            v-else
            class="my-auto text-capitalize font-md font-semibold text-gray-400 text-center"
          >
            {{ $t("global.noDataAvailable") }}
          </p>
        </div>
      </div>
    </div>

    <!-- Contact Status - Full Screen -->

    <CalculumFullScreen
      v-if="
        contactStatusChartIsFullScreen &&
          !isNullOrUndefined(contactStatusItemsFormatted)
      "
      :title="$t('global.emailNegotiations')"
      @closeFullScreen="contactStatusChartIsFullScreen = false"
    >
      <template #fullScreenContent>
        <div class="card w-100 bootstrap-card-body-no-hover card-full-width">
          <div class="card-body">
            <div
              class="d-flex justify-content-between align-items-center mb-2"
              style="z-index: 97; position: relative;"
            >
              <h6 class="mb-1 font-bold text-base">
                {{ $t("global.contactStatus") }}
              </h6>
            </div>

            <div class="row" style="z-index: 1;">
              <div class="col-12 fullScreen">
                <Chart :style="{ height: '900px' }">
                  <ChartLegend :position="'bottom'" />
                  <ChartSeries>
                    <ChartSeriesItem
                      :type="'pie'"
                      :data-items="contactStatusItemsFormatted"
                      :field="'value'"
                      :category-field="'category'"
                      :labels="{
                        visible: true,
                        content: chartsGetLabelContentFormatted
                      }"
                      :color-field="'pieSliceColor'"
                    />
                  </ChartSeries>
                </Chart>
              </div>
            </div>
          </div>
        </div>
      </template>
    </CalculumFullScreen>

    <!-- END Contact Status -->

    <!-- Cash Flow Achieved -->

    <div class="col-md-6 col-xl-4 d-flex">
      <div class="card">
        <div class="card-body d-flex flex-column">
          <h6 class="font-bold text-base">
            {{ $t("home.homePage.cashFlowAchieved") }}
            <CalculumTooltipIcon
              :info-text="$t('global.cashFlowAchievedTooltip')"
              :advanced-tooltip-class="false"
              :unique-identifier="'cash-flow-achieved-tooltip-manage'"
              :key-pop-over="'cashFlowAchievedTooltipManage'"
            />
          </h6>

          <template
            v-if="statsIsLoading || !isNullOrUndefined(cashFlowAchieved)"
          >
            <div class="my-auto">
              <GeneralGaugeBar
                :active-skeleton="statsIsLoading"
                :arc-gauge-key="cashFlowAchievedComponentKey"
                :cards-in-a-row-count="3"
                :middle-number="
                  StringUtils.formatBigNumbers(cashFlowAchieved?.agreed ?? -1)
                "
                :percentage="cashFlowAchieved?.percentage"
                :result="0"
                :show-skeleton="statsIsLoading"
                :target="
                  StringUtils.formatBigNumbers(cashFlowAchieved?.end ?? -1)
                "
              />
            </div>
          </template>

          <!-- No Data -->
          <p
            v-else
            class="my-auto text-capitalize font-md font-semibold text-gray-400 text-center"
          >
            {{ $t("global.noDataAvailable") }}
          </p>
        </div>
      </div>
    </div>

    <!-- END Cash Flow Achieved -->
  </div>

  <!-- Grid -->

  <div v-if="!showTeaserViewForEmailNegotiations" class="row">
    <div class="col-12">
      <div class="card min-h-px">
        <div class="card-body">
          <ListEmailNegotiation
            :key="keyGrid"
            :selected-program-id="programSelectedId || undefined"
            :plan-selected-id="planSelectedId || undefined"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- END Grid -->
</template>
<script lang="ts">
import { KeyValue } from "@/types";

import {
  ComputedRef,
  Ref,
  computed,
  defineComponent,
  ref,
  watch,
  reactive,
  toRefs,
  onMounted
} from "vue";

// Icons
import IconDocument from "@/resources/assets/images/icons/IconDocument.vue";

// Kendo
import {
  TabStrip,
  TabStripSelectEventArguments,
  TabStripTabProperties
} from "@progress/kendo-vue-layout";
import {
  Chart,
  ChartLegend,
  ChartSeries,
  ChartSeriesItem
} from "@progress/kendo-vue-charts";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import "hammerjs";

import {
  ArrayUtils,
  ColorsUtils,
  FormatData,
  isNullOrUndefined,
  NumberUtils,
  StringUtils
} from "@/utils";
import { columnsEmailNegotiations } from "../data";
import { EmailNegotiationAPI } from "@/api";
import { useI18n } from "vue-i18n";
import { useProgram, useSpendFile, useUser } from "@/composables";
import { useAppStore } from "@/stores/app";
import { CalculumFullScreen } from "@ada/design-system";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import GeneralGaugeBar from "@/modules/components/GeneralGaugeBar.vue";
import ListEmailNegotiation from "@/modules/home/manageModule/components/ListEmailNegotiation.vue";
import { useToast } from "vue-toastification";
import SkeletonPieChart from "@/modules/home/components/skeletons/SkeletonPieChart.vue";
import TeaserView from "@/modules/components/teaser/TeaserView.vue";

export default defineComponent({
  name: "EmailNegotiations",
  components: {
    CalculumFullScreen,
    CalculumTooltipIcon,
    Chart,
    ChartLegend,
    ChartSeries,
    ChartSeriesItem,
    GeneralGaugeBar,
    IconDocument,
    ListEmailNegotiation,
    SkeletonPieChart,
    TabStrip,
    TeaserView
  },
  props: {
    currentTabTracker: { type: Number, default: 0 }
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    const appStore = useAppStore();
    const toast = useToast();

    const { spendFileVersionActiveId } = useSpendFile();

    const { userIsSuperAdmin, useFeatureEmailNegotiations, userSalesRoleEnabled } = useUser();

    /**
     * Show Teaser View for Email Negotiations if roles is not included
     */
    const showTeaserViewForEmailNegotiations = computed(() => {
      return useFeatureEmailNegotiations.value === false;
    });

    const { programSelectedId } = useProgram();
    

    const currencyRate: ComputedRef<number> = computed(
      () => appStore.getCurrencyAmount
    );

    interface DataInterface {
      keyGrid: number;
    }

    const dataemail = reactive<DataInterface>({
      keyGrid: NumberUtils.getRandomInt()
    });

    // *** Plans ***

    const emailNegotiationPlans: Ref<KeyValue<string, string>[] | null> = ref(
      null
    );

    const emailNegotiationPlansIsLoading: Ref<boolean> = ref(false);

    const planSelectedId: Ref<string | null> = ref(null);

    const showGrid = ref(false);

    watch(emailNegotiationPlans, () => {
      // Validate
      if (isNullOrUndefined(emailNegotiationPlans.value)) {
        if (import.meta.env.DEV)
          console.error("** (tabOnSelect) emailNegotiationPlans.value is null");

        return;
      }

      // Only one plan available. Select it.
      if (
        tabSelectedIndex.value === 0 &&
        emailNegotiationPlans.value.length === 1
      ) {
        planSelectedId.value = emailNegotiationPlans.value[0].key;

        return;
      }
    });

    async function emailNegotiationGetPlansAPIReadAll() {
      // Validate
      if (StringUtils.isNullUndefinedOrEmpty(programSelectedId.value)) {
        if (import.meta.env.DEV)
          console.error(
            "** (emailNegotiationGetPlansAPIReadAll) programSelectedId is null"
          );

        return;
      }

      emailNegotiationPlansIsLoading.value = true;

      const response = await EmailNegotiationAPI.emailNegotiationGetPlans({
        programId: programSelectedId.value
      });

      // Validate response
      if (!response.success || isNullOrUndefined(response.data)) {
        if (import.meta.env.DEV)
          console.log(
            `** Error - Invalid response in panelBarItemOptionsAPIReadAll.`
          );

        toast.error(translate.t("global.errorSendingEmail"));

        emailNegotiationPlans.value = null;

        emailNegotiationPlansIsLoading.value = false;
      }

      emailNegotiationPlans.value = response.data;

      emailNegotiationPlansIsLoading.value = false;
    }

    // *** END Plans ***

    // *** Tabs ***

    const tabs: Ref<TabStripTabProperties[]> = computed(() => {
      if (isNullOrUndefined(emailNegotiationPlans.value)) {
        return [
          {
            title: translate.t('home.emailNegotiations.summaryColumn')
          }
        ];
      }

      return [
        {
          title: translate.t('home.emailNegotiations.summaryColumn')
        },
        ...emailNegotiationPlans.value.map(i => {
          return {
            id: i.key,
            title: i.value
          };
        })
      ];
    });

    const tabSelectedIndex = ref(0);

    function tabOnSelect(e: TabStripSelectEventArguments) {
      tabSelectedIndex.value = e.selected;
    }

    watch(tabSelectedIndex, () => {
      // Validate
      if (isNullOrUndefined(emailNegotiationPlans.value)) {
        if (import.meta.env.DEV)
          console.error("** (tabOnSelect) emailNegotiationPlans.value is null");

        return;
      }

      // No plan selected
      if (
        tabSelectedIndex.value === 0 &&
        emailNegotiationPlans.value.length > 2
      ) {
        planSelectedId.value = null;

        return;
      }

      // Many plans available
      // if (
      //   ArrayUtils.isEmpty(emailNegotiationPlans.value) ||
      //   tabSelectedIndex.value - 1 < 0
      // ) {
      //   if (import.meta.env.DEV)
      //     console.error(
      //       "** (tabOnSelect) emailNegotiationPlans.value is empty or array index is negative"
      //     );

      //   return;
      // }

      if (tabSelectedIndex.value === 0) {
        planSelectedId.value = null;
      } else {
        planSelectedId.value =
          emailNegotiationPlans.value[tabSelectedIndex.value - 1].key;
      }
      dataemail.keyGrid++;
    });

    // Refresh data if tab changes
    watch(planSelectedId, () => {
      if (isNullOrUndefined(planSelectedId.value)) {
        emailNegotiationGetStatsAPIReadAll();

        return;
      }

      emailNegotiationGetStatsAPIReadAll({
        planId: planSelectedId.value
      });
    });

    // *** END Tabs ***

    // *** Upload file ***

    const fileRef = ref();

    function fileUploadBtnOnClick() {
      // Validate
      if (isNullOrUndefined(fileRef.value)) {
        if (import.meta.env.DEV) console.error("** (fileUploadBtnOnClick) fileRef is null");

        return;
      }

      fileRef.value.click();

      fileRef.value.value = "";
    }

    /**
     * Upload a file to the server.
     *
     * @param {any} event
     * @return {Promise<void>}
     */
    async function fileInputOnChange(event: Event): Promise<void> {
      // Validate
      if (isNullOrUndefined(event.target)) {
        if (import.meta.env.DEV) console.error("** (fileAPICreate) event.target is null");

        return;
      }

      const target = event.target as HTMLInputElement;

      if (isNullOrUndefined(target.files)) {
        if (import.meta.env.DEV) console.error("** (fileAPICreate) target.files is null");

        return;
      }

      const files: FileList = target.files;

      const response = await EmailNegotiationAPI.emailNegotiationFileUpload({
        file: files[0],
        spendFileVersionId: spendFileVersionActiveId.value
      });

      // Validate response
      if (!response.success || isNullOrUndefined(response.data)) {
        toast.error(translate.t("global.errorUploadEmailNegotiation"));
      }

      toast.success(translate.t('global.successUploadEmailNegotiation'));
    }

    // *** END Upload file ***

    // *** Stats ***

    const statsIsLoading: Ref<boolean> = ref(false);

    const stats: Ref<{
      communicationMetrics: {
        emailStatus: string;
        value: number;
      }[];
      contactStatus: {
        contactStatus: string | null;
        value: number;
      }[];
      cashFlowAchieved: {
        agreed: number;
        end: number;
        percentage: number;
        start: number;
      };
    } | null> = ref(null);

    async function emailNegotiationGetStatsAPIReadAll(options?: {
      planId: string;
    }) {
      // Init
      const { planId } = options || {};

      // Validate
      if (StringUtils.isNullUndefinedOrEmpty(programSelectedId.value)) {
        if (import.meta.env.DEV)
          console.error(
            "** (emailNegotiationGetStatsAPIReadAll) programSelectedId is missing."
          );

        return;
      }

      let response = null;

      // Enable loading
      statsIsLoading.value = true;

      // Get Summary if not plan specified
      if (StringUtils.isNullUndefinedOrEmpty(planId)) {
        response = await EmailNegotiationAPI.emailNegotiationGetStats({
          currencyRate: currencyRate.value,
          programId: programSelectedId.value
        });
      }
      // Get data for plan selected
      else {
        response = await EmailNegotiationAPI.emailNegotiationGetStats({
          currencyRate: currencyRate.value,
          programId: programSelectedId.value,
          planId: planId
        });
      }

      // Validate response
      if (!response.success || isNullOrUndefined(response.data)) {
        if (import.meta.env.DEV)
          console.log(
            `** Error - Invalid response in emailNegotiationGetStatsAPIReadAll.`
          );
        toast.error(translate.t('global.errorSendingEmail'));

        stats.value = null;

        // Disable loading
        statsIsLoading.value = false;

        return;
      }

      stats.value = response.data;

      // Disable loading
      statsIsLoading.value = false;
    }

    // *** Communication Metrics ***

    const communicationMetricsChartIsFullScreen = ref(false);

    const communicationMetricsItems: ComputedRef<
      | {
          emailStatus: string;
          value: number;
        }[]
      | null
    > = computed(() => {
      // Validate
      if (isNullOrUndefined(stats.value)) {
        return null;
      }

      return stats.value.communicationMetrics;
    });

    /**
     * Get the formatted items of the communication metrics
     *
     * @returns {ComputedRef<{category: string; value: string; pieSliceColor: string}[]>}
     */
    const communicationMetricsItemsFormatted: ComputedRef<
      | {
          category: string;
          value: number | null;
          pieSliceColor: string;
        }[]
      | null
    > = computed(() => {
      // Validate
      if (isNullOrUndefined(communicationMetricsItems.value)) {
        return null;
      }

      return communicationMetricsItems.value.map(i => {
        return {
          category: i.emailStatus,
          value: i.value,
          pieSliceColor: chartsGetItemColor(i.emailStatus)
        };
      });
    });

    /**
     * Get the total from the items communication metrics items
     *
     * @returns {ComputedRef<number>}
     */
    const communicationMetricsTotalFormatted: ComputedRef<string> = computed(
      () => {
        if (
          isNullOrUndefined(communicationMetricsItems.value) ||
          ArrayUtils.isEmpty(communicationMetricsItems.value)
        ) {
          return "-";
        }

        const total = communicationMetricsItems.value.reduce(
          (total, item) =>
            !isNullOrUndefined(item.emailStatus) &&
            !isNullOrUndefined(item.value)
              ? total + item.value
              : total,
          0
        );

        return FormatData.getNumberWithDecimals(total, 0) ?? "-";
      }
    );

    // *** END Communication Metrics ***

    // *** Contact Status ***

    const contactStatusChartIsFullScreen = ref(false);

    const contactStatusItems: ComputedRef<
      | {
          contactStatus: string | null;
          value: number;
        }[]
      | null
    > = computed(() => {
      // Validate
      if (isNullOrUndefined(stats.value)) {
        return null;
      }

      return stats.value.contactStatus;
    });

    /**
     * Get the formatted items of the suppliers status
     *
     * @returns {ComputedRef<{category: string; value: string; pieSliceColor: string}[]>}
     */
    const contactStatusItemsFormatted: ComputedRef<
      | {
          category: string | null;
          value: number | null;
          pieSliceColor: string;
        }[]
      | null
    > = computed(() => {
      // Validate
      if (isNullOrUndefined(contactStatusItems.value)) {
        return null;
      }

      return contactStatusItems.value.map(i => {
        return {
          category: i.contactStatus ?? null,
          value: i.value,
          pieSliceColor: chartsGetItemColor(i.contactStatus ?? "")
        };
      });
    });

    /**
     * Get the total from the items suppliers status items
     *
     * @returns {ComputedRef<number>}
     */
    const contactStatusTotalFormatted: ComputedRef<string> = computed(() => {
      if (
        isNullOrUndefined(contactStatusItems.value) ||
        ArrayUtils.isEmpty(contactStatusItems.value)
      ) {
        return "-";
      }

      const total = contactStatusItems.value.reduce(
        (total, item) =>
          !isNullOrUndefined(item.value) ? total + item.value : total,
        0
      );

      return FormatData.getNumberWithDecimals(total, 0) ?? "-";
    });

    // *** END Suppliers Status ***

    // *** Cash Flow Achieved ***

    const cashFlowAchieved = computed(() => {
      // Validate
      if (isNullOrUndefined(stats.value)) {
        return null;
      }

      return stats.value.cashFlowAchieved;
    });

    const cashFlowAchievedComponentKey = ref(NumberUtils.getRandomInt());

    watch(
      () => props.currentTabTracker,
      () => {
        cashFlowAchievedComponentKey.value = NumberUtils.getRandomInt();
      }
    );

    // *** END Cash Flow Achieved ***

    function chartsGetLabelContentFormatted(props: {
      category: string;
      dataItem: {
        category: string;
        value: number;
        pieSliceColor: string;
      };
      percentage: number;
      series: any;
      value: number;
    }) {
      let formatedPercentage = StringUtils.formatPercentage(props.percentage);

      // Dealing with very small numbers
      if (props.percentage < 0.001 && props.percentage > 0) {
        formatedPercentage = "< 0.001%";
      }

      let formatedNumber =
        FormatData.getNumberWithDecimals(props.dataItem.value, 0) ?? "0";

      return `${formatedNumber} (${formatedPercentage})`;
    }

    function chartsGetItemColor(key: string): string {
      switch (key) {
        case "Opened":
        case "In progress":
          return ColorsUtils.blue[500];

        case "Replied":
        case "Escalated":
        case "Sent":
          return ColorsUtils.graycool[600];

        case "Bounced":
          return ColorsUtils.bluelight[400];

        case "Undelivered":
        case "No answer":
          return ColorsUtils.gray[400];

        case "Agreed (Extended)":
          return ColorsUtils.violet[500];

        case "Agreed (Not Extended)":
          return ColorsUtils.violet[300];

        default:
          return "";
      }
    }

    // *** Grid ***

    const gridColumns = columnsEmailNegotiations;

    const gridData: Ref<any[] | null> = ref(null);

    const gridDataIsLoading = ref(false);

    // Refresh data if tab changes
    watch(planSelectedId, () => {
      showGrid.value = true;
    });

    // *** END Grid ***

    onMounted(() => {
      if (showTeaserViewForEmailNegotiations.value) {
        return;
      }

      emailNegotiationGetStatsAPIReadAll();
      emailNegotiationGetPlansAPIReadAll();
    });

    return {
      ...toRefs(dataemail),
      cashFlowAchieved,
      cashFlowAchievedComponentKey,
      chartsGetLabelContentFormatted,
      communicationMetricsChartIsFullScreen,
      communicationMetricsItemsFormatted,
      communicationMetricsTotalFormatted,
      contactStatusChartIsFullScreen,
      contactStatusItemsFormatted,
      contactStatusTotalFormatted,
      fileInputOnChange,
      fileRef,
      fileUploadBtnOnClick,
      gridColumns,
      gridData,
      gridDataIsLoading,
      isNullOrUndefined,
      planSelectedId,
      programSelectedId,
      showGrid,
      showTeaserViewForEmailNegotiations,
      statsIsLoading,
      StringUtils,
      tabOnSelect,
      tabs,
      tabSelectedIndex,
      userIsSuperAdmin,
      userSalesRoleEnabled
    };
  }
});
</script>
<style lang="scss" scoped>
// ? - Remove this when all views are updated
.card {
  padding: 0;
  margin-bottom: 16px;
  min-height: 297px;
  width: 100%;
}

.card-body {
  padding: 24px 24px 16px;
}
</style>
