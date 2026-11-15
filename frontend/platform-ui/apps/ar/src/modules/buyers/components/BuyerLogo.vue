<template>
<span
  class="buyer-logo"
  :title="name ?? undefined"
  aria-hidden="true"
><span class="buyer-logo__initials">{{ initials }}</span></span>
</template>

<script setup lang="ts">
/**
 * UC-UI-05 A1: "A buyer has no logo. A neutral placeholder carrying the buyer's initials. The
 * card layout must not collapse or leave a hole for the common case of an unbranded
 * counterparty."
 *
 * Ported from AP's `CardsByStatus.vue` (the `letterOfDomain` circle it falls back to on
 * `@error`) and `InitialLettersText.vue` (the multi-letter algorithm - see `utils/initials.ts`),
 * simplified to ALWAYS render the initials rather than an `<img>` with a fallback: unlike AP's
 * `entityMediaPath`, `ParsedCompanyDto` carries no logo/media field for a buyer today, so there
 * is no source to attempt and no `@error` case to guard - the "no logo" alt flow is not a
 * fallback here, it is every buyer. Ported this way rather than left unbuilt because building
 * the fallback machinery for an image source that does not exist would be speculative code with
 * nothing to exercise it; see the gap-ledger entry this feature cites for what changes here
 * if/when a logo source is added.
 */
import { computed } from 'vue'
import { initialsOf } from '../utils/initials'

const props = withDefaults(defineProps<{ name?: string | null }>(), { name: null })
const initials = computed(() => initialsOf(props.name))
</script>

<style scoped>
.buyer-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 50%;
  background: var(--color-gray-100, #eceff1);
  color: var(--color-gray-600, #546e7a);
  flex: none;
}

.buyer-logo__initials {
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
}
</style>
