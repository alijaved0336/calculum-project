export interface CalculumAnalyzeFilter {
  availableFiltersData: Array<any>,
  availableSortedFilters: Array<any>,
  checkAllCompanies: {
    selected: boolean
  },
  checkAllValue: boolean,
  dataArray: {
    type: string,
    operators: Array<any>,
    values: Array<{ name: string, value: string, selected: boolean }>
  },
  defaultArray: Array<any>,
  disableAllValues: boolean,
  errorWithInputValues: boolean,
  filterRuleCondition: string,
  filterRuleOneOperator: string,
  filterRuleOneValue: string,
  filterRuleSelectedValues: Array<any>,
  filterRuleTwoOperator: string,
  filterRuleTwoValue: string,
  filteredAppliedOptions: Array<any>,
  hasCategoryLevel: boolean,
  hasOperatorItems: boolean,
  hasValueItems: boolean,
  ifCheckedAll: boolean,
  inputErrorForTopRankPercent: boolean,  
  listOfCompanies: Array<any>,
  resetAllCompanies: {
    selected: boolean
  },
  ruleone: {
    operator: string | null,
    value: string | number | null
  } | null,
  ruletwo: {
    operator: string | null,
    value: string | number | null
  } | null,
  selectedConditionsTab: boolean,
  selectedFilter: string,
  selectedFilterArray: Array<any>,
  selectedFilterType: string,
  selectedRadioValue: string | null,
  selectedSelectorsTab: boolean,
  selectedTab: string,
  selectedTopRankCategory: {
    category: string,
    value: number
  },
  selectedTopRankCategoryValue: number,
  selectedTopRankTab: boolean,
  selectLevel: string,
  showInputOne: boolean,
  showInputTwo: boolean,
  topRankCategoriesInAvailableFields: Array<any>,
  topRankCategory: Array<any>,
  topRankNotSelected: boolean,
  triedToSubmit: boolean,
  userInputSearch: string,
  userSelectedRuleFilter: boolean
}
