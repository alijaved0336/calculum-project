/**
 * Mirrors the `watch(() => subscribeStore.setRefeshPlans, ...)` handler in
 * HomePlanV2.vue (the Firestore `plan/{planUuid}` status contract — see
 * docs/handoff-front-plan-status-firebase-contract.md in the Back-End repo).
 *
 * HomePlanV2.vue is not mountable in this harness (heavy Kendo/CalculumModal
 * dependency tree, same class of issue documented in other specs in this repo).
 * The handler is reproduced here verbatim so its branching and async ordering
 * can be tested directly, following the same mirror-the-logic approach used in
 * ManageTeamAction.spec.ts and KanbanAgreedTermsModal.spec.ts.
 */
import { describe, it, expect, vi } from 'vitest'

interface PlanStatus {
  pendingRecalculation: boolean
  planInrecalculation: boolean
}

// Mirrors HomePlanV2.vue's watcher body exactly, including the fix: the cache
// reset must be awaited before getPlan() fires (WI Firestore plan contract §4.7/§6).
async function handlePlanStatusChange(
  newValue: string,
  planStatus: PlanStatus,
  apolloClientResetStore: () => Promise<void>,
  getPlan: () => void,
) {
  switch (newValue) {
    case 'updatingPending':
      planStatus.pendingRecalculation = true
      planStatus.planInrecalculation = false
      break

    case 'updating':
      planStatus.pendingRecalculation = false
      planStatus.planInrecalculation = true
      break

    case 'ready':
      await apolloClientResetStore()
      planStatus.pendingRecalculation = false
      planStatus.planInrecalculation = false
      getPlan()
      break

    default:
      break
  }
}

function freshStatus(): PlanStatus {
  return { pendingRecalculation: false, planInrecalculation: false }
}

describe('HomePlanV2 plan status watcher — Firestore plan contract', () => {
  it('"updatingPending" sets pendingRecalculation and clears planInrecalculation', async () => {
    const planStatus = freshStatus()
    await handlePlanStatusChange('updatingPending', planStatus, vi.fn(), vi.fn())
    expect(planStatus).toEqual({ pendingRecalculation: true, planInrecalculation: false })
  })

  it('"updating" sets planInrecalculation and clears pendingRecalculation', async () => {
    const planStatus: PlanStatus = { pendingRecalculation: true, planInrecalculation: false }
    await handlePlanStatusChange('updating', planStatus, vi.fn(), vi.fn())
    expect(planStatus).toEqual({ pendingRecalculation: false, planInrecalculation: true })
  })

  it('"ready" clears both flags and calls getPlan only after the cache reset resolves', async () => {
    const planStatus: PlanStatus = { pendingRecalculation: false, planInrecalculation: true }
    const order: string[] = []
    const apolloClientResetStore = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            order.push('reset-resolved')
            resolve()
          }, 10)
        }),
    )
    const getPlan = vi.fn(() => order.push('getPlan-called'))

    await handlePlanStatusChange('ready', planStatus, apolloClientResetStore, getPlan)

    expect(planStatus).toEqual({ pendingRecalculation: false, planInrecalculation: false })
    expect(apolloClientResetStore).toHaveBeenCalledTimes(1)
    expect(getPlan).toHaveBeenCalledTimes(1)
    expect(order).toEqual(['reset-resolved', 'getPlan-called'])
  })

  it('regression guard: getPlan does not run before the cache reset promise settles', () => {
    const planStatus = freshStatus()
    let resetResolved = false
    const apolloClientResetStore = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            resetResolved = true
            resolve()
          }, 10)
        }),
    )
    const getPlan = vi.fn(() => {
      // If this ever runs before the reset resolves, the bug this fix closes
      // (missing `await` before apolloClientResetStore()) has regressed.
      expect(resetResolved).toBe(true)
    })

    // Deliberately not awaited: exercises the exact race the fix guards against.
    void handlePlanStatusChange('ready', planStatus, apolloClientResetStore, getPlan)
    expect(getPlan).not.toHaveBeenCalled()
  })

  it('"deleted" is a no-op — flags and side effects untouched', async () => {
    const planStatus: PlanStatus = { pendingRecalculation: true, planInrecalculation: true }
    const apolloClientResetStore = vi.fn()
    const getPlan = vi.fn()

    await handlePlanStatusChange('deleted', planStatus, apolloClientResetStore, getPlan)

    expect(planStatus).toEqual({ pendingRecalculation: true, planInrecalculation: true })
    expect(apolloClientResetStore).not.toHaveBeenCalled()
    expect(getPlan).not.toHaveBeenCalled()
  })

  it('an unrecognized status is a no-op', async () => {
    const planStatus = freshStatus()
    const apolloClientResetStore = vi.fn()
    const getPlan = vi.fn()

    await handlePlanStatusChange('', planStatus, apolloClientResetStore, getPlan)

    expect(planStatus).toEqual({ pendingRecalculation: false, planInrecalculation: false })
    expect(apolloClientResetStore).not.toHaveBeenCalled()
    expect(getPlan).not.toHaveBeenCalled()
  })
})
