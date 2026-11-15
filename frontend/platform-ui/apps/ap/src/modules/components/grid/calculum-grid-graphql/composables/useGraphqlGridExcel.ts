import {
  computed,
  onBeforeUnmount,
  onMounted,
  toValue,
  type MaybeRefOrGetter,
} from "vue";
import { useCompany, useUser } from "@/composables";
import {
  EXPORT_EXCEL_FEATURE,
  FEATURE_DOWNLOAD_EXCEL,
  FEATURE_DOWNLOAD_EXCEL_MATCH,
  ROLE_COMPANY_ADMIN,
} from "@/constants";

export const GRAPHQL_GRID_EXPORT_CSV_MENU_ID = "options-exportcsv";
export const GRAPHQL_GRID_EXPORT_CSV_BUTTON_SELECTOR = ".open-grid-options";

export type GraphqlGridExcelEmit = (
  event: "exportCSV",
  ...args: unknown[]
) => void;

export interface GraphqlGridExcelVisibilityInput {
  forCompanyAdmin: boolean;
  isForMatchView: boolean;
  userSessionRoles: readonly string[];
  isSuperAdmin: boolean;
  companyActiveId: string;
}

export interface UseGraphqlGridExcelOptions {
  forCompanyAdmin: MaybeRefOrGetter<boolean>;
  isForMatchView: MaybeRefOrGetter<boolean>;
  collectionQuery: MaybeRefOrGetter<string>;
  loadingExtra: MaybeRefOrGetter<boolean>;
  allowExportExcel: MaybeRefOrGetter<boolean>;
  emit: GraphqlGridExcelEmit;
}

/**
 * Excel-icon visibility for CalculumGridGraphql.
 * Company-admin screens skip the download-excel feature roles.
 * EXPORT_EXCEL_FEATURE is a company uuid string; `.includes` matches the SFC.
 */
export function isGraphqlGridExcelVisible(
  input: GraphqlGridExcelVisibilityInput,
): boolean {
  if (input.forCompanyAdmin) {
    return (
      input.userSessionRoles.includes(ROLE_COMPANY_ADMIN) || input.isSuperAdmin
    );
  }

  if (EXPORT_EXCEL_FEATURE.includes(input.companyActiveId)) {
    return true;
  }

  if (input.isForMatchView) {
    return (
      (input.userSessionRoles.includes(FEATURE_DOWNLOAD_EXCEL_MATCH) &&
        input.userSessionRoles.includes(ROLE_COMPANY_ADMIN)) ||
      input.isSuperAdmin
    );
  }

  return (
    (input.userSessionRoles.includes(FEATURE_DOWNLOAD_EXCEL) &&
      input.userSessionRoles.includes(ROLE_COMPANY_ADMIN)) ||
    input.isSuperAdmin
  );
}

/** Toolbar ellipsis: roles plus `allowExportExcel`, hidden while extra rows load. */
export function shouldShowGraphqlGridExcelToolbar(
  iconExcelIsNotHidden: boolean,
  loadingExtra: boolean,
  allowExportExcel: boolean,
): boolean {
  return iconExcelIsNotHidden && !loadingExtra && allowExportExcel;
}

/**
 * Bootstrap collapse click-outside: click `.open-grid-options` when the
 * menu is open and the event is outside both the menu and the trigger.
 */
export function closeGraphqlGridExportXlsModal(event: Event): void {
  const exportModal = document.getElementById(GRAPHQL_GRID_EXPORT_CSV_MENU_ID);
  const exportButton = document.querySelector(
    GRAPHQL_GRID_EXPORT_CSV_BUTTON_SELECTOR,
  );

  if (exportModal && exportButton) {
    if (
      !exportModal.contains(event.target as Node) &&
      !exportButton.contains(event.target as Node)
    ) {
      if (exportModal.classList.contains("show")) {
        (exportButton as HTMLElement).click();
      }
    }
  }
}

/**
 * Excel export emit and options-menu click-outside for CalculumGridGraphql.
 * Toolbar markup stays on the facade; this owns visibility, `exportCSV`, and
 * the document listener for `#options-exportcsv`.
 */
export function useGraphqlGridExcel(options: UseGraphqlGridExcelOptions) {
  const { user, userSessionRoles } = useUser();
  const { companyActiveId } = useCompany();

  const iconExcelIsNotHidden = computed(() =>
    isGraphqlGridExcelVisible({
      forCompanyAdmin: toValue(options.forCompanyAdmin),
      isForMatchView: toValue(options.isForMatchView),
      userSessionRoles: userSessionRoles.value,
      isSuperAdmin: Boolean(user.value?.isSuperAdmin),
      companyActiveId: companyActiveId.value,
    }),
  );

  const showExcelToolbar = computed(() =>
    shouldShowGraphqlGridExcelToolbar(
      iconExcelIsNotHidden.value,
      toValue(options.loadingExtra),
      toValue(options.allowExportExcel),
    ),
  );

  function exportExcel() {
    options.emit("exportCSV", toValue(options.collectionQuery));
  }

  onMounted(() => {
    document.addEventListener("click", closeGraphqlGridExportXlsModal);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("click", closeGraphqlGridExportXlsModal);
  });

  return {
    iconExcelIsNotHidden,
    showExcelToolbar,
    exportExcel,
  };
}
