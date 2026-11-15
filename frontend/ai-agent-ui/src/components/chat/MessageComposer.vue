<template>
  <div class="proto-a-composer">
    <div class="composer">
      <div class="composer-chips">
        <button
          class="ctx-pill"
          :disabled="sessionLoading"
          @click="!sessionLoading && (toneDropdownOpen = !toneDropdownOpen)"
          ref="toneSelectorEl"
        >
          <span class="dot-c" :style="{ background: toneColor(selectedTone) }" />
          <span>{{ selectedTone }}</span>
          <ChevronDownSvg />

          <div v-if="toneDropdownOpen" class="tone-dropdown" @click.stop>
            <button
              v-for="t in tones"
              :key="t"
              :class="['tone-option', { active: selectedTone === t, unavailable: !availableTones.has(t) }]"
              :disabled="!availableTones.has(t)"
              @click="selectTone(t)"
            >
              <span class="tone-option-dot" :style="{ background: toneColor(t) }" />
              <span class="tone-option-name">{{ t }}</span>
              <span v-if="t === recommendedTone && availableTones.has(t)" class="recommended-badge">RECOMMENDED</span>
              <span v-else-if="!availableTones.has(t)" class="unavailable-badge">UNAVAILABLE</span>
            </button>
          </div>
        </button>
      </div>

      <div class="composer-input">
        <textarea
          :value="modelValue"
          :placeholder="disabled ? 'Thread wrapped up — start a new chat to continue' : 'Ask anything about the supplier.'"
          rows="2"
          :disabled="disabled"
          @input="onInput"
          @keydown.enter.exact.prevent="!disabled && !loading && emit('send')"
          ref="textareaEl"
        />
        <div class="composer-tools">
          <a-tooltip v-if="loading" title="Stop">
            <button class="stop-btn" type="button" @click="emit('stop')">
              <StopSvg />
            </button>
          </a-tooltip>
          <a-tooltip v-else title="Send">
            <button
              class="send-btn"
              :disabled="disabled || !modelValue.trim() || !isConnected"
              @click="emit('send')"
            >
              <ArrowRSvg />
            </button>
          </a-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Tone } from '@/types/chat'
import { ChevronDownSvg, ArrowRSvg, StopSvg } from '@/components/chat/icons'
import { TONE_COLORS } from '@/utils/chatFormatters'

const props = defineProps<{
  modelValue: string
  loading: boolean
  sessionLoading: boolean
  isConnected: boolean
  selectedTone: Tone
  tones: readonly Tone[]
  recommendedTone: Tone
  availableTones: Set<Tone>
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:selectedTone': [tone: Tone]
  'send': []
  'stop': []
}>()

const toneDropdownOpen = ref(false)
const toneSelectorEl = ref<HTMLElement | null>(null)
const textareaEl = ref<HTMLTextAreaElement | null>(null)

function toneColor(tone: Tone) {
  return TONE_COLORS[tone] ?? '#d1d5db'
}

function onInput(e: Event) {
  const ta = e.target as HTMLTextAreaElement
  ta.style.height = 'auto'
  ta.style.height = `${ta.scrollHeight}px`
  emit('update:modelValue', ta.value)
}

watch(() => props.modelValue, (val) => {
  if (!val && textareaEl.value) textareaEl.value.style.height = 'auto'
})

function selectTone(t: Tone) {
  emit('update:selectedTone', t)
  toneDropdownOpen.value = false
}

function onDocumentClick(e: MouseEvent) {
  if (toneSelectorEl.value && !toneSelectorEl.value.contains(e.target as Node)) {
    toneDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  if (!props.disabled) nextTick(() => textareaEl.value?.focus())
})
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<style scoped>
.proto-a-composer {
  padding: 8px 10px 10px;
  border-top: 1px solid var(--line-2);
  flex-shrink: 0;
  background: #fff;
}
.composer {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 1px 0 rgba(15,20,40,0.02), 0 4px 12px rgba(15,20,40,0.04);
}
.composer-chips {
  display: flex;
  gap: 6px;
  padding: 4px 4px 6px;
  flex-wrap: wrap;
}
.ctx-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--chip);
  border: none;
  color: var(--ink);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  text-transform: capitalize;
  transition: background 0.12s;
}
.ctx-pill:hover:not(:disabled) { background: #E8EBF0; }
.ctx-pill:disabled { opacity: 0.5; cursor: not-allowed; }
.ctx-pill .ico { width: 11px; height: 11px; color: var(--muted); }
.dot-c {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--teal);
  flex-shrink: 0;
}
.tone-dropdown {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  min-width: 210px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 20, 40, 0.12);
  z-index: 50;
  overflow: hidden;
  padding: 4px;
}
.tone-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 7px;
  font-size: 12.5px;
  color: var(--ink-2);
  cursor: pointer;
  text-align: left;
  text-transform: capitalize;
  transition: background 0.1s;
}
.tone-option:hover:not(:disabled) { background: var(--teal-50); }
.tone-option.active { background: var(--teal-50); font-weight: 600; color: var(--teal-700); }
.tone-option.unavailable { opacity: 0.45; cursor: not-allowed; }
.tone-option-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.tone-option-name { flex: 1; }
.unavailable-badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--muted);
  background: #f3f4f6;
  border-radius: 4px;
  padding: 1px 5px;
  text-transform: uppercase;
}
.composer-input { position: relative; }
.composer-input textarea {
  width: 100%;
  resize: none;
  border: none;
  outline: none;
  font: inherit;
  font-size: 13px;
  color: var(--ink);
  padding: 8px 70px 8px 8px;
  background: transparent;
  line-height: 1.5;
  max-height: 100px;
  overflow-y: auto;
  box-sizing: border-box;
}
.composer-input textarea::placeholder { color: var(--muted-2); }
.composer-input textarea:disabled { cursor: not-allowed; opacity: 0.5; }
.composer-tools {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: flex;
  gap: 4px;
  align-items: center;
}
.tool {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: none;
  border: none;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.tool:hover { background: var(--chip); color: var(--ink); }
.tool .ico { width: 14px; height: 14px; }
.send-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--teal);
  color: #fff;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.12s, transform 0.1s;
}
.send-btn:hover:not(:disabled) { background: var(--teal-700); transform: scale(1.05); }
.send-btn:disabled { background: #d1d5db; cursor: not-allowed; transform: none; }
.send-btn .ico { width: 14px; height: 14px; }
.stop-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--ink);
  color: #fff;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.12s, transform 0.1s;
}
.stop-btn:hover { background: #374151; transform: scale(1.05); }
.stop-btn .ico { width: 12px; height: 12px; }
.composer-disclaimer {
  font-size: 10.5px;
  line-height: 1.4;
  color: var(--muted-2);
  text-align: center;
  padding: 7px 8px 1px;
}
</style>
