import type { Ref } from "vue";
import {
  activeClientModeI18nKey,
  type ActiveClientMode,
} from "@/modules/components/grid/calculum-grid/utils/activeClientModeI18nKey";
import { formatDateForInput } from "@/modules/components/grid/calculum-grid/utils/formatDateForInput";

export type ClientGridPilotSavedEntity = {
  id: string;
  pilotTimeExpire: string | null;
};

export type ClientGridCompaniesAdminEmit = (
  event:
    | "update-level-of-access"
    | "active-client-checked"
    | "companies-grid-module-checked"
    | "date-selected"
    | "potential-suppliers-limit-changed",
  ...args: unknown[]
) => void;

export interface UseClientGridCompaniesAdminModulesOptions {
  /** Parent-owned pilot-related saved entities bag (mutated in place). */
  savedEntities: Ref<ClientGridPilotSavedEntity[]>;
  /** i18n `t` for Active Client mode caption. */
  t: (key: string) => string;
  emit: ClientGridCompaniesAdminEmit;
}

/**
 * Companies-admin module checkboxes, Active Client, pilot expire seeding,
 * level-of-access, and related date / limit emits.
 */
export function useClientGridCompaniesAdminModules(
  options: UseClientGridCompaniesAdminModulesOptions,
) {
  function handleUpdateLevelOfAccess(
    behavior: unknown,
    isPublic: unknown,
    dataItem: unknown,
  ) {
    options.emit("update-level-of-access", behavior, isPublic, dataItem);
  }

  function dateSelected(companyEntity: unknown, date: unknown) {
    options.emit("date-selected", companyEntity, date);
  }

  function potentialSuppliersLimitChanged(
    companyEntity: unknown,
    limit: unknown,
  ) {
    options.emit("potential-suppliers-limit-changed", companyEntity, limit);
  }

  /**
   * WI#18362. The "(Auto)" / "(Manual)" caption of the Active Client cell.
   *
   * Deliberately returns an empty string when the company carries no mode: showing "(Auto)" by
   * default would look identical to a company whose mode never arrived from the API.
   */
  function activeClientModeLabel(dataItem: { activeClientMode?: unknown }) {
    const key = activeClientModeI18nKey(
      dataItem.activeClientMode as ActiveClientMode,
    );
    return key ? options.t(key) : "";
  }

  /**
   * WI#18362. Active Client is a plain boolean on the company, not a roles[] entry, so it gets
   * its own event instead of going through companiesGridModuleOnChecked.
   */
  function activeClientOnChecked({
    dataItem,
    checked,
  }: {
    dataItem: { "@id": string };
    checked: unknown;
  }) {
    options.emit("active-client-checked", {
      companyIRI: dataItem["@id"],
      checked,
    });
  }

  /**
   * WI#19987. Undo the manual pin: the view queues it for Save, next to the other pending edits.
   */
  function activeClientOnReset({ dataItem }: { dataItem: { "@id": string } }) {
    options.emit("active-client-reset", { companyIRI: dataItem["@id"] });
  }

  function companiesGridModuleOnChecked({
    fieldName,
    dataItem,
    checked,
  }: {
    fieldName: string;
    dataItem: {
      "@id": string;
      pilotTimeExpire?: string | null;
    };
    checked: boolean;
  }) {
    const companyIRI = dataItem["@id"];
    const saved = options.savedEntities.value;

    if (!saved) {
      options.savedEntities.value = [];
    }

    const entities = options.savedEntities.value;

    if (fieldName === "featurePilotAccountIsAvailable") {
      if (checked) {
        entities.push({
          id: dataItem["@id"],
          pilotTimeExpire: dataItem.pilotTimeExpire ?? null,
        });
        const today = new Date();
        const defaultDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 30,
        );
        const defaultDateString = formatDateForInput(defaultDate);
        dateSelected(dataItem, defaultDateString);
      } else {
        const index = entities.findIndex((entity) => entity.id === companyIRI);
        if (index > -1) {
          entities.splice(index, 1);
        }
      }
    }

    options.emit("companies-grid-module-checked", {
      fieldName,
      companyIRI,
      checked,
    });
  }

  /**
   * Seeds pilot saved-entities from grid rows that already carry FEATURE_PILOT.
   * Call from facade `onMounted` when `forCompaniesAdminPilotRelated`.
   */
  function seedPilotSavedEntities(
    gridData: Array<{
      "@id": string;
      roles?: string[];
      pilotTimeExpire?: string | null;
    }>,
  ) {
    gridData.forEach((entity) => {
      if (entity.roles?.includes("FEATURE_PILOT")) {
        options.savedEntities.value.push({
          id: entity["@id"],
          pilotTimeExpire: entity.pilotTimeExpire ?? null,
        });
      }
    });
  }

  return {
    handleUpdateLevelOfAccess,
    dateSelected,
    potentialSuppliersLimitChanged,
    activeClientModeLabel,
    activeClientOnChecked,
    activeClientOnReset,
    companiesGridModuleOnChecked,
    seedPilotSavedEntities,
  };
}
