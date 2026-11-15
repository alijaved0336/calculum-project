
import { ProgramSpendInfo  } from '@/types';


export interface HomeAnalyzeProgramNineBoxesTableVcard {
  currentTableSelected: any;
  currentTabSelected: string;
  selectedBoxesArray: Array<any>;
  selectedBoxesInfoSummary: any;
  selectedBoxesPercentage: {
    selectedBoxesPercentageEconomicProfit: string;    
    selectedBoxesPercentageRebateCashFlow: string;
    selectedBoxesPercentageExpectedEconomicProfit: string;
    selectedBoxesPercentageExpectedCashFlow: string;
    selectedBoxesPercentageExpectedRebateCashFlow: string;
    selectedBoxesPercentageCashflow: string;
    selectedBoxesPercentageParents: string;    
    selectedBoxesPercentageSpends: string;
    selectedBoxesPercentageSuppliers: string;
    selectedBoxesPercentageVolume: string;
  };
  selectedBoxesTotalBigNumber: {
    selectedBoxesTotalEconomicProfitNumber: string;
    selectedBoxesTotalRebateCashFlowBigNumber: string;
    selectedBoxesTotalExpectedEconomicProfitBigNumber: string;
    selectedBoxesTotalExpectedCashFlowBigNumber: string;
    selectedBoxesTotalExpectedRebateCashFlowBigNumber: string;
    selectedBoxesTotalCashflowBigNumber: string;
    selectedBoxesTotalParentsBigNumber: string;    
    selectedBoxesTotalSpendsBigNumber: string;
    selectedBoxesTotalSuppliersBigNumber: string;
    selectedBoxesTotalVolumeBigNumber: string;
  };
  selectedBoxesTotal: {
    selectedBoxesTotalRebateCashFlow: number;
    selectedBoxesTotalEconomicProfit: number;
    selectedBoxesTotalExpectedEconomicProfitTerms: number;
    selectedBoxesTotalExpectedCashFlowTerms: number;
    selectedBoxesTotalExpectedRebateCashFlowTerms: number;        
    selectedBoxesTotalCashflow: number;
    selectedBoxesTotalParents: number;
    selectedBoxesTotalSpends: number;
    selectedBoxesTotalSuppliers: number;
    selectedBoxesTotalVolume: number;    
  };
  selectedBoxesStringValue: string;
  showZeroBoxSection: boolean;
  totalBoxesInfoSummary: any;
  totalBoxes: {
    totalEconomicProfit: number;
    totalRebateCashFlow: number;
    totalExpectedEconomicProfit: number;
    totalExpectedCashFlow: number;

    totalExpectedRebateCashFlow: number;
    
    totalActualPaymentTerms: number;    
    totalCashflow: number;
    totalContractualPaymentTerms: number;
    totalDiscounts: number;
    
    totalExpectedPaymentTerms: number;
    totalParents: number;
    totalPaymentTermsOpportunity: number;
    totalSpends: number;
    totalSuppliers: number;
    totalVolume: number;
  };
  totalBoxesBigNumber: {
    totalEconomicProfitBigNumber: string;
    totalRebateCashFlowBigNumber: string;
    totalExpectedEconomicProfitBigNumber: string;
    totalExpectedCashFlowBigNumber: string;
    totalExpectedRebateCashFlowBigNumber: string;
    totalCashflowBigNumber: string;
    totalParentsBigNumber: string;    
    totalSpendsBigNumber: string;
    totalSuppliersBigNumber: string;
    totalVolumeBigNumber: string
    
  };
}
