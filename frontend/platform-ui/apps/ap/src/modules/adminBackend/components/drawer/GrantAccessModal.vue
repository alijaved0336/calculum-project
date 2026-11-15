<!-- src/modules/adminBackend/components/drawer/GrantAccessModal.vue -->
<template>
<teleport to="body">
  <transition name="modal-fade">
    <div class="grant-overlay" v-if="visible" @click.self="$emit('close')">
      <div class="grant-modal">
        <div class="modal-header"><span class="modal-title">{{ $t('adminBackend.drawer.grantAccess.title') }}</span>
          <button class="modal-close" @click="$emit('close')" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="info-section">
            <div class="info-label">{{ $t('adminBackend.drawer.grantAccess.user') }}</div>
            <div class="info-value">
              <div class="info-name">{{ userName }}</div>
              <div class="info-email">{{ userEmail }}</div>
            </div>
          </div>
          <div class="info-section">
            <div class="info-label">{{ $t('adminBackend.drawer.grantAccess.companies') }}</div>
            <div class="company-search-wrap">
              <svg class="search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input class="company-search" type="text" v-model="search" :placeholder="$t('adminBackend.drawer.grantAccess.searchPlaceholder')"/>
            </div>
            <div class="company-list">
              <div class="company-list-empty" v-if="selectableCompanies.length === 0 && limitedCompanies.length === 0 && assignedCompanies.length === 0">{{ search ? $t('adminBackend.drawer.grantAccess.noCompaniesSearch') : $t('adminBackend.drawer.grantAccess.noCompanies') }}</div>
              <template v-else>
                <template v-if="selectableCompanies.length > 0">
                  <label class="company-item select-all">
                    <input type="checkbox" :checked="allSelected" @change="toggleAll"/><span class="company-name">{{ $t('adminBackend.drawer.grantAccess.selectAll', { count: selectableCompanies.length }) }}</span>
                  </label>
                  <div class="company-divider"></div>
                </template>
                <label class="company-item" v-for="c in selectableCompanies" :key="c.id">
                  <input type="checkbox" :value="c.id" v-model="selectedIds"/><span class="company-name">{{ c.name }}</span>
                </label>
                <template v-if="limitedCompanies.length > 0">
                  <div class="company-divider"></div>
                  <div class="company-item-limited" v-for="c in limitedCompanies" :key="c.id">
                    <svg class="lock-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg><span class="company-name">{{ c.name }}</span><span class="limit-reason">{{ c.reason }}</span>
                  </div>
                </template>
                <template v-if="assignedCompanies.length > 0">
                  <div class="company-divider"></div>
                  <div class="section-label">{{ $t('adminBackend.drawer.grantAccess.alreadyAssigned') }}</div>
                  <div class="company-item assigned" v-for="c in assignedCompanies" :key="c.id">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg><span class="company-name">{{ c.name }}</span>
                  </div>
                </template>
              </template>
            </div>
          </div>
          <div class="info-section">
            <div class="info-label">{{ $t('adminBackend.drawer.grantAccess.roles') }}</div>
            <div class="roles-hint">{{ $t('adminBackend.drawer.grantAccess.rolesHint', { role: 'User' }) }}</div>
            <div class="roles-checkboxes">
              <label class="role-checkbox">
                <input type="checkbox" v-model="adminChecked"/><span class="role-label">{{ $t('adminBackend.drawer.grantAccess.admin') }}</span>
              </label>
              <label class="role-checkbox">
                <input type="checkbox" v-model="partnerChecked"/><span class="role-label">{{ $t('adminBackend.drawer.grantAccess.partner') }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="alert-error" v-if="errorMessage">{{ errorMessage }}</div>
          <div class="alert-success" v-if="successMessage">{{ successMessage }}</div>
          <div class="modal-actions">
            <button class="btn-grant" :disabled="granting || selectedIds.length === 0" @click="grant"><span class="spinner" v-if="granting"></span>{{ $t('adminBackend.drawer.grantAccess.grantButton', { count: selectedIds.length }) }}</button>
            <button class="btn-cancel" :disabled="granting" @click="$emit('close')">{{ $t('global.cancel') }}</button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useUserDrawer } from '@/composables/useUserDrawer'

export interface CompanyOption {
  id: string
  name: string
}

export interface CompanyCapacity {
  id: string
  userLeftToCreate: number
  groupLimitReached?: boolean
}

const props = defineProps<{
  visible: boolean
  userEmail: string
  userName: string
  availableCompanies: CompanyOption[]
  existingCompanyUuids: string[]
  companiesCapacity: CompanyCapacity[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'granted'): void
}>()

const { grantCompanyAccess } = useUserDrawer()

const search = ref('')
const selectedIds = ref<string[]>([])
const adminChecked = ref(false)
const partnerChecked = ref(false)
const granting = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const isCalculumEmail = computed(() =>
  (props.userEmail || '').trim().toLowerCase().endsWith('@calculum.ai')
)

function getCapacity(companyId: string): number {
  const entry = props.companiesCapacity.find(c => c.id === companyId)
  return entry ? entry.userLeftToCreate : 0
}

/** Companies NOT assigned and with capacity (or calculum email bypass) */
const selectableCompanies = computed(() => {
  const q = search.value.trim().toLowerCase()
  return props.availableCompanies.filter(c => {
    if (props.existingCompanyUuids.includes(c.id)) return false
    if (!isCalculumEmail.value && getCapacity(c.id) <= 0) return false
    if (q && !c.name.toLowerCase().includes(q)) return false
    return true
  })
})

/** Companies NOT assigned but with no capacity (hidden for calculum emails) */
const limitedCompanies = computed(() => {
  if (isCalculumEmail.value) return []
  const q = search.value.trim().toLowerCase()
  return props.availableCompanies
    .filter(c => {
      if (props.existingCompanyUuids.includes(c.id)) return false
      if (getCapacity(c.id) > 0) return false
      if (q && !c.name.toLowerCase().includes(q)) return false
      return true
    })
    .map(c => {
      const cap = props.companiesCapacity.find(x => x.id === c.id)
      const reason = cap?.groupLimitReached ? 'Group user limit reached' : 'Company user limit reached'
      return { ...c, reason }
    })
})

/** Companies already assigned to the user */
const assignedCompanies = computed(() => {
  const q = search.value.trim().toLowerCase()
  return props.availableCompanies.filter(c => {
    if (!props.existingCompanyUuids.includes(c.id)) return false
    if (q && !c.name.toLowerCase().includes(q)) return false
    return true
  })
})

const allSelected = computed(() =>
  selectableCompanies.value.length > 0
  && selectableCompanies.value.every(c => selectedIds.value.includes(c.id))
)

function toggleAll() {
  if (allSelected.value) {
    const visibleIds = new Set(selectableCompanies.value.map(c => c.id))
    selectedIds.value = selectedIds.value.filter(id => !visibleIds.has(id))
  } else {
    const current = new Set(selectedIds.value)
    selectableCompanies.value.forEach(c => current.add(c.id))
    selectedIds.value = [...current]
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    search.value = ''
    selectedIds.value = []
    adminChecked.value = false
    partnerChecked.value = false    
    granting.value = false
    errorMessage.value = null
    successMessage.value = null
  }
})

async function grant() {
  granting.value = true
  errorMessage.value = null
  successMessage.value = null

  const roles: string[] = ['ROLE_USER']
  if (adminChecked.value) roles.push('ROLE_COMPANY_ADMIN')
  if (partnerChecked.value) roles.push('ROLE_PARTNER')    

  const failed: string[] = []
  for (const companyId of selectedIds.value) {
    try {
      await grantCompanyAccess(props.userEmail, companyId, roles)
    } catch {
      const c = props.availableCompanies.find(x => x.id === companyId)
      failed.push(c?.name ?? companyId)
    }
  }

  granting.value = false

  if (failed.length === 0) {
    emit('granted')
    emit('close')
  } else if (failed.length === selectedIds.value.length) {
    errorMessage.value = 'Could not grant access. Please try again.'
  } else {
    successMessage.value = `Access granted to ${selectedIds.value.length - failed.length} company(ies).`
    errorMessage.value = `Failed for: ${failed.join(', ')}`
    emit('granted')
  }
}
</script>

<style scoped>
.grant-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.35);
  display: flex; align-items: center; justify-content: center; z-index: 10000;
  font-size: 1rem;
}
.grant-modal {
  background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  width: 420px; max-width: 90vw; overflow: hidden; display: flex; flex-direction: column;
  max-height: 90vh;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
}
.modal-title { font-weight: 700; color: #111827; }
.modal-close {
  background: none; border: none; cursor: pointer; color: #9ca3af; padding: 2px; line-height: 1;
}
.modal-close:hover { color: #374151; }
.modal-body { padding: 18px; overflow-y: auto; flex: 1; }
.info-section { margin-bottom: 16px; }
.info-section:last-child { margin-bottom: 0; }
.info-label {
  font-weight: 700; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;
}
.info-value { color: #111827; }
.info-name { font-weight: 600; }
.info-email { color: #6b7280; margin-top: 1px; }

/* Company search */
.company-search-wrap {
  position: relative; margin-bottom: 6px;
}
.search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af;
}
.company-search {
  width: 100%; padding: 7px 10px 7px 28px; border: 1px solid #d1d5db;
  border-radius: 6px; outline: none; box-sizing: border-box;
  font-family: inherit; color: #111827;
}
.company-search:focus { border-color: #ff2c4f; box-shadow: 0 0 0 2px #ffdfe4; }

/* Company list */
.company-list {
  border: 1px solid #e5e7eb; border-radius: 6px; max-height: 200px;
  overflow-y: auto; background: #fff;
}
.company-list-empty {
  padding: 12px; color: #9ca3af; text-align: center;
}
.company-item {
  display: flex; align-items: center; gap: 8px; padding: 4px 12px;
  cursor: pointer; color: #374151; transition: background 0.1s;
}
.company-item:hover { background: #f9fafb; }
.company-item.select-all { font-weight: 600; color: #111827; }
.company-item input[type="checkbox"] {
  width: 14px; height: 14px; accent-color: #ff2c4f; cursor: pointer; flex-shrink: 0;
}
.company-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.company-divider { border-top: 1px solid #e5e7eb; }

/* Limited (limit reached) */
.company-item-limited {
  display: flex; align-items: center; gap: 8px; padding: 5px 12px;
  color: #9ca3af; background: #f9fafb;
}
.company-item-limited .company-name {
  color: #9ca3af;
}
.lock-icon { flex-shrink: 0; color: #d1d5db; }
.limit-reason {
  margin-left: auto; flex-shrink: 0;
  font-weight: 500; color: #b45309; background: #fef3c7;
  padding: 1px 6px; border-radius: 4px;
}

/* Already assigned section */
.section-label {
  padding: 5px 12px 2px; font-weight: 700; color: #9ca3af;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.company-item.assigned {
  cursor: default; color: #9ca3af;
}
.company-item.assigned:hover { background: transparent; }
.company-item.assigned svg { flex-shrink: 0; color: #10b981; }

/* Roles */
.roles-hint { color: #6b7280; line-height: 1.4; margin-bottom: 8px; }
.roles-checkboxes { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.role-checkbox {
  display: flex; align-items: center; gap: 8px; cursor: pointer; color: #374151;
}
.role-checkbox input[type="checkbox"] {
  width: 16px; height: 16px; accent-color: #ff2c4f; cursor: pointer;
}
.role-label { font-weight: 500; }

/* Footer */
.modal-footer { padding: 0 18px 18px; flex-shrink: 0; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
.modal-actions button {
  border-radius: 8px; padding: 10px 24px; 
  line-height: 1.4; box-sizing: border-box; font-family: inherit;
  cursor: pointer; text-align: center;
}
.btn-grant {
  background: #ff2c4f; color: #fff; border: 1px solid #ff2c4f; font-weight: 600;
  white-space: nowrap;
}
.btn-grant:hover { background: #e02343; border-color: #e02343; }
.btn-grant:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancel {
  background: #fff; color: #374151; border: 1px solid #d1d5db; font-weight: 500;
}
.btn-cancel:hover { background: #f9fafb; }
.btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }
.alert-error {
  margin-bottom: 10px; padding: 8px 12px; background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; color: #dc2626;
}
.alert-success {
  margin-bottom: 10px; padding: 8px 12px; background: #f0fdf4; border: 1px solid #bbf7d0;
  border-radius: 6px; color: #166534;
}
.spinner {
  display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 6px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
