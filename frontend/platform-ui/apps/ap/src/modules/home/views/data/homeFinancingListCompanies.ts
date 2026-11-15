import * as globalColumns from '@ada/design-system/data/globalColumns'

export const homeFinancingListCompanies = [
    ...globalColumns.selected,
    ...globalColumns.entityName,
    ...globalColumns.entityCountryName,
    ...globalColumns.entityRegion,
    ...globalColumns.entityContinent,   
    ...globalColumns.entityIndustryCodeNaics2,
    ...globalColumns.entityIndustryNameNaics2,
    ...globalColumns.entityIndustryCodeNaics3,
    ...globalColumns.entityIndustryNameNaics3,     
    ...globalColumns.entityIndustryCode,
    ...globalColumns.entityIndustryName
]