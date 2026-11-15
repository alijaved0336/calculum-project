import * as formatData from '@/utils/FormatData'

export function getParsedDataFromChart(name: string, response: Array<any>) {
  if (name === 'averagePaymentTermsPerBuyingEntity') {
    return parseAveragePaymentTermsPerBuyingEntity(response)
  } else if (name === 'averagePaymentTermsPerProcurementTeam') {
    return parseAvgPaymentTermsPerProcurementTeam(response)
  } else if (name === 'averagePaymentTermsPerCountry') {
    return parseAvgPaymentTermsPerCountry(response)
  } else if (name === 'averagePaymentTermsPerRegion') {
    return parseAvgPaymentTermsPerRegion(response)
  } else if (name === 'averagePaymentTermsPerIndustry') {
    return parseAvgPaymentTermsPerIndustry(response)
  } else if (name === 'averagePaymentTermsPerCommodity') {
    return parseAvgPaymentTermsPerCommodity(response)
  } else if (name === 'averagePaymentTermsPerSupplierCompanySize') {
    return parseAvgPaymentTermsPerCompanySize(response)
  } else if (name === 'averagePaymentTermsPerNegotiationComplexity') {
    return parseAveragePaymentTermsPerNegotiationComplexity(response)
  } else if (name === 'averagePaymentTermsPerMateriality') {
    return parseAveragePaymentTermsPerMateriality(response)
  } else if (name === 'averagePaymentTermsPerCreditScore') {
    return parseAveragePaymentTermsPerCreditScore(response)
  } else if (name === 'spendPerBuyingEntity') {
    return parseSpendPerBuyingEntity(response)
  } else if (name === 'spendPerProcurementTeam') {
    return parseSpendPerProcurementTeam(response)
  } else if (name === 'spendPerCountry') {
    return parseSpendPerCountry(response)
  } else if (name === 'spendPerRegion') {
    return parseSpendPerRegion(response)
  } else if (name === 'spendPerIndustry') {
    return parseSpendPerIndustry(response)
  } else if (name === 'spendPerCommodity') {
    return parseSpendPerCommodity(response)
  } else if (name === 'spendPerCreditScore') {
    return parseSpendPerCreditScore(response)
  } else if (name === 'spendPerMateriality') {
    return parseSpendPerMateriality(response)
  } else if (name === 'numbersOfSuppliersPerCountry') {
    return parseNumbersOfSuppliersPerCountry(response)
  } else if (name === 'numbersOfSuppliersPerRegion') {
    return parseNumbersOfSuppliersPerRegion(response)
  } else if (name === 'numbersOfSuppliersPerBuyingEntity') {
    return parseNumbersOfSuppliersPerBuyingEntity(response)
  } else if (name === 'numbersOfSuppliersPerProcurementTeam') {
    return parseNumbersOfSuppliersPerProcurementTeam(response)
  } else if (name === 'numbersOfSpendsPerProcurementTeam') {
    return parseNumbersOfSpendsPerProcurementTeam(response)
  } else if (name === 'numbersOfSuppliersPerIndustry') {
    return parseNumbersOfSuppliersPerIndustry(response)
  } else if (name === 'numbersOfSuppliersPerCommodity') {
    return parseNumbersOfSuppliersPerCommodity(response)
  } else if (name === 'numbersOfSuppliersPerCreditScore') {
    return parseNumbersOfSuppliersPerCreditScore(response)
  } else if (name === 'numbersOfSuppliersPerMateriality') {
    return parseNumbersOfSuppliersPerMateriality(response)
  } else if (name === 'spendConcentrationPerBuyingEntity') {
    return parseSpendConcentrationPerBuyingEntity(response)
  } else if (name === 'spendConcentrationPerProcurementTeam') {
    return parseSpendConcentrationPerTeam(response)
  } else if (name === 'spendConcentrationPerCountry') {
    return parseSpendConcentrationPerCountry(response)
  } else if (name === 'spendConcentrationPerRegion') {
    return parseSpendConcentrationPerRegion(response)
  } else if (name === 'spendConcentrationPerIndustry') {
    return parseSpendConcentrationPerIndustry(response)
  } else if (name === 'spendConcentrationPerCommodity') {
    return parseSpendConcentrationPerCommodity(response)
  } else if (name === 'spendConcentrationPerCreditScore') {
    return parseSpendConcentrationPerCreditScore(response)
  } else if (name === 'spendConcentrationPerMateriality') {
    return parseSpendConcentrationPerMateriality(response)
  } else if (name === 'outstandingPerBuyingEntity') {
    return parseOutstandingPerBuyingEntity(response)
  } else if (name === 'outstandingPerProcurementTeam') {
    return parseOutstandingPerProcurementTeam(response)
  } else if (name === 'outstandingPerCountry') {
    return parseOutstandingPerCountry(response)
  } else if (name === 'outstandingPerRegion') {
    return parseOutstandingPerRegion(response)
  } else if (name === 'outstandingPerIndustry') {
    return parseOutstandingPerIndustry(response)
  } else if (name === 'outstandingPerCommodity') {
    return parseOutstandingPerCommodity(response)
  } else if (name === 'outstandingPerCreditScore') {
    return parseOutstandingPerCreditScore(response)
  } else if (name === 'outstandingPerMateriality') {
    return parseOutstandingPerMateriality(response)
  } else if (name === 'spendConcentrationsPerTopSuppliers') {
    return parseSpendConcentrationsPerTopSuppliers(response)
  } else if (name === 'numberOfSuppliersPerSpendConcentrations') {
    return parseNumberOfSuppliersPerSpendConcentrations(response)
  } else if (name === 'overviewInfoPanelsSpendM') {
    return parseOverviewInfoPanelsSpendM(response)
  } else if (name === 'overviewInfoPanelsOutstanding') {
    return parseOverviewInfoPanelsSpendM(response)
  } else {
    return []
  }
}

export function parseAveragePaymentTermsPerBuyingEntity(response: Array<any>) {
  const result: Array<any> = [['Buyer', 'Avg. Payment Terms']]
  response.forEach(function(item: any) {
    result.push([
      item.buyerName,
      parseFloat(formatData.proposedTerms(item.buyerAvg).toFixed(1))
    ])
  })
  return result
}

export function parseAvgPaymentTermsPerProcurementTeam(response: Array<any>) {
  const result: Array<any> = [['Procurement Team', 'Avg. Payment Terms']]
  response.forEach(function(item: any) {
    result.push([
      item.supplierTeam,
      parseFloat(formatData.proposedTerms(item.teamAvg).toFixed(1))
    ])
  })
  return result
}

export function parseAvgPaymentTermsPerCountry(response: Array<any>) {
  const result: Array<any> = [['Country', 'Avg. Payment Terms']]
  response.forEach(function(item: any) {
    result.push([
      item.supplierCountry,
      parseFloat(formatData.proposedTerms(item.countryAvg).toFixed(1))
    ])
  })
  return result
}

export function parseAvgPaymentTermsPerRegion(response: Array<any>) {
  const result: Array<any> = [['Region', 'Avg. Payment Terms']]
  response.forEach(function(item: any) {
    result.push([
      item.region,
      parseFloat(formatData.proposedTerms(item.avg).toFixed(1))
    ])
  })
  return result
}

export function parseAvgPaymentTermsPerIndustry(response: Array<any>) {
  const result: Array<any> = [['Industry', 'Avg. Payment Terms']]
  response.forEach(function(item: any) {
    result.push([
      item.industryName,
      parseFloat(formatData.proposedTerms(item.avg).toFixed(1))
    ])
  })
  return result
}

export function parseAvgPaymentTermsPerCommodity(response: Array<any>) {
  const result: Array<any> = [['Commodity', 'Avg. Payment Terms']]
  response.forEach(function(item: any) {
    result.push([
      item.commodityName,
      parseFloat(formatData.proposedTerms(item.avg).toFixed(1))
    ])
  })
  return result
}

export function parseAvgPaymentTermsPerCompanySize(response: Array<any>) {
  const result: Array<any> = [['Company Size', 'Avg. Payment Terms']]
  response.forEach(function(item: any) {
    result.push([
      item.companySizeDesc,
      parseFloat(formatData.proposedTerms(item.avg).toFixed(1))
    ])
  })
  return result
}

export function parseAveragePaymentTermsPerNegotiationComplexity(response: Array<any>) {
  const result: Array<any> = [['Negotiation Complexity', 'Avg. Payment Terms']]
  response.forEach(function(item: any) {
    result.push([
      item.negotiationComplexityDescription,
      parseFloat(formatData.proposedTerms(item.avg).toFixed(1))
    ])
  })
  return result
}

export function parseAveragePaymentTermsPerMateriality(response: Array<any>) {
  const result: Array<any> = [['Materiality', 'Avg. Payment Terms']]
  response.forEach(function(item: any) {
    result.push([
      item.materialityDescription,
      parseFloat(formatData.proposedTerms(item.avg).toFixed(1))
    ])
  })
  return result
}

export function parseAveragePaymentTermsPerCreditScore(response: Array<any>) {
  const result: Array<any> = [['Credit Score', 'Avg. Payment Terms']]
  response.forEach(function(item: any) {
    result.push([
      item.creditScoreLevel,
      parseFloat(formatData.proposedTerms(item.avg).toFixed(1))
    ])
  })
  return result
}

export function parseSpendPerProcurementTeam(response: Array<any>) {
  const result: Array<any> = [['Procurement Team', 'Spend']]
  response.forEach(function(item: any) {
    result.push([
      item.team,
      parseFloat(formatData.changeToCurrency(item.spend).toFixed(1))
    ])
  })
  return result
}

export function parseSpendPerBuyingEntity(response: Array<any>) {
  const result: Array<any> = [['Buyer', 'Spend']]
  response.forEach(function(item: any) {
    result.push([
      item.buyerName,
      parseFloat(formatData.changeToCurrency(item.buyerAmount).toFixed(1))
    ])
  })
  return result
}

export function parseSpendPerCountry(response: Array<any>) {
  const result: Array<any> = [['Country', 'Spend']]
  response.forEach(function(item: any) {
    result.push([
      item.countryCode,
      parseFloat(formatData.changeToCurrency(item.total).toFixed(1))
    ])
  })
  return result
}

export function parseSpendPerRegion(response: Array<any>) {
  const result: Array<any> = [['Region', 'Spend']]
  response.forEach(function(item: any) {
    result.push([
      item.region,
      parseFloat(formatData.changeToCurrency(item.spend).toFixed(1))
    ])
  })
  return result
}

export function parseSpendPerIndustry(response: Array<any>) {
  const result: Array<any> = [['Industry', 'Spend']]
  response.forEach(function(item: any) {
    result.push([
      item.industryName,
      parseFloat(formatData.changeToCurrency(item.total).toFixed(1))
    ])
  })
  return result
}

export function parseSpendPerCommodity(response: Array<any>) {
  const result: Array<any> = [['Commodity', 'Spend']]
  response.forEach(function(item: any) {
    result.push([
      item.commodityName,
      parseFloat(formatData.changeToCurrency(item.total).toFixed(1))
    ])
  })
  return result
}

export function parseSpendPerCreditScore(response: Array<any>) {
  const result: Array<any> = [['Credit Score', 'Spend']]
  response.forEach(function(item: any) {
    result.push([
      item.creditScoreRange,
      parseFloat(formatData.changeToCurrency(item.spend).toFixed(1))
    ])
  })
  return result
}

export function parseSpendPerMateriality(response: Array<any>) {
  const result: Array<any> = [['Materiality', 'Spend']]
  response.forEach(function(item: any) {
    result.push([
      item.materialityDescription,
      parseFloat(formatData.changeToCurrency(item.total).toFixed(1))
    ])
  })
  return result
}

export function parseNumbersOfSuppliersPerCountry(response: Array<any>) {
  const result: Array<any> = [['Country', 'Suppliers']]
  response.forEach(function(item: any) {
    result.push([
      item.countryCode,
      parseInt(item.supplierCount)
    ])
  })
  return result
}

export function parseNumbersOfSuppliersPerRegion(response: Array<any>) {
  const result: Array<any> = [['Region', 'Suppliers']]
  response.forEach(function(item: any) {
    result.push([
      item.regionName,
      parseInt(item.supplierCount)
    ])
  })
  return result
}

export function parseNumbersOfSuppliersPerBuyingEntity(response: Array<any>) {
  const result: Array<any> = [['Buying Entity', 'Suppliers']]
  response.forEach(function(item: any) {
    result.push([
      item.buyerName,
      parseInt(item.supplierCount)
    ])
  })
  return result
}

export function parseNumbersOfSuppliersPerProcurementTeam(response: Array<any>) {
  const result: Array<any> = [['Procurement Team', 'Suppliers']]
  response.forEach(function(item: any) {
    result.push([
      item.team,
      parseInt(item.supplierCount)
    ])
  })
  return result
}

export function parseNumbersOfSpendsPerProcurementTeam(response: Array<any>) {
  const result: Array<any> = [['Procurement Team', 'Spends']]
  response.forEach(function(item: any) {
    result.push([
      item.team,
      parseInt(item.spendCount)
    ])
  })
  return result
}

export function parseNumbersOfSuppliersPerIndustry(response: Array<any>) {
  const result: Array<any> = [['Industry', 'Suppliers']]
  response.forEach(function(item: any) {
    result.push([
      item.industry,
      parseInt(item.supplierCount)
    ])
  })
  return result
}

export function parseNumbersOfSuppliersPerCommodity(response: Array<any>) {
  const result: Array<any> = [['Commodity', 'Suppliers']]
  response.forEach(function(item: any) {
    result.push([
      item.commodity,
      parseInt(item.supplierCount)
    ])
  })
  return result
}

export function parseNumbersOfSuppliersPerCreditScore(response: Array<any>) {
  const result: Array<any> = [['Credit Score', 'Suppliers']]
  response.forEach(function(item: any) {
    result.push([
      item.creditScoreLevel,
      parseInt(item.supplierCount)
    ])
  })
  return result
}

export function parseNumbersOfSuppliersPerMateriality(response: Array<any>) {
  const result: Array<any> = [['Materiality', 'Suppliers']]
  response.forEach(function(item: any) {
    result.push([
      item.materialityDescription,
      parseInt(item.supplierCount)
    ])
  })
  return result
}

export function parseSpendConcentrationPerBuyingEntity(response: Array<any>) {
  const result: Array<any> = [['Buyer', 'Spend Concentration']]
  response.forEach(function(item: any) {
    result.push([
      item.buyerName,
      parseFloat(formatData.changeToCurrency(item.buyerAmount).toFixed(1))
    ])
  })
  return result
}

export function parseSpendConcentrationPerTeam(response: Array<any>) {
  const result: Array<any> = [['Procurement Team', 'Spend Concentration']]
  response.forEach(function(item: any) {
    result.push([
      item.team,
      parseFloat(formatData.changeToCurrency(item.spend).toFixed(1))
    ])
  })
  return result
}

export function parseSpendConcentrationPerCountry(response: Array<any>) {
  const result: Array<any> = [['Country', 'Spend Concentration']]
  response.forEach(function(item: any) {
    result.push([
      item.countryCode,
      parseFloat(formatData.changeToCurrency(item.total).toFixed(1))
    ])
  })
  return result
}

export function parseSpendConcentrationPerRegion(response: Array<any>) {
  const result: Array<any> = [['Region', 'Spend Concentration']]
  response.forEach(function(item: any) {
    result.push([
      item.region,
      parseFloat(formatData.changeToCurrency(item.spend).toFixed(1))
    ])
  })
  return result
}

export function parseSpendConcentrationPerIndustry(response: Array<any>) {
  const result: Array<any> = [['Industry', 'Spend Concentration']]
  response.forEach(function(item: any) {
    result.push([
      item.industryName,
      parseFloat(formatData.changeToCurrency(item.total).toFixed(1))
    ])
  })
  return result
}

export function parseSpendConcentrationPerCommodity(response: Array<any>) {
  const result: Array<any> = [['Commodity', 'Spend Concentration']]
  response.forEach(function(item: any) {
    result.push([
      item.commodityName,
      parseFloat(formatData.changeToCurrency(item.total).toFixed(1))
    ])
  })
  return result
}

export function parseSpendConcentrationPerCreditScore(response: Array<any>) {
  const result: Array<any> = [['Credit Score', 'Spend Concentration']]
  response.forEach(function(item: any) {
    result.push([
      item.creditScoreLevel,
      parseFloat(formatData.changeToCurrency(item.total).toFixed(1))
    ])
  })
  return result
}

export function parseSpendConcentrationPerMateriality(response: Array<any>) {
  const result: Array<any> = [['Materiality', 'Spend Concentration']]
  response.forEach(function(item: any) {
    result.push([
      item.materialityDescription,
      parseFloat(formatData.changeToCurrency(item.total).toFixed(1))
    ])
  })
  return result
}

export function parseOutstandingPerBuyingEntity(response: Array<any>) {
  const result: Array<any> = [['Buying Entity', 'Outstanding']]
  response.forEach(function(item: any) {
    result.push([
      item.buyerName,
      parseFloat(formatData.changeToCurrency(item.outstanding).toFixed(1))
    ])
  })
  return result
}

export function parseOutstandingPerProcurementTeam(response: Array<any>) {
  const result: Array<any> = [['Procurement Team', 'Outstanding']]
  response.forEach(function(item: any) {
    result.push([
      item.supplierTeam,
      parseFloat(formatData.changeToCurrency(item.outstanding).toFixed(1))
    ])
  })
  return result
}

export function parseOutstandingPerCountry(response: Array<any>) {
  const result: Array<any> = [['Country', 'Outstanding']]
  response.forEach(function(item: any) {
    result.push([
      item.supplierCountry,
      parseFloat(formatData.changeToCurrency(item.outstanding).toFixed(1))
    ])
  })
  return result
}

export function parseOutstandingPerRegion(response: Array<any>) {
  const result: Array<any> = [['Region', 'Outstanding']]
  response.forEach(function(item: any) {
    result.push([
      item.region,
      parseFloat(formatData.changeToCurrency(item.outstanding).toFixed(1))
    ])
  })
  return result
}

export function parseOutstandingPerIndustry(response: Array<any>) {
  const result: Array<any> = [['Industry', 'Outstanding']]
  response.forEach(function(item: any) {
    result.push([
      item.industryName,
      parseFloat(formatData.changeToCurrency(item.outstanding).toFixed(1))
    ])
  })
  return result
}

export function parseOutstandingPerCommodity(response: Array<any>) {
  const result: Array<any> = [['Commodity', 'Outstanding']]
  response.forEach(function(item: any) {
    result.push([
      item.commodityName,
      parseFloat(formatData.changeToCurrency(item.outstanding).toFixed(1))
    ])
  })
  return result
}

export function parseOutstandingPerCreditScore(response: Array<any>) {
  const result: Array<any> = [['Credit Score', 'Outstanding']]
  response.forEach(function(item: any) {
    result.push([
      item.creditScoreLevel,
      parseFloat(formatData.changeToCurrency(item.outstanding).toFixed(1))
    ])
  })
  return result
}

export function parseOutstandingPerMateriality(response: Array<any>) {
  const result: Array<any> = [['Materiality', 'Outstanding']]
  response.forEach(function(item: any) {
    result.push([
      item.materialityDescription,
      parseFloat(formatData.changeToCurrency(item.outstanding).toFixed(1))
    ])
  })
  return result
}

export function parseSpendConcentrationsPerTopSuppliers(response: Array<any>) {
  const result: Array<any> = [['Interval', 'Spend Volume']]
  response.forEach(function(item: any) {
    result.push([
      item.interval,
      parseFloat(formatData.changeToCurrency(item.spend).toFixed(1))
    ])
  })
  return result
}

export function parseNumberOfSuppliersPerSpendConcentrations(response: Array<any>) {
  const result: Array<any> = [['Interval', 'Spend Volume']]
  response.forEach(function(item: any) {
    result.push([
      item.interval,
      parseFloat(item.providers)
    ])
  })
  return result
}

export function parseOverviewInfoPanelsSpendM(response: any) {
  const result: Array<any> = [['Effort', 'Amount given']]
  const value = Math.round((100 * Math.round(response.valueToDisplay / 1000000)) / Math.round(response.maxValue / 1000000))
  result.push(
    [`${response.description} - ${(+(response.realValue / 1000000).toFixed(1)).toLocaleString('en-US')}`, value], ['Other', 100 - value]
  )
  return result
}
