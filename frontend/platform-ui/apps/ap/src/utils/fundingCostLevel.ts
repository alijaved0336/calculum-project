export const getFundingCostLevel = (value : string) : number => {
  if (value === 'Low') {
    return 1
  } else if (value === 'Medium' || value === 'Med') {
    return 3
  } else if (value === 'High') {
    return 5
  } else {
    return 1
  }
}
