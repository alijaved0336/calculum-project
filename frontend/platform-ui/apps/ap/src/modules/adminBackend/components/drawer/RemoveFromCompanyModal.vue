<!-- src/modules/adminBackend/components/drawer/RemoveFromCompanyModal.vue -->
<template>
<teleport to="body">
  <transition name="modal-fade">
    <div class="remove-overlay" v-if="visible" @click.self="$emit('close')">
      <div class="remove-modal">
        <div class="modal-header"><span class="modal-title">{{ $t('adminBackend.drawer.removeFromCompany.title') }}</span>
          <button class="modal-close" @click="$emit('close')" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="info-section">
            <div class="info-label">{{ $t('adminBackend.drawer.removeFromCompany.user') }}</div>
            <div class="info-value">
              <div class="info-name">{{ userName }}</div>
              <div class="info-email">{{ userEmail }}</div>
            </div>
          </div>
          <div class="info-section">
            <div class="info-label">{{ $t('adminBackend.drawer.removeFromCompany.company') }}</div>
            <div class="info-value"><span class="company-badge">{{ companyName }}</span></div>
          </div>
          <div class="warning-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg><span>{{ $t('adminBackend.drawer.removeFromCompany.warning', { name: userName, company: companyName }) }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <div class="alert-error" v-if="errorMessage">{{ errorMessage }}</div>
          <div class="modal-actions">
            <button class="btn-remove" :disabled="removing" @click="remove"><span class="spinner" v-if="removing"></span>{{ $t('adminBackend.drawer.removeFromCompany.removeButton') }}</button>
            <button class="btn-cancel" :disabled="removing" @click="$emit('close')">{{ $t('global.cancel') }}</button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUserDrawer } from '@/composables/useUserDrawer'

const props = defineProps<{
  visible: boolean
  userUuid: string
  userName: string
  userEmail: string
  companyUuid: string
  companyName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'removed'): void
}>()

const { removeFromCompany } = useUserDrawer()

const removing = ref(false)
const errorMessage = ref<string | null>(null)

watch(() => props.visible, (v) => {
  if (v) {
    errorMessage.value = null
    removing.value = false
  }
})

async function remove() {
  removing.value = true
  errorMessage.value = null
  try {
    await removeFromCompany(props.userUuid, props.companyUuid)
    emit('removed')
    emit('close')
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message
      || err?.response?.data?.detail
      || 'Could not remove user from company. Please try again.'
  } finally {
    removing.value = false
  }
}
</script>

<style scoped>
.remove-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35);
  display: flex; align-items: center; justify-content: center; z-index: 10000;
  font-size: 1rem;
}
.remove-modal {
  background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  width: 380px; max-width: 90vw; overflow: hidden;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid #e5e7eb;
}
.modal-title { font-weight: 700; color: #111827; }
.modal-close {
  background: none; border: none; cursor: pointer; color: #9ca3af; padding: 2px; line-height: 1;
}
.modal-close:hover { color: #374151; }
.modal-body { padding: 18px; }
.info-section { margin-bottom: 16px; }
.info-label {
  font-weight: 700; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;
}
.info-value { color: #111827; }
.info-name { font-weight: 600; }
.info-email { color: #6b7280; margin-top: 1px; }
.company-badge {
  display: inline-block; background: #f0fdf4; color: #166534;
  border-radius: 4px; padding: 2px 8px; font-weight: 500;
}
.warning-banner {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 8px; color: #991b1b; line-height: 1.4;
}
.warning-banner svg { flex-shrink: 0; color: #dc2626; margin-top: 1px; }
.modal-footer { padding: 0 18px 18px; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
.modal-actions button {
  border-radius: 8px; padding: 10px 24px; 
  line-height: 1.4; box-sizing: border-box; font-family: inherit;
  cursor: pointer; text-align: center;
}
.btn-remove {
  background: #dc2626; color: #fff; border: 1px solid #dc2626; font-weight: 600;
}
.btn-remove:hover { background: #b91c1c; border-color: #b91c1c; }
.btn-remove:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel {
  background: #fff; color: #374151; border: 1px solid #d1d5db; font-weight: 500;
}
.btn-cancel:hover { background: #f9fafb; }
.btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }
.alert-error {
  margin-bottom: 10px; padding: 8px 12px; background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; color: #dc2626;
}
.spinner {
  display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 6px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
