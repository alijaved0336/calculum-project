<template>
<CustomBadge
  :text="$t(`arMatch.severity.${severity}`, severity)"
  :variant="severity === 'blocking' ? 'danger' : 'warning'"
/>
</template>

<script setup lang="ts">
/**
 * The blocking/warning distinction (UC-VAL-03 basic flow step 4), factored out once a second
 * place needed the exact same badge `ErrorsTab.vue` already rendered per row: `ErrorGroupsSummary`
 * shows the same severity per group. Any severity outside the two known values still renders (via
 * `$t`'s own fallback to the raw string) as a warning-styled badge rather than throwing - matching
 * `ErrorsTab.vue`'s original behaviour before this was extracted.
 */
import { CustomBadge } from '@ada/design-system'

defineProps<{ severity: string }>()
</script>
