<template>
<Teleport to="body">
  <div
    class="calculum-modal-overlay"
    :style="{ zIndex }"
    @click.self="onOverlayClick"
  >
    <div
      class="calculum-modal-content"
      :class="`calculum-modal-content--${size}`"
      :style="width ? { width, maxWidth: width } : undefined"
      role="dialog"
      aria-modal="true"
    >
      <button
        v-if="showClose"
        type="button"
        class="calculum-modal-close"
        :aria-label="t('button.close')"
        @click="emit('close')"
      >
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>

      <div v-if="title || $slots.title" class="calculum-modal-header">
        <slot name="title">
          <h5 class="calculum-modal-title mb-0">{{ title }}</h5>
        </slot>
      </div>

      <div class="calculum-modal-body">
        <slot />
      </div>

      <div v-if="$slots.footer" class="calculum-modal-footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
</Teleport>
</template>

<script setup lang="ts">
/**
 * Generic modal shell for AR - reviewed against AP's own `modules/components/CalculumModal.vue`
 * for this port, but simplified to just what's actually reusable here: a Teleported-to-body
 * overlay + content box, an optional title/close button, and `default`/`title`/`footer` slots for
 * body, a custom header and action buttons. AP's own `isPdfModal`/`withoutNavbar`/
 * `capitalizeTitle`/`classesTitle`/`customHeight` props were dropped as AP-specific cruft with
 * nothing to reuse here - add them back only if a real AR caller needs the equivalent.
 *
 * Teleported to `<body>` so this never inherits a clipped/`overflow: hidden` or transformed
 * ancestor (see `ColumnSelector.vue` in design-system for the same reasoning), and each instance's
 * z-index comes from `acquireModal()` (`calculumModalStack.ts`) rather than a fixed constant - the
 * point of this component is that a modal opened from inside another `CalculumModal` has to render
 * on top of it, which a fixed z-index can't guarantee (two instances at the same z-index stack by
 * Teleport's own insertion order, an implementation detail, not something this component promises).
 * That same stack is also how Escape is scoped to close only the topmost modal instead of every
 * open one at once.
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { acquireModal, isTopmostModal, releaseModal } from './calculumModalStack'

const props = withDefaults(
  defineProps<{
    title?: string
    /** Preset width - `width` overrides this when given. */
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    /** Explicit CSS width (e.g. a caller-configurable `"70%"`), for callers whose width isn't one
     * of `size`'s fixed presets. Overrides `size`'s own preset width when given. */
    width?: string
    showClose?: boolean
    closeOnOverlayClick?: boolean
    closeOnEscape?: boolean
  }>(),
  {
    title: '',
    size: 'md',
    width: undefined,
    showClose: true,
    closeOnOverlayClick: true,
    closeOnEscape: true,
  },
)

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n({ useScope: 'global' })

const { token, zIndex } = acquireModal()

function onOverlayClick(): void {
  if (props.closeOnOverlayClick) {
    emit('close')
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.closeOnEscape && isTopmostModal(token)) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  releaseModal(token)
})
</script>

<style scoped>
.calculum-modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.5);
}

.calculum-modal-content {
  position: relative;
  width: 100%;
  max-height: 100%;
  overflow-y: auto;
  border-radius: var(--border-radius-default, 8px);
  background: var(--bg-surface, #ffffff);
  padding: 1.5rem;
}

.calculum-modal-content--sm {
  max-width: 400px;
}

.calculum-modal-content--md {
  max-width: 800px;
}

.calculum-modal-content--lg {
  max-width: 1000px;
}

.calculum-modal-content--xl {
  max-width: 90vw;
}

.calculum-modal-content--full {
  max-width: 95vw;
}

.calculum-modal-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: none;
  color: var(--color-text-3, #78909c);
  cursor: pointer;
}

.calculum-modal-close:hover {
  background: var(--bg-surface-subtle-1, #eceff1);
  color: var(--color-text-1, #455a64);
}

.calculum-modal-header {
  margin-bottom: 1rem;
  padding-right: 2rem;
}

.calculum-modal-title {
  font-weight: 600;
}

.calculum-modal-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>
