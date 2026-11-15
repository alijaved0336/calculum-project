
export function getParsedDataFromChart (name: string, response: Array<any>) {
  if (name === 'potentialCashFlowInNegotiation') {
    return parsePotentialCashFlowInNegotiation(response)
  } else if (name === 'spendInK') {
    return parseSpendInk(response)
  } else if (name === 'creditScore') {
    return parseCreditScore(response)
  } else {
    return []
  }
}

export function parsePotentialCashFlowInNegotiation (response: any) {
  const result: any = {
    chart: [['Data', 'Total']],
    progress: []
  }

  let value = 0
  if (response.potentialCash.valueToDisplay > 0) {
    value = Math.round((100 * response.potentialCash.valueToDisplay) / 100000)
  }
  result.progress = [
    {
      name: 'Buyer Leverage',
      color: response.buyerLeverage.color,
      text: response.buyerLeverage.description || ''
    },
    {
      name: 'Negotiation',
      color: response.negotiation.color,
      text: response.negotiation.description || ''
    }
  ]

  if (response.buyerLeverage.valueToDisplay >= 0.08) {
    result.progress[0].value = 90
  } else if (response.buyerLeverage.valueToDisplay < 0.08 && response.buyerLeverage.valueToDisplay >= 0.02) {
    result.progress[0].value = 60
  } else {
    result.progress[0].value = 30
  }

  if (response.potentialCash.valueToDisplay <= 0.5) {
    result.progress[1].value = 30
  } else if (response.potentialCash.valueToDisplay > 0.5 && response.potentialCash.valueToDisplay <= 0.7) {
    result.progress[1].value = 60
  } else {
    result.progress[1].value = 90
  }

  result.chart.push(
    [`${response.potentialCash.description}`, value],
    ['Other', 100 - value]
  )

  return result
}

export function parseSpendInk (response: any) {
  const result: any = {
    chart: [['Data', 'Total']],
    progress: []
  }

  const value = Math.round(response.spend.valueToDisplay)

  result.progress = [
    {
      name: 'Cash Flow Impact',
      color: response.cashFlowImpact.color,
      text: response.cashFlowImpact.description || ''
    }
  ]

  if (response.cashFlowImpact.valueToDisplay <= 0.0001) {
    result.progress[0].value = 30
  } else if (response.cashFlowImpact.valueToDisplay > 0.0001 && response.cashFlowImpact.valueToDisplay <= 0.01) {
    result.progress[0].value = 60
  } else {
    result.progress[0].value = 90
  }

  result.chart.push(
    [`${response.spend.description}`, value],
    ['Other', 100 - value]
  )

  return result
}

export function parseCreditScore (response: any) {
  const result: any = {
    chart: [['Data', 'Total']],
    progress: []
  }

  const value = Math.round(response.creditScore.valueToDisplay)

  result.progress = [
    {
      name: 'Data Depth',
      color: response.dataDepth.color,
      text: response.dataDepth.description || ''
    },
    {
      name: 'Frequency',
      color: response.frequency.color,
      text: response.frequency.description || ''
    }
  ]

  if (response.dataDepth.valueToDisplay <= 0.3) {
    result.progress[0].value = 30
  } else if (response.dataDepth.valueToDisplay > 0.3 && response.dataDepth.valueToDisplay <= 0.6) {
    result.progress[0].value = 60
  } else {
    result.progress[0].value = 90
  }

  if (response.frequency.valueToDisplay <= 1) {
    result.progress[1].value = 30
  } else if (response.frequency.valueToDisplay > 1 && response.frequency.valueToDisplay <= 3) {
    result.progress[1].value = 60
  } else {
    result.progress[1].value = 90
  }

  result.chart.push(
    [`${response.creditScore.description}`, value],
    ['Other', 100 - value]
  )

  return result
}
