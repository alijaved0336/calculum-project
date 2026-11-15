<template>
  <Teleport to="body">
    <div v-if="card" class="summary-modal-shell" @click.self="emit('close')">
      <div class="summary-modal">
        <div class="summary-modal-head">
          <div class="summary-modal-heading">
            <p class="summary-modal-kicker">Supplier position</p>
          </div>
          <button class="summary-modal-close" type="button" aria-label="Close" @click="emit('close')">
            <CloseSvg />
          </button>
        </div>
        <div class="summary-modal-body">
          <SupplierFactsCard :card="card" expanded />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { SummaryCard } from '@/types/chat'
import { CloseSvg } from '@/components/chat/icons'
import SupplierFactsCard from '@/components/chat/SupplierFactsCard.vue'

defineProps<{
  card: SummaryCard | null
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<style scoped>
.summary-modal-shell {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.45);
}

.summary-modal {
  width: min(720px, 100%);
  max-height: min(90vh, 900px);
  overflow: auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.25);
  padding: 18px 22px 22px;
}

.summary-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eef0f4;
}

.summary-modal-kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6b7280;
}

.summary-modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #f3f4f6;
  cursor: pointer;
  color: #374151;
}

.summary-modal-close:hover {
  background: #e5e7eb;
}

.summary-modal-body {
  min-width: 0;
  overflow: visible;
}
</style>
