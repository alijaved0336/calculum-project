import type { SideBarItem } from "@ada/design-system";
import * as HomeRouting from "@/modules/home/HomeRouting";

/** Primary sidebar items — extend as modules are ported. */
export const NAV_ITEMS: SideBarItem[] = [
  { icon: "sidebar-home", title: "Home", key: "home" },
  { icon: "sidebar-opportunity", title: "Opportunity", key: "opportunity" },
  { icon: "sidebar-analyze", title: "Analyze", key: "analyze" },
  { icon: "sidebar-match", title: "Match", key: "match" },
  { icon: "sidebar-plan", title: "Plan", key: "plan" },
  { icon: "sidebar-suppliers", title: "Suppliers", key: "suppliers" },
  { icon: "sidebar-manage", title: "Manage", key: "manage" },
  { icon: "sidebar-compare", title: "Compare", key: "compare" },
];

/** Map sidebar keys → vue-router route names (only wired modules). */
export const NAV_ROUTE_BY_KEY: Record<string, string> = {
  home: HomeRouting.home,
};

/** Map vue-router route names → sidebar keys. */
export const NAV_KEY_BY_ROUTE: Record<string, string> = {
  [HomeRouting.home]: "home",
};

export const DEFAULT_NAV_KEY = "home";
