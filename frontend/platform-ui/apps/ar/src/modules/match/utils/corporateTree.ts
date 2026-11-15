import type { CorporateTreeEdgeDto, CorporateTreeNodeDto } from '@/api'

// A type alias (not an `interface ... extends TNode`) because TypeScript's interface heritage
// clause cannot extend a bare generic type parameter, even one constrained to an object type.
export type CorporateTreeUiNode<TNode extends { id: number } = CorporateTreeNodeDto> = TNode & {
  expand: boolean
  children: CorporateTreeUiNode<TNode>[]
}

/** Either corporate-tree response shape `buildCorporateTree` can walk - `entityCard`'s
 * `CorporateTreeResponse` (numeric-versionId endpoint) or `buyers/customerCard`'s uuid-scoped
 * `BuyerCorporateTreeResponse` (both declared in `@/api`, neither imported here to keep this
 * generic helper from depending on either concrete shape). */
export interface CorporateTreeLikeResponse<TNode extends { id: number }> {
  nodes: TNode[]
  edges: CorporateTreeEdgeDto[]
}

/**
 * Reshapes the API's flat nodes+edges into the single nested tree `vue3-blocks-tree` draws -
 * shared by both of AR's corporate-tree tabs (`entityCard`'s own UC-UI-08 one and
 * `buyers/customerCard`'s UC-UI-06 one): both walk the exact same edges/cycles/partial/truncated
 * shape off their own endpoint (only the node DTO itself differs - the buyer-scoped one adds
 * volume/payment-terms/sales-line figures the numeric-versionId one has no equivalent for) and need
 * the exact same cycle-safe walk, so duplicating this function would mean duplicating its cycle
 * guard, not just its view. Generic over the node DTO so each caller's own `CorporateTreeUiNode<T>`
 * keeps its own fields, rather than widening both tabs down to their lowest common shape.
 *
 * Exactly one tree, never a forest or a node under two parents, is the contract UC-API-08's walk
 * (`EfCorporateTreeStore`) makes: every party gets at most one parent edge - the upward walk
 * follows one `UltimateParentId` pointer per row, and an edge that would give a node a second
 * parent (a cycle) is diverted into `cycles` instead of `edges`. `toUiNode` still carries a
 * `visited` set rather than trusting that contract all the way to an unbounded recursion: a
 * response that violated it (a bug, a future backend change) would otherwise recurse forever on a
 * cyclic branch below the root and crash the whole tab with a stack overflow, not just this panel -
 * the one failure mode worse than the malformed-response `null` this function already returns for.
 * A repeated id simply stops that branch, the same truncation a depth bound already produces.
 */
export function buildCorporateTree<TNode extends { id: number }>(
  response: CorporateTreeLikeResponse<TNode>,
): CorporateTreeUiNode<TNode> | null {
  const byId = new Map(response.nodes.map((node) => [node.id, node]))
  const childIdsByParent = new Map<number, number[]>()
  const nodesWithAParent = new Set<number>()

  for (const edge of response.edges) {
    nodesWithAParent.add(edge.childId)
    const siblings = childIdsByParent.get(edge.parentId) ?? []
    siblings.push(edge.childId)
    childIdsByParent.set(edge.parentId, siblings)
  }

  const rootId = response.nodes.find((node) => !nodesWithAParent.has(node.id))?.id
  if (rootId === undefined) {
    // Every node in a real response is either the root or reachable from it; only an empty
    // `nodes` list (which the backend never sends - a tree always contains at least the buyer)
    // reaches here. The caller surfaces this `null` explicitly (a "this response is malformed"
    // state) rather than assuming it unreachable.
    return null
  }

  const visited = new Set<number>()

  function toUiNode(id: number): CorporateTreeUiNode<TNode> | null {
    const node = byId.get(id)
    if (!node || visited.has(id)) {
      return null
    }
    visited.add(id)
    return {
      ...node,
      expand: true,
      children: (childIdsByParent.get(id) ?? [])
        .map(toUiNode)
        .filter((child): child is CorporateTreeUiNode<TNode> => child !== null),
    }
  }

  return toUiNode(rootId)
}
