<template>
  <output v-if="task.status !== 'idle'" class="grid-export-status" :class="`grid-export-status--${task.status}`">
    <span class="grid-export-status__message">{{ message }}</span>

    <CustomButton
      v-if="task.status === 'running' || task.status === 'downloading'"
      class="grid-export-status__action"
      variant="plain"
      :text="t('arGridExport.cancelExport')"
      @click="cancelExport"
    />
    <CustomButton
      v-else
      class="grid-export-status__action"
      variant="plain"
      :text="t('arGridExport.dismiss')"
      @click="dismiss"
    />
  </output>

  <CustomDialog
    :visible="showLargeExportConfirm"
    :title="t('home.analyze.list.largeExportTitle')"
    :width="480"
    :close-on-overlay-click="false"
    @update:visible="onConfirmVisibleChange"
  >
    <p class="grid-export-status__confirm-text">
      {{ t('arGridExport.largeExportWarning', { count: formattedExportCount }) }}
    </p>

    <template #actions>
      <CustomButton
        class="grid-export-status__cancel"
        :text="t('arGridExport.cancel')"
        @click="cancelLargeExport"
      />
      <CustomButton
        class="grid-export-status__continue"
        variant="accent"
        :text="t('arGridExport.continue')"
        @click="confirmLargeExport"
      />
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
/**
 * The one UI every AR grid shares for its Excel export: the large-export confirmation (above
 * `LARGE_EXPORT_THRESHOLD` rows), and the progress / result line with its Cancel and Dismiss
 * buttons. AR has no background-process panel and no toast host, so this renders what
 * `useArGridExport` exposes in place, next to the grid. A view mounts it once, keeps a ref to it, and
 * calls `start(kind, request, totalRows)` from its grid's `@export` (or `notice(key)` to explain why
 * it cannot start one, e.g. while the page is still loading); the composable lives here, so
 * leaving the page cancels a running export with the component.
 */
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CustomButton, CustomDialog } from '@ada/design-system'
import type { GridExportKind, GridExportRequest } from '@/api/gridExport'
import { useArGridExport } from '@/composables/useArGridExport'

/**
 * The loading flag of the grid this line belongs to. A "still loading" notice is only true while
 * that load runs, so it is cleared when the flag goes false. Optional: without it nothing clears.
 */
const props = defineProps<{ loading?: boolean }>()

const { t, locale } = useI18n({ useScope: 'global' })

const {
  showLargeExportConfirm,
  pendingExportCount,
  task,
  startExport,
  confirmLargeExport,
  cancelLargeExport,
  cancelExport,
  dismiss,
  notice,
  clearNotice,
} = useArGridExport()

watch(
  () => props.loading,
  (isLoading) => {
    if (!isLoading) {
      clearNotice()
    }
  },
)

// The row count in the confirmation, grouped for the active locale (10,005 / 10.005).
const formattedExportCount = computed(() => pendingExportCount.value.toLocaleString(locale.value))

// A finished export has no text of its own in the composable; the running states carry theirs.
const message = computed(() => (task.value.status === 'completed' ? t('arGridExport.completed') : task.value.message))

/** The dialog's own close (Escape / X) is a decline, same as its Cancel button. */
function onConfirmVisibleChange(visible: boolean): void {
  if (!visible) {
    cancelLargeExport()
  }
}

/** Starts an export of `request`, confirming first when `totalRows` is large. */
function start(kind: GridExportKind, request: GridExportRequest, totalRows: number): Promise<void> {
  return startExport(kind, request, totalRows)
}

defineExpose({ start, notice })
</script>

<style scoped>
.grid-export-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--border-radius-default, 8px);
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 0.875rem;
}

.grid-export-status--failed {
  background: var(--error-50, #fef3f2);
  color: var(--error-700, #b42318);
}

.grid-export-status__confirm-text {
  margin: 0;
}
</style>
