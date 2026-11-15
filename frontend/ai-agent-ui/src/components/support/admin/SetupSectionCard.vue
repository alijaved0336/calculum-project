<script setup lang="ts">
/**
 * SetupSectionCard — shared collapsible card used across the Setup page.
 * Header (icon + title + optional info) and a collapsible body slot.
 */
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    collapsible?: boolean;
  }>(),
  { collapsible: true }
);

import { ref } from "vue";
const open = ref(true);
</script>

<template>
  <section class="card">
    <header class="card__head">
      <div class="card__title">
        <span class="card__icon"><slot name="icon" /></span>
        <h2>{{ title }}</h2>
        <span class="card__info" title="More info">i</span>
      </div>
      <button
        v-if="collapsible"
        class="card__chevron"
        :class="{ 'is-collapsed': !open }"
        @click="open = !open"
        aria-label="Toggle section"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b6bcc3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6" /></svg>
      </button>
    </header>

    <p v-if="description" class="card__desc">{{ description }}</p>

    <div v-show="open" class="card__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  box-shadow: 0 1px 2px rgba(20, 24, 28, 0.03);
  overflow: hidden;
}
.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px 6px;
}
.card__title { display: flex; align-items: center; gap: 11px; }
.card__title h2 { margin: 0; font-size: 18px; font-weight: 600; }
.card__icon {
  width: 32px; height: 32px; border-radius: 10px;
  background: var(--accent-soft);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
}
.card__info {
  display: inline-flex; align-items: center; justify-content: center;
  width: 15px; height: 15px; border: 1.4px solid #c3c8cf; border-radius: 50%;
  color: var(--muted-2); font-size: 10px; font-style: italic; font-weight: 700;
}
.card__chevron { border: none; background: transparent; cursor: pointer; padding: 4px; line-height: 0; }
.card__chevron.is-collapsed { transform: rotate(180deg); }
.card__desc {
  margin: 8px 26px 18px;
  color: var(--muted); font-size: 13.5px; line-height: 1.55;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.card__body { padding-bottom: 4px; }
</style>
