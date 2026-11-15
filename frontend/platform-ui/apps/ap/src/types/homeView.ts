
import { ProgramSelectedAndStatus, ProgramDropdownValues, ProgramSpendInfo  } from '@/types';


export interface DataInterface {
    username: string | undefined,
    loadingPrograms: boolean,
    selectedProgramUri: string,
    statusesInfo: Array<any>,
    selectedTabIndex: number,
    key: number,
    keyGauge1: number,
    keyGauge2: number,
    keyGauge3: number,
    keyScroll: number,
    keyScrollRecentchanges: number,
    agreedInfo: {
      start: number,
      end: number,
      agreed: number,
      percentage: number
    },
    suppliersNegotiated: {
      start: number,
      end: number,
      negotiated: number,
      percentage: number
    },
    cashFlowAchieved: {
      start: number,
      end: number,
      agreed: number,
      percentage: number
    },
    loadingGaugeInfoPaymentTerms: boolean,
    loadingGaugeInfocashFlowAchieved: boolean,
    loadingStackedBarInfo: boolean,
    programValues: ProgramSelectedAndStatus,
    dropdownProgramValues: ProgramDropdownValues,
    loadingGaugesuppliersNegotiated: boolean,
    programSpendInfo: Partial<ProgramSpendInfo>,
    loadingSuppliersNegotiated: boolean,
    planSummary: Array<any>,
    loadingPlanSummary: boolean,
    keyPlansummary: number,
    showModalPlanSummary: boolean,
    areNotesLoading: boolean,
    notesSummary: Array<any>,
    homeDashboardWithPrograms: boolean,
    keyLayout: number
  }

  export interface PlanSummaryCard {
    planUuid: string,
    planName: string,
    planStartDate: string,
    planEndDate: string,
    previous: {
      cashFlow: number
      agreedCashFlow: number
      spendCount: number
      negotiatedCount: number
      start: string | null,
      end: string | null,
    },
    current: {
      cashFlow: number,
      agreedCashFlow: number,
      spendCount: number,
      negotiatedCount: number,
      start: string | null,
      end: string | null,
    },
    next: {
      cashFlow: number,
      agreedCashFlow: number,
      spendCount: number,
      negotiatedCount: number,
      start: string | null,
      end: string | null,
    }
  }

  export interface noteInterface {
    message: string
    commentContent?: string | Array<{ type?: string; text?: string; uuid?: string }>
    updated: string,
    entityName: string,
    emailCreatedBy: string,
    createdBy: {
      firstName: string,
      lastName: string,      
    },
    entityNotification : {
      name: string
    }
  }

  export interface recentNotification {
    type: string,
    title: string,
    originType: string,
    read: string | null,
    message: string,
    humanDate: string,
    updated: string
}