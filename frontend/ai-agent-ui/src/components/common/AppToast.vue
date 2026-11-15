<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="toast.type"
        >
          <span class="toast-icon">
            <svg v-if="toast.type === 'success'" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7.25" stroke="currentColor" stroke-width="1.5" />
              <path d="M4.5 8l2.5 2.5 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg v-else viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7.25" stroke="currentColor" stroke-width="1.5" />
              <path d="M8 5v4M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </span>
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts } = useToast()
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 28px;
  right: 28px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 12px 18px;
  border-radius: 10px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  pointer-events: auto;
}

.toast.success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.toast.error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.toast.warning {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}

.toast-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  display: flex;
}

.toast-icon svg {
  width: 16px;
  height: 16px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
