<!-- src/modules/adminBackend/components/drawer/DrawerTabDangerZone.vue -->
<template>
<div class="danger-zone">
  <div class="warning-box">
    <div class="warning-box-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    </div>
    <h4 class="warning-title">{{ $t('adminBackend.drawer.dangerZone.removeFromPlatform') }}</h4>
    <p class="warning-desc" v-if="identityType === 'pending'">{{ $t('adminBackend.drawer.dangerZone.removeDescPending') }}</p>
    <p class="warning-desc" v-else>{{ $t('adminBackend.drawer.dangerZone.removeDesc') }}</p>
    <button class="btn-warning-action" @click="showRemoveConfirm = true" :disabled="removing">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>{{ $t('adminBackend.drawer.dangerZone.removeFromPlatform') }}
    </button>
  </div>
  <div class="danger-warning-box" v-if="identityType !== 'pending' && userIsSuperAdmin">
    <div class="danger-zone-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </div>
    <h4>{{ $t('adminBackend.drawer.dangerZone.deleteUserAccount') }}</h4>
    <p class="danger-desc" v-if="identityType === 'sso'">{{ $t('adminBackend.drawer.dangerZone.deleteDescSso') }}</p>
    <p class="danger-desc" v-else-if="identityType === 'pending'">{{ $t('adminBackend.drawer.dangerZone.deleteDescPending') }}</p>
    <p class="danger-desc" v-else>{{ $t('adminBackend.drawer.dangerZone.deleteDescLocal') }}</p>
    <button class="btn-danger-delete" @click="showDeleteConfirm = true" :disabled="deleting">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>{{ $t('adminBackend.drawer.dangerZone.deleteUserAccount') }}
    </button>
  </div>
  <teleport to="body">
    <transition name="overlay-fade">
      <div class="confirm-overlay" v-if="showRemoveConfirm" @click.self="showRemoveConfirm = false">
        <div class="confirm-dialog">
          <div class="confirm-dialog-icon confirm-dialog-icon--warning">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3>{{ $t('adminBackend.drawer.dangerZone.confirmRemoveTitle') }}</h3>
          <p>{{ $t('adminBackend.drawer.dangerZone.confirmRemoveMessage', { name: user.userFullName }) }}</p>
          <div class="confirm-dialog-actions">
            <button class="btn-cancel" @click="showRemoveConfirm = false">{{ $t('global.cancel') }}</button>
            <button class="btn-confirm-warning" @click="confirmRemoveFromPlatform" :disabled="removing">
              <div class="spinner spinner--warning" v-if="removing"></div>{{ $t('adminBackend.drawer.dangerZone.confirmRemoveButton') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
  <teleport to="body">
    <transition name="overlay-fade">
      <div class="confirm-overlay" v-if="showDeleteConfirm" @click.self="showDeleteConfirm = false">
        <div class="confirm-dialog">
          <div class="confirm-dialog-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h3>{{ $t('adminBackend.drawer.dangerZone.confirmDeleteTitle') }}</h3>
          <p>{{ $t('adminBackend.drawer.dangerZone.confirmDeleteMessage', { name: user.userFullName }) }}</p>
          <div class="confirm-dialog-actions">
            <button class="btn-cancel" @click="showDeleteConfirm = false">{{ $t('global.cancel') }}</button>
            <button class="btn-confirm-delete" @click="confirmDelete" :disabled="deleting">
              <div class="spinner" v-if="deleting"></div>
              <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>{{ $t('adminBackend.drawer.dangerZone.confirmDeleteButton') }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
  <div class="alert-error" v-if="errorMessage">{{ errorMessage }}</div>
</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useUserDrawer } from '@/composables/useUserDrawer'
import { useUser } from '@/composables'

const props = defineProps<{
  user: { userUuid: string; userFullName: string; userAzureId: string | null; identityProvider: string | null }
}>()
const emit = defineEmits<{ (e: 'deleted', userUuid: string): void }>()

const { userIsSuperAdmin } = useUser()
const { deleteUser, removeFromPlatform } = useUserDrawer()
const showDeleteConfirm = ref(false)
const showRemoveConfirm = ref(false)
const deleting = ref(false)
const removing = ref(false)
const errorMessage = ref<string | null>(null)

const identityType = computed(() => {
  if (!props.user.userAzureId) return 'pending'
  return !props.user.identityProvider || props.user.identityProvider === 'local' ? 'local' : 'sso'
})

async function confirmRemoveFromPlatform() {
  const uuid = props.user.userUuid || (props.user as any).uuid
  if (!uuid) { errorMessage.value = 'User UUID not available.'; return }
  removing.value = true
  errorMessage.value = null
  try {
    await removeFromPlatform(uuid)
    showRemoveConfirm.value = false
    emit('deleted', uuid)
  } catch {
    errorMessage.value = 'Could not remove user from platform. Please try again.'
  } finally {
    removing.value = false
  }
}

async function confirmDelete() {
  const uuid = props.user.userUuid || (props.user as any).uuid
  if (!uuid) { errorMessage.value = 'User UUID not available.'; return }
  deleting.value = true
  errorMessage.value = null
  try {
    await deleteUser(uuid)
    showDeleteConfirm.value = false
    emit('deleted', uuid)
  } catch {
    errorMessage.value = 'Could not delete user. Please try again.'
  } finally {
    deleting.value = false
  }
}

watch(() => props.user, () => {
  showDeleteConfirm.value = false
  showRemoveConfirm.value = false
  deleting.value = false
  removing.value = false
  errorMessage.value = null
})
</script>

<style scoped>
.danger-zone {
  font-size: 1rem;
}

/* Warning (yellow) section */
.warning-box {
  border: 1px solid #fde68a; border-radius: 10px;
  padding: 18px 18px 20px; background: #fffbeb; margin-bottom: 14px;
}
.warning-box-icon {
  width: 38px; height: 38px; border-radius: 50%; background: #fef3c7;
  display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
}
.warning-title {
  font-weight: 700; color: #92400e; margin-bottom: 6px;
}
.warning-desc {
  color: #78350f; line-height: 1.6; margin-bottom: 16px;
}
.btn-warning-action {
  background: #f59e0b; color: #fff; border: none; border-radius: 7px;
  padding: 8px 18px; font-weight: 600; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
}
.btn-warning-action:hover { background: #d97706; }
.btn-warning-action:disabled { opacity: 0.6; cursor: not-allowed; }

/* Danger (red) section */
.danger-warning-box {
  border: 1px solid #fca5a5; border-radius: 10px;
  padding: 18px 18px 20px; background: #fff5f5;
}
.danger-zone-icon {
  width: 38px; height: 38px; border-radius: 50%; background: #fee2e2;
  display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
}
h4 {
  font-weight: 700; color: #991b1b; margin-bottom: 6px;
}
.danger-desc {
  color: #7f1d1d; line-height: 1.6; margin-bottom: 16px;
}
.btn-danger-delete {
  background: #dc2626; color: #fff; border: none; border-radius: 7px;
  padding: 8px 18px; font-weight: 600; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
}
.btn-danger-delete:hover { background: #b91c1c; }
.btn-danger-delete:disabled { opacity: 0.6; cursor: not-allowed; }

/* Confirm dialog */
.confirm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200;
  display: flex; align-items: center; justify-content: center;
}
.confirm-dialog {
  background: #fff; border-radius: 12px; padding: 28px 28px 22px;
  max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}
.confirm-dialog-icon {
  width: 48px; height: 48px; border-radius: 50%; background: #fee2e2;
  display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
}
h3 {
  font-weight: 700; color: #111827; text-align: center; margin-bottom: 8px;
}
.confirm-dialog p {
  color: #6b7280; text-align: center; line-height: 1.6; margin-bottom: 22px;
}
.confirm-dialog-user { font-weight: 600; color: #374151; }
.confirm-dialog-actions { display: flex; gap: 10px; }
.btn-cancel {
  border: 1px solid #e5e7eb; background: #fff; border-radius: 7px;
  padding: 10px 20px; font-weight: 500; cursor: pointer; color: #374151;
  white-space: nowrap;
}
.btn-cancel:hover { background: #f9fafb; }
.btn-confirm-delete {
  flex: 1; background: #dc2626; color: #fff; border: none; border-radius: 7px;
  padding: 10px 20px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  white-space: nowrap;
}
.btn-confirm-delete:hover { background: #b91c1c; }
.btn-confirm-delete:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-confirm-warning {
  flex: 1; background: #f59e0b; color: #fff; border: none; border-radius: 7px;
  padding: 10px 20px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  white-space: nowrap;
}
.btn-confirm-warning:hover { background: #d97706; }
.btn-confirm-warning:disabled { opacity: 0.6; cursor: not-allowed; }
.confirm-dialog-icon--warning { background: #fef3c7; }
.spinner--warning { border-top-color: #fff; }

.spinner {
  display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.overlay-fade-enter-active, .overlay-fade-leave-active { transition: opacity 0.15s; }
.overlay-fade-enter-from, .overlay-fade-leave-to { opacity: 0; }

.alert-error {
  margin-top: 12px; padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; color: #dc2626;
}
</style>
