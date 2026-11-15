/**
 * Paging constants for the match tables, kept out of the component so they can be asserted.
 *
 * `MatchesTab` pages server-side and derives the grid's `skip` from the page size in the RESPONSE,
 * not the one it requested. That is deliberate: the pager describes the rows on screen, and those
 * are the rows the server chose to send.
 *
 * The two can differ, because `GetLines` clamps `pageSize` to 1..500 and echoes the clamped value.
 * A size offered above that ceiling would come back reduced, and the pager's arithmetic would then
 * disagree with the `total` shown next to it — an off-by-a-page that looks like a backend bug.
 * Every size offered here is inside the range, so it cannot happen; this file exists so that stays
 * a checked fact rather than something the next person to add a size has to already know.
 */

/** The page sizes offered in the pager. */
export const pageSizes = [25, 50, 100, 250]

/** The largest `pageSize` `Ada.Ar.Api`'s `GetLines` honours. Above it, the response echoes 500. */
export const apiMaxPageSize = 500

/** The page and size a grid pager event is asking for. */
export interface PageRequest {
  page: number
  pageSize: number
}

/**
 * The grid counts rows skipped; the API counts pages. This is the conversion between them.
 *
 * Takes the pager event's `skip`/`take` plus the last confirmed `skip`/`pageSize` (i.e. the ones
 * the currently-displayed page was requested with), and returns the page and size to request next.
 */
export function pageRequestFromGridEvent(
  eventSkip: number,
  eventTake: number,
  lastConfirmedSkip: number,
  lastConfirmedPageSize: number,
): PageRequest | null {
  // A `take` of 0 divides to Infinity and would request `?page=Infinity&pageSize=0`, which the API
  // answers 400 for: a pager event turns into an error banner over a table that was fine. Ignored
  // rather than clamped, because there is no page size a caller meant by zero, and the grid emits
  // this only in transient states it recovers from on its own.
  if (!eventTake || eventTake < 1) {
    return null
  }

  // Plain navigation (take unchanged) and a page-SIZE change need different sources for the
  // absolute row offset. On plain navigation the event's own `skip` IS the row Kendo is asking
  // for — recomputing from our last-confirmed `skip` instead would floor back to the page we are
  // already on, since that confirmed value only advances once the requested page has loaded, so
  // "next" would never leave the current page. A page-size change is the opposite: the event's
  // `skip` is not guaranteed to carry the pre-change absolute offset, so the target page has to
  // come from `skip` (our own last-confirmed position) divided by the NEW size, landing on the
  // page that contains the row the user was looking at rather than wherever the event reports.
  const pageSizeChanged = eventTake !== lastConfirmedPageSize
  const absoluteSkip = pageSizeChanged ? lastConfirmedSkip : eventSkip

  return { page: Math.floor(absoluteSkip / eventTake) + 1, pageSize: eventTake }
}
