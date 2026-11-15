<template>
<div class="corporate-tree-node-logo">
  <img
    v-if="showLogoImage"
    class="corporate-tree-node-logo__image"
    :src="logoUrl ?? undefined"
    :alt="name ?? undefined"
    loading="lazy"
    @error="onLogoError"
  />
  <span v-else class="corporate-tree-node-logo__fallback" aria-hidden="true">{{ firstLetter }}</span>
</div>
</template>

<script setup lang="ts">
/**
 * Same logo/first-letter-fallback pattern as `CustomerCardHeader.vue` (itself mirroring
 * design-system's `EntityLogoColumn.vue`), split into its own component rather than inlined in
 * `CustomerCardCorporateTreeTab.vue`'s `#node` slot: that slot renders once per tree node, so each
 * card needs its own independent "did THIS node's logo fail to load" state - a single ref in the
 * tab's own `setup()` would be shared (and so wrongly reset/tripped) across every node in the tree.
 * A separate component gives each rendered node its own instance, and so its own state, for free.
 */
import { computed, ref, watch } from 'vue'

const props = defineProps<{ logoUrl: string | null; name: string | null }>()

const brokenLogo = ref(false)
watch(
  () => props.logoUrl,
  () => {
    brokenLogo.value = false
  },
)
const showLogoImage = computed(() => Boolean(props.logoUrl) && !brokenLogo.value)
function onLogoError(): void {
  brokenLogo.value = true
}
const firstLetter = computed(() => props.name?.charAt(0).toUpperCase() ?? '-')
</script>

<style scoped>
/* Same shape/fallback look as design-system's EntityLogoColumn.vue (.entity-logo-cell__logo /
   __logo-fallback) and CustomerCardHeader.vue's own header avatar. */
.corporate-tree-node-logo {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  overflow: hidden;
  border-radius: 50%;
  background: var(--neutral-300);
}

.corporate-tree-node-logo__image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.corporate-tree-node-logo__fallback {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-1);
  text-transform: uppercase;
}
</style>
