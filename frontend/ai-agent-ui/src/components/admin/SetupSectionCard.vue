<template>
  <section class="setup-card">
    <div class="setup-card-header" @click="collapsed = !collapsed">
      <div class="title-row">
        <h2 class="title">{{ title }}</h2>
        <a-tooltip v-if="hint || description" :title="hint || description">
          <span class="info-ico-wrap">
            <InfoCircleSvg class="info-ico" />
          </span>
        </a-tooltip>
      </div>
      <div class="meta-row">
        <span v-if="meta" class="meta-text">{{ meta }}</span>
        <a-tooltip :title="collapsed ? 'Expand' : 'Collapse'">
          <button
            class="chevron-btn"
            @click.stop="collapsed = !collapsed"
          >
            <ChevronUpSvg v-if="!collapsed" />
            <ChevronDownSvg v-else />
          </button>
        </a-tooltip>
      </div>
    </div>

    <p v-if="description" class="description">{{ description }}</p>

    <div v-show="!collapsed" class="setup-card-body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { InfoCircleSvg, ChevronDownSvg, ChevronUpSvg } from '@/components/admin/icons'

defineProps<{
  title: string
  meta?: string
  description?: string
  hint?: string
}>()

const collapsed = ref(false)
</script>

<style scoped>
.setup-card {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  padding: 24px 0;
  margin-bottom: 0;
}

.setup-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}

.info-ico-wrap {
  display: inline-flex;
  align-items: center;
  cursor: help;
  position: relative;
}
.info-ico {
  width: 14px;
  height: 14px;
  color: var(--muted-2);
  flex-shrink: 0;
}
.info-ico-wrap:hover .info-ico {
  color: var(--muted);
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-text {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}

.chevron-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--muted);
  border-radius: 6px;
  cursor: pointer;
}

.chevron-btn:hover {
  background: var(--line-2);
  color: var(--ink);
}

.chevron-btn :deep(.ico) {
  width: 14px;
  height: 14px;
}

.description {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
  margin: 8px 0 0;
  max-width: 900px;
}

.setup-card-body {
  margin-top: 18px;
}
</style>
