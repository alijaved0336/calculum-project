import { computed, ComputedRef } from "vue";
import { EntityCard } from "@/types";

export const TOP_MENU_TAB_ORDER = [
  "opportunity-tab",
  "supplier-insights-tab",
  "supplier-options-tab",
  "financing-tab",
  "corporate-tab",
  "company-details-tab",
  "ratings-and-metrics-tab",
  "entity-card-calculator",
  "news-tab",
] as const;

export type TopMenuTabId = (typeof TOP_MENU_TAB_ORDER)[number];

export interface TopMenuTabShowFlagsState {
  programTarget: string | null;
  disabledProgram: boolean;
  useFeatureSupplierInsights: boolean;
  isFinancingEnabled: boolean;
  hasSCF: boolean;
  potentialTheme: boolean;
  useFeatureEntityCardNewsletter: boolean;
  /** Super-admin gate on the AR-mockup-only "Options" tab. */
  userIsSuperAdmin: boolean;
  /** AR mockup mode (retired; EntityCardOverview always passes false). */
  allowShowTabOptionsReceivablesMockup4: boolean;
}

/** Mirrors the `show` condition of each tab in the `topMenuTabs` computed. */
export function buildTopMenuTabShowFlags(
  s: TopMenuTabShowFlagsState,
): Record<TopMenuTabId, boolean> {
  return {
    "opportunity-tab": s.programTarget === "cashFlow" && !s.disabledProgram,
    "supplier-insights-tab": s.useFeatureSupplierInsights,
    "supplier-options-tab": s.userIsSuperAdmin && s.allowShowTabOptionsReceivablesMockup4,
    "financing-tab": s.isFinancingEnabled && s.hasSCF && !s.disabledProgram,
    "corporate-tab": true,
    "company-details-tab": true,
    "ratings-and-metrics-tab": true,
    "entity-card-calculator": s.programTarget === "cashFlow" || !!s.potentialTheme,
    "news-tab": s.useFeatureEntityCardNewsletter,
  };
}

/** Mirrors the `active` condition of each tab in the `topMenuTabs` computed. */
export function isTopMenuTabActive(id: TopMenuTabId, selectedButton: string): boolean {
  switch (id) {
    case "opportunity-tab":
      return selectedButton === "EntityCardNegotiation" || selectedButton === "ReceivablesMockup3";
    case "supplier-insights-tab":
      return selectedButton === "EntityCardSupplierController";
    case "supplier-options-tab":
      return selectedButton === "ReceivablesMockup4";
    case "financing-tab":
      return selectedButton === "EntityCardFinancing";
    case "corporate-tab":
      return selectedButton === "EntityCardCorporateTree";
    case "company-details-tab":
      return selectedButton === "EntityCardCompanyDetails";
    case "ratings-and-metrics-tab":
      return selectedButton === "EntityCardRatingsAndMetrics" || selectedButton === "ReceivablesMockup5";
    case "entity-card-calculator":
      return selectedButton === "EntityCardCalculator";
    case "news-tab":
      return selectedButton === "EntityCardNews";
    default:
      return false;
  }
}

/**
 * roundedTopLeft/roundedTopRight are derived from position within the
 * *visible* tabs, not per-tab: the first visible tab always keeps the
 * rounded left edge, the last visible tab always keeps the rounded right
 * edge, and everything in between is squared on both sides — regardless
 * of which tabs happen to be shown/hidden.
 */
export function roundingByPosition(
  visibleIds: string[],
): Record<string, { roundedTopLeft: boolean; roundedTopRight: boolean }> {
  const lastIndex = visibleIds.length - 1;
  return Object.fromEntries(
    visibleIds.map((id, index) => [
      id,
      { roundedTopLeft: index !== 0, roundedTopRight: index !== lastIndex },
    ]),
  );
}

export interface TopMenuTabHandlers {
  changeButton: (page: EntityCard.EntityCardPage) => void;
  changeTabOverview: () => void;
  changeTabRatingNMetrics: () => void;
}

/**
 * Two tabs bypass the standard changeButton path via bespoke handlers
 * (changeTabOverview / changeTabRatingNMetrics) — preserved verbatim here.
 */
export function getTopMenuTabOnClick(id: TopMenuTabId, handlers: TopMenuTabHandlers): () => void {
  switch (id) {
    case "opportunity-tab":
      return handlers.changeTabOverview;
    case "ratings-and-metrics-tab":
      return handlers.changeTabRatingNMetrics;
    case "supplier-insights-tab":
      return () => handlers.changeButton("EntityCardSupplierController" as EntityCard.EntityCardPage);
    case "supplier-options-tab":
      return () => handlers.changeButton("ReceivablesMockup4" as EntityCard.EntityCardPage);
    case "financing-tab":
      return () => handlers.changeButton("EntityCardFinancing" as EntityCard.EntityCardPage);
    case "corporate-tab":
      return () => handlers.changeButton("EntityCardCorporateTree" as EntityCard.EntityCardPage);
    case "company-details-tab":
      return () => handlers.changeButton("EntityCardCompanyDetails" as EntityCard.EntityCardPage);
    case "entity-card-calculator":
      return () => handlers.changeButton("EntityCardCalculator" as EntityCard.EntityCardPage);
    case "news-tab":
      return () => handlers.changeButton("EntityCardNews" as EntityCard.EntityCardPage);
  }
}

export interface TopMenuTab {
  id: TopMenuTabId;
  show: boolean;
  active: boolean;
  label: string;
  badge?: string;
  capitalize?: boolean;
  onClick: () => void;
}

export interface VisibleTopMenuTab extends TopMenuTab {
  roundedTopLeft: boolean;
  roundedTopRight: boolean;
}

export interface UseTopMenuTabsOptions {
  state: () => TopMenuTabShowFlagsState & { selectedButton: string };
  translate: { t: (key: string) => string };
  setTitleForsupplier: ComputedRef<string>;
  handlers: TopMenuTabHandlers;
}

const useTopMenuTabs = (options: UseTopMenuTabsOptions) => {
  const { state, translate, setTitleForsupplier, handlers } = options;

  const topMenuTabs = computed<TopMenuTab[]>(() => {
    const s = state();
    const showFlags = buildTopMenuTabShowFlags(s);

    return [
      {
        id: "opportunity-tab",
        show: showFlags["opportunity-tab"],
        active: isTopMenuTabActive("opportunity-tab", s.selectedButton),
        onClick: getTopMenuTabOnClick("opportunity-tab", handlers),
        label: translate.t("home.entityCard.topMenu.opportunity"),
      },
      {
        id: "supplier-insights-tab",
        show: showFlags["supplier-insights-tab"],
        active: isTopMenuTabActive("supplier-insights-tab", s.selectedButton),
        onClick: getTopMenuTabOnClick("supplier-insights-tab", handlers),
        label: setTitleForsupplier.value,
        badge: translate.t("home.entityCard.supplierInsights.betaBadge"),
      },
      {
        // AR mockup only; label stays untranslated like the rest of the receivables demo.
        id: "supplier-options-tab",
        show: showFlags["supplier-options-tab"],
        active: isTopMenuTabActive("supplier-options-tab", s.selectedButton),
        onClick: getTopMenuTabOnClick("supplier-options-tab", handlers),
        label: "Options",
      },
      {
        id: "financing-tab",
        show: showFlags["financing-tab"],
        active: isTopMenuTabActive("financing-tab", s.selectedButton),
        onClick: getTopMenuTabOnClick("financing-tab", handlers),
        label: translate.t("global.financing"),
      },
      {
        id: "corporate-tab",
        show: showFlags["corporate-tab"],
        active: isTopMenuTabActive("corporate-tab", s.selectedButton),
        onClick: getTopMenuTabOnClick("corporate-tab", handlers),
        label: translate.t("home.entityCard.topMenu.corporateTree"),
      },
      {
        id: "company-details-tab",
        show: showFlags["company-details-tab"],
        active: isTopMenuTabActive("company-details-tab", s.selectedButton),
        onClick: getTopMenuTabOnClick("company-details-tab", handlers),
        label: translate.t("home.entityCard.topMenu.companyDetails"),
      },
      {
        id: "ratings-and-metrics-tab",
        show: showFlags["ratings-and-metrics-tab"],
        active: isTopMenuTabActive("ratings-and-metrics-tab", s.selectedButton),
        onClick: getTopMenuTabOnClick("ratings-and-metrics-tab", handlers),
        label: translate.t("home.entityCard.topMenu.ratingFinancials"),
      },
      {
        id: "entity-card-calculator",
        show: showFlags["entity-card-calculator"],
        active: isTopMenuTabActive("entity-card-calculator", s.selectedButton),
        onClick: getTopMenuTabOnClick("entity-card-calculator", handlers),
        label: translate.t("home.entityCard.topMenu.paymentTermsVsPrice"),
        capitalize: false,
      },
      {
        id: "news-tab",
        show: showFlags["news-tab"],
        active: isTopMenuTabActive("news-tab", s.selectedButton),
        onClick: getTopMenuTabOnClick("news-tab", handlers),
        label: translate.t("home.entityCard.topMenu.news"),
      },
    ];
  });

  const visibleTopMenuTabs = computed<VisibleTopMenuTab[]>(() => {
    const visible = topMenuTabs.value.filter((tab) => tab.show);
    const rounding = roundingByPosition(visible.map((tab) => tab.id));
    return visible.map((tab) => ({
      ...tab,
      ...rounding[tab.id],
    }));
  });

  return {
    topMenuTabs,
    visibleTopMenuTabs,
  };
};

export default useTopMenuTabs;
