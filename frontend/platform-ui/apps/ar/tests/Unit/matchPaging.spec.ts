import { describe, expect, it } from 'vitest'
import { apiMaxPageSize, pageRequestFromGridEvent, pageSizes } from '@/modules/match/paging'

/**
 * `MatchesTab` derives the grid's `skip` from the page size the API RETURNED, not the one it asked
 * for, so the pager always describes the rows actually on screen.
 *
 * `GetLines` clamps `pageSize` to 1..500 and echoes the clamped value, so a size offered above the
 * ceiling would come back reduced and the pager's arithmetic would disagree with the `total` beside
 * it. Unreachable today because every offered size is inside the range — which is an invariant held
 * by two files in two repositories agreeing at a distance, and therefore worth a test rather than a
 * memory.
 */
describe('match table paging', () => {
  it('offers no page size the API would clamp', () => {
    for (const size of pageSizes) {
      expect(size).toBeGreaterThanOrEqual(1)
      expect(size).toBeLessThanOrEqual(apiMaxPageSize)
    }
  })

  it('offers sizes in ascending order, so the pager reads as a scale', () => {
    expect([...pageSizes].sort((a, b) => a - b)).toEqual(pageSizes)
  })

  it('ignores a page event with no take, rather than requesting page Infinity', () => {
    // Without this guard, a take of 0 divides to Infinity and builds `?page=Infinity&pageSize=0`,
    // which the API rejects: a transient grid state turns into an error banner over a working table.
    expect(pageRequestFromGridEvent(0, 0, 0, 25)).toBeNull()
    expect(pageRequestFromGridEvent(50, 0, 50, 25)).toBeNull()
    expect(pageRequestFromGridEvent(50, -25, 50, 25)).toBeNull()
  })

  it('paginates plain navigation from the event skip, at every offered size', () => {
    // Plain navigation (take unchanged): the event's own skip is the row Kendo is asking for.
    expect(pageRequestFromGridEvent(0, 25, 0, 25)).toEqual({ page: 1, pageSize: 25 })
    expect(pageRequestFromGridEvent(25, 25, 0, 25)).toEqual({ page: 2, pageSize: 25 })
    expect(pageRequestFromGridEvent(150, 25, 125, 25)).toEqual({ page: 7, pageSize: 25 })

    expect(pageRequestFromGridEvent(0, 50, 0, 50)).toEqual({ page: 1, pageSize: 50 })
    expect(pageRequestFromGridEvent(50, 50, 0, 50)).toEqual({ page: 2, pageSize: 50 })

    expect(pageRequestFromGridEvent(0, 100, 0, 100)).toEqual({ page: 1, pageSize: 100 })
    expect(pageRequestFromGridEvent(100, 100, 0, 100)).toEqual({ page: 2, pageSize: 100 })

    expect(pageRequestFromGridEvent(0, 250, 0, 250)).toEqual({ page: 1, pageSize: 250 })
    expect(pageRequestFromGridEvent(250, 250, 0, 250)).toEqual({ page: 2, pageSize: 250 })
  })

  it('paginates a page-SIZE change from the last-confirmed skip, not the event skip', () => {
    // The event's skip is not guaranteed to carry the pre-change absolute offset on a size change,
    // so the target page must come from the last-confirmed skip divided by the NEW size — landing
    // on the page containing the row the user was looking at.

    // On page 3 of 25 (rows 50-74, last-confirmed skip 50) and switching to 50 per page: row 50
    // now falls on page 2 of the new size, regardless of whatever skip the event itself reports.
    expect(pageRequestFromGridEvent(0, 50, 50, 25)).toEqual({ page: 2, pageSize: 50 })
    expect(pageRequestFromGridEvent(999, 50, 50, 25)).toEqual({ page: 2, pageSize: 50 })

    // On page 1 of 50 (last-confirmed skip 0) and switching to 100 per page: still page 1.
    expect(pageRequestFromGridEvent(0, 100, 0, 50)).toEqual({ page: 1, pageSize: 100 })

    // On page 5 of 50 (last-confirmed skip 200) and switching down to 25 per page: row 200 falls
    // on page 9 of the smaller size.
    expect(pageRequestFromGridEvent(0, 25, 200, 50)).toEqual({ page: 9, pageSize: 25 })
  })
})
