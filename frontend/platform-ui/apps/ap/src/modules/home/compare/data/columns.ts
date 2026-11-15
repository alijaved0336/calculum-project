import { translate } from '../../../../utils/translation'


import * as globalColumns from '@ada/design-system/data/globalColumns'

export const entityColumnsPeers = [
  ...globalColumns.nameCompare,
  ...globalColumns.countryCompare, 
  ...globalColumns.industryCompare
]

export const defaultCompareListCompanies = [
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