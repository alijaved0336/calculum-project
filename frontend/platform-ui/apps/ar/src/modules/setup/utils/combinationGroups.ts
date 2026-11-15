/**
 * AB#20839 (#20824): Peer Group Standard's combination groups, ported from AP's
 * `combinationGroupUtils.ts` to AR's nested shape (Buyer / Transaction / Supplier). A group's
 * priority is its position in the list, so reordering needs no renumbering.
 *
 * The defaults are not copied here: "Restore to Defaults" uses the API's `defaultCombinationGroups`.
 */
import {
  PARTY_ATTRIBUTES,
  TRANSACTION_ATTRIBUTES,
  type CombinationGroup,
} from '../api/setupStrategies.types'

export const MIN_PEER_GROUP_OCCURRENCES = 1
export const MAX_PEER_GROUP_OCCURRENCES = 9999

const flagsOf = (group: CombinationGroup): boolean[] => [
  ...PARTY_ATTRIBUTES.map((key) => group.buyer[key]),
  ...TRANSACTION_ATTRIBUTES.map((key) => group.transaction[key]),
  ...PARTY_ATTRIBUTES.map((key) => group.supplier[key]),
]

export function emptyGroup(): CombinationGroup {
  const off = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((key) => [key, false])) as Record<K, boolean>
  return { buyer: off(PARTY_ATTRIBUTES), transaction: off(TRANSACTION_ATTRIBUTES), supplier: off(PARTY_ATTRIBUTES) }
}

/**
 * A plain copy: the groups usually come from reactive state, which `structuredClone` refuses.
 * The sections hold only boolean flags, so copying each one is a full deep copy.
 */
export const cloneGroups = (groups: CombinationGroup[]): CombinationGroup[] =>
  groups.map((group) => ({ buyer: { ...group.buyer }, transaction: { ...group.transaction }, supplier: { ...group.supplier } }))

export const activeAttributeCount = (group: CombinationGroup): number => flagsOf(group).filter(Boolean).length

/** Peer Group has no forced-identity floor: a group with nothing on would match every peer. */
export const groupHasAnyAttribute = (group: CombinationGroup): boolean => activeAttributeCount(group) > 0

/** True when two groups have exactly the same attributes on. */
export function hasDuplicateGroups(groups: CombinationGroup[]): boolean {
  const fingerprints = groups.map((group) => flagsOf(group).join(','))
  return new Set(fingerprints).size !== fingerprints.length
}

/** "Sort by Enabled Attributes": most attributes first; ties keep their order (a stable sort). */
export const sortByEnabledAttributes = (groups: CombinationGroup[]): CombinationGroup[] =>
  [...groups].sort((a, b) => activeAttributeCount(b) - activeAttributeCount(a))

/** Moves the group at `from` to `to`, shifting the ones between. */
export function moveGroup(groups: CombinationGroup[], from: number, to: number): CombinationGroup[] {
  const moved = [...groups]
  if (from === to || from < 0 || from >= moved.length) return moved
  const [group] = moved.splice(from, 1)
  moved.splice(to, 0, group)
  return moved
}

/**
 * Why the groups cannot be saved (an i18n key), checked in AP's order: no group, a group with no
 * attribute, two identical groups. Undefined when they can.
 */
export function combinationGroupsError(groups: CombinationGroup[]): string | undefined {
  if (groups.length === 0) return 'arSetup.peerGroup.warnings.noGroups'
  if (!groups.every(groupHasAnyAttribute)) return 'arSetup.peerGroup.warnings.emptyGroup'
  if (hasDuplicateGroups(groups)) return 'arSetup.peerGroup.warnings.duplicateGroups'
  return undefined
}

/** Minimum Occurrences: a whole number from 1 to 9,999 (an emptied field arrives as NaN). */
export function peerGroupOccurrencesError(occurrences: number | undefined): string | undefined {
  if (occurrences === undefined) return undefined
  if (!Number.isInteger(occurrences)) return 'arSetup.validation.minOccurrencesWhole'
  if (occurrences < MIN_PEER_GROUP_OCCURRENCES || occurrences > MAX_PEER_GROUP_OCCURRENCES) {
    return 'arSetup.validation.peerGroupMinOccurrencesRange'
  }
  return undefined
}
