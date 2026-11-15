/**
 * Tests for useRecalculationStatus composable
 *
 * Covers:
 * - cleanValues() resetting program/plan/spend-file status
 * - the recalculating-status computeds
 * - the 4 subscribeStore watchers (refreshPrograms, setRefeshPlans,
 *   setRefeshSpendFiles, refresh9boxes), including the "deleted"/"ready"
 *   side effects dispatched through the cross-composable bridge and the
 *   refresh9boxes no-op-on-unknown-value behavior (no default branch in the
 *   original switch).
 *
 * Extracted verbatim from HomeNavbar.vue (Sprint 116 US-2 refactor).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return { ...actual, useI18n: () => ({ t: (key: string) => key }) }
})

import { useSubscribeStore } from '@/stores/subscribe'
import useRecalculationStatus from '@/modules/home/composables/useRecalculationStatus'

describe('useRecalculationStatus', () => {
  let subscribeStore: ReturnType<typeof useSubscribeStore>
  let bridge: { changeCompany?: any; selectSpendFile?: any }
  let getSelectedCompany: () => string
  let getIsLoadingChangeSpendFile: () => boolean
  let getSpendFileVersionActive: () => any

  beforeEach(() => {
    setActivePinia(createPinia())
    subscribeStore = useSubscribeStore()
    bridge = { changeCompany: vi.fn(), selectSpendFile: vi.fn() }
    getSelectedCompany = () => '/api/companies/1'
    getIsLoadingChangeSpendFile = () => false
    getSpendFileVersionActive = () => ({ '@id': '/api/spend_file_versions/1' })
  })

  function build() {
    return useRecalculationStatus(
      () => getSelectedCompany(),
      () => getIsLoadingChangeSpendFile(),
      () => getSpendFileVersionActive(),
      bridge,
    )
  }

  describe('cleanValues', () => {
    it('resets program, plan and spend-file status to their false baseline', () => {
      const { programValues, planStatus, spendFileStatus, cleanValues } = build()
      programValues.recalculationInProgress = true
      planStatus.planInrecalculation = true
      spendFileStatus.spendFileInrecalculation = true

      cleanValues()

      expect(programValues).toEqual({
        recalculationInProgress: false,
        pendingRecalculation: false,
        isBoxesRecalculating: false,
      })
      expect(planStatus).toEqual({ pendingRecalculation: false, planInrecalculation: false })
      expect(spendFileStatus).toEqual({ pendingRecalculation: false, spendFileInrecalculation: false })
    })
  })

  describe('computeds', () => {
    it('labelForRecalculatingStatus prefers the in-progress label', () => {
      const { programValues, labelForRecalculatingStatus } = build()
      programValues.recalculationInProgress = true
      expect(labelForRecalculatingStatus.value).toBe('global.programInrecalculation')
    })

    it('labelForRecalculatingStatus falls back to the pending label', () => {
      const { programValues, labelForRecalculatingStatus } = build()
      programValues.pendingRecalculation = true
      expect(labelForRecalculatingStatus.value).toBe('global.pendingRecalculation')
    })

    it('labelForRecalculatingStatus is null when nothing is happening', () => {
      const { labelForRecalculatingStatus } = build()
      expect(labelForRecalculatingStatus.value).toBeNull()
    })

    it('showRecalculatingStatus is true if any program/plan flag is set', () => {
      const { planStatus, showRecalculatingStatus } = build()
      expect(showRecalculatingStatus.value).toBe(false)
      planStatus.pendingRecalculation = true
      expect(showRecalculatingStatus.value).toBe(true)
    })

    it('showSpendFileRecalculatingStatus mirrors the spend-file status flags', () => {
      const { spendFileStatus, showSpendFileRecalculatingStatus } = build()
      expect(showSpendFileRecalculatingStatus.value).toBe(false)
      spendFileStatus.pendingRecalculation = true
      expect(showSpendFileRecalculatingStatus.value).toBe(true)
    })

    it('labelForRecalculatingStatusSpendFile shows the % once progress is available', () => {
      const { spendFileStatus, labelForRecalculatingStatusSpendFile } = build()
      spendFileStatus.spendFileInrecalculation = true
      vi.spyOn(subscribeStore, 'getSpendFileProgress', 'get').mockReturnValue(42)
      expect(labelForRecalculatingStatusSpendFile.value).toBe('Updating Data · 42%')
    })

    it('labelForRecalculatingStatusSpendFile falls back to a plain label with no progress', () => {
      const { spendFileStatus, labelForRecalculatingStatusSpendFile } = build()
      spendFileStatus.spendFileInrecalculation = true
      expect(labelForRecalculatingStatusSpendFile.value).toBe('Updating Data')
    })
  })

  describe('refreshPrograms watcher', () => {
    it.each([
      ['calculationPending', { pendingRecalculation: true, recalculationInProgress: false, isBoxesRecalculating: false }],
      ['updating', { pendingRecalculation: false, recalculationInProgress: true, isBoxesRecalculating: true }],
      ['recalculating', { pendingRecalculation: false, recalculationInProgress: true, isBoxesRecalculating: true }],
      ['calculationReady', { pendingRecalculation: false, recalculationInProgress: false, isBoxesRecalculating: true }],
      ['ready', { pendingRecalculation: false, recalculationInProgress: false, isBoxesRecalculating: false }],
      ['some-unknown-value', { pendingRecalculation: false, recalculationInProgress: false, isBoxesRecalculating: false }],
    ])('maps "%s" to %o', async (value, expected) => {
      const { programValues } = build()
      subscribeStore.refreshPrograms = value
      await nextTick()
      expect(programValues).toEqual(expected)
    })
  })

  describe('setRefeshPlans watcher', () => {
    it.each([
      ['updatingPending', { pendingRecalculation: true, planInrecalculation: false }],
      ['updating', { pendingRecalculation: false, planInrecalculation: true }],
      ['ready', { pendingRecalculation: false, planInrecalculation: false }],
      ['some-unknown-value', { pendingRecalculation: false, planInrecalculation: false }],
    ])('maps "%s" to %o', async (value, expected) => {
      const { planStatus } = build()
      subscribeStore.setRefeshPlans = value
      await nextTick()
      expect(planStatus).toEqual(expected)
    })
  })

  describe('refresh9boxes watcher', () => {
    it.each([
      ['pending', true],
      ['recalculating', true],
      ['ready', false],
    ])('sets isBoxesRecalculating to %s for "%s"', async (value, expected) => {
      const { programValues } = build()
      subscribeStore.refresh9boxes = value
      await nextTick()
      expect(programValues.isBoxesRecalculating).toBe(expected)
    })

    it('leaves isBoxesRecalculating untouched for an unrecognized value (no default branch)', async () => {
      const { programValues } = build()
      subscribeStore.refresh9boxes = 'pending'
      await nextTick()
      expect(programValues.isBoxesRecalculating).toBe(true)

      subscribeStore.refresh9boxes = 'some-unknown-value'
      await nextTick()
      expect(programValues.isBoxesRecalculating).toBe(true)
    })
  })

  describe('setRefeshSpendFiles watcher', () => {
    it('calculatingPending sets pending status and disallows module actions', async () => {
      const { spendFileStatus } = build()
      const spy = vi.spyOn(subscribeStore, 'setAllowActionsInModules')
      subscribeStore.setRefeshSpendFiles = 'calculatingPending'
      await nextTick()
      expect(spendFileStatus).toEqual({ pendingRecalculation: true, spendFileInrecalculation: false })
      expect(spy).toHaveBeenCalledWith(false)
    })

    it.each(['updating', 'calculating'])('"%s" sets in-recalculation status and disallows module actions', async (value) => {
      const { spendFileStatus } = build()
      const spy = vi.spyOn(subscribeStore, 'setAllowActionsInModules')
      subscribeStore.setRefeshSpendFiles = value
      await nextTick()
      expect(spendFileStatus).toEqual({ pendingRecalculation: false, spendFileInrecalculation: true })
      expect(spy).toHaveBeenCalledWith(false)
    })

    it('deleted calls bridge.changeCompany with the currently selected company', async () => {
      build()
      subscribeStore.setRefeshSpendFiles = 'deleted'
      await nextTick()
      expect(bridge.changeCompany).toHaveBeenCalledWith('/api/companies/1', true)
      expect(bridge.selectSpendFile).not.toHaveBeenCalled()
    })

    it('ready resets status, allows module actions, and calls bridge.selectSpendFile', async () => {
      const { spendFileStatus } = build()
      const spy = vi.spyOn(subscribeStore, 'setAllowActionsInModules')
      subscribeStore.setRefeshSpendFiles = 'ready'
      await nextTick()
      expect(spendFileStatus).toEqual({ pendingRecalculation: false, spendFileInrecalculation: false })
      expect(spy).toHaveBeenCalledWith(true)
      expect(bridge.selectSpendFile).toHaveBeenCalledWith({ '@id': '/api/spend_file_versions/1' })
    })

    it('ready does NOT call bridge.selectSpendFile while a spend-file change is already loading', async () => {
      getIsLoadingChangeSpendFile = () => true
      build()
      subscribeStore.setRefeshSpendFiles = 'ready'
      await nextTick()
      expect(bridge.selectSpendFile).not.toHaveBeenCalled()
    })

    it('an unrecognized value resets status and allows module actions (default branch)', async () => {
      const { spendFileStatus } = build()
      const spy = vi.spyOn(subscribeStore, 'setAllowActionsInModules')
      subscribeStore.setRefeshSpendFiles = 'some-unknown-value'
      await nextTick()
      expect(spendFileStatus).toEqual({ pendingRecalculation: false, spendFileInrecalculation: false })
      expect(spy).toHaveBeenCalledWith(true)
    })
  })
})
