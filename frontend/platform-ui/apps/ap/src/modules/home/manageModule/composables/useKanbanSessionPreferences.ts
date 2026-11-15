export type FilterScopePreference = "all" | "filtered";

const FILTER_SCOPE_KEY = "ada-kanban-filterScopePreference";
const GLOBAL_WARNING_SUPPRESSED_KEY = "ada-kanban-globalWarningSuppressed";

export function getSavedFilterScope(): FilterScopePreference | null {
  try {
    const value = localStorage.getItem(FILTER_SCOPE_KEY);
    return value === "all" || value === "filtered" ? value : null;
  } catch {
    return null;
  }
}

export function saveFilterScope(scope: FilterScopePreference) {
  try {
    localStorage.setItem(FILTER_SCOPE_KEY, scope);
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — degrade to always-prompt
  }
}

export function isGlobalWarningSuppressed(): boolean {
  try {
    return localStorage.getItem(GLOBAL_WARNING_SUPPRESSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function suppressGlobalWarning() {
  try {
    localStorage.setItem(GLOBAL_WARNING_SUPPRESSED_KEY, "true");
  } catch {
    // localStorage unavailable — warning will simply reappear next drop
  }
}

export function useKanbanSessionPreferences() {
  return {
    getSavedFilterScope,
    saveFilterScope,
    isGlobalWarningSuppressed,
    suppressGlobalWarning
  };
}
