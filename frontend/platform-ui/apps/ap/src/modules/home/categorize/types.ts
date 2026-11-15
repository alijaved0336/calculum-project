export { DataValues } from "../../../types/charting";

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

export interface SpendFileDetails {
  buyers: string | null; // e.g.: "Pagero Inc"
  countries: string | null; // e.g.: "Austria, Belgium, ..."
  currencies: string | null; // e.g.: "EUR, GBP, USD"
  ultimateParentNames: string | null; // e.g.: "3M CO, AGC INC, ASSA ABLOY AB, ..."
}
