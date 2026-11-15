import { ProgramSelectedAndStatus, ProgramDropdownValues } from "@/types";

export interface DataInterfaceFinancingGroups {
    programValues: ProgramSelectedAndStatus;
    dropdownProgramValues: ProgramDropdownValues;
    keyDropdown: number,
    loadingProgramApiCalls: boolean,
    dataProgramSelected: any | null,
    isRuleFilterShowing: boolean,
    isEditMode: boolean,
    currentGroupObj: {
        baseRate: string;
        baseRateType: string;
        color: string;
        financingName: string;
        fundingSpread: string;
        name: string;
        financingRules: Array<any>;
    },
    editedFinanceFilterObj: {
        condition: string;
        field: string;
        multi: [] | null;
        filterOne: { operator: string; value: string } | null;
        filterTwo?: { operator: string; value: string } | null;
    },
    madeChangesInFilter: boolean,
    availableFilters: Array<any>,
    editFilterObj: {
        condition: string;
        field: string;
        multi: [] | null;
        filterOne: { operator: string; value: string } | null;
        filterTwo?: { operator: string; value: string } | null;
    },
    finanKey: number,    
    saveGroups: boolean,
    localChanges: boolean,
    showModalLocalChanges: boolean,
    newSelectedProgram: string
}


export interface DataInterfaceHarmonizationGroups {
    programValues: ProgramSelectedAndStatus;
    dropdownProgramValues: ProgramDropdownValues;
    keyDropdown: number,
    loadingProgramApiCalls: boolean,
    dataProgramSelected: any | null,
    harmonizationKey: number,    
    saveGroups: boolean,
    localChanges: boolean,
    showModalLocalChanges: boolean,
    newSelectedProgram: string
}

