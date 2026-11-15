import { describe, expect, it } from 'vitest'
import {
  badgeForStatus,
  canRecalculate,
  isActiveStatus,
} from '@/modules/match/utils/versionStatus'

/**
 * The status vocabulary rules every version-watching screen shares (UC-FE-05a). The table cases
 * pin the two decisions most worth pinning: `processed` admits NO recalculation (A1's exact
 * sentence - a never-calculated version must take its first calculation through the finalize
 * hand-off), and an unknown status is a resting place, so a poller cannot hammer the API
 * forever over a vocabulary word this build has never heard of.
 */
describe('versionStatus.isActiveStatus', () => {
  it.each(['uploaded', 'processing', 'calculateClaimed', 'calculating', 'recalculateClaimed', 'reCalculating'])(
    'keeps polling while the pipeline is moving through %s',
    (status) => {
      expect(isActiveStatus(status)).toBe(true)
    },
  )

  it.each(['ready', 'processed', 'error', 'errorCalculating', 'errorReCalculating'])(
    'treats %s as a resting place',
    (status) => {
      expect(isActiveStatus(status)).toBe(false)
    },
  )

  it('treats null and an unknown vocabulary word as resting places, never as "poll forever"', () => {
    expect(isActiveStatus(null)).toBe(false)
    expect(isActiveStatus('somethingNew')).toBe(false)
  })
})

describe('versionStatus.canRecalculate', () => {
  it.each(['ready', 'errorCalculating', 'errorReCalculating'])('offers recalculation from %s', (status) => {
    expect(canRecalculate(status)).toBe(true)
  })

  it('deliberately offers none from processed (UC-FE-05a A1)', () => {
    expect(canRecalculate('processed')).toBe(false)
  })

  it('offers none from an in-flight claim - the poller is already following it', () => {
    expect(canRecalculate('recalculateClaimed')).toBe(false)
  })

  it('offers none for null or an unknown status', () => {
    expect(canRecalculate(null)).toBe(false)
    expect(canRecalculate('calculating')).toBe(false)
  })
})

describe('versionStatus.badgeForStatus', () => {
  it('marks the settled statuses as success', () => {
    expect(badgeForStatus('ready')).toBe('success')
    expect(badgeForStatus('processed')).toBe('success')
  })

  it('marks anything whose name carries "error" as danger, matching the Dashboard rule it came from', () => {
    expect(badgeForStatus('error')).toBe('danger')
    expect(badgeForStatus('errorCalculating')).toBe('danger')
    expect(badgeForStatus('errorReCalculating')).toBe('danger')
  })

  it('marks everything still in flight (and the unknown) as info', () => {
    expect(badgeForStatus('calculating')).toBe('info')
    expect(badgeForStatus(null)).toBe('info')
  })
})
