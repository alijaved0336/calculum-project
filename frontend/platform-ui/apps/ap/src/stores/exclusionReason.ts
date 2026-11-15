import { defineStore } from "pinia";
import { ref, computed } from "vue";

/**
 * AB#20307: orchestrates the "reason for exclusion" popup. Excluding a row - single (ExcludeColumn)
 * or bulk (IncludeExcludeAction, via ListsCFEdit's gridExclude) - must block on the user entering a
 * reason (search existing or type new) before the exclude request is sent; cancelling aborts the
 * exclude entirely. Both entry points live in different components with no shared ancestor other
 * than the Edit Mode view, so a single globally-mounted modal (see ExclusionReasonModal.vue) driven
 * by this store's state - rather than prop/emit chains through every intermediate component - is
 * how they both reach it.
 */
export const useExclusionReasonStore = defineStore("exclusionReason", () => {
  const programId = ref<string | null>(null);
  const resolver = ref<((reason: string | null) => void) | null>(null);

  const isOpen = computed(() => resolver.value !== null);

  /**
   * Opens the popup and resolves with the chosen/typed reason, or null if the user cancels.
   * Callers should skip the exclude request entirely when this resolves to null.
   */
  function requestReason(forProgramId: string): Promise<string | null> {
    return new Promise((resolve) => {
      resolver.value?.(null);
      programId.value = forProgramId;
      resolver.value = (reason: string | null) => resolve(reason);
    });
  }

  function confirm(reason: string) {
    const resolve = resolver.value;
    resolver.value = null;
    resolve?.(reason);
  }

  function cancel() {
    const resolve = resolver.value;
    resolver.value = null;
    resolve?.(null);
  }

  return {
    programId,
    isOpen,
    requestReason,
    confirm,
    cancel,
  };
});
