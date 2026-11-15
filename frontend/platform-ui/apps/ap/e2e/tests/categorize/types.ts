/**
 * @fileoverview
 * TypeScript types and interfaces for Categorize E2E tests.
 *
 * This file contains shared types and interfaces used across Categorize E2E test suites,
 * including data structures for chart data, overview panels, and other UI/API data models.
 *
 * These types help ensure type safety and consistency in test code that interacts with
 * API responses and UI data representations in the Categorize module.
 */


export interface DataValues {
  categoriesData: Array<any>;
  chartTitle: string;
  dataSeries: Array<any>;
  isBigNumber: boolean;
  isLoading: boolean;
  isShowingPieChart: boolean;
  xAxisTitle: string;
  yAxisTitle: string;
}

export interface OverviewInfoPanels {
  paymentTerm: {
    currentPaymentTerms: number;
    contractualPaymentTerms: number;
    maxValue: number;
  };
  buyerLeverage: {
    maxValue: number;
    valueToDisplay: number;
    description: string;
    color: string;
  };
  spendM: { realValue: number };
  outstanding: { realValue: number };
  summary: {
    numOfSuppliers: number;
    numOfSpends: number;
    avgSpendVolume: number;
    numOfBuyers: number;
    numOfUltimateParent: number;
  };
}

// ? - Almost the same as OverviewInfoPanels
export interface Panels {
  buyerLeverage: {
    color: string;
    value: number;
    label: string;
    valueToDisplay: any;
  };
  spend: { realValue: number };
  outstanding: { realValue: number };
  summary: {
    avgSpendVolume: number;
    parents: number;
    suppliers: number;
    spends: number;
    buyers: number;
  };
  paymentTerm: {
    contractualPaymentTerms: number | null;
    currentPaymentTerms: number | null;
    maxValue: number;
  };
}

export interface SelectedCharts {
  fullScreen: string;
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
}

// ? - Use common interface or delete
export interface SpendFileDetails {
  buyers: string | null; // e.g.: "Pagero Inc"
  countries: string | null; // e.g.: "Austria, Belgium, ..."
  currencies: string | null; // e.g.: "EUR, GBP, USD"
  ultimateParentNames: string | null; // e.g.: "3M CO, AGC INC, ASSA ABLOY AB, ..."
}
