<!-- src/modules/adminBackend/components/drawer/DrawerTabAccess.vue -->
<template>
<div class="access-tab">
  <div class="access-header-row" v-if="isCalculumEmail && userIsSuperAdmin">
    <div class="section-title">{{ $t('adminBackend.drawer.access.generalRolesByUser') }}</div>
    <button class="btn-add" @click="$emit('edit-general-roles', user.userRoles)">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>{{ $t('adminBackend.drawer.access.editRoles') }}
    </button>
  </div>
  <div class="access-header-row">
    <div class="section-title">{{ $t('adminBackend.drawer.access.companyAccess') }}</div>
    <button class="btn-add" @click="$emit('grant', companyEntries)">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>{{ $t('adminBackend.drawer.access.grantAccess') }}
    </button>
  </div>
  <div class="loading-center" v-if="loading">
    <div class="spinner"></div>
  </div>
  <div class="error-banner" v-else-if="error">{{ $t('adminBackend.drawer.access.errorLoad') }}
    <button class="btn-link" @click="load">{{ $t('adminBackend.drawer.access.tryAgain') }}</button>
  </div>
  <div class="empty-text" v-else-if="companyEntries.length === 0">{{ $t('adminBackend.drawer.access.noAccess') }}</div>
  <div class="access-table" v-else>
    <div class="access-table-header"><span>{{ $t('adminBackend.drawer.access.company') }}</span><span>{{ $t('adminBackend.drawer.access.group') }}</span><span>{{ $t('adminBackend.drawer.access.roles') }}</span></div>
    <div class="access-table-body">
      <div class="access-row" v-for="entry in companyEntries" :key="entry.companyUuid" :class="{ selected: selectedCompanyUuid === entry.companyUuid }" @click="selectRow(entry.companyUuid)"><span><span class="company-badge">{{ entry.companyName }}</span></span><span class="groups-cell">
          <template v-if="entry.groupName"><span class="group-badge" v-for="g in entry.groupName.split(',')" :key="g">{{ g.trim() }}</span></template><span v-else>—</span></span><span class="roles-cell"><span class="role-badge role-admin" v-if="entry.roles.includes('ROLE_COMPANY_ADMIN')">{{ $t('adminBackend.drawer.access.admin') }}</span><span class="role-badge role-partner" v-if="entry.roles.includes('ROLE_PARTNER')">{{ $t('adminBackend.drawer.access.partner') }}</span><span v-if="!entry.roles.includes('ROLE_COMPANY_ADMIN') && !entry.roles.includes('ROLE_PARTNER')">—</span></span></div>
    </div>
  </div>
  <transition name="fade">
    <div class="access-actions" v-if="selectedCompanyUuid">
      <button class="action-btn" @click="$emit('edit-roles', selectedCompanyUuid, companyEntries)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>{{ $t('adminBackend.drawer.access.editCompanyRoles') }}
      </button>
      <button class="action-btn danger" @click="$emit('remove', selectedCompanyUuid, companyEntries)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>{{ $t('adminBackend.drawer.access.removeFromCompany') }}
      </button>
    </div>
  </transition>
</div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useUserDrawer, type UserCompanyAccess } from '@/composables/useUserDrawer'
import { useUser } from '@/composables'

const props = defineProps<{
  user: {
    userUuid?: string
    uuid?: string,
    userEmail?: string,
    userRoles: string[]
  }
}>()
defineEmits<{
  (e: 'grant', entries: UserCompanyAccess[]): void
  (e: 'edit-roles', companyUuid: string, entries: UserCompanyAccess[]): void
  (e: 'remove', companyUuid: string, entries: UserCompanyAccess[]): void,
  (e: 'edit-general-roles', userRoles: string[]): void
}>()

const { fetchUserCompanies } = useUserDrawer()
const selectedCompanyUuid = ref<string | null>(null)
const companyEntries = ref<UserCompanyAccess[]>([])
const loading = ref(false)
const error = ref(false)

const { userIsSuperAdmin } = useUser()

const isCalculumEmail = computed(() =>
  (props.user?.userEmail || '').trim().toLowerCase().endsWith('@calculum.ai')
)


async function load() {
  const userUuid = props.user?.userUuid || props.user?.uuid
  if (!userUuid) return
  loading.value = true; error.value = false
  try {
    companyEntries.value = await fetchUserCompanies(userUuid)
  } catch { error.value = true }
  finally { loading.value = false }
}

function selectRow(uuid: string) {
  selectedCompanyUuid.value = selectedCompanyUuid.value === uuid ? null : uuid
}

watch(() => props.user, () => {
  selectedCompanyUuid.value = null
  load()
}, { immediate: true })
</script>

<style scoped>
.access-tab {
  font-size: 1rem;
}
.section-title {
  font-weight: 700; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.05em; margin: 0;
}
.access-header-row {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
}
.btn-add {
  background: #ff2c4f; color: #fff; border: none; border-radius: 6px;
  padding: 4px 10px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 4px;
}
.btn-add:hover { background: #e02343; }
.empty-text { color: #9ca3af; }

.access-table {
  border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 8px;
}
.access-table-header {
  display: grid; grid-template-columns: 1.4fr 1fr 1fr;
  padding: 7px 12px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;
  font-weight: 700; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.access-table-body {
  max-height: 270px;
  overflow-y: auto;
}
.access-row {
  display: grid; grid-template-columns: 1.4fr 1fr 1fr;
  padding: 9px 12px; color: #374151;
  border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background 0.1s;
}
.company-badge {
  display: inline-block; background: #f0fdf4; color: #166534;
  border-radius: 4px; padding: 1px 6px; 
}
.groups-cell { display: flex; gap: 4px; flex-wrap: wrap; }
.group-badge {
  display: inline-flex; align-items: center; background: #f3e8ff; color: #7c3aed;
  border-radius: 4px; padding: 2px 8px; font-weight: 500; line-height: 1; height: 20px;
}
.access-row:last-child { border-bottom: none; }
.access-row:hover { background: #f3f4f6; }
.access-row.selected {
  background: #f3f4f6; border-left: 3px solid #ff2c4f; padding-left: 9px;
}

.roles-cell { display: flex; gap: 4px; flex-wrap: wrap; }
.role-badge {
  display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px;
  font-weight: 500; line-height: 1; height: 20px;
}
.role-admin { background: #fef2f2; color: #dc2626; }
.role-partner { background: #eff6ff; color: #2563eb; }

.access-actions {
  display: flex; gap: 8px; padding: 8px 0 4px; border-top: 1px solid #e5e7eb; margin-top: 4px;
  animation: fadeInActions 0.15s ease;
}
@keyframes fadeInActions {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.action-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 6px; border: 1px solid #e5e7eb;
  background: #fff; font-weight: 500; cursor: pointer; color: #374151;
}
.action-btn:hover { background: #f9fafb; border-color: #d1d5db; }
.action-btn.danger { color: #dc2626; border-color: #fecaca; }
.action-btn.danger:hover { background: #fef2f2; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

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
</style>
