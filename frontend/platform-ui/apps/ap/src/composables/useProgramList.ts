
import { isEmpty, StringUtils } from "@/utils";
import { useEntityCardStore } from "@/stores/entityCard";
import { ProgramSelectedAndStatus, ProgramDropdownValues  } from '@/types';

function sortProgramsByName(allPrograms: Array<any>): Array<any> {
    return allPrograms.sort((a: any, b: any) => a.name.localeCompare(b.name));
}

/**
 * Spend File composable.
 * It provides access to the active spend file version and its properties.
 */
const useProgramList = () => {

    const entityCardStore = useEntityCardStore();

    function setSelectedProgramValues(programResponse: Array<any>): ProgramSelectedAndStatus {
        const programValues: ProgramSelectedAndStatus = {
            recalculationInProgress: null,
            selectedProgramId: null,
            pendingRecalculation: null,
            isBoxesRecalculating: null
        }
        
        if (isEmpty(programResponse)) {
            return programValues;
        }
    
        const setIndex = programResponse.length - 1;    
        if ( !StringUtils.isNullUndefinedOrEmpty(entityCardStore.getSelectedProgram) ) {
            const programInList = programResponse.find((x: any) => x['@id'] === "/api/analyze/programs/" + entityCardStore.getSelectedProgram);
            if (programInList) {
                programValues.recalculationInProgress = programInList.recalculationInProgress;
                programValues.pendingRecalculation = programInList.pendingRecalculation;
                programValues.selectedProgramId = entityCardStore.getSelectedProgram;
            } else {
                programValues.selectedProgramId = StringUtils.removeIRI(programResponse[setIndex]['@id']);
                programValues.recalculationInProgress = programResponse[setIndex].recalculationInProgress;
                programValues.pendingRecalculation = programResponse[setIndex].pendingRecalculation;
                entityCardStore.setSelectedProgram(null);
            }
        } else {
            programValues.selectedProgramId = StringUtils.removeIRI(programResponse[setIndex]['@id']);
            programValues.recalculationInProgress = programResponse[setIndex].recalculationInProgress;
            programValues.pendingRecalculation = programResponse[setIndex].pendingRecalculation;
            entityCardStore.setSelectedProgram(StringUtils.removeIRI(programValues.selectedProgramId));
        }    
        return programValues;
    }


    function setProgramsToDropdown(allPrograms: Array<any>): ProgramDropdownValues {
    
        const programValues: ProgramDropdownValues = {
            programsList: null
        };
    
        if (allPrograms.length > 0) {
            programValues.programsList = sortProgramsByName(allPrograms);
        }
    
        return programValues;
    }
    



    return {
        setSelectedProgramValues,
        setProgramsToDropdown
    }


}

export default useProgramList