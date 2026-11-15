import { route } from "@/services/router/Routing";

export const homeAnalyzeProgramsPanel = "HomeAnalyzeProgramsPanel";
export const homeAnalyzeProgramOverview = "HomeAnalyzeProgramOverview";
export const homeAnalyzeProgramToPlan1 = "HomeAnalyzeProgramToPlan1";


export const openHomeAnalyzeProgramsPanel = (...params: any) =>
  route(homeAnalyzeProgramsPanel, ...params);
export const openHomeAnalyzeProgramOverview = (...params: any) =>
  route(homeAnalyzeProgramOverview, ...params);
export const openHomeAnalyzeProgramToPlan1 = (...params: any) =>
  route(homeAnalyzeProgramToPlan1, ...params);