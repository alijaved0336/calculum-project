import { VcardInfo } from "@/modules/home/types";
import { reactive } from "vue";

interface vCardProvider {
  vCardProvider: string;
  selected: boolean;
  acceptanceTypes: [
    {
      id: string;
      vCardProvider: string;
      acceptanceType: string;
      enrollment: number;
      description: string;
      enrollmentPresentation: string;
      priority: number;
      error: string | null;
    },
  ];
  acceptanceTypesTemplates: [
    {
      id: string;
      vCardProvider: string;
      acceptanceType: string;
      enrollment: number;
      description: string;
      enrollmentPresentation: string;
      priority: number;
      error: string | null;
    },
  ];
}

export interface HomeCardGroupsSettings {
    allowTermsExtension: boolean;
    allowTermsExtensionInitial: boolean;
    availableFilters: Array<any>;
    buyerStandardNameMaxLength: number;
    cardGroupIndex: number;
    cardGroups: Array<any>;
    cardGroupsDeleted: Array<any>;
    cardGroupsInitial: Array<any>;
    changingInputField: boolean;
    currentGroupIndex: number;
    currentSelectedCardGroup: {
      color: string;
      vCardGroupRules: Array<any>;
    };
    currentSelectedObjForDeletingIndex: number;
    currentSelectedObjForDeletingObj: {
      color: string;
      vCardGroupRules: Array<any>;
    };
    defaultEnrollment: number | null;
    defaultEnrollmentError: string | null;
    defaultEnrollmentInitial: number | null;
    defaultEnrollmentPresentation: string | null;

    probabilityOfSuccess: number | null;
    probabilityOfSuccessError: string | null;
    probabilityOfSuccessInitial: number | null;
    probabilityOfSuccessPresentation: string | null;





    dragDropGroupIndex: number;
    dragToSpecificIndex: number;
    dropdownOptions: Array<any>;
    editSelectedCardGroup: {
      condition: string;
      field: string;
      multi: [] | null;
      filterOne: { operator: string; value: string } | null;
      filterTwo?: { operator: string; value: string } | null;
    };
    financingGroupsRules: Array<any>;
    groupCardSelectIndex: number;
    hasBuyerStandardNameError: boolean;
    hasErrors: boolean;
    hasPaymentTermsError: boolean;
    haveAcceptanceTypes: boolean;
    isEditMode: boolean;
    isGroupItemCurrentlyDragged: boolean;
    isLoadingFilters: boolean;
    isMouseHoveringOverDragIcon: boolean;
    isSavingGroups: boolean;
    loadingBuyerStandardGroups: boolean;
    loadingPatch: boolean;
    parsingGroups: boolean;
    saveNContinue: any;
    selectedDefaultColor: number;
    showConfirmModal: boolean;
    showDeleteConfirmation: boolean;
    showErrorRules: boolean;
    showFilter: boolean;
    showModal: boolean;
    showMoreSettings: boolean;
    somethingIsChanged: boolean;
    vCardGroupsInfo: VcardInfo | null;
    vCardProvider: vCardProvider | null;
    vCardProviderInitial: vCardProvider | null;
    vCardProviderSelected: string;
    vCardsGroupsEnabled: boolean;
    vCardsGroupsEnabledInitial: boolean;
    keyReactive: number;    
    showAceptanceTypes: boolean
}



export interface ExcludedSuppliersInterface {  
  availableFilters: Array<any>;
  buyerStandardNameMaxLength: number;
  cardGroupIndex: number;
  cardGroups: Array<any>;
  cardGroupsDeleted: Array<any>;
  cardGroupsInitial: Array<any>;
  changingInputField: boolean;
  currentGroupIndex: number;
  currentSelectedCardGroup: {
    color: string;
    groupRules: Array<any>;
  };
  currentSelectedObjForDeletingIndex: number;
  currentSelectedObjForDeletingObj: {
    color: string;
    groupRules: Array<any>;
  };  
  dragDropGroupIndex: number;
  dragToSpecificIndex: number;
  editSelectedCardGroup: {
    condition: string;
    field: string;
    multi: [] | null;
    filterOne: { operator: string; value: string } | null;
    filterTwo?: { operator: string; value: string } | null;
  };
  financingGroupsRules: Array<any>;
  groupCardSelectIndex: number;
  hasBuyerStandardNameError: boolean;
  hasErrors: boolean;
  hasPaymentTermsError: boolean;
  haveAcceptanceTypes: boolean;
  isEditMode: boolean;
  isGroupItemCurrentlyDragged: boolean;
  isLoadingFilters: boolean;
  isMouseHoveringOverDragIcon: boolean;
  isSavingGroups: boolean;
  loadingBuyerStandardGroups: boolean;
  loadingPatch: boolean;
  parsingGroups: boolean;
  saveNContinue: any;
  selectedDefaultColor: number;
  showConfirmModal: boolean;
  showDeleteConfirmation: boolean;
  showErrorRules: boolean;
  showFilter: boolean;
  showModal: boolean;
  showMoreSettings: boolean;
  somethingIsChanged: boolean;
  keyReactive: number;    
  showAceptanceTypes: boolean
}