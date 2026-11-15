import { describe, it, expect } from 'vitest'
import { getCashFlowAchieved } from '@/modules/home/views/cashFlowAchieved'

/**
 * AB#20403 — the Home "Cash Flow Achieved" gauge must show the Agreed Improved cash flow
 * over the Manage total, whatever position each stage takes in `statusesInfo`.
 */
const record = (key: string, value: number, percentage: number, total = 39572594) => ({ key, value, percentage, total })

// Order returned by api/manage/stats_info since On Hold was added
const statusesInfo = [
  record('analyzed', 18495492, 46.74),
  record('onHold', 895598, 2.26),
  record('planned', 6183024, 15.62),
  record('contacted', 4603614, 11.63),
  record('agreed', 0, 0),
  record('agreedExtended', 9394866, 23.74)
]

describe('getCashFlowAchieved', () => {
  it('takes the agreedExtended record, not the contacted one', () => {
    expect(getCashFlowAchieved(statusesInfo)).toEqual({ agreed: 9394866, percentage: 23.74, end: 39572594 })
  })

  it('does not depend on the position of the stages', () => {
    expect(getCashFlowAchieved([...statusesInfo].reverse()).agreed).toBe(9394866)
  })

  it('returns zeros when the stage is missing', () => {
    expect(getCashFlowAchieved([])).toEqual({ agreed: 0, percentage: 0, end: 0 })
  })
})
