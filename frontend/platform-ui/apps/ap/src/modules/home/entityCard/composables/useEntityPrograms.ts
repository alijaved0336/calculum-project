import { useAnalyzeStore } from "@/stores/analyze";
import { useEntityCardStore } from "@/stores/entityCard";
import { StringUtils } from "@/utils";
import { removeDuplicatesById } from "@/utils/EntityCardUtils";
import { EntityCard } from "@/types";

interface EntityProgramsState {
  apiPrograms: any[];
  currentPrograms: any[];
  disabledProgram: boolean;
  hasSCF: boolean;
  hasFinancing: boolean;
  hasHarmonization: boolean;
  loading: boolean;
  programData: any;
  programTarget: string | null;
  selectedButton: EntityCard.EntityCardPage;
  selectedProgramUri: string | null;
  keyComponent: number;
}

interface UseEntityProgramsOptions {
  data: EntityProgramsState;
  companyId: () => string;
  getCreditScore: () => void;
}

const useEntityPrograms = (options: UseEntityProgramsOptions) => {
  const { data, companyId, getCreditScore } = options;
  const analyzeStore = useAnalyzeStore();
  const entityCardStore = useEntityCardStore();

  /**
   * Get program data. Send supplier and program data to Adabot.
   */
  function retrieveProgramData() {
    const params = {
      programId: data.selectedProgramUri,

      callbackSuccess: (callbackSuccessData: any) => {
        data.programData = callbackSuccessData;
        data.programTarget = callbackSuccessData.programTarget;
        data.hasFinancing = callbackSuccessData.externalFinancingEnabled;
        data.hasHarmonization = callbackSuccessData.termHarmonizationEnabled;

        if (!data.hasFinancing) {
          data.selectedButton = "EntityCardNegotiation";
        }

        /**
         * Set default tab ONLY if existe an available program
         */
        // If the program is cashFlow, the default tab is EntityCardNegotiation

        if (data.disabledProgram) {
          data.selectedButton = "EntityCardCorporateTree";
        }
        getCreditScore();
      },

      callbackError: () => {
        getCreditScore();
      },
    };

    analyzeStore.getProgram(params);
  }

  function getUserSupplierPrograms() {
    const params = {
      supplierId: companyId(),
      callbackSuccess: (callbackSuccessData: any) => {
        data.apiPrograms = removeDuplicatesById(callbackSuccessData.programsCurrentSFV);

        // If there is at least one program
        if (data.apiPrograms.length > 0) {
          // Filter programs where the entity are included

          let resultFilter = data.apiPrograms.filter(
            (program: any) => program.disabled === false,
          );

          const position = resultFilter.length - 1;

          // If there is a program selected
          if (entityCardStore.getSelectedProgram) {
            let existsIndex = data.apiPrograms.findIndex(
              (x: any) =>
                x["@id"] ===
                "/api/analyze/programs/" +
                  entityCardStore.getSelectedProgram,
            );

            // Program found
            if (existsIndex >= 0) {
              data.selectedProgramUri = data.apiPrograms[existsIndex]["@id"];
              data.disabledProgram = data.apiPrograms[existsIndex].disabled;
              data.hasSCF = data.apiPrograms[existsIndex].hasFinancing;
              if (data.apiPrograms[existsIndex].disabled === false) {
                data.currentPrograms = [...resultFilter];
              } else {
                data.currentPrograms = data.apiPrograms[existsIndex];
                data.currentPrograms = [
                  data.currentPrograms,
                  ...resultFilter,
                ];
              }
            }
            // Program not found
            else {
              data.selectedProgramUri = resultFilter[position]["@id"];
              data.disabledProgram = resultFilter[position].disabled;
              data.hasSCF = resultFilter[position].hasFinancing;
              data.currentPrograms = [...resultFilter];
            }
          }
          // There is no program selected
          else {
            // If there is at least one program enabled
            if (resultFilter.length > 0) {
              data.selectedProgramUri = resultFilter[position]["@id"];
              data.disabledProgram = resultFilter[position].disabled;
              data.hasSCF = resultFilter[position].hasFinancing;
              data.currentPrograms = [...resultFilter];
            }
            // No program available
            else {
              data.selectedProgramUri = null;
            }
          }
        }

        // No program available
        else {
          data.selectedProgramUri = null;

          // If there's no program, the Oportunity TAB don't show, so the default is Corporate Tree
          data.selectedButton = "EntityCardCorporateTree";
        }

        // Get data from program selected
        if (data.selectedProgramUri !== null) {
          retrieveProgramData();
        } else {
          getCreditScore();
        }

        // Set selected program
        entityCardStore.setSelectedProgram(
          data.selectedProgramUri
            ? StringUtils.removeIRI(data.selectedProgramUri)
            : null,
        );
      },
      callbackError: (callbackErrorData: any) => {
        if (import.meta.env.DEV)
          console.error("** Error in getUserSupplierPrograms", callbackErrorData);

        // Disable Loading
        data.loading = false;
      },
    };
    entityCardStore.getUserSupplierPrograms(params);
  }

  function selectProgram(program: any) {
    if (data.currentPrograms.length > 0) {
      analyzeStore.setHarmonizationsGroupsbyProgram([]);
      analyzeStore.setFinancingsGroupsbyProgram([]);
      data.loading = true;
      const exists = data.currentPrograms.find(
        (x: any) => x["@id"] === program,
      );

      data.disabledProgram = exists.disabled;
      data.hasSCF = exists.hasFinancing;
      data.selectedButton = "EntityCardNegotiation";
      data.keyComponent++;

      /**
       * This is to validate if the current entity is included or not in the selected program
       */
      const currentProgram = data.currentPrograms.find(
        (x: any) => x["@id"] === data.selectedProgramUri,
      );

      /**
       * set into data.selectedProgramUri the new selected program
       */
      data.selectedProgramUri = program;
      /**
       * reset the value into vuex to know the selected program
       */
      entityCardStore.setSelectedProgram(
        data.selectedProgramUri
          ? StringUtils.removeIRI(data.selectedProgramUri)
          : null,
      );

      if (currentProgram.disabled === false) {
        /**
         * if false, only refresh program info
         */
        retrieveProgramData();
      } else {
        /**
         * If TRUE, we need refresh the dropdown to remove the excluded program from the dropdown
         * AND is true, because the user visited a program where the entity is excluded, and then go to the entity and is necesary show the program once in the dropdown
         */

        //- TODO, maybe we need only make a filter to exclude  "currentProgram.disabled === true" to avoid make a other call
        getUserSupplierPrograms();
      }
    }
  }

  return {
    getUserSupplierPrograms,
    selectProgram,
    retrieveProgramData,
  };
};

export default useEntityPrograms;
