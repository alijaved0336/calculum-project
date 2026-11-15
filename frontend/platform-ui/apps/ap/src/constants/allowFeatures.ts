/**
 * Set uuid companies to allow features 
 */

export const ALLOW_FEATURES_COMPANIES = {
    EXPORT_EXCEL: "efea02c7-a314-421b-b228-5795232bde1c",

  } as const;

  // To allow export excel feature for the companies
  export const EXPORT_EXCEL_FEATURE = ALLOW_FEATURES_COMPANIES.EXPORT_EXCEL;

  // RECEIVABLES was removed by UC-ENT-12 (WI#19427). It listed two company uuids, so enabling a
  // customer for receivables meant editing this constant and deploying the bundle to three
  // environments — and it was tested with String.includes, a substring match. It is now the
  // MODULE_AR company role, ticked in Companies administration and read through hasModuleRole like
  // every other module. The two uuids it held were granted the role by migration
  // Version20260814102417 in `web-app`, so they kept their access across the change.

  