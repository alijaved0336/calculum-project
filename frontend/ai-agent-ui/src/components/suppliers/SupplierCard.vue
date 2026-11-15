<template>
  <div class="card" @click="emit('open-chat', supplier)">
    <div class="card-top">
      <div class="card-name-block">
        <h2 class="card-name">{{ supplier.name }}</h2>
        <div class="card-received">
          <span class="field-label">Received Name:</span>
          <span class="received-value">{{ supplier.receivedName || 'N/A' }}</span>
        </div>
      </div>
    </div>

    <div class="badge-row">
      <div class="initials-badge">{{ supplierInitials(supplier.name) }}</div>
    </div>

    <div class="card-fields">
      <div class="field-row">
        <span class="field-label">Parents:</span>
        <span :class="['field-value', supplier.parentName ? 'link' : 'muted']">
          {{ supplier.parentName || 'N/A' }}
        </span>
      </div>
      <div class="field-row">
        <span class="field-label">Country</span>
        <span class="field-value link">{{ supplier.country || 'N/A' }}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Spend Volume:</span>
        <span class="field-value">
          {{ supplier.spendVolume == null ? 'N/A' : formatSpendVolume(supplier.spendVolume) }}
        </span>
      </div>
      <div class="field-row">
        <span class="field-label">SME:</span>
        <span class="field-value">
          {{ supplier.isSme == null ? 'Unknown' : supplier.isSme ? 'Yes' : 'No' }}
        </span>
      </div>
    </div>

    <div class="card-footer">
      <button class="analyzed-btn" type="button" @click.stop="emit('open-chat', supplier)">
        Analyzed
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatSpendVolume, supplierInitials } from '@/data/suppliers'
import type { SupplierListItem } from '@/api/session.api'

defineProps<{
  supplier: SupplierListItem
}>()

const emit = defineEmits<{
  'open-chat': [supplier: SupplierListItem]
}>()
</script>

<style scoped>
.card {
  background: #fff;
  border-radius: 12px;
  padding: 18px 20px 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07), 0 0 0 1px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.1s;
  position: relative;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.card-name-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.card-name {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  margin: 0;
  line-height: 1.3;
  word-break: break-word;
}

.card-received {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex-wrap: wrap;
}

.received-value {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.badge-row {
  display: flex;
}

.initials-badge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #e5e7eb;
  color: #374151;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.card-fields {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.field-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  line-height: 1.4;
}

.field-label {
  color: #6b7280;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 12.5px;
}

.field-value {
  color: #111827;
  font-size: 13px;
  min-width: 0;
  word-break: break-word;
}

.field-value.link {
  color: #2563eb;
}

.field-value.muted {
  color: #9ca3af;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.analyzed-btn {
  background: #1e293b;
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 6px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.analyzed-btn:hover {
  background: #0f172a;
}
</style>
