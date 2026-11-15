import type { PartyRole } from '@/api'

/** UC-MOD-01's structural role, `PartyRole`'s PascalCase enum name lower-cased to the
 * `arMatch.roles.*` key that carries its label. Single source of truth for both the Companies
 * tab (filter buttons and each row's badge) and the Customer Card (its role badge), so the label
 * can't drift out of sync between them the way it had before this map existed. */
const roleLabelKeys: Record<PartyRole, string> = {
  Self: 'self',
  Counterparty: 'counterparty',
  Parent: 'parent',
}

/** The `arMatch.roles.*` i18n key for a given structural role. */
export const roleLabelKey = (role: PartyRole): string => roleLabelKeys[role]
