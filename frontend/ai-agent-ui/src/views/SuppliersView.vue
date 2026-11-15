<template>
  <div class="page">
    <SuppliersHeader
      :active-tenant-label="activeTenantLabel"
      :supplier-count="suppliers.length"
      :show-supplier-count="!!authStore.selectedTenantId"
      :is-admin="isAdmin"
      :is-super-admin="isSuperAdmin"
      @reopen-tenant-picker="reopenTenantPicker"
      @logout="logout"
      @setup="router.push('/setup')"
      @super-admin="router.push('/super-admin')"
    />

    <template v-if="authStore.selectedTenantId">
      <p v-if="error" class="page-error">{{ error }}</p>

      <SuppliersContent
        v-model:search-term="searchTerm"
        :suppliers="suppliers"
        :loading-initial="loadingInitial"
        :loading-more="loadingMore"
        @open-chat="openChat"
        @load-more="loadSuppliersPage()"
      />
    </template>

    <TenantPickerModal
      :open="showTenantPicker"
      :draft-tenant-id="draftTenantId"
      :tenant-options="tenantOptions"
      :tenant-load-error="tenantLoadError"
      :tenant-loading="tenantLoading"
      :show-cancel="!!authStore.selectedTenantId"
      @update:draftTenantId="draftTenantId = $event"
      @confirm="confirmTenant"
      @cancel="tenantPickerForced = false"
      @logout="logout"
    />

    <button
      v-if="showScrollTop"
      class="scroll-top-btn"
      type="button"
      title="Back to top"
      aria-label="Back to top"
      @click="scrollToTop"
    >
      <ChevronDownSvg />
      <span>Back to top</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { authApi, type TenantOption } from '@/api/auth.api'
import { sessionApi, type SupplierListItem } from '@/api/session.api'
import { useAuthStore } from '@/stores/auth.store'
import { ChevronDownSvg } from '@/components/chat/icons'
import SuppliersContent from '@/components/suppliers/SuppliersContent.vue'
import SuppliersHeader from '@/components/suppliers/SuppliersHeader.vue'
import TenantPickerModal from '@/components/suppliers/TenantPickerModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const suppliers = ref<SupplierListItem[]>([])
const error = ref('')
const loadingInitial = ref(false)
const loadingMore = ref(false)
const hasMoreSuppliers = ref(true)
const supplierOffset = ref(0)
const searchTerm = ref('')
const debouncedSearchTerm = ref('')
const tenantPickerForced = ref(false)
const draftTenantId = ref('')
const tenantOptions = ref<TenantOption[]>([])
const tenantLoadError = ref('')
const tenantLoading = ref(false)
const showScrollTop = ref(false)
const supplierPageSize = 200
let searchDebounceTimer: ReturnType<typeof window.setTimeout> | null = null
let supplierRequestId = 0

const showTenantPicker = computed(
  () =>
    tenantPickerForced.value ||
    (!authStore.selectedTenantId &&
      (authStore.role === 'global_platform_admin' ||
        authStore.memberships.length > 1)),
)

const selectedTenantOption = computed(
  () => tenantOptions.value.find((tenant) => tenant.tenantId === authStore.selectedTenantId) ?? null,
)

const activeTenantLabel = computed(() => {
  return selectedTenantOption.value?.tenantName ?? authStore.activeMembership?.tenantName ?? 'Choose tenant'
})

const isAdmin = computed(() => {
  const role = authStore.role ?? authStore.activeMembership?.role
  return role === 'admin'
})

const isSuperAdmin = computed(() => {
  const role = authStore.role ?? authStore.activeMembership?.role
  return role === 'global_platform_admin'
})

function openChat(supplier: SupplierListItem) {
  router.push({ name: 'chat', params: { supplierId: supplier.supplierId } })
}

function reopenTenantPicker() {
  tenantPickerForced.value = true
  draftTenantId.value =
    authStore.selectedTenantId ??
    authStore.activeMembership?.tenantId ??
    tenantOptions.value[0]?.tenantId ??
    ''
}

function confirmTenant() {
  if (!draftTenantId.value) return

  const nextTenantId = draftTenantId.value
  const nextTenantUuid = tenantOptions.value.find((t) => t.tenantId === nextTenantId)?.tenantUuid ?? null
  authStore.selectTenant(nextTenantId, nextTenantUuid)
  tenantPickerForced.value = false
}

function resetSuppliers() {
  suppliers.value = []
  supplierOffset.value = 0
  hasMoreSuppliers.value = true
}

async function loadSuppliersPage(reset = false) {
  if (!authStore.selectedTenantId) {
    resetSuppliers()
    return
  }

  if (!reset && (!hasMoreSuppliers.value || loadingInitial.value || loadingMore.value)) return

  if (reset) resetSuppliers()

  const requestId = ++supplierRequestId
  const offset = reset ? 0 : supplierOffset.value
  const search = debouncedSearchTerm.value.trim()
  loadingInitial.value = offset === 0
  loadingMore.value = offset > 0
  error.value = ''
  try {
    const { data } = await sessionApi.listSuppliers(authStore.selectedTenantId, {
      limit: supplierPageSize,
      offset,
      search,
    })

    if (requestId !== supplierRequestId) return

    const nextSuppliers = data.suppliers
    suppliers.value = reset ? nextSuppliers : [...suppliers.value, ...nextSuppliers]
    supplierOffset.value = offset + nextSuppliers.length
    hasMoreSuppliers.value = nextSuppliers.length === supplierPageSize
  } catch (err: unknown) {
    if (requestId !== supplierRequestId) return
    if (offset === 0) suppliers.value = []
    if (axios.isAxiosError(err)) {
      const url = err.config?.url ?? '/suppliers'
      const status = err.response?.status
      error.value = status
        ? `GET ${url} failed with status ${status}`
        : `Network error calling ${url}: ${err.message}`
    } else {
      error.value = err instanceof Error ? err.message : 'Failed to load suppliers'
    }
  } finally {
    if (requestId === supplierRequestId) {
      loadingInitial.value = false
      loadingMore.value = false
    }
  }
}

async function loadTenants() {
  tenantLoading.value = true
  try {
    tenantLoadError.value = ''
    const { data } = await authApi.listTenants()
    tenantOptions.value = data.tenants

    if (!draftTenantId.value) {
      draftTenantId.value = authStore.selectedTenantId ?? data.tenants[0]?.tenantId ?? ''
    }
  } catch (err: unknown) {
    tenantOptions.value = []
    tenantLoadError.value = err instanceof Error ? err.message : 'Failed to load tenants'
  } finally {
    tenantLoading.value = false
  }
}

function logout() {
  authStore.logout()
  router.replace({ name: 'login' })
}

function updateScrollTopVisibility() {
  showScrollTop.value = window.scrollY > 240
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(() => authStore.selectedTenantId, () => {
  supplierRequestId += 1
  void loadSuppliersPage(true)
}, { immediate: true })

watch(searchTerm, (value) => {
  if (searchDebounceTimer) window.clearTimeout(searchDebounceTimer)
  searchDebounceTimer = window.setTimeout(() => {
    debouncedSearchTerm.value = value
  }, 300)
})

watch(debouncedSearchTerm, () => {
  supplierRequestId += 1
  void loadSuppliersPage(true)
})

onMounted(() => {
  tenantPickerForced.value = !authStore.selectedTenantId && authStore.role === 'global_platform_admin'
  updateScrollTopVisibility()
  window.addEventListener('scroll', updateScrollTopVisibility, { passive: true })
  void loadTenants()
})

onBeforeUnmount(() => {
  if (searchDebounceTimer) window.clearTimeout(searchDebounceTimer)
  window.removeEventListener('scroll', updateScrollTopVisibility)
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f5f7;
  padding: 32px 24px;
  box-sizing: border-box;
}

.page-error {
  max-width: 960px;
  margin: 0 auto 16px;
  padding: 12px 14px;
  border: 1px solid #fecaca;
  border-radius: 12px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 14px;
}

.scroll-top-btn {
  position: fixed;
  left: 24px;
  bottom: 24px;
  z-index: 120;
  display: inline-flex;
  width: auto;
  height: 40px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #ffffff;
  color: #111827;
  padding: 0 12px;
  box-shadow: 0 8px 18px rgba(17, 24, 39, 0.14);
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
}

.scroll-top-btn:hover,
.scroll-top-btn:focus-visible {
  border-color: #2563eb;
  color: #2563eb;
  box-shadow: 0 10px 26px rgba(37, 99, 235, 0.2);
  transform: translateY(-1px);
}

.scroll-top-btn :deep(.ico) {
  width: 15px;
  height: 15px;
  transform: rotate(180deg);
}

@media (max-width: 640px) {
  .scroll-top-btn {
    left: 16px;
    bottom: 16px;
  }
}

</style>
