import { defineStore } from "pinia";
import { ref } from "vue";
import type { PreviousThread } from "@/api/session.api";

export const useUiStore = defineStore("ui", () => {
  const pinnedThreadIds = ref<Set<string>>(new Set());
  const pendingRedirect = ref<string | null>(null);

  function initFromThreads(threads: PreviousThread[]) {
    pinnedThreadIds.value = new Set(
      threads.filter((t) => t.pinned).map((t) => t.thread_id),
    );
  }

  function togglePin(threadId: string) {
    const next = new Set(pinnedThreadIds.value);
    if (next.has(threadId)) {
      next.delete(threadId);
    } else {
      next.add(threadId);
    }
    pinnedThreadIds.value = next;
  }

  function isPinned(threadId: string): boolean {
    return pinnedThreadIds.value.has(threadId);
  }

  function syncPinnedThread(threadId: string, pinned: boolean) {
    const next = new Set(pinnedThreadIds.value);
    if (pinned) {
      next.add(threadId);
    } else {
      next.delete(threadId);
    }
    pinnedThreadIds.value = next;
  }

  function setPendingRedirect(path: string | null) {
    pendingRedirect.value = path;
  }

  function consumePendingRedirect() {
    const path = pendingRedirect.value;
    pendingRedirect.value = null;
    return path;
  }

  return {
    pinnedThreadIds,
    pendingRedirect,
    initFromThreads,
    togglePin,
    isPinned,
    syncPinnedThread,
    setPendingRedirect,
    consumePendingRedirect,
  };
});
