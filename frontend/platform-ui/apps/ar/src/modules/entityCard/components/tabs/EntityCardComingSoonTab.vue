<template>
  <NoDataAvailable :title="message" />
</template>

<script setup lang="ts">
/**
 * The Corporate Tree and Company Details tabs are their own stories (UC-UI-08, UC-UI-09), both
 * depending on this shell rather than the other way around - this is the hand-off point they
 * replace with real content. One component for both rather than two near-identical stubs, since
 * "not built yet" has no per-tab behaviour to differ on.
 */
import { NoDataAvailable } from '@ada/design-system'

defineProps<{ message: string }>()
</script>
