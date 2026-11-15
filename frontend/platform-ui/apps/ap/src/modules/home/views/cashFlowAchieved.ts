interface StatusInfoRecord {
  key: string
  value: number
  percentage: number
  total: number
}

export interface CashFlowAchieved {
  agreed: number
  percentage: number
  end: number
}

const ACHIEVED_STATUS = 'agreedExtended'

/**
 * AB#20403 — the Home "Cash Flow Achieved" gauge: the Agreed Improved cash flow over the
 * Manage total. Looked up by key, never by position: statusesInfo grew a stage (On Hold)
 * once and silently pointed the gauge at Contacted.
 */
export function getCashFlowAchieved(statusesInfo: StatusInfoRecord[]): CashFlowAchieved {
  const achieved = statusesInfo.find((status) => status.key === ACHIEVED_STATUS)

  return {
    agreed: achieved?.value ?? 0,
    percentage: achieved?.percentage ?? 0,
    end: achieved?.total ?? 0
  }
}
