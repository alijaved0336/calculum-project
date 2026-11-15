<!-- src/modules/adminBackend/components/drawer/EditRolesModal.vue -->
<template>
<teleport to="body">
  <transition name="modal-fade">
    <div class="edit-roles-overlay" v-if="visible" @click.self="$emit('close')">
      <div class="edit-roles-modal">
        <div class="modal-header"><span class="modal-title">{{ $t('adminBackend.drawer.editRoles.title') }}</span>
          <button class="modal-close" @click="$emit('close')" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="info-section">
            <div class="info-label">{{ $t('adminBackend.drawer.editRoles.user') }}</div>
            <div class="info-value">
              <div class="info-name">{{ userName }}</div>
              <div class="info-email">{{ userEmail }}</div>
            </div>
          </div>
          <div class="info-section" v-if="!isEditingGeneralRoles">
            <div class="info-label">{{ $t('adminBackend.drawer.editRoles.company') }}</div>
            <div class="info-value"><span class="company-badge">{{ companyName }}</span></div>
          </div>
          <div class="info-section">
            <div class="info-label">{{ $t('adminBackend.drawer.editRoles.roles') }}</div>
            <div class="d-flex flex-column gap-2" v-if="!isEditingGeneralRoles">
              <div class="roles-hint" v-if="!isEditingSelf">{{ $t('adminBackend.drawer.editRoles.rolesHint', { role: 'User' }) }}</div>
              <div class="roles-hint roles-hint-disabled" v-else>{{ $t('adminBackend.drawer.editRoles.cannotEditOwnRoles') }}</div>
            </div>
            <div class="roles-checkboxes" v-if="!isEditingGeneralRoles">
              <label class="role-checkbox" :class="{ disabled: isEditingSelf }">
                <input type="checkbox" v-model="adminChecked" :disabled="isEditingSelf"/><span class="role-label">{{ $t('adminBackend.drawer.grantAccess.admin') }}</span>
              </label>
              <label class="role-checkbox" :class="{ disabled: isEditingSelf }">
                <input type="checkbox" v-model="partnerChecked" :disabled="isEditingSelf"/><span class="role-label">{{ $t('adminBackend.drawer.grantAccess.partner') }}</span>
              </label>
            </div>
            <div class="roles-checkboxes" v-if="isEditingGeneralRoles">
              <label class="role-checkbox" v-if="isCalculumEmail" :class="{ disabled: isEditingSelf }">
                <input type="checkbox" v-model="dataChecked" :disabled="isEditingSelf"/><span class="role-label">{{ $t('adminBackend.drawer.grantAccess.dataUser') }}</span>
              </label>
              <label class="role-checkbox" v-if="isCalculumEmail" :class="{ disabled: isEditingSelf }">
                <input type="checkbox" v-model="salesChecked" :disabled="isEditingSelf"/><span class="role-label">{{ $t('adminBackend.drawer.grantAccess.salesUser') }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="alert-error" v-if="errorMessage">{{ errorMessage }}</div>
          <div class="modal-actions">
            <button class="btn-save" :disabled="saving || isEditingSelf" @click="save"><span class="spinner" v-if="saving"></span>{{ $t('global.save') }}</button>
            <button class="btn-cancel" :disabled="saving" @click="$emit('close')">{{ $t('global.cancel') }}</button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useUserDrawer } from '@/composables/useUserDrawer'
import useUser from '@/services/user/composables/useUser'

const props = defineProps<{
  visible: boolean
  userUuid: string
  userName: string
  userEmail: string
  companyUuid: string
  companyName: string
  currentRoles: string[],
  isEditingGeneralRoles?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated'): void,
  (e: 'updated-roles', roles: string[]): void
}>()

const { updateUserRoles, updateUserGeneralRoles } = useUserDrawer()

const isCalculumEmail = computed(() =>
  (props.userEmail || '').trim().toLowerCase().endsWith('@calculum.ai')
)

const { userId: currentUserUuid } = useUser()

const isEditingSelf = computed(() => currentUserUuid.value === props.userUuid)

const adminChecked = ref(false)
const partnerChecked = ref(false)
const dataChecked = ref(false)
const salesChecked = ref(false)
const saving = ref(false)
const errorMessage = ref<string | null>(null)

watch(() => props.visible, (v) => {
  if (v) {
    adminChecked.value = props.currentRoles.includes('ROLE_COMPANY_ADMIN')
    partnerChecked.value = props.currentRoles.includes('ROLE_PARTNER')
    dataChecked.value = props.currentRoles.includes('ROLE_DATA')
    salesChecked.value = props.currentRoles.includes('ROLE_SALES')
    errorMessage.value = null
    saving.value = false
  }
})

async function save() {
  saving.value = true
  errorMessage.value = null
  const roles: string[] = ['ROLE_USER']
  if (adminChecked.value) roles.push('ROLE_COMPANY_ADMIN')
  if (partnerChecked.value) roles.push('ROLE_PARTNER')
  if (dataChecked.value) roles.push('ROLE_DATA')
  if (salesChecked.value) roles.push('ROLE_SALES')
  try {
    
    if (props.isEditingGeneralRoles) {
      await updateUserGeneralRoles(props.userUuid, roles)
    } else {
      await updateUserRoles(props.userUuid, props.companyUuid, roles)
    }

    if (props.isEditingGeneralRoles) {
      emit('updated-roles', roles)
    } else {
      emit('updated')
    }

    emit('close')
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message
      || err?.response?.data?.detail
      || 'Could not update roles. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.edit-roles-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35);
  display: flex; align-items: center; justify-content: center; z-index: 10000;
  font-size: 1rem;
}
.edit-roles-modal {
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
.info-section:last-child { margin-bottom: 0; }
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
.roles-hint {
  color: #6b7280; line-height: 1.4; margin-bottom: 8px;
}
.roles-hint-disabled {
  color: #dc2626; background: #fef2f2; padding: 8px; border-radius: 4px;
}
.roles-checkboxes { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.role-checkbox {
  display: flex; align-items: center; gap: 8px; cursor: pointer; color: #374151;
}
.role-checkbox.disabled {
  cursor: not-allowed; color: #9ca3af;
}
.role-checkbox.disabled input[type="checkbox"] {
  cursor: not-allowed;
}
.role-checkbox input[type="checkbox"] {
  width: 16px; height: 16px; accent-color: #ff2c4f; cursor: pointer;
}
.role-label { font-weight: 500; }
.modal-footer { padding: 0 18px 18px; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
.modal-actions button {
  border-radius: 8px; padding: 10px 24px; 
  line-height: 1.4; box-sizing: border-box; font-family: inherit;
  cursor: pointer; text-align: center;
}
.btn-save {
  background: #ff2c4f; color: #fff; border: 1px solid #ff2c4f; font-weight: 600;
}
.btn-save:hover { background: #e02343; border-color: #e02343; }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
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
