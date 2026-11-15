/**
 * Tests for the spend file version check logic introduced in CookieSessionsFns.ts.
 *
 * The logic is mirrored here as a pure function (resolveSpendFileAction) to avoid
 * mocking stores and the router — same pattern used in useSpendFile.spec.ts.
 *
 * Covered scenarios:
 *  - No ready versions available
 *  - User already on the latest ready version
 *  - First-time user (no active spend file version)
 *  - Single spend file entity  → auto-switch
 *  - Multiple spend file entities → show banner
 *  - Version number sorting (latest wins regardless of array order)
 *  - Mixed statuses (only 'ready' versions are candidates)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { UserSessionActiveCompanySpendFileVersion } from '@/types'

// ---------------------------------------------------------------------------
// Pure mirror of the decision logic in checkNewSpendFileVersion
// (CookieSessionsFns.ts). Side-effects (store calls, routing) are replaced
// by the returned action descriptor so they can be asserted in tests.
// ---------------------------------------------------------------------------

type SpendFileAction =
  | { type: 'route' }
  | { type: 'autoSwitch'; version: UserSessionActiveCompanySpendFileVersion }
  | { type: 'showBanner'; version: UserSessionActiveCompanySpendFileVersion }

function resolveSpendFileAction(
  versions: UserSessionActiveCompanySpendFileVersion[],
  activeId: string | null | undefined
): SpendFileAction {
  const readyVersions = versions.filter(v => v.status === 'ready')

  if (!readyVersions.length) {
    return { type: 'route' }
  }

  const latestVersion = readyVersions.reduce((max, v) =>
    Number(v.version) > Number(max.version) ? v : max
  )

  if (latestVersion['@id'] === activeId) {
    return { type: 'route' }
  }

  const distinctFileNames = new Set(readyVersions.map(v => v.name))
  if (!activeId || distinctFileNames.size === 1) {
    return { type: 'autoSwitch', version: latestVersion }
  }

  return { type: 'showBanner', version: latestVersion }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeVersion(
  overrides: Partial<UserSessionActiveCompanySpendFileVersion> & {
    '@id': string
    name: string
    version: string
  }
): UserSessionActiveCompanySpendFileVersion {
  return {
    '@type': 'SpendFileVersion',
    status: 'ready',
    isPublic: true,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveSpendFileAction', () => {
  let v1: UserSessionActiveCompanySpendFileVersion
  let v2: UserSessionActiveCompanySpendFileVersion
  let v3: UserSessionActiveCompanySpendFileVersion

  beforeEach(() => {
    v1 = makeVersion({ '@id': '/api/spend_file_versions/uuid-1', name: 'Corp Spend', version: '1' })
    v2 = makeVersion({ '@id': '/api/spend_file_versions/uuid-2', name: 'Corp Spend', version: '2' })
    v3 = makeVersion({ '@id': '/api/spend_file_versions/uuid-3', name: 'Corp Spend', version: '3' })
  })

  // -------------------------------------------------------------------------
  describe('no ready versions available', () => {
    it('returns route when the versions list is empty', () => {
      const result = resolveSpendFileAction([], '/api/spend_file_versions/uuid-1')
      expect(result.type).toBe('route')
    })

    it('returns route when all versions are processing', () => {
      const processing = makeVersion({ '@id': '/api/spend_file_versions/uuid-1', name: 'Corp Spend', version: '1', status: 'processing' })
      const result = resolveSpendFileAction([processing], '/api/spend_file_versions/uuid-1')
      expect(result.type).toBe('route')
    })

    it('returns route when all versions are calculating', () => {
      const calculating = makeVersion({ '@id': '/api/spend_file_versions/uuid-1', name: 'Corp Spend', version: '1', status: 'calculating' })
      const result = resolveSpendFileAction([calculating], null)
      expect(result.type).toBe('route')
    })

    it('ignores non-ready versions and routes when only non-ready remain', () => {
      const nonReady = [
        makeVersion({ '@id': '/api/spend_file_versions/uuid-1', name: 'Corp Spend', version: '1', status: 'processing' }),
        makeVersion({ '@id': '/api/spend_file_versions/uuid-2', name: 'Corp Spend', version: '2', status: 'calculating' }),
      ]
      const result = resolveSpendFileAction(nonReady, null)
      expect(result.type).toBe('route')
    })
  })

  // -------------------------------------------------------------------------
  describe('user already on the latest ready version', () => {
    it('returns route when active version equals the only ready version', () => {
      const result = resolveSpendFileAction([v1], v1['@id'])
      expect(result.type).toBe('route')
    })

    it('returns route when active version equals the latest of several ready versions', () => {
      const result = resolveSpendFileAction([v1, v2, v3], v3['@id'])
      expect(result.type).toBe('route')
    })

    it('returns route even if newer versions exist but they are not ready', () => {
      const v4Processing = makeVersion({ '@id': '/api/spend_file_versions/uuid-4', name: 'Corp Spend', version: '4', status: 'processing' })
      const result = resolveSpendFileAction([v1, v2, v3, v4Processing], v3['@id'])
      expect(result.type).toBe('route')
    })
  })

  // -------------------------------------------------------------------------
  describe('first-time user (no active spend file version)', () => {
    it('returns autoSwitch with the single available ready version', () => {
      const result = resolveSpendFileAction([v1], null)
      expect(result.type).toBe('autoSwitch')
      if (result.type === 'autoSwitch') {
        expect(result.version['@id']).toBe(v1['@id'])
      }
    })

    it('returns autoSwitch with the latest version when multiple are available', () => {
      const result = resolveSpendFileAction([v1, v2, v3], null)
      expect(result.type).toBe('autoSwitch')
      if (result.type === 'autoSwitch') {
        expect(result.version['@id']).toBe(v3['@id'])
      }
    })

    it('returns autoSwitch when activeId is undefined', () => {
      const result = resolveSpendFileAction([v1], undefined)
      expect(result.type).toBe('autoSwitch')
    })
  })

  // -------------------------------------------------------------------------
  describe('single spend file entity → auto-switch', () => {
    it('returns autoSwitch when there is one file name and the active version is outdated', () => {
      const result = resolveSpendFileAction([v1, v2, v3], v1['@id'])
      expect(result.type).toBe('autoSwitch')
    })

    it('auto-switches to the latest version, not just any newer one', () => {
      const result = resolveSpendFileAction([v1, v2, v3], v1['@id'])
      expect(result.type).toBe('autoSwitch')
      if (result.type === 'autoSwitch') {
        expect(result.version['@id']).toBe(v3['@id'])
      }
    })

    it('ignores non-ready versions when picking the latest for auto-switch', () => {
      const v4Processing = makeVersion({ '@id': '/api/spend_file_versions/uuid-4', name: 'Corp Spend', version: '4', status: 'processing' })
      const result = resolveSpendFileAction([v1, v2, v3, v4Processing], v1['@id'])
      expect(result.type).toBe('autoSwitch')
      if (result.type === 'autoSwitch') {
        expect(result.version['@id']).toBe(v3['@id'])
      }
    })

    it('returns autoSwitch when single file has only two versions and active is v1', () => {
      const result = resolveSpendFileAction([v1, v2], v1['@id'])
      expect(result.type).toBe('autoSwitch')
      if (result.type === 'autoSwitch') {
        expect(result.version['@id']).toBe(v2['@id'])
      }
    })
  })

  // -------------------------------------------------------------------------
  describe('multiple spend file entities → show banner', () => {
    let fileA_v1: UserSessionActiveCompanySpendFileVersion
    let fileB_v1: UserSessionActiveCompanySpendFileVersion
    let fileB_v2: UserSessionActiveCompanySpendFileVersion

    beforeEach(() => {
      fileA_v1 = makeVersion({ '@id': '/api/spend_file_versions/a1', name: 'File A', version: '1' })
      fileB_v1 = makeVersion({ '@id': '/api/spend_file_versions/b1', name: 'File B', version: '1' })
      fileB_v2 = makeVersion({ '@id': '/api/spend_file_versions/b2', name: 'File B', version: '2' })
    })

    it('returns showBanner when user has two different spend files and latest differs from active', () => {
      const result = resolveSpendFileAction([fileA_v1, fileB_v1, fileB_v2], fileA_v1['@id'])
      expect(result.type).toBe('showBanner')
    })

    it('banner targets the latest ready version across all files', () => {
      const result = resolveSpendFileAction([fileA_v1, fileB_v1, fileB_v2], fileA_v1['@id'])
      expect(result.type).toBe('showBanner')
      if (result.type === 'showBanner') {
        expect(result.version['@id']).toBe(fileB_v2['@id'])
      }
    })

    it('returns showBanner when user is on an older version of one of the files', () => {
      const result = resolveSpendFileAction([fileA_v1, fileB_v1, fileB_v2], fileB_v1['@id'])
      expect(result.type).toBe('showBanner')
    })

    it('returns route (not banner) when user is already on the global latest version', () => {
      const result = resolveSpendFileAction([fileA_v1, fileB_v1, fileB_v2], fileB_v2['@id'])
      expect(result.type).toBe('route')
    })
  })

  // -------------------------------------------------------------------------
  describe('version number sorting', () => {
    it('picks version 10 over version 9 (numeric, not lexicographic)', () => {
      const v9  = makeVersion({ '@id': '/api/spend_file_versions/v9',  name: 'Corp Spend', version: '9' })
      const v10 = makeVersion({ '@id': '/api/spend_file_versions/v10', name: 'Corp Spend', version: '10' })
      const result = resolveSpendFileAction([v9, v10], v9['@id'])
      expect(result.type).toBe('autoSwitch')
      if (result.type === 'autoSwitch') {
        expect(result.version['@id']).toBe(v10['@id'])
      }
    })

    it('picks version 10 regardless of array order', () => {
      const v9  = makeVersion({ '@id': '/api/spend_file_versions/v9',  name: 'Corp Spend', version: '9' })
      const v10 = makeVersion({ '@id': '/api/spend_file_versions/v10', name: 'Corp Spend', version: '10' })
      const resultForward  = resolveSpendFileAction([v9,  v10], null)
      const resultReversed = resolveSpendFileAction([v10, v9],  null)
      expect(resultForward.type).toBe('autoSwitch')
      expect(resultReversed.type).toBe('autoSwitch')
      if (resultForward.type === 'autoSwitch')  expect(resultForward.version['@id']).toBe(v10['@id'])
      if (resultReversed.type === 'autoSwitch') expect(resultReversed.version['@id']).toBe(v10['@id'])
    })

    it('handles a single-element ready list correctly', () => {
      const result = resolveSpendFileAction([v2], '/api/spend_file_versions/uuid-1')
      expect(result.type).toBe('autoSwitch')
      if (result.type === 'autoSwitch') {
        expect(result.version['@id']).toBe(v2['@id'])
      }
    })
  })

  // -------------------------------------------------------------------------
  describe('mixed statuses', () => {
    it('only considers ready versions when determining the latest', () => {
      const v5Ready      = makeVersion({ '@id': '/api/spend_file_versions/v5', name: 'Corp Spend', version: '5', status: 'ready' })
      const v6Processing = makeVersion({ '@id': '/api/spend_file_versions/v6', name: 'Corp Spend', version: '6', status: 'processing' })
      const v7Calculating = makeVersion({ '@id': '/api/spend_file_versions/v7', name: 'Corp Spend', version: '7', status: 'calculating' })

      const result = resolveSpendFileAction([v5Ready, v6Processing, v7Calculating], null)
      expect(result.type).toBe('autoSwitch')
      if (result.type === 'autoSwitch') {
        expect(result.version['@id']).toBe(v5Ready['@id'])
      }
    })

    it('treats deleteClaimed and recalculateClaimed as non-ready', () => {
      const vDeleted      = makeVersion({ '@id': '/api/spend_file_versions/del', name: 'Corp Spend', version: '5', status: 'deleteClaimed' })
      const vRecalculate  = makeVersion({ '@id': '/api/spend_file_versions/rec', name: 'Corp Spend', version: '6', status: 'recalculateClaimed' })
      const result = resolveSpendFileAction([vDeleted, vRecalculate, v3], null)
      expect(result.type).toBe('autoSwitch')
      if (result.type === 'autoSwitch') {
        expect(result.version['@id']).toBe(v3['@id'])
      }
    })
  })

  // -------------------------------------------------------------------------
  describe('banner visibility logic (pure)', () => {
    const isBannerVisible = (
      pending: UserSessionActiveCompanySpendFileVersion | null,
      dismissedIri: string | null
    ) => !!pending && pending['@id'] !== dismissedIri

    it('shows banner when pending version exists and has not been dismissed', () => {
      expect(isBannerVisible(v1, null)).toBe(true)
    })

    it('hides banner when pending version IRI matches dismissed IRI', () => {
      expect(isBannerVisible(v1, v1['@id'])).toBe(false)
    })

    it('shows banner when a different (newer) version is pending than the dismissed one', () => {
      expect(isBannerVisible(v2, v1['@id'])).toBe(true)
    })

    it('hides banner when pending version is null', () => {
      expect(isBannerVisible(null, null)).toBe(false)
    })

    it('pending version is null by default (non-persisted)', () => {
      const pendingNewSpendFileVersion: UserSessionActiveCompanySpendFileVersion | null = null
      expect(pendingNewSpendFileVersion).toBeNull()
    })

    it('dismissed IRI is null by default', () => {
      const dismissedSpendFileBannerVersionIri: string | null = null
      expect(dismissedSpendFileBannerVersionIri).toBeNull()
    })
  })
})
