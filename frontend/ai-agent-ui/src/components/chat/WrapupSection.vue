<template>
  <div class="wrapup">
    <div v-if="done" class="wrapup-done">
      <CheckSvg /> Thanks — logged
    </div>
    <div v-else class="wrapup-open">
      <div class="wrapup-row">
        <span class="wrapup-q">What is your feedback?</span>
        <div class="wrapup-thumbs">
          <button :class="['wrapup-thumb', { on: wrapupChoice === 'up' }]" title="Worked well" @click="choose('up')">
            <ThumbUpSvg />
          </button>
          <button :class="['wrapup-thumb down', { on: wrapupChoice === 'down' }]" title="Missed the mark" @click="choose('down')">
            <ThumbDownSvg />
          </button>
        </div>
      </div>
      <!-- <div class="wrapup-comment">
        <input
          v-model="wrapupComment"
          placeholder="Add a one-line note (optional)"
          @keydown.enter="submit"
        />
        <button class="wrapup-log" :disabled="!wrapupChoice" @click="submit">Log</button>
      </div> -->
      <!-- <div class="wrapup-note">Rolls into an aggregated team report.</div> -->
    </div>
  </div>
  <Teleport to="body">
    <div v-if="showThanks" class="thanks-backdrop" @click.self="dismissThanks">
      <div class="thanks-modal" role="dialog" aria-label="Thanks for the Feedback!">
        <CheckSvg />
        <p>Thanks for the Feedback!</p>
        <button type="button" @click="dismissThanks">OK</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { CheckSvg, ThumbUpSvg, ThumbDownSvg } from '@/components/chat/icons'

const props = defineProps<{ done: boolean }>()
const emit = defineEmits<{
  'update:done': [value: boolean]
  'submit': [choice: 'up' | 'down', comment: string]
  'dismissed': []
}>()

const wrapupChoice = ref<'up' | 'down' | null>(null)
const wrapupComment = ref('')
const showThanks = ref(false)

watch(() => props.done, (val) => {
  if (!val) {
    wrapupChoice.value = null
    wrapupComment.value = ''
  }
})

function submit() {
  if (!wrapupChoice.value) return
  emit('submit', wrapupChoice.value, wrapupComment.value)
  emit('update:done', true)
  showThanks.value = true
}

function dismissThanks() {
  showThanks.value = false
  emit('dismissed')
}

function choose(choice: 'up' | 'down') {
  wrapupChoice.value = choice
  submit()
}
</script>

<style scoped>
.wrapup {
  margin: 2px 0px 2px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
}
.wrapup-open {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: #fff;
  border: 1px solid var(--line);
  border-left: 3px solid var(--teal);
  border-radius: 8px;
  padding: 5px 10px;
  margin-top: 4px;
  margin-left: 2.9rem;
  animation: wrapup-in 0.18s ease-out;
}
@keyframes wrapup-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: none; }
}
.wrapup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.wrapup-q { font-size: 12.5px; font-weight: 600; color: var(--ink); }
.wrapup-thumbs { display: flex; gap: 6px; }
.wrapup-thumb {
  width: 26px;
  height: 22px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid var(--line);
  color: var(--muted);
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s, background 0.12s;
}
.wrapup-thumb:hover { border-color: var(--muted-2); color: var(--ink-2); }
.wrapup-thumb .ico { width: 13px; height: 13px; }
.wrapup-thumb.on { background: var(--teal-50); border-color: var(--teal); color: var(--teal-700); }
.wrapup-thumb.down.on { background: #FCEBEC; border-color: var(--red); color: var(--red); }
.wrapup-comment { display: flex; gap: 6px; }
.wrapup-comment input {
  flex: 1;
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 7px 10px;
  font: inherit;
  font-size: 12px;
  background: #FAFBFC;
  outline: none;
  color: var(--ink);
  transition: border-color 0.12s;
}
.wrapup-comment input:focus { border-color: var(--teal); background: #fff; }
.wrapup-log {
  border: none;
  border-radius: 7px;
  padding: 0 14px;
  background: var(--teal-700);
  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.12s;
}
.wrapup-log:hover:not(:disabled) { background: #0a5c55; }
.wrapup-log:disabled { background: var(--line); color: var(--muted-2); cursor: not-allowed; }
.wrapup-note { font-size: 11px; color: var(--muted-2); }
.wrapup-done {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--teal-700);
}
.wrapup-done .ico { width: 13px; height: 13px; }
</style>

<!-- Teleport leaves scoped attrs behind; unique class names keep this from leaking -->
<style>
.thanks-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(15, 20, 40, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.thanks-modal {
  background: #fff;
  border-radius: 14px;
  padding: 28px 32px;
  width: 320px;
  max-width: 100%;
  text-align: center;
  box-shadow: 0 30px 80px rgba(15, 20, 40, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.thanks-modal .ico { width: 28px; height: 28px; color: var(--teal-700); }
.thanks-modal p {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
}
.thanks-modal button {
  margin-top: 4px;
  border: none;
  border-radius: 8px;
  padding: 8px 28px;
  background: var(--teal-700);
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.thanks-modal button:hover { background: #0a5c55; }
</style>
