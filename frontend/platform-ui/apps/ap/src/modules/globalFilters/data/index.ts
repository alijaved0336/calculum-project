import { CategoryName, Field, FilterType, TargetView } from "@/types";

/**
 * the list of all of the possible fields in the global filters
 */
const panelBarItemsDefault: {
  field: Field;
  levels: TargetView[];
  levelSelectedDefault: TargetView;
  categories: CategoryName[];
  filterType: FilterType;
}[] = [
  {
    field: "buyerName",
    levels: ["parents", "suppliers", "spends"],
    levelSelectedDefault: "spends",
    categories: ["buyer"],
    filterType: "multipleCheckboxes"
  },
  {
    field: "commodity",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    categories: ["industry"],
    filterType: "multipleCheckboxes"
  },
  {
    field: "entityIndustryName",
    levels: ["parents", "suppliers"],
    levelSelectedDefault: "suppliers",
    categories: ["industry"],
    filterType: "multipleCheckboxes"
  },
  {
    field: "entityCompanySize",
    levels: ["parents"],
    levelSelectedDefault: "parents",
    categories: ["sizeAndRating"],
    filterType: "multipleCheckboxes"
  },
  {
    field: "entityRegion",
    levels: ["parents", "suppliers"],
    levelSelectedDefault: "suppliers",
    categories: ["geography"],
    filterType: "multipleCheckboxes"
  },
  {
    field: "entityCountryName",
    levels: ["parents", "suppliers"],
    levelSelectedDefault: "suppliers",
    categories: ["geography"],
    filterType: "multipleCheckboxes"
  },
  {
    field: "buyerCountry",
    levels: [ "spends"],
    levelSelectedDefault: "spends",
    categories: ["geography", "buyer"],
    filterType: "multipleCheckboxes"
  },
  {
    field: "buyerRegion",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    categories: ["geography","buyer"],
    filterType: "multipleCheckboxes"
  },
  {
    field: "teamName",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    categories: ["planAndExecute"],
    filterType: "multipleCheckboxes"
  },
  {
    field: "planPhaseNames",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    categories: ["planAndExecute"],
    filterType: "treeView"
  },
  {
    field: "modelPaymentTerms",
    levels: ["spends", "suppliers", "parents"],
    levelSelectedDefault: "suppliers",
    categories: ["opportunity", "spendVolumeAndPaymentTerms"],
    filterType: "rangeSlider"
  },
  {
    field: "contractualPaymentTermsWithCashDiscounts",
    levels: ["spends", "suppliers", "parents"],
    levelSelectedDefault: "suppliers",
    categories: ["spendVolumeAndPaymentTerms"],
    filterType: "rangeSlider"
  },
  {
    field: "contractualPaymentTermsWithoutCashDiscounts",
    levels: ["spends", "suppliers", "parents"],
    levelSelectedDefault: "suppliers",
    categories: ["spendVolumeAndPaymentTerms"],
    filterType: "rangeSlider"
  },
  {
    field: "actualPaymentTerms",
    levels: ["spends", "suppliers", "parents"],
    levelSelectedDefault: "suppliers",
    categories: ["spendVolumeAndPaymentTerms"],
    filterType: "rangeSlider"
  },
  {
    field: "isSME",
    levels: ["suppliers"],
    levelSelectedDefault: "suppliers",
    categories: ["sizeAndRating"],
    filterType: "radioBtn"
  },
  {
    field: "isVCardApplied",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    categories: ["scfVcardDiscounting"],
    filterType: "radioBtn"
  },
  {
    field: "volume",
    levels: ["spends", "suppliers", "parents"],
    levelSelectedDefault: "suppliers",
    categories: ["sizeAndRating", "spendVolumeAndPaymentTerms"],
    filterType: "rangeSlider"
  },
  {
    field: "forecastVolume",
    levels: ["spends", "suppliers", "parents"],
    levelSelectedDefault: "suppliers",
    categories: ["sizeAndRating", "spendVolumeAndPaymentTerms"],
    filterType: "rangeSlider"
  },
  {
    field: "entityStockPerformanceMarketIndex",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    categories: ["sizeAndRating"],
    filterType: "multipleCheckboxes"
  },
  {
    field: "financings",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    categories: ["scfVcardDiscounting"],
    filterType: "multipleCheckboxes"
  },
  {
    field: 'vCardGroupName',
    levels: ["spends"],
    levelSelectedDefault: "spends",
    categories: ["scfVcardDiscounting"],
    filterType: "multipleCheckboxes"
  },
  {
    field: "cashDiscounts",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    categories: ["scfVcardDiscounting", "spendVolumeAndPaymentTerms"],
    filterType: "multipleCheckboxes"
  },
  {
    field: "modelCashFlow",
    levels: ["spends", "suppliers", "parents"],
    levelSelectedDefault: "suppliers",
    categories: ["opportunity"],
    filterType: "rangeSlider"
  },

  {
    field: "entityWomanOwnedBusiness",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    categories: ["dei"],
    filterType: "radioBtn"
  },
  {
    field: "entityEthnicMinorityOwnedBusiness",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    categories: ["dei"],
    filterType: "radioBtn"
  },
  {
    field: "entityVeteranOwnedBusiness",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    categories: ["dei"],
    filterType: "radioBtn"
  },
  {
    field: "programApplied",
    levels: ["spends", "suppliers", "parents"],
    levelSelectedDefault: "spends",
    categories: ["scfVcardDiscounting"],
    filterType: "multipleCheckboxes"
  },{
    field: "box",
    levels: ["spends", "suppliers", "parents"],
    levelSelectedDefault: "suppliers",
    categories: ["opportunity"],
    filterType: "multipleCheckboxes"
  },  
  {
    field: "financialBox",
    levels: ["spends", "suppliers", "parents"],
    levelSelectedDefault: "suppliers",
    categories: ["opportunity"],
    filterType: "multipleCheckboxes"
  },
  {
    field: "scfBox",
    levels: ["spends", "suppliers", "parents"],
    levelSelectedDefault: "suppliers",
    categories: ["opportunity"],
    filterType: "multipleCheckboxes"
  },
  {
    field: "vCardBox",
    levels: ["spends", "suppliers", "parents"],
    levelSelectedDefault: "suppliers",
    categories: ["opportunity"],
    filterType: "multipleCheckboxes"
  },  {
    field: "currencyCode",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    categories: ["geography","spendVolumeAndPaymentTerms"],
    filterType: "multipleCheckboxes"
  },

];

// *** Custom Data Points ***

const panelBarItemsCustomDataPointsDefault: {
  field: Field; // ? - Maybe replace with field
  levels: TargetView[];
  levelSelectedDefault: TargetView;
  categories: CategoryName[];
  filterType: FilterType;
}[] = [
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint1",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint2",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint3",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint4",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint5",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint6",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint7",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint8",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint9",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint10",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint11",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint12",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint13",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint14",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint15",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint16",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint17",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint18",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint19",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint20",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "multipleCheckboxes"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint21",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "rangeSlider"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint22",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "rangeSlider"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint23",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "rangeSlider"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint24",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "rangeSlider"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint25",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "rangeSlider"
  },
  {
    /** this is the custom column from uploaded spend file custom  columns */
    field: "customDataPoint26",
    levels: ["spends"],
    levelSelectedDefault: "spends",
    /** this is the category of that root selected filter */
    categories: ["customFields"],
    filterType: "rangeSlider"
  }
];

export { panelBarItemsCustomDataPointsDefault, panelBarItemsDefault };
