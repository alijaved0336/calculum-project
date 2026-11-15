import { describe, expect, it } from 'vitest'
import {
  allLinesSelection,
  applyPageSelection,
  buildTargetScope,
  initialTargetInput,
  isLineSelected,
  needsAllLineIds,
  noLinesSelection,
  partySaleLinesQuery,
  partySaleLinesWhere,
  selectedLineCount,
  toTargetRole,
  toTelerikFilter,
  validateTargetDays,
} from '@/modules/buyers/utils/targetPaymentTerms'

describe('partySaleLinesQuery / toTelerikFilter', () => {
  const filter = {
    logic: 'and' as const,
    filters: [
      { field: 'volume', operator: 'gt', value: 100 },
      { field: 'customDataPoint3', operator: 'eq', value: 'X' },
    ],
  }

  it("ANDs the grid's filters onto the party's own lines, custom attributes riding apart", () => {
    const query = partySaleLinesQuery(1500, 'Parent', filter)

    expect(query?.where).toEqual({ and: [{ parentId: { eq: 1500 } }, { and: [{ volume: { gt: 100 } }] }] })
    expect(query?.customFilters).toHaveLength(1)
  })

  it("is just the party's lines when nothing is filtered", () => {
    expect(partySaleLinesQuery(1500, 'Counterparty', undefined)).toEqual({ where: { buyerId: { eq: 1500 } }, customFilters: [] })
  })

  it('JSON-encodes the applied filter, and an empty "and" when there is none', () => {
    expect(JSON.parse(toTelerikFilter(filter))).toEqual(filter)
    expect(toTelerikFilter(undefined)).toBe('{"logic":"and","filters":[]}')
  })
})

/** AB#20657: the Target modal's validation (EF-1), line selection and scope (FR-03, EF-2) rules. */
describe('validateTargetDays (EF-1)', () => {
  it.each([0, 60, 365, '0', '45', ' 30 '])('accepts the whole number of days %j', (raw) => {
    expect(validateTargetDays(raw)).toEqual({ ok: true, value: Number(String(raw).trim()) })
  })

  it.each([400, 366, 12.5, '12.5', -5, '-5', '', null, undefined, 'abc', '1e2'])('refuses %j', (raw) => {
    expect(validateTargetDays(raw)).toEqual({ ok: false })
  })
})

describe('SaleLineSelection', () => {
  it('reads "all" as every line except its ids, and "some" as only its ids', () => {
    const allButTwo = { all: true, ids: [2] }
    expect(isLineSelected(allButTwo, 1)).toBe(true)
    expect(isLineSelected(allButTwo, 2)).toBe(false)
    expect(selectedLineCount(allButTwo, 10)).toBe(9)

    const onlyTwo = { all: false, ids: [2] }
    expect(isLineSelected(onlyTwo, 1)).toBe(false)
    expect(isLineSelected(onlyTwo, 2)).toBe(true)
    expect(selectedLineCount(onlyTwo, 10)).toBe(1)
  })

  it('folds an unticked row on the page into the exceptions of "all", keeping other pages selected', () => {
    const next = applyPageSelection(allLinesSelection(), [1, 2, 3], { 1: true, 2: false, 3: true }, 30)

    expect(next).toEqual({ all: true, ids: [2] })
  })

  it('folds a ticked row into "some", and unticking it again drops it', () => {
    const picked = applyPageSelection(noLinesSelection(), [1, 2], { 1: true, 2: false }, 30)
    expect(picked).toEqual({ all: false, ids: [1] })

    expect(applyPageSelection(picked, [1, 2], { 1: false, 2: false }, 30)).toEqual(noLinesSelection())
  })

  it('becomes "all" once every line has been picked, and none once every line is excluded', () => {
    expect(applyPageSelection({ all: false, ids: [1] }, [2], { 2: true }, 2)).toEqual(allLinesSelection())
    expect(applyPageSelection({ all: true, ids: [1] }, [2], { 2: false }, 2)).toEqual(noLinesSelection())
  })

  it('only needs the full id list for an "all except a few" selection', () => {
    expect(needsAllLineIds(allLinesSelection())).toBe(false)
    expect(needsAllLineIds({ all: false, ids: [1] })).toBe(false)
    expect(needsAllLineIds({ all: true, ids: [1] })).toBe(true)
  })
})

describe('partySaleLinesWhere', () => {
  it("narrows to a buyer's own lines, a Parent's whole family, or nothing for a bad id", () => {
    expect(partySaleLinesWhere('1500', 'Counterparty')).toEqual({ buyerId: { eq: 1500 } })
    expect(partySaleLinesWhere(1500, undefined)).toEqual({ buyerId: { eq: 1500 } })
    expect(partySaleLinesWhere(1500, 'Parent')).toEqual({ parentId: { eq: 1500 } })
    expect(partySaleLinesWhere('abc', 'Parent')).toBeNull()
  })
})

describe('buildTargetScope (FR-03)', () => {
  it('targets the whole buyer, with no ids, when every line is selected', () => {
    expect(buildTargetScope({ role: 'Counterparty', selection: allLinesSelection(), total: 3 }))
      .toEqual({ ok: true, scope: { level: 'SaleLine', role: 'Counterparty', all: true, saleLineIds: null } })
  })

  it('targets the whole family on a Parent when every line is selected (AF-1)', () => {
    expect(buildTargetScope({ role: 'Parent', selection: allLinesSelection(), total: 40 }))
      .toEqual({ ok: true, scope: { level: 'SaleLine', role: 'Parent', all: true, saleLineIds: null } })
  })

  it('targets exactly the picked lines (AF-2)', () => {
    expect(buildTargetScope({ role: 'Counterparty', selection: { all: false, ids: [3, 1] }, total: 3 }))
      .toEqual({ ok: true, scope: { level: 'SaleLine', role: 'Counterparty', all: false, saleLineIds: [3, 1] } })
  })

  it('targets every line but the excluded ones, out of the full id list', () => {
    expect(buildTargetScope({ role: 'Parent', selection: { all: true, ids: [2] }, total: 3, allIds: [1, 2, 3] }))
      .toEqual({ ok: true, scope: { level: 'SaleLine', role: 'Parent', all: false, saleLineIds: [1, 3] } })
  })

  it("targets the card's open Sale Line tab alone, whatever the selection", () => {
    expect(buildTargetScope({ role: 'Counterparty', activeSaleLineId: 42, selection: noLinesSelection(), total: 0 }))
      .toEqual({ ok: true, scope: { level: 'SaleLine', role: 'Counterparty', all: false, saleLineIds: [42] } })
  })

  it('refuses an empty selection (EF-2)', () => {
    expect(buildTargetScope({ role: 'Counterparty', selection: noLinesSelection(), total: 3 })).toEqual({ ok: false })
    expect(buildTargetScope({ role: 'Counterparty', selection: { all: true, ids: [1, 2] }, total: 2 })).toEqual({ ok: false })
  })
})

describe('initialTargetInput (AF-4)', () => {
  it('pre-fills the current target and leaves the field empty without one', () => {
    expect(initialTargetInput(60)).toBe('60')
    expect(initialTargetInput(0)).toBe('0')
    expect(initialTargetInput(null)).toBe('')
    expect(initialTargetInput(undefined)).toBe('')
  })
})

describe('toTargetRole', () => {
  it('sends Parent for a family and Counterparty for any other party', () => {
    expect(toTargetRole('Parent')).toBe('Parent')
    expect(toTargetRole('Counterparty')).toBe('Counterparty')
    expect(toTargetRole('Self')).toBe('Counterparty')
    expect(toTargetRole(undefined)).toBe('Counterparty')
  })
})
