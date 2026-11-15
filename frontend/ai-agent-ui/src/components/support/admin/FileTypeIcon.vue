<script setup lang="ts">
/**
 * FileTypeIcon — file-shaped badge (document outline + folded corner +
 * colored extension banner), colored per type.
 */
import { computed } from "vue";
import { DOC_ICON_COLORS } from "@/data/supportDocuments";

const props = defineProps<{ ext: string }>();
const color = computed(() => DOC_ICON_COLORS[props.ext.toUpperCase()] || "#5b6470");
</script>

<template>
  <span class="icon" :style="{ color }">
    <svg width="27" height="31" viewBox="0 0 27 31">
      <path d="M5 2.5h11l7 7V28.5H5z" fill="#fff" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
      <path d="M16 2.5v7h7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
      <rect x="1" y="16" width="21" height="9.5" rx="2.2" fill="currentColor" />
      <text x="11.5" y="23.2" text-anchor="middle" fill="#fff" font-size="6.4" font-weight="800" letter-spacing="0.3" font-family="Inter, sans-serif">{{ ext.toUpperCase() }}</text>
    </svg>
  </span>
</template>

<style scoped>
.icon { display: inline-flex; flex-shrink: 0; line-height: 0; }
</style>
