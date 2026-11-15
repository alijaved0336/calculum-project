<template>
  <div class="wc-dashboard">
    <!-- Header bar: version selector + min-days control -->
    <div
      class="d-flex align-items-center justify-content-between flex-wrap mb-3 wc-dashboard__header"
    >
      <div
        v-if="fromVersionOptions.length >= 1"
        class="d-flex align-items-center wc-version-selector"
      >
        <span class="wc-version-selector__compare-label">{{
          $t("home.workingCapital.versionSelector.compareFrom")
        }}</span>
        <div class="wc-version-selector__side">
          <SearchableDropdown
            :model-value="fromVersionUuid"
            :items="fromVersionItems"
            value-key="uuid"
            label-key="label"
            @update:model-value="onFromVersionSelect"
          />
        </div>
        <div class="wc-version-selector__arrow"><span>→</span></div>
        <div
          class="wc-version-selector__side_active wc-version-selector__latest"
        >
          <span class="wc-version-selector__check">✓</span>
          <span>{{ activeSpendFileLabel }}</span>
        </div>
      </div>
      <div
        v-else
        class="wc-dashboard__spacer"
      ></div>
      <div class="d-flex align-items-center justify-content-end flex-wrap">
        <WorkingCapitalMinDaysControl
          :model-value="minDays"
          @increment="incrementMinDays"
          @decrement="decrementMinDays"
        />
        <!-- Options menu, same pattern as EntityCardOverview.vue's 3-dot menu -->
        <div class="d-flex icon-container wc-options ml-2">
          <a
            id="wc-options-btn"
            class="d-flex border-none"
            href="#"
            :class="{ 'wc-options__btn--disabled': !comparisonResult }"
            @click.prevent="
              comparisonResult && (showOptionsMenu = !showOptionsMenu)
            "
          >
            <iconEllipsisVertical class="three-dots-icon my-auto" />
          </a>
          <div
            v-if="showOptionsMenu"
            id="wc-options-menu"
            class="dropdown-container"
          >
            <ul class="d-flex flex-column menu-items-list">
              <li
                class="menu-item pointer"
                data-testid="wc-export-pdf-menu-item"
                @click="openExportPDFModal"
              >
                <span class="d-flex text-gray-500 container-svg-and-text">
                  <iconPDF class="menu-icon mr-2 fill-current" />
                  <span>{{
                    $t("home.workingCapital.export.exportButton")
                  }}</span>
                </span>
              </li>
              <!-- WI#20545 — same access as the PDF, no role check (BR-06). -->
              <li
                class="menu-item pointer"
                :class="{ 'menu-item--disabled': hasError }"
                data-testid="wc-export-excel-menu-item"
                @click="!hasError && exportListToExcel()"
              >
                <span class="d-flex text-gray-500 container-svg-and-text">
                  <IconDownload class="menu-icon mr-2 fill-current" />
                  <span>{{
                    $t("home.workingCapital.export.exportExcelButton")
                  }}</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <WorkingCapitalExportPDF
      v-if="showExportPDFModal && comparisonResult"
      :result="comparisonResult"
      :base-version-uuid="fromVersion?.uuid"
      @close="showExportPDFModal = false"
    />

    <!-- Error state -->
    <div
      v-if="hasError && !isLoading"
      class="alert alert-danger d-flex align-items-center justify-content-between"
    >
      <span>{{ $t("home.workingCapital.error.loadFailed") }}</span>
      <button
        class="btn btn-sm btn-outline-danger"
        @click="runComparison"
      >
        {{ $t("home.workingCapital.error.retry") }}
      </button>
    </div>

    <!-- Currency conversion unavailable notice (AC-05/EF-1) -->
    <div
      v-if="currencyConversionUnavailable"
      class="alert alert-warning d-flex align-items-center"
    >
      <span>{{
        $t("home.workingCapital.error.currencyConversionUnavailable")
      }}</span>
    </div>

    <!-- WI#20545 — Overview / List sub-tabs. v-show, not v-if: switching never refetches
         nor rebuilds the charts (AC-01), and a Min Days or "Compare from" change only
         reruns the comparison, so the user stays on whichever sub-tab is open (AF-1/AF-2). -->
    <div
      class="d-flex align-items-center mb-3"
      data-testid="wc-sub-tabs"
    >
      <a
        v-for="(tab, index) in subTabs"
        :key="tab.key"
        class="btn font-md text-capitalize custom-padding-btn"
        :class="[
          activeSubTab === tab.key ? 'btn-clear' : 'btn-clean',
          index > 0 ? 'rounded-tbl-none' : '',
          index < subTabs.length - 1 ? 'rounded-tbr-none' : '',
        ]"
        :data-testid="`wc-sub-tab-${tab.key}`"
        @click="activeSubTab = tab.key"
      >{{ $t(tab.label) }}</a>
    </div>

    <WorkingCapitalSupplierList
      v-show="activeSubTab === 'list'"
      :items="supplierListItems"
      :company-currency="comparisonResult?.currency ?? ''"
      :current-file-name="toVersion?.name ?? ''"
      :comparison-file-name="fromVersion?.name ?? ''"
    />

    <div
      v-show="activeSubTab === 'overview'"
      data-testid="wc-overview"
    >
      <!-- KPI Cards row -->
      <div class="row mb-3">
        <div
          v-for="(card, index) in kpiCards"
          :key="card.title"
          class="col-sm-12 col-md-6 col-lg-6 col-xl-3 mb-3"
        >
          <WorkingCapitalKPICard
            :title="card.title"
            :big-value="card.bigValue"
            :big-value-tooltip="card.bigValueTooltip"
            :sub-lines="card.subLines"
            :progress-pct="card.progressPct"
            :show-skeleton="isLoading"
            :centered="index < 3"
          />
        </div>
      </div>

      <!-- Charts row 1 -->
      <div class="row">
        <div class="col-sm-12 col-lg-6 mb-3">
          <SupplierMatchCoverageChart
            v-if="comparisonResult"
            :result="comparisonResult"
            :from-label="fromMonthYear"
            :to-label="toMonthYear"
            :show-skeleton="isLoading"
          />
        </div>
        <div class="col-sm-12 col-lg-6 mb-3">
          <WAPTImprovementChart
            v-if="comparisonResult"
            :result="comparisonResult"
            :from-label="fromMonthYear"
            :to-label="toMonthYear"
            :show-skeleton="isLoading"
          />
        </div>
      </div>
      <!-- Charts row 2 -->
      <div class="row">
        <div class="col-sm-12 col-lg-6 mb-3">
          <CashFlowByCountryChart
            v-if="comparisonResult"
            :result="comparisonResult"
            :show-skeleton="isLoading"
          />
        </div>
        <div class="col-sm-12 col-lg-6 mb-3">
          <PaymentTermsByCountryChart
            v-if="comparisonResult"
            :result="comparisonResult"
            :from-label="fromMonthYear"
            :to-label="toMonthYear"
            :show-skeleton="isLoading"
          />
        </div>
      </div>
      <!-- Charts row 3 -->
      <div class="row align-items-start">
        <div class="col-sm-12 col-lg-6 mb-3">
          <TopSuppliersChart
            v-if="comparisonResult"
            :result="comparisonResult"
            :show-skeleton="isLoading"
          />
        </div>
        <div class="col-sm-12 col-lg-6 mb-3">
          <CashFlowVsTargetChart
            v-if="comparisonResult"
            :result="comparisonResult"
            :show-skeleton="isLoading"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAppStore } from "@/stores/app";
import iconEllipsisVertical from "@/resources/assets/images/icons/iconEllipsisVertical.vue";
import iconPDF from "@/resources/assets/images/icons/iconPDF.vue";
import IconDownload from "@/modules/components/icons/IconDownload.vue";
import {
  formatVersionLabel,
  formatVersionMonthYear,
} from "../utils/formatters";
import { buildKpiCards } from "../utils/kpiCards";
import { SearchableDropdown } from "@ada/design-system";
import { useWorkingCapitalComparison } from "../composables/useWorkingCapitalComparison";
import WorkingCapitalMinDaysControl from "../components/WorkingCapitalMinDaysControl.vue";
import WorkingCapitalKPICard from "../components/WorkingCapitalKPICard.vue";
import SupplierMatchCoverageChart from "../components/SupplierMatchCoverageChart.vue";
import WAPTImprovementChart from "../components/WAPTImprovementChart.vue";
import CashFlowByCountryChart from "../components/CashFlowByCountryChart.vue";
import PaymentTermsByCountryChart from "../components/PaymentTermsByCountryChart.vue";
import TopSuppliersChart from "../components/TopSuppliersChart.vue";
import CashFlowVsTargetChart from "../components/CashFlowVsTargetChart.vue";
import WorkingCapitalExportPDF from "../pdf/WorkingCapitalExportPDF.vue";
import WorkingCapitalSupplierList from "../components/WorkingCapitalSupplierList.vue";
import { useWorkingCapitalExcelExport } from "../composables/useWorkingCapitalExcelExport";

type WorkingCapitalSubTab = "overview" | "list";

export default defineComponent({
  name: "WorkingCapitalDashboard",
  components: {
    iconEllipsisVertical,
    iconPDF,
    IconDownload,
    WorkingCapitalSupplierList,
    SearchableDropdown,
    WorkingCapitalMinDaysControl,
    WorkingCapitalKPICard,
    SupplierMatchCoverageChart,
    WAPTImprovementChart,
    CashFlowByCountryChart,
    PaymentTermsByCountryChart,
    TopSuppliersChart,
    CashFlowVsTargetChart,
    WorkingCapitalExportPDF,
  },
  setup() {
    const { t, locale } = useI18n({
      warnHtmlMessage: false,
      useScope: "global",
    });
    const showExportPDFModal = ref(false);
    const showOptionsMenu = ref(false);
    const appStore = useAppStore();

    function openExportPDFModal() {
      showOptionsMenu.value = false;
      showExportPDFModal.value = true;
    }

    // Closes the options menu on any click outside the button/menu itself —
    // same pattern as EntityCardOverview.vue's menuPopup.
    function handleClickOutsideOptionsMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (
        target.closest("#wc-options-btn") ||
        target.closest("#wc-options-menu")
      ) {
        return;
      }
      showOptionsMenu.value = false;
    }
    onMounted(() => {
      document.body.addEventListener("click", handleClickOutsideOptionsMenu);
    });
    onUnmounted(() => {
      document.body.removeEventListener("click", handleClickOutsideOptionsMenu);
    });
    // AC-05/EF-1 — the global currency selector (HomeNavbar.vue) sets this when
    // the last rate fetch failed, so we can show a clear notice instead of
    // silently displaying stale/incorrect converted amounts.
    const currencyConversionUnavailable = computed(
      () => appStore.getCurrencyConversionUnavailable,
    );

    const {
      fromVersionOptions,
      toVersion,
      fromVersion,
      minDays,
      comparisonResult,
      isLoading,
      hasError,
      runComparison,
      selectFromVersion,
      incrementMinDays,
      decrementMinDays,
    } = useWorkingCapitalComparison();
    // AC-07 — month + year, locale-aware; falls back to the version identity alone
    // when finalDate is missing (EF-1).
    const fromVersionItems = computed(() =>
      fromVersionOptions.value.map((v) => ({
        uuid: v.uuid,
        label: formatVersionLabel(v, locale.value),
      })),
    );
    const fromVersionUuid = computed(() => fromVersion.value?.uuid ?? "");

    const activeSpendFileLabel = computed(() => {
      const monthYear = formatVersionMonthYear(
        toVersion.value?.finalDate,
        locale.value,
      );
      return monthYear
        ? t("home.workingCapital.versionSelector.activeSpendFileWithDate", {
            date: monthYear,
          })
        : t("home.workingCapital.versionSelector.activeSpendFile");
    });

    function onFromVersionSelect(uuid: string) {
      const version = fromVersionOptions.value.find((v) => v.uuid === uuid);
      if (version) selectFromVersion(version);
    }

    // WI#20545 — Overview is today's dashboard and the default (AC-01).
    const subTabs: { key: WorkingCapitalSubTab; label: string }[] = [
      { key: "overview", label: "home.workingCapital.subTabs.overview" },
      { key: "list", label: "home.workingCapital.subTabs.list" },
    ];
    const activeSubTab = ref<WorkingCapitalSubTab>("overview");
    // EF-2 — when the comparison could not be loaded the List is empty, not stale.
    const supplierListItems = computed(() =>
      hasError.value ? [] : (comparisonResult.value?.supplierList ?? []),
    );

    const { exportToExcel } = useWorkingCapitalExcelExport();
    function exportListToExcel() {
      showOptionsMenu.value = false;
      if (comparisonResult.value) {
        exportToExcel(comparisonResult.value, fromVersion.value?.uuid, {
          current: toVersion.value?.name,
          comparison: fromVersion.value?.name,
        });
      }
    }

    const kpiCards = computed(() => buildKpiCards(comparisonResult.value, t));

    const fromYear = computed(() => comparisonResult.value?.fromYear ?? "");
    const toYear = computed(() => comparisonResult.value?.toYear ?? "");
    // Month + year for the WAPT Improvement chart specifically — a bare year is
    // ambiguous once spend files can have different period boundaries. Falls back
    // to the bare year if the date is missing.
    const fromMonthYear = computed(
      () =>
        formatVersionMonthYear(comparisonResult.value?.fromDate, locale.value) ||
        fromYear.value,
    );
    const toMonthYear = computed(
      () =>
        formatVersionMonthYear(comparisonResult.value?.toDate, locale.value) ||
        toYear.value,
    );

    return {
      fromVersionOptions,
      fromVersion,
      toVersion,
      fromVersionItems,
      fromVersionUuid,
      activeSpendFileLabel,
      currencyConversionUnavailable,
      showExportPDFModal,
      showOptionsMenu,
      openExportPDFModal,
      subTabs,
      activeSubTab,
      supplierListItems,
      exportListToExcel,
      onFromVersionSelect,
      minDays,
      comparisonResult,
      isLoading,
      hasError,
      runComparison,
      selectFromVersion,
      incrementMinDays,
      decrementMinDays,
      kpiCards,
      fromMonthYear,
      toMonthYear,
    };
  },
});
</script>

<style scoped lang="scss">
.wc-dashboard {
  padding: 1rem 0;

  &__header {
    gap: 0.75rem;
  }

  &__spacer {
    flex: 1;
  }

  :deep(.card-body) {
    padding: 0.75rem;
  }
}

.wc-version-selector {
  gap: 0.75rem;

  &__compare-label {
    font-size: 0.8125rem;
    color: #344054;
    white-space: nowrap;
  }

  &__side {
    min-width: 310px;
  }

  &__side_active {
    min-width: 200px;
  }

  &__latest {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    min-height: 38px;
    border: 1px solid #c7d7fe;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    color: #6172f3;
    background: #f5f3ff;
    white-space: nowrap;
  }

  &__check {
    color: #6172f3;
    font-size: 0.875rem;
  }

  &__arrow {
    font-size: 1.125rem;
    color: #667085;
  }
}

// Options menu (3-dot button + dropdown), same pattern as EntityCardOverview.vue.
.wc-options {
  position: relative;

  &__btn--disabled {
    opacity: 0.4;
    pointer-events: none;
  }
}

.three-dots-icon {
  max-height: 16px;
}

.dropdown-container {
  position: absolute;
  top: 2.25rem;
  right: 0;
  z-index: 10;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 1rem;
  border-radius: 8px;
  width: fit-content;
  border: 1px solid #e4e7ec;
  box-shadow:
    0 4px 6px -2px rgba(16, 24, 40, 0.03),
    0 12px 16px -4px rgba(16, 24, 40, 0.08);

  .menu-items-list {
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .menu-item {
    margin: 0;
    padding: 0;
  }

  .menu-item--disabled {
    opacity: 0.4;
    pointer-events: none;
  }

  .menu-icon {
    width: 20px !important;
    height: 20px !important;
  }

  .container-svg-and-text {
    white-space: nowrap;

    &:hover {
      cursor: pointer;

      span {
        color: #6172f3;
      }
    }
  }
}
</style>
