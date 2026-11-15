import columnsEmailNegotiations from "./columnsEmailNegotiations";

export const nodesEdges = `
  actualPaymentTerms
  entityFlagUrl
  entityMediaPath
  spendAlias
  spendCounts
  supplierCounts
  entityName
  teamName
  entityUuid
  volume
  entityCountryName
  entityType
  contractualPaymentTermsWithoutCashDiscounts
  contractualPaymentTermsWithCashDiscounts
  termsWithoutCashDiscount
  agreedCashFlow
  modelPaymentTerms
  modelCashFlow
  negotiationStatus
  negotiationStatusCodes
  negotiationStatusUpdatedAt
  vCardRebateFull
  hasVCard
  isVCardApplied
  onSCF
  scfAccepted
  uuid
  isPilot\n
`;

// Only valid on the Supplier/Parent GraphQL types (ProgramListSupplier/ProgramListParent) —
// requesting it on the spend-level type (ProgramListSpend) would break that query entirely.

export const planPhaseUuidFragment = `
  planPhaseUuid
  \n
`;

export const stageBreakdownFragment = `
  stageBreakdown {
      stageCode
      count
      avgPaymentTerms
      avgPaymentTermsWithoutDiscount
      cashFlowTarget
      vCardRebateFull
  }\n
  planPhaseAssignments {
    spendUuid
    planPhaseUuid
  }
  \n
`;

export { columnsEmailNegotiations };
