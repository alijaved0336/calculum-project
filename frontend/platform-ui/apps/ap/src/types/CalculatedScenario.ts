export interface User {
  '@id': string;
  '@type': 'User';
  email: string;
  firstName: string;
  lastName: string;
  created: string;
  updated: string;
  humanDate: string;
  createdBy?: User;
}

export interface Entity {
  '@id': string;
  '@type': 'SpendParsedCompany';
  created: string;
  updated: string;
  humanDate: string;
}

export interface Config {
  '@type': 'SpendProgramConfiguration';
  '@id': string;
  updated: string;
}

export interface Program {
  '@id': string;
  '@type': 'Program';
  createdBy: User;
  created: string;
  updated: string;
  updatedBy: User;
  humanDate: string;
  name: string;
}

export interface BuyerData {
  rebate: number;
  totalCostChange: number;
  contractual: number;
  annualVolume: number;
  float: number;
  taxRate: number;
  wacc: number;
  modeledNewTerms: number;
  actualDaysPaidByBuyer: number;
  adjustedVolume: number;
  costImpact: number;
  changeInAfterTaxOperatingProfit: number;
  currentAverage: number;
  proposedAverage: number;
  cashFlowImpact: number;
  totalChangeInCapital: number;
  changeInValueOfInvestedCapital: number;
  economicProfit: number;
  economicProfitAsPercent: number;
}

export interface SupplierData {
  contractual: number;
  annualVolume: number;
  supplierCost: number;
  totalCostChange: number;
  potentialDaysFinanced: number;
  actualDaysPaymentReceivedSupplier: number;
  adjustedVolume: number;
  financingCost: number;
  costImpact: number;
  changeInAfterTaxOperatingProfit: number;
  currentAverage: number;
  proposedAverage: number;
  cashFlowImpact: number;
  totalChangeInCapital: number;
  changeInValueOfInvestedCapital: number;
  economicProfit: number;
  economicProfitAsPercent: number;
}

export interface CalculatedDataData {
  priceChange: number;
  changeInTerms: number;
  buyer: BuyerData;
  supplier: SupplierData;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface Charts {
  paymentTermsImpact: ChartData[];
  economicProfit: ChartData[];
  cashFlow: ChartData[];
  priceImpact: ChartData[];
}

export interface CalculatedData {
  data: CalculatedDataData;
  charts: Charts;
}

export interface CalculatedTable {
  [key: string]: number[];
}

export interface CalculatedScenario {
  '@id': string;
  '@type': 'CalculatedScenario';
  createdBy: User;
  changeInTerms: number;
  name: string;
  priceChange: number;
  supplierTaxRate: number;
  supplierWacc: number;
  calculationType: string;
  level: string;
  entity: Entity;
  config: Config;
  program: Program;
  calculatedData: CalculatedData;
  calculatedTable: CalculatedTable;
  created: string;
  updated: string;
  updatedBy: User;
  humanDate: string;
} 