import { ref, onBeforeUnmount, type Ref } from 'vue'

/**
 * Minimal single-<video> preview player for the segment manager: seek to a segment's
 * start and stop at its end, so an admin can verify a moment before deleting it.
 *
 * The caller owns the `<video>` element ref and passes it in, then wires
 * `@timeupdate="handleTimeUpdate"` and `@loadedmetadata="onLoadedMeta"`. Mirrors the chat
 * widget's stop-at-end behaviour without coupling to that component.
 */
export function useSegmentPreview(videoEl: Ref<HTMLVideoElement | null>) {
  const activeId = ref<string | null>(null) // which segment is currently previewing
  let endSec = 0 // 0 = no stop bound
  let pendingSeek: number | null = null // seek deferred until metadata is ready

  function preview(startMs: number | null, endMs: number | null, id: string) {
    const el = videoEl.value
    if (!el) return
    const start = (startMs ?? 0) / 1000
    const end = endMs != null ? endMs / 1000 : 0
    endSec = end > start ? end : 0
    activeId.value = id
    try {
      if (Number.isFinite(el.duration) && el.duration > 0) el.currentTime = start
      else pendingSeek = start // element not ready yet — seek on loadedmetadata
      void el.play()
    } catch {
      /* autoplay/seek can throw; the user can still use native controls */
    }
  }

  function onLoadedMeta() {
    const el = videoEl.value
    if (el && pendingSeek != null) {
      el.currentTime = pendingSeek
      pendingSeek = null
    }
  }

  function handleTimeUpdate() {
    const el = videoEl.value
    if (!el) return
    // Stop at the segment's end, then release the bound so native play resumes freely.
    if (endSec && el.currentTime >= endSec) {
      el.pause()
      endSec = 0
      activeId.value = null
    }
  }

  function stop() {
    const el = videoEl.value
    if (el) {
      try { el.pause() } catch { /* ignore */ }
    }
    endSec = 0
    pendingSeek = null
    activeId.value = null
  }

  onBeforeUnmount(stop)

  return { activeId, preview, onLoadedMeta, handleTimeUpdate, stop }
}
