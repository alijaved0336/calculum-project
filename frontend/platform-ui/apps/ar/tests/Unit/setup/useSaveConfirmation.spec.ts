import { describe, expect, it, vi } from 'vitest'
import { useSaveConfirmation } from '@/modules/setup/composables/useSaveConfirmation'

/** Harmonization (UC step 16) and Client Standard (AC-10) ask before a company-wide save. */
describe('useSaveConfirmation', () => {
  it('opens the dialog and saves only on Continue, resolving with the save result', async () => {
    const save = vi.fn().mockResolvedValue(true)
    const confirmation = useSaveConfirmation(save)

    const answer = confirmation.request()
    expect(confirmation.visible.value).toBe(true)
    expect(save).not.toHaveBeenCalled()

    await confirmation.confirm()
    await expect(answer).resolves.toBe(true)
    expect(save).toHaveBeenCalledOnce()
    expect(confirmation.visible.value).toBe(false)
  })

  it('resolves false without saving on Cancel', async () => {
    const save = vi.fn()
    const confirmation = useSaveConfirmation(save)
    const answer = confirmation.request()
    confirmation.cancel()
    await expect(answer).resolves.toBe(false)
    expect(save).not.toHaveBeenCalled()
  })

  it('passes a refused save through as false', async () => {
    const confirmation = useSaveConfirmation(vi.fn().mockResolvedValue(false))
    const answer = confirmation.request()
    await confirmation.confirm()
    await expect(answer).resolves.toBe(false)
  })
})
