/**
 * Maps Active Client mode to an i18n key.
 * Empty / unknown mode → null so the UI can show no caption (WI#18362).
 */

export type ActiveClientMode = "manual" | "auto" | null | undefined;

export function activeClientModeI18nKey(
  mode: ActiveClientMode,
): string | null {
  if (mode === "manual") {
    return "adminBackend.companiesAdmin.activeClientMode.manual";
  }

  if (mode === "auto") {
    return "adminBackend.companiesAdmin.activeClientMode.auto";
  }

  return null;
}
