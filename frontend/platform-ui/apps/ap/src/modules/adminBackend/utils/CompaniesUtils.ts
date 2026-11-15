import {
    UserRoles
  } from "@/types";

// Imported from the leaf module rather than the `@/utils` barrel: that barrel pulls in
// RedirectSection, which reaches the router and from there whole views, so importing it here would
// drag the application graph into anything that only wants a role check — including a unit test.
import { hasModuleRole } from "@/utils/moduleRoleUtils";


import { FEATURE_9_BOXES_FINANCING, FEATURE_CREDIT_RATING, FEATURE_DOWNLOAD_EXCEL, FEATURE_DOWNLOAD_EXCEL_MATCH, FEATURE_DOWNLOAD_PDF_ENTITY, FEATURE_EMAIL_NEGOTIATIONS, FEATURE_PAYMENT_TERMS_VS_PRICE, FEATURE_PILOT, FEATURE_SCF_STRATEGY, FEATURE_SME, FEATURE_SUPPLIER_STANDARD, FEATURE_PEER_GROUP_STANDARD, FEATURE_VALUE_PROPOSITION, FEATURE_VIRTUAL_CARD, MODULE_ANALYZE, MODULE_AR, MODULE_COMPARE, MODULE_MANAGE, MODULE_MATCH, MODULE_OPPORTUNITY, MODULE_PLAN, MODULE_SUPPLIERS, FEATURE_LEVERAGE_DISTRIBUTION, FEATURE_ENTITY_CARD_NEWSLETTER, FEATURE_KEEP_HISTORICAL_DATA, FEATURE_SUPPLIER_INSIGHTS, FEATURE_FORECAST_VOLUME, FEATURE_SUPPORT_BOT, FEATURE_POTENTIAL_SUPPLIERS, FEATURE_AI_BOT_NEGOTIATION, FEATURE_DYNAMIC_FILTERED_SUMMARIES } from "@/constants";

/**
 * The companies enabled for receivables, i.e. holding `MODULE_AR` (UC-ENT-12 A2).
 *
 * Reads `roles`, which `/api/companies` already serialises — the same source the companies grid
 * reads to paint its checkboxes, so no endpoint of its own is needed.
 *
 * Uses `hasModuleRole`, an exact element match, rather than testing a joined string: the allowlist
 * this replaced compared uuids with `String.includes`, and a substring test would also match a
 * longer key that merely starts the same way.
 *
 * A non-array argument yields an empty list rather than throwing, because the caller reads a store
 * that is empty until its first fetch resolves.
 */
export function filterReceivablesCompanies<T extends { roles?: string[] }>(
    companies: unknown
  ): T[] {
    if (!Array.isArray(companies)) {
      return [];
    }

    return companies.filter((company: T) =>
      hasModuleRole(company?.roles ?? [], MODULE_AR)
    );
  }

export type CompaniesGridModuleFieldName =
| "downloadExcelIsAvailable"
| "featureDownloadPdfEntityIsAvailable"
| "featureEmailNegotiationsIsAvailable"
| "featurePilotAccountIsAvailable"
| "featureVCardIsAvailable"
| "matchDowloadExcelIsAvailable"
| "moduleAnalyzeIsAvailable"
| "moduleArIsAvailable"
| "moduleCompareIsAvailable"
| "moduleEntityCardIsAvailable"
| "moduleManageIsAvailable"
| "moduleOverviewIsAvailable"
| "modulePlanIsAvailable"
| "moduleProgramIsAvailable"
| "scfStandardStrategy"
| "feature9BoxesFinancing"
| "featureCreditRating"
| "featureSupplierStandard"
| "featurePeerGroupStandard"
| "featureSupportBot"
| "featurePaymentTermsvsPrice"
| "featureSME"
| "featureValueProposition"
| "featureLeverageDistribution"
| "featureEntityCardNewsletter"
| "featureKeepHistoricalData"
| "featureSupplierInsightsIsAvailable"
| "featureForecastVolumeIsAvailable"
| "featurePotentialSuppliersIsAvailable"
| "featureAiBotNegotiation"
| "featureDynamicFilteredSummariesIsAvailable"

export function getRoleFromFieldName(
    fieldName: CompaniesGridModuleFieldName
  ): UserRoles | undefined {
    switch (fieldName) {
      case "moduleAnalyzeIsAvailable":
        return MODULE_ANALYZE;
      case "moduleProgramIsAvailable":
        return MODULE_OPPORTUNITY;
      case "modulePlanIsAvailable":
        return MODULE_PLAN;
      case "moduleManageIsAvailable":
        return MODULE_MANAGE;
      case "moduleEntityCardIsAvailable":
        return MODULE_SUPPLIERS;
      case "moduleCompareIsAvailable":
        return MODULE_COMPARE;
      case "moduleOverviewIsAvailable":
        return MODULE_MATCH;
      // UC-ENT-12. Enables the whole receivables application for the company, unlike the cases
      // above, which each enable one screen inside payables.
      case "moduleArIsAvailable":
        return MODULE_AR;
      case "downloadExcelIsAvailable":
        return FEATURE_DOWNLOAD_EXCEL;
      case "featureDownloadPdfEntityIsAvailable":
        return FEATURE_DOWNLOAD_PDF_ENTITY;
      case "matchDowloadExcelIsAvailable":
        return FEATURE_DOWNLOAD_EXCEL_MATCH;
      case "scfStandardStrategy":
        return FEATURE_SCF_STRATEGY;
      case "feature9BoxesFinancing":
        return FEATURE_9_BOXES_FINANCING;
      case "featureEmailNegotiationsIsAvailable":
        return FEATURE_EMAIL_NEGOTIATIONS;
      case "featurePilotAccountIsAvailable":
        return FEATURE_PILOT;
      case "featureVCardIsAvailable":
        return FEATURE_VIRTUAL_CARD
      case "featurePaymentTermsvsPrice":
          return FEATURE_PAYMENT_TERMS_VS_PRICE       
      case "featureSME":
        return FEATURE_SME
      case "featureCreditRating":
        return FEATURE_CREDIT_RATING 
      case "featureSupplierStandard":
        return FEATURE_SUPPLIER_STANDARD;
      case "featurePeerGroupStandard":
        return FEATURE_PEER_GROUP_STANDARD;
      case "featureSupportBot":
        return FEATURE_SUPPORT_BOT;
      case "featureValueProposition":
        return FEATURE_VALUE_PROPOSITION 
      case "featureLeverageDistribution":
        return FEATURE_LEVERAGE_DISTRIBUTION
      case "featureEntityCardNewsletter":
        return FEATURE_ENTITY_CARD_NEWSLETTER;
      case "featureKeepHistoricalData":
        return FEATURE_KEEP_HISTORICAL_DATA;
      case "featureSupplierInsightsIsAvailable":
        return FEATURE_SUPPLIER_INSIGHTS;
      case "featureForecastVolumeIsAvailable":
        return FEATURE_FORECAST_VOLUME;
      case "featurePotentialSuppliersIsAvailable":
        return FEATURE_POTENTIAL_SUPPLIERS;
      case "featureAiBotNegotiation":
        return FEATURE_AI_BOT_NEGOTIATION;
      case "featureDynamicFilteredSummariesIsAvailable":
        return FEATURE_DYNAMIC_FILTERED_SUMMARIES;
      default:
        if (import.meta.env.DEV) {
          console.warn(
            "** (getRoleFromFieldName) Error: Unknown fieldName:",
            fieldName
          );
        }
        return undefined;
    }
  }