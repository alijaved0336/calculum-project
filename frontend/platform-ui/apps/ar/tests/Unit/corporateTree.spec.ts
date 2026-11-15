import { describe, expect, it } from 'vitest'
import { buildCorporateTree } from '@/modules/match/utils/corporateTree'
import type { CorporateTreeResponse } from '@/api'

function tree(overrides: Partial<CorporateTreeResponse> = {}): CorporateTreeResponse {
  return {
    buyerId: 10,
    nodes: [
      { id: 1, companyName: 'Top Parent', role: 'Parent', resolution: 'Resolved', isRequestedBuyer: false },
      { id: 10, companyName: 'Acme Corp', role: 'Self', resolution: 'Enriched', isRequestedBuyer: true },
      { id: 20, companyName: 'Acme Sub', role: 'Counterparty', resolution: 'Named', isRequestedBuyer: false },
    ],
    edges: [
      { parentId: 1, childId: 10 },
      { parentId: 10, childId: 20 },
    ],
    cycles: [],
    partial: false,
    truncated: false,
    ...overrides,
  }
}

describe('buildCorporateTree', () => {
  it('nests children under their parent, rooted at the one node with no incoming edge', () => {
    const root = buildCorporateTree(tree())

    expect(root?.id).toBe(1)
    expect(root?.children).toHaveLength(1)
    expect(root?.children[0].id).toBe(10)
    expect(root?.children[0].children).toHaveLength(1)
    expect(root?.children[0].children[0].id).toBe(20)
  })

  it('marks every node expanded by default', () => {
    const root = buildCorporateTree(tree())

    expect(root?.expand).toBe(true)
    expect(root?.children[0].expand).toBe(true)
  })

  it('returns a single childless node for a buyer with no relationships', () => {
    const root = buildCorporateTree(
      tree({
        nodes: [{ id: 10, companyName: 'Acme Corp', role: 'Self', resolution: 'Enriched', isRequestedBuyer: true }],
        edges: [],
      }),
    )

    expect(root?.id).toBe(10)
    expect(root?.children).toHaveLength(0)
  })

  it('returns null when no node has an empty incoming-edge set (malformed response, no root)', () => {
    const root = buildCorporateTree(
      tree({
        nodes: [
          { id: 1, companyName: 'A', role: 'Self', resolution: 'Enriched', isRequestedBuyer: true },
          { id: 2, companyName: 'B', role: 'Counterparty', resolution: 'Named', isRequestedBuyer: false },
        ],
        edges: [
          { parentId: 1, childId: 2 },
          { parentId: 2, childId: 1 },
        ],
      }),
    )

    expect(root).toBeNull()
  })

  it('returns null for an empty node list', () => {
    const root = buildCorporateTree(tree({ nodes: [], edges: [] }))

    expect(root).toBeNull()
  })

  it('stops a branch at a repeated id rather than recursing forever on a cycle below the root', () => {
    // 20 points back at 10, a cycle that never reaches the root (1) - edges cannot actually carry
    // this per the backend's own contract (see this function's own doc), but must not hang if a
    // response ever did.
    const root = buildCorporateTree(
      tree({
        edges: [
          { parentId: 1, childId: 10 },
          { parentId: 10, childId: 20 },
          { parentId: 20, childId: 10 },
        ],
      }),
    )

    expect(root?.id).toBe(1)
    expect(root?.children[0].id).toBe(10)
    // 10 was already visited reaching this branch, so the cyclic edge back to it is dropped
    // instead of being walked again.
    expect(root?.children[0].children.map((child) => child.id)).toEqual([20])
    expect(root?.children[0].children[0].children).toHaveLength(0)
  })
})
