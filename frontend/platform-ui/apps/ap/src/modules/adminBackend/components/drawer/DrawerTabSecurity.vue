<!-- src/modules/adminBackend/components/drawer/DrawerTabSecurity.vue -->
<template>
<div class="security-tab">
  <div class="loading-center" v-if="loading">
    <div class="spinner"></div>
  </div>
  <div class="error-banner" v-else-if="loadError">Could not load security data.
    <button class="btn-link" @click="load">Try again</button>
  </div>
  <template v-else>
    <div class="security-section">
      <div class="section-title">Account Status</div>
      <div class="toggle-row"><span>Account is {{ accountEnabled ? 'enabled' : 'disabled' }}</span>
        <div class="toggle" :class="{ 'toggle-on': accountEnabled, 'toggle-off': !accountEnabled }" @click="toggleAccount" :style="{ opacity: togglingAccount ? 0.5 : 1 }"></div>
      </div>
    </div>
    <div class="security-section">
      <div class="section-title">B2C Identity</div>
      <div class="field-row"><span class="field-label">Last password change</span><span class="field-value">{{ lastPasswordChange ?? '—' }}</span></div>
    </div>
    <div class="security-section">
      <div class="section-title">MFA Methods</div>
      <div class="empty-text" v-if="!loadingMfa && mfaMethods.length === 0">No MFA methods registered.</div>
      <div class="loading-center" v-if="loadingMfa">
        <div class="spinner"></div>
      </div>
      <div class="auth-method-row" v-for="method in mfaMethods" :key="method.id">
        <div class="auth-method-info">
          <svg class="auth-method-icon" v-if="method.type === 'softwareOath'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <svg class="auth-method-icon" v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
          </svg>
          <div class="auth-method-text">
            <div class="auth-method-label">{{ method.type === 'softwareOath' ? 'Authenticator app' : 'Phone' }}</div>
            <div class="auth-method-sub">{{ method.label }}</div>
          </div>
        </div>
        <button class="btn-remove" :disabled="removingMethodId === method.id" @click="removeMethod(method)"><span class="spinner" v-if="removingMethodId === method.id"></span><span v-else>Remove</span></button>
      </div>
    </div>
    <div class="security-section">
      <div class="section-title">Actions</div>
      <div class="action-list">
        <button class="action-btn" disabled="disabled" title="Coming soon — requires IEF policy update">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>Force Password Reset
        </button>
        <button class="action-btn" :disabled="invalidating" @click="doInvalidateSessions">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg><span class="spinner" v-if="invalidating"></span>Invalidate All Sessions
        </button>
        <button class="action-btn" @click="$emit('reset-idp')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>Reset Identity Provider
        </button>
      </div>
    </div>
  </template>
  <div class="alert-error" v-if="actionError">{{ actionError }}</div>
  <div class="alert-success" v-if="actionSuccess">{{ actionSuccess }}</div>
</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUserDrawer, type MfaMethod } from '@/composables/useUserDrawer'

const props = defineProps<{
  user: {
    userUuid: string
    userAzureId: string | null
    rolesByCompany: Record<string, { roles: string[]; companyName: string }>
  }
}>()
const emit = defineEmits<{
  (e: 'reset-idp'): void
  (e: 'resend-invitation', userCompanyIds: number[]): void
  (e: 'updated'): void
}>()

const { fetchB2CProfile, fetchMfaMethods, removeMfaMethod, setAccountEnabled, invalidateSessions } = useUserDrawer()

const loading = ref(false)
const loadingMfa = ref(false)
const loadError = ref(false)
const actionError = ref<string | null>(null)
const actionSuccess = ref<string | null>(null)
const mfaMethods = ref<MfaMethod[]>([])
const lastPasswordChange = ref<string | null>(null)
const accountEnabled = ref<boolean>(true)
const togglingAccount = ref(false)
const removingMethodId = ref<string | null>(null)
const invalidating = ref(false)

async function load() {
  const uuid = props.user.userUuid || (props.user as any).uuid
  if (!uuid || !props.user.userAzureId) return
  loading.value = true; loadError.value = false
  try {
    const profile = await fetchB2CProfile(uuid)
    lastPasswordChange.value = profile.lastPasswordChangeDateTime
      ? new Date(profile.lastPasswordChangeDateTime).toLocaleDateString()
      : null
  } catch { loadError.value = true }
  finally { loading.value = false }

  loadingMfa.value = true
  try {
    mfaMethods.value = await fetchMfaMethods(uuid)
  } catch { /* show empty list on failure */ }
  finally { loadingMfa.value = false }
}

async function toggleAccount() {
  if (togglingAccount.value) return
  const newVal = !accountEnabled.value
  togglingAccount.value = true; actionError.value = null
  try {
    await setAccountEnabled(props.user.userUuid || (props.user as any).uuid, newVal)
    accountEnabled.value = newVal
    emit('updated')
  } catch {
    actionError.value = 'Could not change account status. Please try again.'
  } finally { togglingAccount.value = false }
}

async function removeMethod(method: MfaMethod) {
  removingMethodId.value = method.id; actionError.value = null
  try {
    await removeMfaMethod(props.user.userUuid || (props.user as any).uuid, method.type, method.id)
    mfaMethods.value = mfaMethods.value.filter(m => m.id !== method.id)
    actionSuccess.value = 'MFA method removed.'
    setTimeout(() => { actionSuccess.value = null }, 3000)
  } catch {
    actionError.value = 'Could not remove MFA method. Please try again.'
  } finally { removingMethodId.value = null }
}

async function doInvalidateSessions() {
  invalidating.value = true; actionError.value = null
  try {
    await invalidateSessions(props.user.userUuid || (props.user as any).uuid)
    actionSuccess.value = 'All sessions invalidated.'
    setTimeout(() => { actionSuccess.value = null }, 3000)
  } catch {
    actionError.value = 'Could not invalidate sessions. Please try again.'
  } finally { invalidating.value = false }
}

watch(() => props.user, () => {
  actionError.value = null
  actionSuccess.value = null
  mfaMethods.value = []
  lastPasswordChange.value = null
  accountEnabled.value = true
  togglingAccount.value = false
  removingMethodId.value = null
  invalidating.value = false
  load()
}, { immediate: true })
</script>

<style scoped>
.security-tab {
  font-size: 1rem;
}
.security-section { margin-bottom: 14px; }
.section-title {
  font-weight: 700; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px;
}

/* Loading & errors */
.loading-center { text-align: center; padding: 16px 0; }
.spinner {
  display: inline-block; width: 14px; height: 14px; border: 2px solid #e5e7eb;
  border-top-color: #ff2c4f; border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error-banner {
  padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; color: #dc2626; display: flex; align-items: center; gap: 8px;
}
.btn-link { background: none; border: none; color: #ff2c4f; cursor: pointer; padding: 0; text-decoration: underline; }
.empty-text { color: #9ca3af; }

/* Toggle row */
.toggle-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 12px; border-radius: 6px; border: 1px solid #e5e7eb;
  font-weight: 500; color: #374151; margin-bottom: 14px;
}
.toggle {
  width: 36px; height: 20px; border-radius: 10px; position: relative;
  cursor: pointer; flex-shrink: 0; transition: background 0.15s;
}
.toggle::after {
  content: ''; position: absolute; top: 2px; width: 16px; height: 16px;
  border-radius: 50%; background: #fff; transition: right 0.15s, left 0.15s;
}
.toggle-on { background: #10b981; }
.toggle-on::after { right: 2px; left: auto; }
.toggle-off { background: #d1d5db; }
.toggle-off::after { left: 2px; right: auto; }

/* Field rows */
.field-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 7px 0; border-bottom: 1px solid #f3f4f6; 
}
.field-label { color: #6b7280; }
.field-value { color: #111827; font-weight: 500; text-align: right; }

/* Auth method rows */
.auth-method-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 10px; background: #f9fafb; border-radius: 6px; margin-bottom: 6px; 
}
.auth-method-info { display: flex; align-items: center; gap: 10px; }
.auth-method-icon { color: #6b7280; flex-shrink: 0; }
.auth-method-label { font-weight: 500; color: #111827; }
.auth-method-sub { color: #9ca3af; }
.btn-remove {
  background: none; border: 1px solid #fca5a5; color: #dc2626;
  border-radius: 4px; padding: 2px 8px; cursor: pointer;
}
.btn-remove:hover { background: #fef2f2; }
.btn-remove:disabled { opacity: 0.5; cursor: not-allowed; }

/* Action buttons */
.action-list { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
.action-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 6px; border: 1px solid #e5e7eb;
  background: #fff; font-weight: 500; cursor: pointer;
  color: #374151; text-align: left;
}
.action-btn:hover { background: #f9fafb; border-color: #d1d5db; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Alerts */
.alert-error {
  margin-top: 12px; padding: 10px 12px; background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; color: #dc2626;
}
.alert-success {
  margin-top: 12px; padding: 10px 12px; background: #f0fdf4; border: 1px solid #bbf7d0;
  border-radius: 6px; color: #166534;
}
</style>
