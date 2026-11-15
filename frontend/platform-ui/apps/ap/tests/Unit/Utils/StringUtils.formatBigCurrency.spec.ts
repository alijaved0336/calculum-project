import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia, defineStore } from "pinia";

// Mock the @/utils barrel before importing StringUtils — StringUtils.ts does
// `import { isNullOrUndefined } from "."`, and the real barrel transitively
// pulls modules whose Vue SFC pipeline trips on a pre-existing broken icon
// component under vitest. Mirrors the pattern used by
// tests/Unit/Utils/StringUtils.formatBigNumbers.spec.ts.
vi.mock("@/utils", () => ({
  isNullOrUndefined: (value: unknown) => value === null || value === undefined,
}));

// Mock the i18n / locales chain that FormatData pulls at module load.
vi.mock("vue-i18n", () => ({
  createI18n: () => ({ global: { t: (key: string) => key } }),
}));
vi.mock("@ada/design-system/locales/index", () => ({ messages: {}, defaultLocale: "en" }));
vi.mock("@/utils/ColorsGroups", () => ({}));
vi.mock("@/stores/user", () => ({
  useUserStore: () => ({ getUserNumberFormatting: "en-US" }),
}));

// Replace @/stores/app with a minimal real Pinia store so that
// FormatData.getCurrencyRate (which calls useAppStore().getCurrencyAmount)
// and the test (which calls app.setCurrencyAmount/setCurrencyTo) share the
// same reactive state. The real store transitively imports SecureLS and an
// API layer that breaks under vitest's transform pipeline.
vi.mock("@/stores/app", () => {
  const useAppStore = defineStore("app", {
    state: () => ({
      currencyAmount: 1 as number,
      currencyTo: "USD" as string,
    }),
    getters: {
      getCurrencyAmount: (state): number => state.currencyAmount,
    },
    actions: {
      setCurrencyAmount(value: number) {
        this.currencyAmount = value;
      },
      setCurrencyTo(value: string) {
        this.currencyTo = value;
      },
    },
  });
  return { useAppStore };
});

import { useAppStore } from "@/stores/app";
import StringUtils from "@/utils/StringUtils";

describe("StringUtils.formatBigCurrency (currency-aware formatter)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("multiplies the input by getCurrencyAmount before formatting", () => {
    const app = useAppStore();
    app.setCurrencyAmount(0.92);
    app.setCurrencyTo("EUR");
    // 100 native -> 92 EUR -> "92.0"
    expect(StringUtils.formatBigCurrency(100)).toBe("92.0");
  });

  it("is identical to formatBigNumbers when currency rate is 1", () => {
    const app = useAppStore();
    app.setCurrencyAmount(1);
    app.setCurrencyTo("USD");
    expect(StringUtils.formatBigCurrency(135.9)).toBe("135.9");
    expect(StringUtils.formatBigCurrency(1_500_000)).toBe("1.5m");
  });

  it("forwards options to the underlying formatter", () => {
    const app = useAppStore();
    app.setCurrencyAmount(1);
    expect(
      StringUtils.formatBigCurrency(1_234_567, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }),
    ).toBe("1.23m");
  });

  it("treats null and undefined as 0", () => {
    const app = useAppStore();
    app.setCurrencyAmount(0.92);
    expect(StringUtils.formatBigCurrency(null as unknown as number)).toBe("0");
    expect(StringUtils.formatBigCurrency(undefined as unknown as number)).toBe("0");
  });

  it("treats NaN as 0", () => {
    const app = useAppStore();
    app.setCurrencyAmount(0.92);
    expect(StringUtils.formatBigCurrency(NaN)).toBe("0");
  });

  it("scales suffixes proportionally to the currency rate", () => {
    const app = useAppStore();
    app.setCurrencyAmount(2);
    // 1_000_000 * 2 = 2_000_000 -> "2.0m"
    expect(StringUtils.formatBigCurrency(1_000_000)).toBe("2.0m");
  });
});
