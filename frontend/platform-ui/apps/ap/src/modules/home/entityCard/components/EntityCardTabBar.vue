<template>
  <div class="d-flex align-items-center tabs-row"><a v-for="tab in tabs" :key="tab.id" :id="tab.id" class="btn font-md custom-padding-btn" :class="{'text-capitalize': tab.capitalize !== false, 'rounded-tbl-none': tab.roundedTopLeft, 'rounded-tbr-none': tab.roundedTopRight, 'active': tab.active, 'btn-clean' : !potentialTheme, 'btn-potential' : potentialTheme}" @click="tab.onClick">{{ tab.label }}<span v-if="tab.badge" class="badge badge-beta ml-1">{{ tab.badge }}</span></a></div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { VisibleTopMenuTab } from '@/modules/home/entityCard/composables/useTopMenuTabs'

export default defineComponent({
  name: 'EntityCardTabBar',
  props: {
    tabs: { type: Array as PropType<VisibleTopMenuTab[]>, required: true },
    potentialTheme: { type: Boolean, required: false, default: false },
  },
})
</script>
