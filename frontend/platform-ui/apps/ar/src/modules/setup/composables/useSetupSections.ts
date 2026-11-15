/**
 * AB#20702 (impl plan K, FR-10): every Setup section registers how to tell it has unsaved edits
 * and how to save or drop them, under the tab it lives in. `SetupView` asks the registry before
 * switching tab or leaving Setup, and its Cancel / Discard / Save modal acts on every dirty section
 * of the tab being left. A tab can hold several sections (Payment Terms Reduction holds Strategies
 * and, with #20733, Harmonization Groups).
 */
import { inject, onBeforeUnmount, provide, type InjectionKey, type Ref } from 'vue'

export type SetupTabId = 'payment-terms' | 'client-standard' | 'cash-flow'

export interface SetupSectionHandle {
  isDirty: Readonly<Ref<boolean>>
  /** Resolves true when the save went through (the modal then carries on with the navigation). */
  save(): Promise<boolean>
  discard(): void
}

export interface SetupSections {
  register(tab: SetupTabId, handle: SetupSectionHandle): () => void
  dirtyIn(tab: SetupTabId): SetupSectionHandle[]
}

const SETUP_SECTIONS_KEY: InjectionKey<SetupSections> = Symbol('setupSections')

export function createSetupSections(): SetupSections {
  const byTab = new Map<SetupTabId, Set<SetupSectionHandle>>()
  return {
    register(tab, handle) {
      if (!byTab.has(tab)) byTab.set(tab, new Set())
      byTab.get(tab)!.add(handle)
      return () => byTab.get(tab)?.delete(handle)
    },
    dirtyIn(tab) {
      return [...(byTab.get(tab) ?? [])].filter((handle) => handle.isDirty.value)
    },
  }
}

export function provideSetupSections(): SetupSections {
  const sections = createSetupSections()
  provide(SETUP_SECTIONS_KEY, sections)
  return sections
}

/** Called by a section's setup(); unregisters itself when the section unmounts. */
export function registerSetupSection(tab: SetupTabId, handle: SetupSectionHandle): void {
  const sections = inject(SETUP_SECTIONS_KEY, null)
  if (!sections) return
  const unregister = sections.register(tab, handle)
  onBeforeUnmount(unregister)
}
