<template>
  <div class="d-flex align-items-center tabs-row" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      :aria-selected="tab.active"
      class="btn font-md custom-padding-btn text-capitalize"
      :class="{ active: tab.active, 'btn-clean': !tab.active }"
      @click="$emit('select', tab.id)"
    >{{ tab.label }}</button>
  </div>
</template>

<script setup lang="ts">
/**
 * Ported from apps/ap/src/modules/home/entityCard/components/EntityCardTabBar.vue at commit
 * b5538527d1 (UC-UI-06 / AB#19235's shell, AP's own version predates the AR port).
 *
 * Adapted: rewritten from Options API to `<script setup>` (AR's convention, e.g. CompaniesTab.vue);
 * AP's `tab.onClick` callback became a plain `select` emit, since AR's tab-switching side effect
 * (updating the route via `EntityCardRouting.selectEntityCardTab`) belongs to the view that owns
 * the route params, not to the tab list itself; and the potential-theme variant and per-tab
 * rounded-corner/badge props are dropped, since AR has neither AP's potential-lead theme nor a
 * beta-badged tab today - a later story adds them back here if AR ever needs them, rather than
 * carrying unused props from day one. Also, unlike AP's `<a>` (no href), each tab is a real
 * `<button type="button">` with `role="tab"`/`aria-selected` so the bar is keyboard- and
 * screen-reader-operable - an anchor with no href never enters the tab order.
 */
import type { EntityCardTab } from '../composables/useEntityCardTabs'

defineProps<{ tabs: EntityCardTab[] }>()
defineEmits<{ select: [id: EntityCardTab['id']] }>()
</script>
