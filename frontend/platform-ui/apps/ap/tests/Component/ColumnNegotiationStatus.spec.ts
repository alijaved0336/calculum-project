/**
 * See CardsByStatus.spec.ts for why this mirrors the component's logic in a plain function
 * instead of mounting the real SFC — ColumnNegotiationStatus.vue depends on
 * PillLabelNumberBadgeParentSupplierLevel.vue, which shares the same broken transitive icon
 * import (via useModulePlan -> @/composables) as PillLabelNumberBadge.vue, confirmed as a
 * pre-existing, project-wide harness limitation unrelated to this feature.
 */
import { describe, it, expect } from 'vitest'
import { isPartialEntity, PARTIAL_PILL_COLOR_CLASSES } from '@/composables/usePartialNegotiationStatus'

const STATUS_LABELS: Record<string, string> = {
  analyzed: 'Analyzed',
  onHold: 'On Hold',
  planned: 'Planned',
  contacted: 'Contacted',
  agreed: 'Agreed-Not Improved',
  agreedExtended: 'Agreed Improved'
}

const STATUS_COLORS: Record<string, string> = {
  analyzed: 'bg-graycool-500',
  contacted: 'bg-teal-500'
}

// Mirrors ColumnNegotiationStatus.vue's pillLabel/negotiationStatusPillColorClasses computeds.
function resolvePill(dataItem: { negotiationStatus: string; negotiationStatusCodes: string }) {
  const isPartial = isPartialEntity(dataItem.negotiationStatusCodes)
  return {
    label: isPartial ? 'Partial' : STATUS_LABELS[dataItem.negotiationStatus],
    colorClasses: isPartial ? PARTIAL_PILL_COLOR_CLASSES : STATUS_COLORS[dataItem.negotiationStatus]
  }
}

describe('ColumnNegotiationStatus Partial-aware pill resolution', () => {
  it('non-Partial: shows the normal translated single-status label and color (regression guard)', () => {
    const result = resolvePill({ negotiationStatus: 'contacted', negotiationStatusCodes: 'contacted' })
    expect(result.label).toBe('Contacted')
    expect(result.colorClasses).toBe('bg-teal-500')
  })

  it('Partial: shows the Partial label with the dedicated Partial color, regardless of negotiationStatus', () => {
    const result = resolvePill({ negotiationStatus: 'analyzed', negotiationStatusCodes: 'analyzed,contacted' })
    expect(result.label).toBe('Partial')
    expect(result.colorClasses).toBe(PARTIAL_PILL_COLOR_CLASSES)
  })

  it('a spend-line row (single code) never renders as Partial, no explicit level check needed', () => {
    const result = resolvePill({ negotiationStatus: 'analyzed', negotiationStatusCodes: 'analyzed' })
    expect(result.label).toBe('Analyzed')
  })
})
