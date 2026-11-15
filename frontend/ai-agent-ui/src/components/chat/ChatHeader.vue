<template>
  <div class="proto-a-tabs">
    <button class="icon hdr-back" @click="emit('go-back')" title="Back">
      <ArrowLeftSvg />
    </button>
    <button :class="['pa-tab']" disabled style="cursor: default; pointer-events: none;">
      Activity <span class="pa-tab-c">18</span>
    </button>
    <button :class="['pa-tab', { on: activeTab === 'assistant' }]" @click="emit('update:activeTab', 'assistant')">
      <SparkleSvg />
      Assistant
      <span v-if="isConnecting" class="ws-dot connecting" />
      <span v-else-if="isConnected" class="ws-dot connected" />
      <span v-else-if="wsError" class="ws-dot error" />
    </button>
    <div class="tab-actions">
      <a-tooltip title="New chat" :get-popup-container="getPopupContainer"><button class="icon" @click="emit('new-chat')"><PlusSvg /></button></a-tooltip>
      <a-tooltip title="Past negotiation strategies" :get-popup-container="getPopupContainer"><button class="icon" @click="emit('toggle-history')" :class="{ on: historyOpen }"><ClockSvg /></button></a-tooltip>
      <!-- <a-tooltip title="Negotiation Goals"><button class="icon" @click="emit('open-goals')"><BookSvg /></button></a-tooltip> -->
      <a-tooltip v-if="showCopyButton" :title="copied ? 'Copied!' : 'Copy conversation'" :get-popup-container="getPopupContainer">
        <button class="icon" :class="{ ok: copied }" @click="emit('copy-conversation')">
          <CheckSvg v-if="copied" /><CopySvg v-else />
        </button>
      </a-tooltip>
      <a-tooltip :title="isFullscreen ? 'Exit full screen' : 'Full screen'" :get-popup-container="getPopupContainer">
        <button class="icon" @click="emit('update:isFullscreen', !isFullscreen)">
          <MinimizeSvg v-if="isFullscreen" /><MaximizeSvg v-else />
        </button>
      </a-tooltip>
      <a-tooltip title="Close" placement="bottomRight" :get-popup-container="getPopupContainer"><button class="icon close-icon" @click="emit('go-back')"><CloseSvg /></button></a-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeftSvg, SparkleSvg, PlusSvg, ClockSvg,
  CheckSvg, CopySvg, MinimizeSvg, MaximizeSvg, CloseSvg,
} from '@/components/chat/icons'

const getPopupContainer = (triggerNode: HTMLElement) => triggerNode.parentNode as HTMLElement

defineProps<{
  activeTab: 'activity' | 'assistant'
  isFullscreen: boolean
  historyOpen: boolean
  copied: boolean
  showCopyButton: boolean
  isConnecting: boolean
  isConnected: boolean
  wsError: string | null
}>()

const emit = defineEmits<{
  'update:activeTab': [value: 'activity' | 'assistant']
  'update:isFullscreen': [value: boolean]
  'toggle-history': []
  'open-goals': []
  'copy-conversation': []
  'new-chat': []
  'go-back': []
}>()
</script>

<style scoped>
.proto-a-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--line-2);
  flex-shrink: 0;
}
.pa-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 6px;
  background: none;
  border: none;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.pa-tab:hover { background: var(--line-2); color: var(--ink); }
.pa-tab.on { background: #6366f16c; color: #000; font-weight: 500; }
.pa-tab .ico { width: 12px; height: 12px; }
.pa-tab-c {
  font-size: 10.5px;
  padding: 1px 5px;
  background: var(--chip);
  border-radius: 999px;
  color: var(--muted);
}
.pa-tab.on .pa-tab-c {
  background: var(--teal-50);
  color: var(--teal-700);
}
.tab-actions {
  margin-left: auto;
  display: flex;
  gap: 1px;
}
.icon {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--muted);
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;
}
.icon:hover { background: var(--line-2); color: var(--ink); }
.icon.close-icon:hover { background: #fee2e2; color: #dc2626; }
.icon.ok  { color: var(--teal-700); background: var(--teal-50); }
.icon.on  { color: var(--teal-700); background: var(--teal-50); }
.icon .ico { width: 13px; height: 13px; }
.hdr-back { margin-right: 2px; }
.ws-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ws-dot.connecting { background: #fbbf24; }
.ws-dot.connected  { background: #10b981; }
.ws-dot.error      { background: #ef4444; }
</style>
