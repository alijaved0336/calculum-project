<template>
  <div class="proto-a-strip">
    <button class="proto-a-strip-row" @click="emit('open-goals')">
      <img class="target-icon" src="@/assets/Target.svg" alt="" />
      <div class="strip-l">
        <div class="strip-eyebrow">ACTIVE GOAL</div>
        <div class="strip-name">{{ goalTitle }}</div>
      </div>
      <ChevronDownSvg />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ChevronDownSvg } from '@/components/chat/icons'

defineProps<{ goalTitle: string }>()
const emit = defineEmits<{ 'open-goals': [] }>()
</script>

<style scoped>
.proto-a-strip {
  padding: 8px 10px 0;
  flex-shrink: 0;
}
.proto-a-strip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #6366f1ff;
  border-radius: 8px;
  background: #eef2ff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.12s, background 0.12s;
}
.proto-a-strip-row:hover { background: #dfe4ff; }
.target-icon { width: 20px; height: 20px; }
.strip-l { flex: 1; }
.strip-eyebrow {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #000;
  line-height: 1;
}
.strip-name {
  font-size: 13px;
  font-weight: 600;
  color: #000;
  margin-top: 2px;
}
.proto-a-strip-row > .ico:last-child { width: 12px; height: 12px; color: #6366f1ff; margin-left: auto; }
</style>
