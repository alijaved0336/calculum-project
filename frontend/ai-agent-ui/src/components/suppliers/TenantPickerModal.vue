<template>
  <div
    v-if="open"
    class="tenant-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="tenant-picker-title"
  >
    <div class="tenant-modal">
      <p class="tenant-kicker">Select tenant</p>
      <h2 id="tenant-picker-title">Choose a workspace before continuing.</h2>
      <p class="tenant-copy">
        This modal stays open until you select one of the available tenants.
      </p>

      <div class="tenant-list">
        <div v-if="tenantLoading" class="tenant-loading-state">
          <div class="tenant-spinner">
            <span></span><span></span><span></span>
          </div>
          <p class="tenant-loading-text">Fetching workspaces…</p>
        </div>

        <template v-else>
          <p v-if="tenantLoadError" class="tenant-error">{{ tenantLoadError }}</p>
          <label class="tenant-field">
            <span class="tenant-field-label">Tenant</span>
            <div class="tenant-select-shell">
              <select
                class="tenant-select"
                :value="draftTenantId"
                @change="onTenantChange"
              >
                <option disabled value="" class="tenant-option placeholder">
                  Select a tenant
                </option>
                <option
                  v-for="tenant in tenantOptions"
                  :key="tenant.tenantId"
                  :value="tenant.tenantId"
                  class="tenant-option"
                >
                  {{ tenant.tenantName }}
                </option>
              </select>
              <span class="tenant-select-icon" aria-hidden="true">▾</span>
            </div>
          </label>

          <p v-if="selectedTenantOption" class="tenant-meta-block">
            <span class="tenant-name">{{ selectedTenantOption.tenantName }}</span>
            <span class="tenant-meta">{{ selectedTenantOption.tenantId }}</span>
          </p>
        </template>
      </div>

      <div class="tenant-actions">
        <button
          v-if="showCancel"
          class="tenant-cancel"
          type="button"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          class="tenant-confirm"
          type="button"
          :disabled="!draftTenantId || tenantLoading"
          @click="emit('confirm')"
        >
          Continue
        </button>
      </div>

      <button class="logout-link" type="button" @click="emit('logout')">
        Logout
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TenantOption } from '@/api/auth.api'

const props = defineProps<{
  open: boolean
  draftTenantId: string
  tenantOptions: TenantOption[]
  tenantLoadError: string
  tenantLoading: boolean
  showCancel: boolean
}>()

const emit = defineEmits<{
  'update:draftTenantId': [value: string]
  confirm: []
  cancel: []
  logout: []
}>()

const selectedTenantOption = computed(
  () => props.tenantOptions.find((tenant) => tenant.tenantId === props.draftTenantId) ?? null,
)

function onTenantChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:draftTenantId', target.value)
}
</script>

<style scoped>
.tenant-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.44);
  backdrop-filter: blur(3px);
}

.tenant-modal {
  width: min(100%, 540px);
  padding: 28px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.2);
}

.tenant-kicker {
  margin: 0 0 10px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tenant-modal h2 {
  margin: 0;
  color: #111827;
  font-size: 28px;
  line-height: 1.15;
}

.tenant-copy {
  margin: 12px 0 0;
  color: #6b7280;
  line-height: 1.6;
}

.tenant-error {
  margin: 0 0 8px;
  color: #b91c1c;
  font-size: 13px;
}

.tenant-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 28px 0 20px;
}

.tenant-loading-text {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
}

/* Three-dot bounce spinner */
.tenant-spinner {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tenant-spinner span {
  display: block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #0f766e;
  animation: dot-bounce 1.2s infinite ease-in-out both;
}

.tenant-spinner span:nth-child(1) { animation-delay: -0.32s; }
.tenant-spinner span:nth-child(2) { animation-delay: -0.16s; }

@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40%           { transform: scale(1);   opacity: 1; }
}

.tenant-list {
  display: grid;
  gap: 12px;
  margin-top: 22px;
}

.tenant-field {
  display: grid;
  gap: 8px;
}

.tenant-field-label {
  color: #374151;
  font-size: 13px;
  font-weight: 600;
}

.tenant-select {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  padding: 13px 44px 13px 14px;
  font-size: 14px;
  font-weight: 600;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  cursor: pointer;
}

.tenant-select option {
  color: #111827;
  background: #ffffff;
  font-weight: 500;
}

.tenant-select option.placeholder {
  color: #9ca3af;
}

.tenant-select option:checked {
  background: #ecfeff;
  color: #0f766e;
}

.tenant-select option:hover {
  background: #f0fdfa;
}

.tenant-select-shell {
  position: relative;
  border: 1px solid #d1d5db;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.tenant-select-shell:hover {
  border-color: #94a3b8;
}

.tenant-select-shell:focus-within {
  border-color: #0f766e;
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
}

.tenant-select-icon {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
  font-size: 12px;
  line-height: 1;
}

.tenant-meta-block {
  margin: 0;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #f9fafb;
}

.tenant-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

.tenant-cancel {
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #fff;
  color: #374151;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.tenant-cancel:hover {
  background: #f9fafb;
}

.tenant-confirm {
  border: 0;
  border-radius: 999px;
  background: #0f766e;
  color: #fff;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.tenant-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tenant-name {
  display: block;
  color: #111827;
  font-weight: 700;
}

.tenant-meta {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
}

.logout-link {
  margin-top: 18px;
  border: 0;
  background: none;
  color: #b91c1c;
  font-weight: 700;
  cursor: pointer;
}

.logout-link:hover {
  color: #991b1b;
}
</style>
