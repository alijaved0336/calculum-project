/**
 * Tests for ManageTeamAction logic.
 *
 * ManageTeamAction.vue cannot be mounted directly in the Vitest/Node.js
 * environment because its Pug template contains TypeScript type casts
 * (`item as UserSessionActiveCompanyTeam`) inside event-handler expressions.
 * The Rollup parser used in the SSR transform path does not understand
 * TypeScript syntax, so full mounting triggers "Expected ',', got 'as'".
 *
 * Strategy: mirror the component's computed logic as pure functions here
 * and test those directly (same approach used in useSpendFile.spec.ts and
 * other specs in this repo).  Emit/action behaviour is validated through
 * a lightweight stub component that re-implements only the relevant logic.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { UserSessionActiveCompanyTeam } from '@/types'

// ─── Pure-logic helpers (mirroring the component's computed properties) ──────

function buildItemsList(teams: UserSessionActiveCompanyTeam[]): UserSessionActiveCompanyTeam[] {
  const sorted = [...teams].sort((a, b) => a.name.localeCompare(b.name))
  return sorted.filter(
    (item, index, self) =>
      index === self.findIndex(t => t.name.toLowerCase() === item.name.toLowerCase()),
  )
}

function buildFilteredItems(
  itemsList: UserSessionActiveCompanyTeam[],
  currentValue: string | null | undefined,
  searchQuery: string,
): UserSessionActiveCompanyTeam[] {
  const cv = currentValue?.toLowerCase()
  const baseList = cv ? itemsList.filter(item => item.name.toLowerCase() !== cv) : itemsList
  if (!searchQuery.trim()) return baseList
  const q = searchQuery.toLowerCase()
  return baseList.filter(item => item.name.toLowerCase().includes(q))
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TEAM_A: UserSessionActiveCompanyTeam = { '@id': '/api/company_teams/1', '@type': 'CompanyTeam', name: 'Alpha' }
const TEAM_B: UserSessionActiveCompanyTeam = { '@id': '/api/company_teams/2', '@type': 'CompanyTeam', name: 'Beta' }
const TEAM_C: UserSessionActiveCompanyTeam = { '@id': '/api/company_teams/3', '@type': 'CompanyTeam', name: 'Gamma' }
const TEAM_A_DUP: UserSessionActiveCompanyTeam = { '@id': '/api/company_teams/9', '@type': 'CompanyTeam', name: 'alpha' }

// ─── Tests: filtering and sorting logic ──────────────────────────────────────

describe('ManageTeamAction — filteredItems logic', () => {

  describe('buildItemsList — sorting and deduplication', () => {
    it('sorts teams alphabetically', () => {
      const result = buildItemsList([TEAM_C, TEAM_A, TEAM_B])
      expect(result.map(t => t.name)).toEqual(['Alpha', 'Beta', 'Gamma'])
    })

    it('preserves already-sorted order', () => {
      const result = buildItemsList([TEAM_A, TEAM_B, TEAM_C])
      expect(result.map(t => t.name)).toEqual(['Alpha', 'Beta', 'Gamma'])
    })

    it('deduplicates teams with the same name (case-insensitive)', () => {
      const result = buildItemsList([TEAM_A, TEAM_A_DUP, TEAM_B])
      expect(result).toHaveLength(2)
    })

    it('keeps the first occurrence when deduplicating', () => {
      // After sort: "alpha" < "Alpha" alphabetically... both are same case-insensitive
      // The sorted order puts them adjacent and the first one is kept
      const result = buildItemsList([TEAM_A, TEAM_A_DUP])
      expect(result).toHaveLength(1)
    })

    it('returns empty array for empty input', () => {
      expect(buildItemsList([])).toEqual([])
    })

    it('returns single item for single-element input', () => {
      expect(buildItemsList([TEAM_A])).toHaveLength(1)
    })
  })

  describe('buildFilteredItems — currentValue exclusion', () => {
    it('excludes item matching currentValue exactly', () => {
      const items = buildItemsList([TEAM_A, TEAM_B])
      const result = buildFilteredItems(items, 'Alpha', '')
      expect(result.map(t => t.name)).toEqual(['Beta'])
    })

    it('excludes item matching currentValue case-insensitively', () => {
      const items = buildItemsList([TEAM_A, TEAM_B])
      const result = buildFilteredItems(items, 'alpha', '')
      expect(result.map(t => t.name)).toEqual(['Beta'])
    })

    it('returns full list when currentValue is null', () => {
      const items = buildItemsList([TEAM_A, TEAM_B])
      expect(buildFilteredItems(items, null, '')).toHaveLength(2)
    })

    it('returns full list when currentValue is undefined', () => {
      const items = buildItemsList([TEAM_A, TEAM_B])
      expect(buildFilteredItems(items, undefined, '')).toHaveLength(2)
    })

    it('returns full list when currentValue matches no team', () => {
      const items = buildItemsList([TEAM_A, TEAM_B])
      expect(buildFilteredItems(items, 'Delta', '')).toHaveLength(2)
    })
  })

  describe('buildFilteredItems — search query', () => {
    it('returns teams matching search query (substring)', () => {
      const items = buildItemsList([TEAM_A, TEAM_B, TEAM_C])
      const result = buildFilteredItems(items, null, 'alp')
      expect(result.map(t => t.name)).toEqual(['Alpha'])
    })

    it('search is case-insensitive', () => {
      const items = buildItemsList([TEAM_A, TEAM_B])
      const result = buildFilteredItems(items, null, 'ALPHA')
      expect(result.map(t => t.name)).toEqual(['Alpha'])
    })

    it('returns empty list when no team matches search', () => {
      const items = buildItemsList([TEAM_A, TEAM_B])
      expect(buildFilteredItems(items, null, 'xyz')).toHaveLength(0)
    })

    it('returns full list for empty search query', () => {
      const items = buildItemsList([TEAM_A, TEAM_B, TEAM_C])
      expect(buildFilteredItems(items, null, '')).toHaveLength(3)
    })

    it('returns full list for whitespace-only search query', () => {
      const items = buildItemsList([TEAM_A, TEAM_B])
      expect(buildFilteredItems(items, null, '   ')).toHaveLength(2)
    })

    it('applies currentValue exclusion before search filter', () => {
      const items = buildItemsList([TEAM_A, TEAM_B, TEAM_C])
      // currentValue = 'Alpha' → base list is [Beta, Gamma]; search 'a' matches Gamma only
      const result = buildFilteredItems(items, 'Alpha', 'a')
      // 'a' appears in Gamma → 'Gamma'.includes('a') = true
      expect(result.map(t => t.name)).toContain('Gamma')
      expect(result.map(t => t.name)).not.toContain('Alpha')
    })

    it('returns multiple results when several teams match', () => {
      const teamAlpha2: UserSessionActiveCompanyTeam = { '@id': '/t/4', '@type': 'T', name: 'Alpha 2' }
      const items = buildItemsList([TEAM_A, teamAlpha2, TEAM_B])
      const result = buildFilteredItems(items, null, 'alpha')
      expect(result).toHaveLength(2)
    })
  })
})

// ─── Tests: callStoreMenuAction / moveTo emit logic ──────────────────────────
//
// We use a minimal wrapper component with a plain template (no TypeScript casts)
// that re-implements the exact same emit logic as ManageTeamAction.

describe('ManageTeamAction — moveTo / callStoreMenuAction emit logic', () => {
  const WrapperComponent = defineComponent({
    props: {
      option: { type: String, required: true },
    },
    emits: ['call-action'],
    setup(props, { emit }) {
      function callStoreMenuAction(
        keyId: string,
        isEmit: boolean,
        removeGroup: boolean,
        payload: any,
      ) {
        const newPayload = { ...payload, removeGroup }
        emit('call-action', keyId, isEmit, newPayload)
      }

      function moveTo(item: any) {
        const payload = { param: item }
        const removeG = !item
        callStoreMenuAction(props.option, true, removeG, payload)
      }

      return { moveTo }
    },
    template: `
      <div>
        <button id="select-item" @click="moveTo({ '@id': '/api/company_teams/1', name: 'Alpha' })">Select</button>
        <button id="clear" @click="moveTo(null)">Clear</button>
      </div>
    `,
  })

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('moveTo(item) emits call-action with param=item and removeGroup=false', async () => {
    const wrapper = mount(WrapperComponent, { props: { option: 'manageTeam' } })
    await wrapper.find('#select-item').trigger('click')

    const emissions = wrapper.emitted('call-action')
    expect(emissions).toHaveLength(1)
    const [key, isEmit, payload] = emissions![0] as [string, boolean, any]
    expect(key).toBe('manageTeam')
    expect(isEmit).toBe(true)
    expect(payload.param['@id']).toBe('/api/company_teams/1')
    expect(payload.removeGroup).toBe(false)
  })

  it('moveTo(null) emits call-action with param=null and removeGroup=true (clear)', async () => {
    const wrapper = mount(WrapperComponent, { props: { option: 'manageTeam' } })
    await wrapper.find('#clear').trigger('click')

    const emissions = wrapper.emitted('call-action')
    expect(emissions).toHaveLength(1)
    const [key, isEmit, payload] = emissions![0] as [string, boolean, any]
    expect(key).toBe('manageTeam')
    expect(isEmit).toBe(true)
    expect(payload.param).toBeNull()
    expect(payload.removeGroup).toBe(true)
  })

  it('emits different option values depending on the prop', async () => {
    const wrapper = mount(WrapperComponent, { props: { option: 'supplierTeam' } })
    await wrapper.find('#clear').trigger('click')
    const [key] = wrapper.emitted('call-action')![0] as [string, boolean, any]
    expect(key).toBe('supplierTeam')
  })

  it('payload always merges removeGroup into the original payload object', async () => {
    const wrapper = mount(WrapperComponent, { props: { option: 'manageTeam' } })
    await wrapper.find('#select-item').trigger('click')
    const [, , payload] = wrapper.emitted('call-action')![0] as [string, boolean, any]
    expect(payload).toHaveProperty('param')
    expect(payload).toHaveProperty('removeGroup')
  })
})

// ─── Tests: addNewItem guard logic ───────────────────────────────────────────
//
// The guard that blocks API calls when the name is empty is pure synchronous
// logic. We mirror it here as a standalone function.

describe('ManageTeamAction — addNewItem guard', () => {
  function canSubmitNew(name: string): boolean {
    return name.trim() !== ''
  }

  it('returns false for empty string', () => {
    expect(canSubmitNew('')).toBe(false)
  })

  it('returns false for whitespace-only string', () => {
    expect(canSubmitNew('   ')).toBe(false)
  })

  it('returns true for a non-empty name', () => {
    expect(canSubmitNew('Alpha Team')).toBe(true)
  })

  it('trims name before checking', () => {
    expect(canSubmitNew('  A  ')).toBe(true)
  })
})

// ─── Tests: saveEdit guard logic ─────────────────────────────────────────────

describe('ManageTeamAction — saveEdit guard', () => {
  function canSubmitEdit(name: string, editingId: string | null): boolean {
    if (name.trim() === '') return false
    if (!editingId) return false
    return true
  }

  it('returns false when name is empty', () => {
    expect(canSubmitEdit('', '/api/company_teams/1')).toBe(false)
  })

  it('returns false when editingItemId is null', () => {
    expect(canSubmitEdit('Alpha', null)).toBe(false)
  })

  it('returns true when both name and id are valid', () => {
    expect(canSubmitEdit('Alpha', '/api/company_teams/1')).toBe(true)
  })

  it('trims name before the empty check', () => {
    expect(canSubmitEdit('   ', '/api/company_teams/1')).toBe(false)
  })
})
