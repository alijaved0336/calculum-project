import {
  ComputedRef,
  Ref,
  WritableComputedRef,
  computed,
  ref,
  watch
} from "vue";

// Types
import { UserSession } from "@/types";

// Utils
import {
  ArrayUtils,
  NumberUtils,
  StringUtils,
  isNull,
  isNullOrUndefined,
  isUndefined
} from "@/utils";
import { useToast } from "vue-toastification";
import { useI18n } from "vue-i18n";
import { useSpendFile, useUser, useApolloClient } from "@/composables";
import { useEntityCardStore } from '@/stores/entityCard';
import { useAnalyzeStore } from "@/stores/analyze";
import * as AnalyzeAPI from "@/modules/home/analyze/api";

/**
 *
 */
const useProgram = (validateapiCall: boolean = true) => {
  const entityCardStore = useEntityCardStore();
  const analyzeStore = useAnalyzeStore();

  const toast = useToast();

  const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

  const { user } = useUser();

  const { spendFileVersionActiveId } = useSpendFile();

  const { apolloClientResetStore } = useApolloClient();

  const programs: Ref<any[] | null | undefined> = ref();

  const programsTrackingNumber: Ref<number> = ref(NumberUtils.getRandomInt());

  watch([spendFileVersionActiveId, programsTrackingNumber], async () => {
    if (validateapiCall) {
      programs.value = await programsAPIReadAll();

      // Sync the global store so isProgramSfvConsistent (and any other consumer
      // of analyzeStore.getAllPrograms) sees the programs for the *current* SFV.
      // Without this, the store can remain stale after an SFV change when the
      // user is on a view (e.g. EntityCard) that uses useProgram() but never
      // calls analyzeStore.fetchAllPrograms() directly.
      if (programs.value) {
        analyzeStore.setAllPrograms(programs.value);
      }
    }
  });

  const programsFormatted: ComputedRef<any[] | null> = computed(() => {
    if (isUndefined(programs.value)) {
      programsTrackingNumber.value++;
      return null;
    }

    if (isNull(programs.value)) {
      return null;
    }

    return ArrayUtils.sortAscBy(programs.value, ["name"]);
  });

  const programsIsLoading = ref(false);

  async function programsAPIReadAll(
    options?: Partial<{
      scope: string;
      marked: boolean;
      firstName: string | null;
      lastName: string | null;
      recalculationInProgress: boolean;
      spendFileVersion: string | null;
    }>
  ): Promise<any[] | undefined | null> {
    const {
      scope = "all",
      marked = false,
      firstName = null,
      lastName = null,
      recalculationInProgress = false,
      spendFileVersion = spendFileVersionActiveId.value
    } = options || {};

    // Validate
    if (isNullOrUndefined(marked)) {
      if (import.meta.env.DEV)
        console.error("** (programsAPIReadAll) Missing marked parameter");

      return;
    }

    if (isNullOrUndefined(scope)) {
      if (import.meta.env.DEV)
        console.error("** (programsAPIReadAll) Missing scope parameter");

      return;
    }

    programsIsLoading.value = true;

    const response = await AnalyzeAPI.getAllPrograms(
      marked,
      scope,
      firstName,
      lastName,
      spendFileVersion
    );

    // Validate response
    if (
      !response.success ||
      response.data === null ||
      response.data === undefined
    ) {
      if (import.meta.env.DEV)
        console.log(
          `** Error - Invalid response in panelBarItemOptionsAPIReadAll.`
        );

      if (!response.skipped) toast.error(translate.t("error.server500"));

      programsIsLoading.value = false;

      return null;
    }

    programsIsLoading.value = false;

    return response.data["hydra:member"];
  }

  // *** Selected program ***

  const programSelectedDefaultId: ComputedRef<UserSession["activeProgramDefaultId"]> = computed(
    () => {
      if (isNullOrUndefined(user.value)) {
        return null;
      }

      return user.value.activeProgramDefaultId;
    }
  );

  const programSelectedId: WritableComputedRef<
    string | undefined | null
  > = computed({
    get() {
      const id = entityCardStore.getSelectedProgram;

      if (isNullOrUndefined(id)) {
        return programSelectedDefaultId.value;
      }

      return id;
    },
    set(id) {
      // Set default program as selected
      if (
        isNullOrUndefined(id) &&
        !isNullOrUndefined(programSelectedDefaultId.value)
      ) {
              entityCardStore.setSelectedProgram(programSelectedDefaultId.value ?? null);

        return;
      }

      entityCardStore.setSelectedProgram(id ?? null);
    }
  });

  const programSelectedIri: WritableComputedRef<string | null> = computed({
    get() {
      if (isNullOrUndefined(programSelectedId.value)) {
        return null;
      }

      const iri = `/api/analyze/programs/${programSelectedId.value}`;

      return iri;
    },
    set(iri) {
      programSelectedId.value = StringUtils.removeIRI(iri);
    }
  });

  const programSelectedIsNotAvailable: ComputedRef<boolean> = computed(() => {
    if (isNullOrUndefined(programs.value)) {
      return true;
    }

    // Search for the selected program in the updated list of programs
    const programSelected = programs.value.find(
      p => p.id === programSelectedId.value
    );

    // Not found or is being recalculated
    if (
      isUndefined(programSelected) ||
      programSelected.recalculationInProgress
    ) {
      return true;
    }

    // It is available
    return false;
  });

  const programSelectedOnChange = async (programIri: string) => {
    programSelectedIri.value = programIri;
    await apolloClientResetStore();
  };

  const programSelectedDropdownIsVisible = computed(
    () =>
      !isNullOrUndefined(programsFormatted.value) &&
      !ArrayUtils.isEmpty(programsFormatted.value) &&
      !StringUtils.isNullUndefinedOrEmpty(programSelectedIri.value)
  );

  watch(programs, () => {
    // Validate
    if (isNullOrUndefined(programs.value)) {
      return;
    }

    // Program selected is available. Do nothing.
    if (!programSelectedIsNotAvailable.value) {
      return;
    }

    // If the selected program is not available, select the next one available
    programSelectedId.value = null;

    programs.value.forEach(p => {
      // Skip if already selected
      if (!isNull(programSelectedId.value)) {
        return;
      }

      // Skip if being recalculated
      if (!p.recalculationInProgress) {
        programSelectedId.value = p.id;
      }
    });

    // If any program is available, notify the user
    if (isNull(programSelectedId.value)) {
      if (import.meta.env.DEV) {
        console.error(
          "** (useProgram) No program can be selected. Please try again later."
        );
      }
    }
  });

  const programSelectedDropdownKey = ref(NumberUtils.getRandomInt());

  watch(programSelectedIri, () => {
    programSelectedDropdownKey.value++;
  });

  // *** END Selected program ***

  /**
   * Returns the status for the financing enabled
   */
  const getFinacingEnabledStatus = computed(() => {
    return analyzeStore.hasFinancing;
  });

  /**
   * Returns the status for the harmonization enabled
   */
  const getHarmonizationEnabledStatus = computed(() => {
    return analyzeStore.hasHarmonization;
  });

  return {
    getFinacingEnabledStatus,
    getHarmonizationEnabledStatus,
    programs,
    programsAPIReadAll,
    programSelectedDropdownIsVisible,
    programSelectedDropdownKey,
    programSelectedId,
    programSelectedIri,
    programSelectedOnChange,
    programsFormatted,
    programsIsLoading,
    programSelectedDefaultId
  };
};

export default useProgram;
