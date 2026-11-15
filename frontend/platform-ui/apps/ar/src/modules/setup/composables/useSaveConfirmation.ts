/**
 * A section whose save recalculates every sale file of the company asks first (Harmonization
 * UC step 16, Client Standard): "Saving recalculates…  Continue?". `request()` opens the dialog
 * and resolves once the admin answers - with the save's own result on Continue, `false` on
 * Cancel - so the footer's Save and the unsaved-changes prompt's Save (Client Standard AC-10:
 * "opens the save confirmation, saves, then moves to the other tab") go through the same dialog.
 */
import { ref } from 'vue'

export function useSaveConfirmation(save: () => Promise<boolean>) {
  const visible = ref(false)
  let answer: ((saved: boolean) => void) | null = null

  function settle(saved: boolean): void {
    visible.value = false
    const resolve = answer
    answer = null
    resolve?.(saved)
  }

  return {
    visible,
    /** Opens the dialog; resolves true only when the admin continued and the save succeeded. */
    request(): Promise<boolean> {
      answer?.(false)
      visible.value = true
      return new Promise<boolean>((resolve) => {
        answer = resolve
      })
    },
    async confirm(): Promise<void> {
      visible.value = false
      settle(await save())
    },
    cancel(): void {
      settle(false)
    },
  }
}
