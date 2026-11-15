import {
  nextTick,
  onBeforeUnmount,
  type Ref,
} from "vue";
import {
  ARC_GAUGE_DECORATE_INTERVAL_MS,
  ARC_GAUGE_DECORATE_MS,
} from "./constants";
import {
  decorateArcGaugeSvg,
  type ArcGaugeDecorateOptions,
} from "./decorate";

/**
 * Re-applies SVG decorations on a timer so the tip tracks Kendo's animated path.
 */
export function useArcGaugeDecoratePass(
  rootEl: Ref<HTMLElement | null>,
  getOptions: () => ArcGaugeDecorateOptions,
) {
  let timer: ReturnType<typeof setInterval> | null = null;

  function applyDecorations() {
    if (!rootEl.value) {
      return;
    }
    decorateArcGaugeSvg(rootEl.value, getOptions());
  }

  function clearDecorateTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function scheduleDecoratePass(ms = ARC_GAUGE_DECORATE_MS) {
    applyDecorations();
    clearDecorateTimer();
    const started = Date.now();
    timer = setInterval(() => {
      applyDecorations();
      if (Date.now() - started >= ms) {
        clearDecorateTimer();
        applyDecorations();
      }
    }, ARC_GAUGE_DECORATE_INTERVAL_MS);
  }

  function scheduleDecoratePassNextTick(ms?: number) {
    void nextTick(() => scheduleDecoratePass(ms));
  }

  onBeforeUnmount(clearDecorateTimer);

  return {
    applyDecorations,
    scheduleDecoratePass,
    scheduleDecoratePassNextTick,
  };
}
