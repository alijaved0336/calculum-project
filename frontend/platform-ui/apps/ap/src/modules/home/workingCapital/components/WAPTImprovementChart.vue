<template>
  <div class="card shadow-none h-100">
    <div class="card-body d-flex flex-column">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h6 class="wc-wapt__title">
            {{ $t("home.workingCapital.wapt.title") }}
          </h6>
          <p class="wc-wapt__subtitle">
            {{ $t("home.workingCapital.wapt.subtitle") }}
          </p>
        </div>
        <div class="d-flex align-items-center wc-wapt__legend">
          <div class="wc-wapt__legend-item">
            <span class="wc-wapt__legend-dot wc-wapt__legend-dot--from"></span>
            <span>{{ fromLabel }}</span>
          </div>
          <div class="wc-wapt__legend-item">
            <span class="wc-wapt__legend-dot wc-wapt__legend-dot--to"></span>
            <span>{{ toLabel }}</span>
          </div>
          <div class="wc-wapt__legend-item">
            <span
              class="wc-wapt__legend-dot wc-wapt__legend-dot--target-from"
            ></span>
            <span
              >{{ $t("home.workingCapital.wapt.target") }} {{ fromLabel }}</span
            >
          </div>
          <div class="wc-wapt__legend-item">
            <span
              class="wc-wapt__legend-dot wc-wapt__legend-dot--target"
            ></span>
            <span
              >{{ $t("home.workingCapital.wapt.target") }} {{ toLabel }}</span
            >
          </div>
        </div>
      </div>
      <template v-if="showSkeleton">
        <SkeletonRectangle size="full" />
      </template>
      <template v-else>
        <div class="wc-wapt__body">
          <div class="wc-wapt__section">
            <p class="wc-wapt__section-label">
              {{ $t("home.workingCapital.wapt.matchedSuppliers") }}
            </p>
            <div
              class="d-flex align-items-stretch"
              style="flex: 1; gap: 0.75rem"
            >
              <div class="wc-wapt__bar-rows">
                <div
                  v-for="row in matchedRows"
                  :key="row.label"
                  class="wc-wapt__bar-row"
                >
                  <span class="wc-wapt__row-label">{{ row.label }}</span>
                  <div class="wc-wapt__bar-container">
                    <div
                      class="wc-wapt__bar"
                      :class="row.cls"
                      :style="{ width: row.pct + '%' }"
                    ></div>
                  </div>
                  <span class="wc-wapt__bar-value"
                    >{{ row.display }}</span
                  >
                </div>
              </div>
              <div class="wc-wapt__badge">
                <span class="wc-wapt__badge-title">{{
                  $t("home.workingCapital.wapt.changeInWapt")
                }}</span>
                <span class="wc-wapt__badge-value">{{ matchedBadge }}</span>
              </div>
            </div>
          </div>
          <div class="wc-wapt__section wc-wapt__section--divider">
            <p class="wc-wapt__section-label">
              {{ $t("home.workingCapital.wapt.improvedSuppliers") }}
            </p>
            <div
              class="d-flex align-items-stretch"
              style="flex: 1; gap: 0.75rem"
            >
              <div class="wc-wapt__bar-rows">
                <div
                  v-for="row in improvedRows"
                  :key="row.label"
                  class="wc-wapt__bar-row"
                >
                  <span class="wc-wapt__row-label">{{ row.label }}</span>
                  <div class="wc-wapt__bar-container">
                    <div
                      class="wc-wapt__bar"
                      :class="row.cls"
                      :style="{ width: row.pct + '%' }"
                    ></div>
                  </div>
                  <span class="wc-wapt__bar-value"
                    >{{ row.display }}</span
                  >
                </div>
              </div>
              <div class="wc-wapt__badge">
                <span class="wc-wapt__badge-title">{{
                  $t("home.workingCapital.wapt.changeInWapt")
                }}</span>
                <span class="wc-wapt__badge-value">{{ improvedBadge }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from "vue";
import { useI18n } from "vue-i18n";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";
import type { WorkingCapitalComparisonResult } from "../types";
import { formatDays, computeSafeMax } from "../utils/formatters";

function buildRows(
  from: number,
  to: number,
  targetFrom: number,
  target: number,
  fromLabel: string, // month + year — "from" row and its "Target" row
  toLabel: string, // month + year — "to" row and its "Target" row
  t: (key: string) => string,
) {
  // Both targets share the scale with both terms, so a target that moved between
  // versions is read off the same axis as the terms that chased it.
  const safeMax = computeSafeMax([from, to, targetFrom, target]);
  return [
    {
      label: fromLabel,
      cls: "wc-wapt__bar--from",
      value: from,
      display: formatDays(from, t),
      pct: (from / safeMax) * 100,
    },
    {
      label: toLabel,
      cls: "wc-wapt__bar--to",
      value: to,
      display: formatDays(to, t),
      pct: (to / safeMax) * 100,
    },
    {
      label: `${t('home.workingCapital.wapt.target')} ${fromLabel}`,
      cls: "wc-wapt__bar--target-from",
      value: targetFrom,
      display: formatDays(targetFrom, t),
      pct: (targetFrom / safeMax) * 100,
    },
    {
      label: `${t('home.workingCapital.wapt.target')} ${toLabel}`,
      cls: "wc-wapt__bar--target",
      value: target,
      display: formatDays(target, t),
      pct: (target / safeMax) * 100,
    },
  ];
}

// AC-05 — standard days-unit label instead of an ad-hoc "d" suffix.
function buildBadge(change: number, t: (key: string) => string): string {
  return `${change >= 0 ? "+" : ""}${formatDays(change, t)}`;
}

export default defineComponent({
  name: "WAPTImprovementChart",
  components: { SkeletonRectangle },
  props: {
    result: {
      type: Object as PropType<WorkingCapitalComparisonResult>,
      required: true,
    },
    fromLabel: { type: String, default: "" }, // month + year — legend, "from" + its "Target" bar rows
    toLabel: { type: String, default: "" }, // month + year — legend, "to" + its "Target" bar rows
    showSkeleton: { type: Boolean, default: false },
  },
  setup(props) {
    const { t } = useI18n({ warnHtmlMessage: false, useScope: "global" });

    const matchedRows = computed(() =>
      buildRows(
        props.result.matchedSuppliers.waptFrom,
        props.result.matchedSuppliers.waptTo,
        props.result.matchedSuppliers.waptTargetFrom,
        props.result.matchedSuppliers.waptTarget,
        props.fromLabel,
        props.toLabel,
        t,
      ),
    );

    const improvedRows = computed(() =>
      buildRows(
        props.result.improvedSuppliers.waptFrom,
        props.result.improvedSuppliers.waptTo,
        props.result.improvedSuppliers.waptTargetFrom,
        props.result.improvedSuppliers.waptTarget,
        props.fromLabel,
        props.toLabel,
        t,
      ),
    );

    const matchedBadge = computed(() =>
      buildBadge(
        props.result.matchedSuppliers.waptTo -
          props.result.matchedSuppliers.waptFrom,
        t,
      ),
    );

    const improvedBadge = computed(() => buildBadge(props.result.waptGainDays, t));

    return { matchedRows, improvedRows, matchedBadge, improvedBadge };
  },
});
</script>

<style scoped lang="scss">
.wc-wapt {
  &__title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #101828;
    margin-bottom: 0.125rem;
  }

  &__subtitle {
    font-size: 0.875rem;
    color: #667085;
    margin-bottom: 1.25rem;
  }

  &__legend {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.8125rem;
    color: #344054;
    flex-shrink: 0;
  }

  &__legend-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  &__legend-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;

    &--from {
      background: #8098f9;
    } // ColorsUtils.graycool[500]
    &--to {
      background: #5262eb;
    } // ColorsUtils.blue[500]
    &--target-from {
      border: 2px dashed #98a2b3;
      background: transparent;
    } // ColorsUtils.gray[400]
    &--target {
      border: 2px dashed #000000;
      background: transparent;
    } // black
  }

  &__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-top: 0.5rem;
  }

  &__bar-rows {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  &__section {
    flex: 1;
    display: flex;
    flex-direction: column;

    &--divider {
      border-top: 1px solid #e4e7ec;
      padding-top: 1.25rem;
      margin-top: 1rem;
    }
  }

  &__section-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #667085;
    margin-bottom: 0.5rem;
  }

  &__bar-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__row-label {
    font-size: 0.875rem;
    color: #667085;
    width: 8.5rem; // fits "Target Jun 2026" — the row labels are nowrap
    flex-shrink: 0;
    white-space: nowrap;
  }

  &__bar-container {
    flex: 1;
    height: 22px;
    background: #f2f4f7;
    border-radius: 4px;
    overflow: hidden;
    min-width: 0;
  }

  &__bar {
    height: 100%;
    border-radius: 4px;
    transition: width 0.4s ease;

    &--from {
      background: #8098f9;
    } // ColorsUtils.graycool[500]
    &--to {
      background: #5262eb;
    } // ColorsUtils.blue[500]
    &--target-from {
      background: transparent;
      border: 2px dashed #98a2b3; // ColorsUtils.gray[400] — lighter than the newer target line
      box-sizing: border-box;
    }

    &--target {
      background: transparent;
      border: 2px dashed #000000; // black
      box-sizing: border-box;
    }
  }

  &__bar-value {
    font-size: 1.125rem;
    color: #344054;
    min-width: 3.5rem;
    text-align: right;
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__badge {
    background: #f0fdf9; // ColorsUtils.teal[50]
    border-radius: 8px;
    padding: 1.25rem 1.5rem;
    text-align: center;
    white-space: nowrap;
    min-width: 13rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    gap: 0.25rem;
  }

  &__badge-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #107569; // ColorsUtils.teal[700]
    text-align: center;
    line-height: 1.2;
  }

  &__badge-value {
    font-size: 2.75rem;
    font-weight: 700;
    color: #0e9384; // ColorsUtils.teal[600]
    line-height: 1.1;
  }
}
</style>
