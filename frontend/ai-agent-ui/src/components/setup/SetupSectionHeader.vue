<template>
  <header class="section-head">
    <h2 class="section-title">
      {{ title }}
      <a-tooltip v-if="hint" :title="hint"><button type="button" class="q" aria-label="More information">?</button></a-tooltip>
    </h2>
    <span v-if="meta" class="section-meta" :id="metaId">{{ meta }}</span>
    <button
      type="button"
      class="section-toggle collapse-btn"
      :class="{ open }"
      aria-label="Collapse"
      @click="emit('toggle')"
    >
      <span v-html="chevronIcon" />
    </button>
    <p v-if="description" class="section-desc">
      {{ description }}
    </p>
    <p v-if="note" class="section-note">
      {{ note }}
    </p>
  </header>
</template>

<script setup lang="ts">
import { chevronIcon } from "@/components/setup/icons";

defineProps<{
  title: string;
  open: boolean;
  meta?: string;
  metaId?: string;
  hint?: string;
  description?: string;
  note?: string;
}>();

const emit = defineEmits<{
  toggle: [];
}>();
</script>

<style scoped>
.section-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas:
    "title meta toggle"
    "desc desc desc"
    "note note note";
  column-gap: 12px;
  row-gap: 10px;
  align-items: center;
}

.section-title {
  grid-area: title;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #122033;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
}

.section-meta {
  grid-area: meta;
  justify-self: end;
  align-self: center;
  color: #8c97a8;
  font-size: 13px;
  line-height: 1.2;
}

.section-toggle {
  grid-area: toggle;
  justify-self: end;
  align-self: center;
}

.section-desc {
  grid-area: desc;
  max-width: none;
  margin: 0;
  color: #6f7b8c;
  font-size: 13px;
  line-height: 1.55;
}

.section-note {
  grid-area: note;
  margin: 0;
  color: #6f7b8c;
  font-size: 13px;
  line-height: 1.55;
}

.q {
  display: inline-grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border: 1px solid #d5dbe4;
  border-radius: 999px;
  color: #9aa5b5;
  font-size: 10px;
  line-height: 1;
  background: none;
  padding: 0;
  cursor: help;
  position: relative;
  font-family: inherit;
  flex-shrink: 0;
}
.q:hover {
  border-color: #a0aab6;
  color: #6f7b8c;
}

.collapse-btn {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: #f1f5f9;
  color: #526072;
}

.collapse-btn span {
  display: inline-flex;
  width: 16px;
  height: 16px;
}

.collapse-btn span :deep(svg) {
  width: 16px;
  height: 16px;
}

.collapse-btn.open {
  transform: rotate(180deg);
}

@media (max-width: 760px) {
  .section-head {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "title toggle"
      "meta meta"
      "desc desc"
      "note note";
  }

  .section-meta {
    justify-self: start;
  }
}
</style>
