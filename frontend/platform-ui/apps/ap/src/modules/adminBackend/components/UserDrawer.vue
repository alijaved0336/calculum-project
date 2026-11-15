<!-- src/modules/adminBackend/components/UserDrawer.vue -->
<template>
<div class="user-drawer" ref="drawerEl" :class="{ open: !!user, 'drawer-small': viewportIsSmall }">
  <div class="drawer-backdrop" v-if="viewportIsSmall && displayUser" @click="$emit('close')"></div>
  <div class="drawer-panel" v-if="displayUser">
    <div class="drawer-header">
      <div class="drawer-avatar" :style="{ backgroundColor: avatarBgColor }"><span>{{ avatarInitials }}</span></div>
      <div class="drawer-header-info">
        <div class="drawer-header-name">{{ displayUser.userFullName }}</div>
        <div class="drawer-header-email">{{ displayUser.userEmail }}</div>
        <div class="drawer-header-badge"><span class="badge" :class="badgeClass">
            <svg class="badge-icon" v-if="identityType === 'local'" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <svg class="badge-icon" v-else-if="identityType === 'sso'" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 7V5a4 4 0 0 0-8 0v2"></path>
              <line x1="8" y1="11" x2="8" y2="17"></line>
              <line x1="12" y1="11" x2="12" y2="17"></line>
              <line x1="16" y1="11" x2="16" y2="17"></line>
            </svg>
            <svg class="badge-icon" v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>{{ badgeLabel }}</span></div>
      </div>
      <button class="drawer-close" @click="$emit('close')" aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="drawer-tabs">
      <button class="drawer-tab" v-for="tab in availableTabs" :key="tab.key" :class="{ active: activeTab === tab.key, 'tab-danger': tab.key === 'danger' }" @click="activeTab = tab.key">{{ tab.label }}</button>
    </div>
    <div class="drawer-content">
      <DrawerTabProfile v-if="activeTab === 'profile'" :user="displayUser" @updated="$emit('updated', $event as any)"></DrawerTabProfile>
      <DrawerTabSecurity v-if="activeTab === 'security' && identityType === 'local'" :user="displayUser" @reset-idp="handleResetIdp" @resend-invitation="handleResendInvitation" @updated="$emit('updated', displayUser as any)"></DrawerTabSecurity>
      <DrawerTabIdentity v-if="activeTab === 'identity' && identityType === 'sso'" :user="displayUser"></DrawerTabIdentity>
      <DrawerTabAccess v-if="activeTab === 'access'" :user="displayUser" @edit-roles="(companyUuid, entries) => handleEditRoles(companyUuid, entries)" @remove="(companyUuid, entries) => handleRemoveFromCompany(companyUuid, entries)" @grant="(entries) => handleGrantAccess(entries)" @edit-general-roles="(userRoles) => handleGeneralRoles(userRoles)"></DrawerTabAccess>
      <DrawerTabAudit v-if="activeTab === 'audit' && identityType !== 'pending'" :user="displayUser"></DrawerTabAudit>
      <DrawerTabDangerZone v-if="activeTab === 'danger'" :user="displayUser" @deleted="$emit('deleted', $event)"></DrawerTabDangerZone>
    </div>
    <transition name="fade">
      <div class="action-banner" v-if="actionBanner" :class="actionBanner.type">{{ actionBanner.message }}
        <button class="btn-close-banner" @click="actionBanner = null">×</button>
      </div>
    </transition>
  </div>
  <EditRolesModal :visible="editRolesVisible" :user-uuid="displayUser?.userUuid || (displayUser as any)?.uuid || ''" :user-name="displayUser?.userFullName ?? ''" :user-email="displayUser?.userEmail ?? ''" :company-uuid="editRolesCompanyUuid" :company-name="editRolesCompanyName" :current-roles="editRolesCurrentRoles" :is-editing-general-roles="isEditingGeneralRoles" @close="handleCloseEditRoles()" @updated-roles="(roles) => refreshRolesAfterEdit(roles)"></EditRolesModal>
  <RemoveFromCompanyModal :visible="removeCompanyVisible" :user-uuid="displayUser?.userUuid || (displayUser as any)?.uuid || ''" :user-name="displayUser?.userFullName ?? ''" :user-email="displayUser?.userEmail ?? ''" :company-uuid="removeCompanyUuid" :company-name="removeCompanyName" @close="removeCompanyVisible = false" @removed="refreshAccessTab"></RemoveFromCompanyModal>
  <GrantAccessModal :visible="grantAccessVisible" :user-email="displayUser?.userEmail ?? ''" :user-name="displayUser?.userFullName ?? ''" :available-companies="availableCompanies ?? []" :existing-company-uuids="grantAccessExistingUuids" :companies-capacity="companiesCapacity ?? []" @close="grantAccessVisible = false" @granted="refreshAccessTab"></GrantAccessModal>
</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { AVATAR_COLORS_BY_LETTER, AVATAR_COLOR_DEFAULT } from '@/utils/ColorsGroups'
import { useUserDrawer } from '@/composables/useUserDrawer'
import DrawerTabProfile from './drawer/DrawerTabProfile.vue'
import DrawerTabSecurity from './drawer/DrawerTabSecurity.vue'
import DrawerTabIdentity from './drawer/DrawerTabIdentity.vue'
import DrawerTabAccess from './drawer/DrawerTabAccess.vue'
import DrawerTabAudit from './drawer/DrawerTabAudit.vue'
import DrawerTabDangerZone from './drawer/DrawerTabDangerZone.vue'
import EditRolesModal from './drawer/EditRolesModal.vue'
import RemoveFromCompanyModal from './drawer/RemoveFromCompanyModal.vue'
import GrantAccessModal from './drawer/GrantAccessModal.vue'

interface UserRow {
  userUuid: string
  userFullName: string
  userFirstName: string
  userLastName: string
  userEmail: string
  userAzureId: string | null
  identityProvider: string | null
  companyUuid: string
  companyName: string
  companyUiGroupName?: string | null
  rolesByCompany: Record<string, { roles: string[]; companyName: string }>
  invitationToken: string | null
  tokenExpiration: string | null
  azureLastInvitationDate?: string | null
  id: number,
  userRoles: string[]
}

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
  user: UserRow | null
  availableCompanies?: CompanyOption[]
  companiesCapacity?: CompanyCapacity[]
}>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated', user: UserRow): void
  (e: 'deleted', userUuid: string): void
}>()

const { resendInvitation, resetIdentityProvider } = useUserDrawer()
const { t } = useI18n({ useScope: 'global' })
const activeTab = ref('profile')
const viewportIsSmall = ref(window.innerWidth < 960)
const actionBanner = ref<{ type: 'success' | 'warning'; message: string } | null>(null)
const drawerEl = ref<HTMLElement | null>(null)
const b2cProfileType = ref<'local' | 'sso' | 'pending' | null>(null)
const b2cIssuerDomain = ref<string | null>(null)

// Edit Roles modal state
const editRolesVisible = ref(false)
const editRolesCompanyUuid = ref('')
const editRolesCompanyName = ref('')
const editRolesCurrentRoles = ref<string[]>([])
const isEditingGeneralRoles = ref(false)

function handleEditRoles(companyUuid: string, companyEntries: Array<{ companyUuid: string; companyName: string; roles: string[] }>) {
  const entry = companyEntries.find(e => e.companyUuid === companyUuid)
  if (!entry) return
  editRolesCompanyUuid.value = entry.companyUuid
  editRolesCompanyName.value = entry.companyName
  editRolesCurrentRoles.value = [...entry.roles]
  isEditingGeneralRoles.value = false
  editRolesVisible.value = true
}


function handleCloseEditRoles() {
  editRolesVisible.value = false
  isEditingGeneralRoles.value = false
}

function handleGeneralRoles(userRoles: string[]) {  
  editRolesCurrentRoles.value = userRoles
  editRolesVisible.value = true
  isEditingGeneralRoles.value = true
}

function refreshAccessTab() {
  if (displayUser.value) {
    displayUser.value = { ...displayUser.value }
  }
}

function refreshRolesAfterEdit(roles: string[]) {
  if (displayUser.value) {
    displayUser.value = { ...displayUser.value, userRoles: roles }
    emit('updated', displayUser.value)
  }
}


// Remove from Company modal state
const removeCompanyVisible = ref(false)
const removeCompanyUuid = ref('')
const removeCompanyName = ref('')

function handleRemoveFromCompany(companyUuid: string, companyEntries: Array<{ companyUuid: string; companyName: string }>) {
  const entry = companyEntries.find(e => e.companyUuid === companyUuid)
  if (!entry) return
  removeCompanyUuid.value = entry.companyUuid
  removeCompanyName.value = entry.companyName
  removeCompanyVisible.value = true
}

// Grant Access modal state
const grantAccessVisible = ref(false)
const grantAccessExistingUuids = ref<string[]>([])

function handleGrantAccess(companyEntries: Array<{ companyUuid: string }>) {
  grantAccessExistingUuids.value = companyEntries.map(e => e.companyUuid)
  grantAccessVisible.value = true
}

// displayUser keeps the last user visible during the close animation.
// It updates immediately when a new user is selected, but on close it
// lingers until the CSS width transition ends so content doesn't vanish.
const displayUser = ref<UserRow | null>(null)
let closeTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.user, (newUser) => {
  if (newUser) {
    // Opening or switching: update immediately
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
    displayUser.value = newUser
    b2cProfileType.value = null // reset while loading new user's profile
    b2cIssuerDomain.value = null
  } else {
    // Closing: keep displayUser around for the duration of the CSS transition
    closeTimer = setTimeout(() => { displayUser.value = null; closeTimer = null }, 250)
  }
}, { immediate: true })

// Derive identity type from GraphQL data (userAzureId + identityProvider are now reliable)
watch(() => props.user, (newUser) => {
  if (!newUser) return
  if (newUser.userAzureId === null && !newUser.invitationToken) {
    b2cProfileType.value = 'pending'
    b2cIssuerDomain.value = null
  } else if (newUser.identityProvider && newUser.identityProvider !== 'local') {
    b2cProfileType.value = 'sso'
    b2cIssuerDomain.value = newUser.identityProvider
  } else {
    b2cProfileType.value = 'local'
    b2cIssuerDomain.value = null
  }
}, { immediate: true })

const identityType = computed<'local' | 'sso' | 'pending'>(() => {
  // Use B2C profile API result; fallback to GraphQL data while loading
  if (b2cProfileType.value) return b2cProfileType.value
  const u = displayUser.value
  if (!u || u.userAzureId === null) return 'pending'
  if (!u.identityProvider || u.identityProvider === 'local') return 'local'
  return 'sso'
})

const availableTabs = computed(() => {
  const tabs = [{ key: 'profile', label: t('adminBackend.drawer.tabs.profile') }]
  if (identityType.value === 'local') tabs.push({ key: 'security', label: t('adminBackend.drawer.tabs.security') })
  if (identityType.value === 'sso') tabs.push({ key: 'identity', label: t('adminBackend.drawer.tabs.identity') })
  tabs.push({ key: 'access', label: t('adminBackend.drawer.tabs.access') })
  if (identityType.value !== 'pending') tabs.push({ key: 'audit', label: t('adminBackend.drawer.tabs.audit') })
  tabs.push({ key: 'danger', label: t('adminBackend.drawer.tabs.dangerZone') })
  return tabs
})

const avatarInitials = computed(() => {
  if (!displayUser.value) return ''
  return ((displayUser.value.userFirstName?.[0] ?? '') + (displayUser.value.userLastName?.[0] ?? '')).toUpperCase()
})

const avatarBgColor = computed(() => {
  const letter = displayUser.value?.userLastName?.[0]?.toUpperCase()
  if (!letter || letter < 'A' || letter > 'Z') return AVATAR_COLOR_DEFAULT
  return AVATAR_COLORS_BY_LETTER[(letter.codePointAt(0) ?? 65) - 65] ?? AVATAR_COLOR_DEFAULT
})

const badgeClass = computed(() => ({
  'badge-local': identityType.value === 'local',
  'badge-sso': identityType.value === 'sso',
  'badge-pending': identityType.value === 'pending',
}))

const badgeLabel = computed(() => {
  if (identityType.value === 'pending') return t('adminBackend.drawer.badge.signupPending')
  if (identityType.value === 'sso') return `SSO — ${b2cIssuerDomain.value ?? displayUser.value?.identityProvider ?? ''}`
  return t('adminBackend.drawer.badge.local')
})

// Reset to profile tab when a different user is selected
watch(() => props.user?.userUuid, () => { activeTab.value = 'profile' })

async function handleResendInvitation(userCompanyIds: number[]) {
  const { succeeded, failed } = await resendInvitation(userCompanyIds)
  if (failed.length === 0) {
    actionBanner.value = { type: 'success', message: t('adminBackend.drawer.banner.invitationResent', { count: succeeded.length }) }
  } else {
    actionBanner.value = {
      type: 'warning',
      message: t('adminBackend.drawer.banner.invitationResentPartial', { succeeded: succeeded.length, failed: failed.length }),
    }
  }
  setTimeout(() => { actionBanner.value = null }, 5000)
}

async function handleResetIdp() {
  if (!displayUser.value) return
  const uuid = displayUser.value.userUuid || (displayUser.value as any).uuid
  // Get first companyUuid - try rolesByCompany (object or JSON string), fallback to companyUuid field
  let companyUuid: string | undefined
  const rbc = displayUser.value.rolesByCompany
  if (rbc && typeof rbc === 'object') {
    companyUuid = Object.keys(rbc)[0]
  } else if (rbc && typeof rbc === 'string') {
    try { companyUuid = Object.keys(JSON.parse(rbc))[0] } catch { /* ignore */ }
  }
  if (!companyUuid) {
    companyUuid = (displayUser.value.companyUuid || '').split(',')[0]?.trim()
  }
  if (!uuid || !companyUuid) {
    actionBanner.value = { type: 'warning', message: t('adminBackend.drawer.grid.noCompanyWarning') }
    setTimeout(() => { actionBanner.value = null }, 5000)
    return
  }
  await resetIdentityProvider(uuid, companyUuid)
  emit('updated', displayUser.value)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

function onResize() {
  viewportIsSmall.value = window.innerWidth < 960
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
/* Large screens: inline side panel — width animates from 0 to 540px */
.user-drawer {
  width: 0;
  flex-shrink: 0;
  height: 100%;
  overflow: hidden;
  background: #fff;
  font-size: 1rem;
  border-left: 1px solid transparent;
  transition: width 0.22s ease, border-color 0.22s ease;
  display: flex;
}
.user-drawer.open {
  width: 540px;
  border-left-color: #e5e7eb;
}
.drawer-panel {
  width: 540px; min-width: 540px; height: 100%; background: #fff;
  display: flex; flex-direction: column; box-shadow: -4px 0 24px rgba(0,0,0,0.08); overflow: hidden;
}
/* Small screens: full-viewport overlay */
.drawer-small {
  position: fixed !important;
  top: 0;
  right: 0;
  width: 0 !important;
  height: 100vh !important;
  height: 100dvh !important;
  z-index: 9999;
  transition: width 0.22s ease;
}
.drawer-small.open {
  width: 540px !important;
}
.drawer-small .drawer-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: -1;
}
.drawer-header {
  display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px 12px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
}
.drawer-avatar {
  width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-weight: 700; color: #fff; flex-shrink: 0;
}
.drawer-header-info { flex: 1; min-width: 0; }
.drawer-header-name { font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.drawer-header-email { color: #6b7280; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.drawer-header-badge { margin-top: 5px; }
.drawer-close { margin-left: auto; background: none; border: none; padding: 2px; cursor: pointer; color: #9ca3af; line-height: 1; }
.drawer-close:hover { color: #374151; }
.drawer-tabs {
  display: flex; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
}
.drawer-tab {
  padding: 9px 16px; border: none; background: none; font-weight: 500; color: #6b7280;
  cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; transition: color 0.15s, border-color 0.15s;
}
.drawer-tab:hover { color: #374151; }
.drawer-tab.active { color: #ff2c4f; border-bottom-color: #ff2c4f; }
.drawer-tab.tab-danger { color: #dc2626; }
.drawer-tab.tab-danger.active { border-bottom-color: #dc2626; }
.drawer-content { flex: 1; overflow-y: auto; padding: 16px 18px; }
.action-banner {
  padding: 10px 16px; display: flex; align-items: center; justify-content: space-between;
}
.action-banner.success { background: #d1fae5; color: #065f46; }
.action-banner.warning { background: #fef3c7; color: #92400e; }
.btn-close-banner { background: none; border: none; cursor: pointer; font-size: 16px; padding: 0 4px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Badges */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 12px; font-weight: 500;
}
.badge-icon { flex-shrink: 0; }
.badge-local { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
.badge-sso { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
.badge-pending { background: #fef9c3; color: #713f12; border: 1px solid #fde047; }
</style>
