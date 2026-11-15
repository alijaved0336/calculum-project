export const graphqlPayload = {
  spendProgramsNineBoxes: {
    variables:{},
    query:"{\n  spends: collectionQueryProgramListSpends(\n    targetProgramUuid: \"df4a867e-63c6-48e3-8d31-3aa16785f560\"\n    order: {entityName: \"asc\"}\n    currencyRate: 1\n    fullDisabled: false\n    first: 150\n    globalFilter: \"{\\\"filters\\\":[],\\\"logic\\\":\\\"and\\\"}\"\n  ) {\n    totalCount\n    pageInfo {\n      startCursor\n      endCursor\n      hasNextPage\n      __typename\n    }\n    edges {\n      cursor\n      node {\n        entityType\n        entityUuid\n        entityMediaPath\n        parentUuid\n        parentLogoPath\n        entityCreditScore\n        entityFlagUrl\n        spendAlias\n        uuid\n        harmonizations\n        harmColors\n        hasDynamic\n        harmonizationLevels\n        financings\n        financingColors\n        entityName\n        harmonizations\n        financings\n        spendAlias\n        buyerName\n        teamName\n        currencyCode\n        volume\n        box\n        commodity\n        capturedCashDiscount\n        contractualPaymentTermsWithoutCashDiscounts\n        actualPaymentTerms\n        entityCountryName\n        buyerCountry\n        buyerRegion\n        entityCountryName\n        entityIndustryName\n        entityStockPerformanceMarketIndex\n        creditScoreSource\n        countryCreditRating\n        modelPaymentTerms\n        modelCashFlow\n        entitySupplierParentGroupMaxStrategy\n        entityIndustryRegionStandardStrategy\n          entitySupplierStandardStrategy\n        entityPeerGroupAverageStrategy\n        financingStrategy\n        discountConversionStrategy\n        buyerStandardStrategy\n        entityRegulatoryTermsStrategy\n        entityRegulatoryTermsStrategyModality\n        customDataPoint1\n        customDataPoint2\n        customDataPoint3\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}"
  },
  suppliersProgramsNineBoxes: {
    variables: {},
    query:
      '{\n  suppliers: collectionQueryProgramListSuppliers(\n    targetProgramUuid: "df4a867e-63c6-48e3-8d31-3aa16785f560"\n    order: {entityName: "asc"}\n    currencyRate: 1\n    fullDisabled: false\n    first: 150\n    globalFilter: "{\\"filters\\":[],\\"logic\\":\\"and\\"}"\n  ) {\n    totalCount\n    pageInfo {\n      startCursor\n      endCursor\n      hasNextPage\n      __typename\n    }\n    edges {\n      cursor\n      node {\n        entityType\n        entityUuid\n        entityMediaPath\n        parentUuid\n        parentLogoPath\n        entityCreditScore\n        entityFlagUrl\n        spendAlias\n        uuid\n        harmonizations\n        harmColors\n        hasDynamic\n        harmonizationLevels\n        financings\n        financingColors\n        entityName\n        harmonizations\n        financings\n        spendAlias\n        buyerName\n        teamName\n        currencyCode\n        volume\n        box\n        commodity\n        capturedCashDiscount\n        contractualPaymentTermsWithoutCashDiscounts\n        actualPaymentTerms\n        entityCountryName\n        buyerCountry\n        buyerRegion\n        entityCountryName\n        entityIndustryName\n        entityStockPerformanceMarketIndex\n        creditScoreSource\n        countryCreditRating\n        modelPaymentTerms\n        modelCashFlow\n        entitySupplierParentGroupMaxStrategy\n        entityIndustryRegionStandardStrategy\n        entitySupplierStandardStrategy\n        entityPeerGroupAverageStrategy\n        financingStrategy\n        discountConversionStrategy\n        buyerStandardStrategy\n        entityRegulatoryTermsStrategy\n        entityRegulatoryTermsStrategyModality\n        spendCounts\n        customDataPoint1\n        customDataPoint2\n        customDataPoint3\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}'
  },
  parentsProgramsNineBoxes: {
    variables: {},
    query:
      '{\n  parents: collectionQueryProgramListParents(\n    targetProgramUuid: "df4a867e-63c6-48e3-8d31-3aa16785f560"\n    order: {entityName: "asc"}\n    currencyRate: 1\n    fullDisabled: false\n    first: 150\n    globalFilter: "{\\"filters\\":[],\\"logic\\":\\"and\\"}"\n  ) {\n    totalCount\n    pageInfo {\n      startCursor\n      endCursor\n      hasNextPage\n      __typename\n    }\n    edges {\n      cursor\n      node {\n        entityType\n        entityUuid\n        entityMediaPath\n        parentUuid\n        parentLogoPath\n        entityCreditScore\n        entityFlagUrl\n        spendAlias\n        uuid\n        harmonizations\n        harmColors\n        hasDynamic\n        harmonizationLevels\n        financings\n        financingColors\n        entityName\n        harmonizations\n        financings\n        spendAlias\n        buyerName\n        teamName\n        currencyCode\n        volume\n        box\n        commodity\n        capturedCashDiscount\n        contractualPaymentTermsWithoutCashDiscounts\n        actualPaymentTerms\n        entityCountryName\n        buyerCountry\n        buyerRegion\n        entityCountryName\n        entityIndustryName\n        entityStockPerformanceMarketIndex\n        creditScoreSource\n        countryCreditRating\n        modelPaymentTerms\n        modelCashFlow\n        entitySupplierParentGroupMaxStrategy\n        entityIndustryRegionStandardStrategy\n        entitySupplierStandardStrategy\n        entityPeerGroupAverageStrategy\n        financingStrategy\n        discountConversionStrategy\n        buyerStandardStrategy\n        entityRegulatoryTermsStrategy\n        entityRegulatoryTermsStrategyModality\n        spendCounts\n        supplierCounts\n        spendsIncludedCounts\n        customDataPoint1\n        customDataPoint2\n        customDataPoint3\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}'
  }
};

/**
 * GraphQL utility class
 */
export default class GraphQlUtils {
  static getDataSpends(response: any) {
    try {
      const nodes = response.data.spends.edges.map((edge: any) => edge.node);

      return nodes;
    } catch (error) {
      console.error(`Error in GraphQlUtils.getDataSpends(): ${error}`);
    }
  }

  static getDataSuppliers(response: any) {
    try {
      const nodes = response.data.suppliers.edges.map((edge: any) => edge.node);

      return nodes;
    } catch (error) {
      console.error(`Error in GraphQlUtils.getDataSuppliers(): ${error}`);
    }
  }

  static getDataParents(response: any) {
    try {
      const nodes = response.data.parents.edges.map((edge: any) => edge.node);

      return nodes;
    } catch (error) {
      console.error(`Error in GraphQlUtils.getDataParents(): ${error}`);
    }
  }
}
