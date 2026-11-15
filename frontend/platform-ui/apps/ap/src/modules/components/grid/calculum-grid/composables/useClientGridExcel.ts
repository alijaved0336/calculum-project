import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { saveExcel } from "@progress/kendo-vue-excel-export";
import { useUser } from "@/composables";
import {
  FEATURE_DOWNLOAD_EXCEL,
  FEATURE_DOWNLOAD_EXCEL_MATCH,
  ROLE_COMPANY_ADMIN,
} from "@/constants";

export interface ClientGridExcelVisibilityInput {
  isForMatchView: boolean;
  userSessionRoles: readonly string[];
  isSuperAdmin: boolean;
}

export interface UseClientGridExcelOptions {
  isForMatchView: MaybeRefOrGetter<boolean>;
  loadingExtra: MaybeRefOrGetter<boolean>;
  allowExportExcel: MaybeRefOrGetter<boolean>;
  gridData: MaybeRefOrGetter<unknown[]>;
  csvFileName: MaybeRefOrGetter<string>;
  csvColumns: MaybeRefOrGetter<unknown[]>;
}

/**
 * Excel-icon visibility for CalculumGrid (client process path).
 * Matches the SFC: super-admin, or company-admin plus the list/match
 * download-excel feature role. Does not use GraphQL company-admin screen
 * or EXPORT_EXCEL_FEATURE company-uuid rules.
 */
export function isClientGridExcelVisible(
  input: ClientGridExcelVisibilityInput,
): boolean {
  const requiredFeature = input.isForMatchView
    ? FEATURE_DOWNLOAD_EXCEL_MATCH
    : FEATURE_DOWNLOAD_EXCEL;

  return (
    input.isSuperAdmin ||
    (input.userSessionRoles.includes(ROLE_COMPANY_ADMIN) &&
      input.userSessionRoles.includes(requiredFeature))
  );
}

/** Toolbar Excel icon: roles plus `allowExportExcel`, hidden while extra rows load. */
export function shouldShowClientGridExcelToolbar(
  iconExcelIsNotHidden: boolean,
  loadingExtra: boolean,
  allowExportExcel: boolean,
): boolean {
  return iconExcelIsNotHidden && !loadingExtra && allowExportExcel;
}

/**
 * Local Excel export for CalculumGrid via Kendo `saveExcel`.
 * Does not emit GraphQL `exportCSV`.
 */
export function useClientGridExcel(options: UseClientGridExcelOptions) {
  const { user, userSessionRoles } = useUser();

  const iconExcelIsNotHidden = computed(() =>
    isClientGridExcelVisible({
      isForMatchView: toValue(options.isForMatchView),
      userSessionRoles: userSessionRoles.value,
      isSuperAdmin: Boolean(user.value?.isSuperAdmin),
    }),
  );

  const showExcelToolbar = computed(() =>
    shouldShowClientGridExcelToolbar(
      iconExcelIsNotHidden.value,
      toValue(options.loadingExtra),
      toValue(options.allowExportExcel),
    ),
  );

  function exportExcel() {
    saveExcel({
      data: toValue(options.gridData),
      fileName: toValue(options.csvFileName),
      columns: toValue(options.csvColumns),
      filterable: true,
    });
  }

  return {
    iconExcelIsNotHidden,
    showExcelToolbar,
    exportExcel,
  };
}
