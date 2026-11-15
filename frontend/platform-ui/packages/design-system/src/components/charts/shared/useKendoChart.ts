import {
  onBeforeUnmount,
  onMounted,
  shallowRef,
  watch,
  type Ref,
  type ComputedRef,
  type WatchStopHandle,
} from "vue";
import { Chart, InstanceObserver } from "@progress/kendo-charts";
import { resolveChartTheme } from "./theme";

type ChartHandlers = {
  onShowTooltip?: (args: unknown) => void;
  onHideTooltip?: () => void;
  onSeriesClick?: (args: unknown) => void;
};

/**
 * Mount / update / destroy an imperative Kendo Chart on a host element.
 *
 * `options` is the single source of truth: the composable watches it
 * and calls `chart.setOptions()` (or re-creates the chart) on every change.
 * The watcher is set up **after** `onMounted` to guarantee the DOM exists.
 */
export function useKendoChart(
  surfaceEl: Ref<HTMLElement | null>,
  options: ComputedRef<Record<string, unknown>>,
  handlers: ChartHandlers = {},
) {
  const chartRef = shallowRef<Chart | null>(null);
  let resizeObserver: ResizeObserver | null = null;
  let stopOptionsWatcher: WatchStopHandle | null = null;
  let stopElWatcher: WatchStopHandle | null = null;
  let destroyed = false;

  function buildObserver() {
    return new InstanceObserver(
      {
        onShowTooltip: (args: unknown) => handlers.onShowTooltip?.(args),
        onHideTooltip: () => handlers.onHideTooltip?.(),
        onSeriesClick: (args: unknown) => handlers.onSeriesClick?.(args),
      },
      {
        showTooltip: "onShowTooltip",
        hideTooltip: "onHideTooltip",
        seriesClick: "onSeriesClick",
      },
    );
  }

  function destroyChart() {
    destroyed = true;
    if (chartRef.value) {
      try {
        chartRef.value.destroy();
      } catch {
        /* already destroyed */
      }
      chartRef.value = null;
    }
  }

  function observeResize(el: HTMLElement) {
    resizeObserver?.disconnect();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    resizeObserver = new ResizeObserver(() => {
      if (!destroyed && chartRef.value) {
        chartRef.value.resize();
      }
    });
    resizeObserver.observe(el);
  }

  function create() {
    const el = surfaceEl.value;
    if (!el || destroyed) {
      return;
    }

    if (chartRef.value) {
      try {
        chartRef.value.destroy();
      } catch {
        /* already destroyed */
      }
      chartRef.value = null;
    }

    try {
      chartRef.value = new Chart(
        el,
        options.value,
        resolveChartTheme(el),
        { observer: buildObserver() },
      );
      destroyed = false;
    } catch {
      chartRef.value = null;
    }
  }

  function update() {
    if (destroyed) {
      return;
    }
    const el = surfaceEl.value;
    const chart = chartRef.value;
    if (!el || !chart) {
      create();
      return;
    }
    chart.setOptions(options.value, resolveChartTheme(el));
  }

  onMounted(() => {
    create();

    if (surfaceEl.value) {
      observeResize(surfaceEl.value);
    }

    stopOptionsWatcher = watch(options, () => {
      update();
    });

    stopElWatcher = watch(surfaceEl, (newEl, oldEl) => {
      if (newEl === oldEl) {
        return;
      }
      destroyChart();
      resizeObserver?.disconnect();
      resizeObserver = null;
      if (newEl) {
        destroyed = false;
        create();
        observeResize(newEl);
      }
    });
  });

  /**
   * Bind to the chart host's `mouseleave`. Hides the custom tooltip and clears Kendo's own active
   * point - Kendo keeps it on leave, so re-entering that same point would fire no new
   * showTooltip and the tooltip would stay hidden (AB#20610).
   */
  function handleMouseLeave() {
    handlers.onHideTooltip?.();
    chartRef.value?.hideElements();
  }

  onBeforeUnmount(() => {
    stopOptionsWatcher?.();
    stopOptionsWatcher = null;
    stopElWatcher?.();
    stopElWatcher = null;
    resizeObserver?.disconnect();
    resizeObserver = null;
    destroyChart();
  });

  return { chartRef, handleMouseLeave };
}
