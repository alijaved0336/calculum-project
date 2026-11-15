/**
 * Composable-owned Opportunity state slices.
 * Child prop clusters (NegotiationStatusPill, NegotiationPlanHeader,
 * NegotiationCashFlowDisplay, overlay groups) stay in
 * `@/modules/home/entityCard/types`.
 */

import type { EntityCard, SpendLine } from "@/types";

export interface NegotiationVCardInfoSlice {
  economicProfit: number | null;
  hasVCard: boolean | null;
  potentialSavings: number | null;
  vCardRebate: number | null;
  vCardRebateFull: number | null;
  equivalentDiscount: number | null;
}

export interface NegotiationSpendVolumeSlice {
  color: string;
  description: string;
  maxValue: number;
  realValue: number;
  currency: string;
  forecastVolume: number | null;
}

export interface NegotiationSpendDetailsSlice {
  buyer: string | null;
  country: string | null;
  currency: string | null;
  ultimateParentCompanyName: string | null;
}

export interface NegotiationLoadingFlags {
  isLoadingEntityDetails: boolean;
  isLoadingVcardInfo: boolean;
  loadingApi: boolean;
  patchGrid: boolean;
  potentialCashFlow: boolean;
  spendVolume: boolean;
}

export interface NegotiationNineBoxSlice {
  boxesSelected: Array<any>;
  boxesSelectedFinancing: Array<any>;
  boxesSelectedSCF: Array<any>;
  supplierNParentBox: string;
  supplierNParentBoxFinancing: string;
  supplierNParentBoxSCF: string;
}

export interface NegotiationTabsSlice {
  tabsData: EntityCard.TabsData[];
  belongtoProgram: boolean;
  spendConfigurationUuid: string;
  spendUUID: string;
  levelType: string;
  levelTypeForStrategies: string;
  allSpendsTab: boolean;
  hideControls: boolean;
  inRecalculation: boolean;
  keyTermsStrategies: number;
  showStrategies: boolean;
}

/** Grid rows/columns. `patchGrid` lives on `NegotiationLoadingFlags`. */
export interface NegotiationGridSlice {
  listSpend: SpendLine[];
  columnsGrid: Array<any>;
  keyGrid: number;
}

export interface NegotiationResultsFeedbackSlice {
  isModalResultsShowing: boolean;
  feedbackRating: number | null;
  additionalFeedback: string;
  feedbackLabels: Array<any>;
  vcardTerms: number;
  opportunityTerms: number;
}

export interface NegotiationCashFlowExtrasSlice {
  potentialCashFlow: {
    realValue: number;
  };
  agreedCashFlow: number | null;
  showExistsTarget: boolean;
  showExistsTargetValue: string | null;
  showExistsAgreedValue: string | null;
  paymentTermsDescriptions: Array<any> | null;
}

export interface NegotiationHarmonizationSlice {
  displayModelForHarmonization: boolean;
  selectedHarmonizationLevelText: string;
  userApprovedHarmonizationOrFinance: string;
}

export type NegotiationPostByGroup = (
  getParams: any,
  type: string,
  items: any,
  level?: string,
) => void;
