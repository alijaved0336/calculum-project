<template>
  <aside class="sidebar">
    <div class="logo-mark">C</div>

    <nav class="nav">
      <button
        v-for="item in SIDEBAR_ITEMS"
        :key="item.id"
        :class="['nav-item', { on: item.id === active }]"
        @click="emit('update:active', item.id)"
      >
        <component :is="iconFor(item.id)" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <div class="avatar-mark">c</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { SIDEBAR_ITEMS, type SidebarItemId } from '@/data/superAdmin'
import {
  HomeSvg, TrendingUpSvg, ClipboardSvg, SlidersSvg,
  TruckSvg, CompareSvg, MatchSvg, GearSvg,
} from '@/components/admin/icons'

defineProps<{ active: SidebarItemId }>()
const emit = defineEmits<{ 'update:active': [value: SidebarItemId] }>()

const ICONS: Record<SidebarItemId, unknown> = {
  home: HomeSvg,
  opportunity: TrendingUpSvg,
  plan: ClipboardSvg,
  manage: SlidersSvg,
  suppliers: TruckSvg,
  compare: CompareSvg,
  match: MatchSvg,
  setup: GearSvg,
}

function iconFor(id: SidebarItemId) {
  return ICONS[id]
}
</script>

<style scoped>
.sidebar {
  width: 76px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
}

.logo-mark {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--teal);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  flex-shrink: 0;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  flex: 1;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 8px 2px;
  background: none;
  border: none;
  color: var(--muted-2);
  cursor: pointer;
  font-size: 10.5px;
  font-weight: 500;
  transition: background 0.12s, color 0.12s;
}

.nav-item :deep(.ico) {
  width: 18px;
  height: 18px;
}

.nav-item:hover {
  color: var(--ink-2);
  background: var(--line-2);
}

.nav-item.on {
  color: var(--orange-600);
  background: var(--orange-50);
  border-right: 2px solid var(--orange);
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 12px;
}

.avatar-mark {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--line-2);
  color: var(--ink-2);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
