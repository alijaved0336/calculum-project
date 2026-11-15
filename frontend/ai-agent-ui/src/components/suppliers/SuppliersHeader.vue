<template>
  <div class="page-header">
    <div class="page-heading">
      <h1 class="page-title">Suppliers</h1>
      <span v-if="showSupplierCount" class="page-count">{{ supplierCount }} suppliers</span>
    </div>

    <div class="header-actions">
      <button v-if="isAdmin" class="setup-chip" type="button" @click="emit('setup')">
        Setup
      </button>
      <button v-if="isSuperAdmin" class="setup-chip" type="button" @click="emit('super-admin')">
        Setup
      </button>
      <button class="tenant-chip" type="button" @click="emit('reopen-tenant-picker')">
        {{ activeTenantLabel }}
      </button>
      <button class="logout-chip" type="button" @click="emit('logout')">
        Logout
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  activeTenantLabel: string
  supplierCount: number
  showSupplierCount: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
}>()

const emit = defineEmits<{
  'reopen-tenant-picker': []
  logout: []
  setup: []
  'super-admin': []
}>()
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-heading {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.page-count {
  font-size: 13px;
  color: #9ca3af;
}

.tenant-chip {
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #ffffff;
  color: #374151;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.setup-chip {
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #111827;
  color: #fff;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.super-admin-chip {
  border: none;
  border-radius: 999px;
  background: #F97316;
  color: #fff;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.logout-chip {
  border: 1px solid #fecaca;
  border-radius: 999px;
  background: #fff1f2;
  color: #b91c1c;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.tenant-chip:hover,
.logout-chip:hover {
  opacity: 0.9;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .page-heading {
    flex-wrap: wrap;
  }
}
</style>
