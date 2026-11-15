<template>
<CalculumModal :size="'md'" :showClose="true" :title="$t('adminBackend.potentialSupplierRequest.modal.reject.title') || 'Reject Request'" @close="handleClose">
  <template v-slot:modalContent>
    <div class="psr-modal-content">
      <div class="warn-banner">
        <div class="warn-icon-wrapper">
          <svg class="warn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div class="warn-text"><strong>{{ $t('adminBackend.potentialSupplierRequest.modal.reject.confirmTitle') || 'Confirm rejection' }}</strong>
          <p>{{ $t('adminBackend.potentialSupplierRequest.modal.reject.confirmMessage') || 'The selected request(s) will be marked as Rejected. This action cannot be undone.' }}</p>
        </div>
      </div>
      <div class="request-cards-list">
        <div class="request-card" v-for="req in requests" :key="req['@id']">
          <div class="card-flag-col"><span class="flag-lg">{{ getFlagEmoji(req.country.localizedName) }}</span></div>
          <div class="card-info-col">
            <div class="card-supplier-name">{{ req.name }}</div>
            <div class="card-meta"><span>{{ $t('adminBackend.potentialSupplierRequest.modal.requestedBy') || 'Requested by' }}</span><span class="capitalize"> {{ req.createdBy.firstName }} {{ req.createdBy.lastName }}</span><span class="sep">·</span><span class="email-text capitalize">{{ req.createdBy.email }}</span></div>
            <div class="card-spendfile"><span>{{ $t('adminBackend.potentialSupplierRequest.columns.spendFile') }}:</span><strong> {{ req.spendFileVersion.name }}</strong><span v-if="req.spendFileVersion.version"> (Ver. {{ req.spendFileVersion.version }})</span></div>
            <div class="card-details">             <span class="detail-label">{{ $t('adminBackend.potentialSupplierRequest.columns.country') || 'Country' }}:</span><strong>{{ req.country.localizedName }}</strong><span class="sep">·</span><span class="detail-label">{{ $t('adminBackend.potentialSupplierRequest.columns.currency') || 'Currency' }}:</span><strong>{{ req.currency.code }}</strong></div>
          </div>
        </div>
      </div>
      <div class="email-section">
        <div class="email-header">
          <label class="email-checkbox-label">
            <input class="email-checkbox" type="checkbox" v-model="sendEmail"/><span v-if="uniqueEmails.length <= 1">{{ $t('adminBackend.potentialSupplierRequest.modal.reject.sendEmail') || 'Notify requester by email' }}</span><span v-else>{{ $t('adminBackend.potentialSupplierRequest.modal.reject.sendEmailMultiple') || 'Notify all requesters by email' }}</span>
          </label>
          <svg class="email-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,12 2,6"></polyline>
          </svg>
        </div>
        <div class="email-to" v-if="sendEmail"><span class="email-to-label">To:</span>
          <div class="email-recipients"><span class="recipient-chip" v-for="email in uniqueEmails" :key="email">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="8" r="4"></circle>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path>
              </svg><span>{{ email }}</span></span></div><span class="recipients-count" v-if="uniqueEmails.length > 1">{{ uniqueEmails.length }} {{ $t('adminBackend.potentialSupplierRequest.modal.markAsSolved.recipients') || 'recipients' }}</span>
        </div>
        <div class="reason-field" v-if="sendEmail">
          <div class="reason-header"><span class="reason-label">{{ $t('adminBackend.potentialSupplierRequest.modal.reject.reason') || 'Reason for rejection' }}</span><span class="required-badge">{{ $t('global.required') || 'Required' }}</span></div>
          <textarea class="reason-textarea" v-model="rejectReason" rows="2" maxlength="500" :class="{ '--error': rejectReasonError }" :placeholder="$t('adminBackend.potentialSupplierRequest.modal.reject.reasonPlaceholder') || 'e.g. Supplier already exists, insufficient information...'" @input="rejectReasonError = false"></textarea><span class="reason-error" v-if="rejectReasonError">{{ $t('adminBackend.potentialSupplierRequest.modal.reject.reasonRequired') || 'Reason is required when sending an email.' }}</span>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <div class="modal-actions-wrapper">
      <button class="modal-btn-action modal-btn-secondary" @click="handleClose" :disabled="loading"><span>{{ $t('global.cancel') || 'Cancel' }}</span></button>
      <button class="modal-btn-action modal-btn-danger" @click="handleConfirm" :disabled="loading"><span class="spinner-border spinner-border-sm" v-if="loading" aria-hidden="true"></span>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"></path>
        </svg><span>{{ $t('adminBackend.potentialSupplierRequest.modal.reject.confirm') || 'Reject' }}</span>
      </button>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, PropType } from 'vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { PotentialSupplierRequest } from "@/types";


export default defineComponent({
  name: 'PotentialSupplierRejectModal',
  components: { CalculumModal },
  props: {
    requests: {
      type: Array as PropType<PotentialSupplierRequest[]>,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['confirm', 'close'],
  setup(props, { emit }) {
    const sendEmail = ref(true)
    const rejectReason = ref('')
    const rejectReasonError = ref(false)

    const uniqueEmails = computed(() => {
      return [...new Set(props.requests.map(r => r.createdBy.email).filter(Boolean))]
    })

    function getFlagEmoji(countryCode: string): string {
      if (!countryCode || countryCode.length !== 2) return ''
      return [...countryCode.toUpperCase()].map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
    }

    function handleConfirm() {
      if (sendEmail.value && !rejectReason.value.trim()) {
        rejectReasonError.value = true
        return
      }
      emit('confirm', {
        sendEmail: sendEmail.value,
        rejectReason: rejectReason.value.trim()
      })
    }

    function handleClose() {
      emit('close')
    }

    return {
      sendEmail,
      rejectReason,
      rejectReasonError,
      uniqueEmails,
      getFlagEmoji,
      handleConfirm,
      handleClose
    }
  }
})
</script>

<style lang="scss" scoped>
$color-primary: #ff2c4f;
$color-rejected: #dc3545;
$color-border: #eaecf0;
$color-text-primary: #1d2939;
$color-text-secondary: #667085;
$color-danger-light: #fce8ea;

:deep(.inner-modal) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.psr-modal-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  font-size: 1rem;
}

// ─── Warning banner ────────────────────────────────────────────────────────────
.warn-banner {
  display: flex;
  gap: 0.875rem;
  padding: 0.875rem;
  background: linear-gradient(135deg, $color-danger-light, lighten($color-danger-light, 3%));
  border-radius: 10px;
  border-left: 4px solid $color-rejected;
  animation: slideIn 0.25s ease-out;

  .warn-icon-wrapper {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(220, 53, 69, 0.15);
  }

  .warn-icon {
    width: 22px;
    height: 22px;
    color: $color-rejected;
    stroke-width: 2.5;
  }

  .warn-text {
    flex: 1;
    strong {
      display: block;
      font-weight: 700;
      color: $color-text-primary;
      margin-bottom: 0.25rem;
    }
    p {
      margin: 0;
      color: $color-text-secondary;
      line-height: 1.5;
    }
  }
}

// ─── Request cards ─────────────────────────────────────────────────────────────
.request-cards-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 80vh;
  overflow-y: auto;
}

.request-card {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border: 1px solid $color-border;
  border-radius: 8px;

  .card-flag-col {
    flex-shrink: 0;
    font-size: 1.75rem;
    line-height: 1;
    padding-top: 2px;
  }

  .card-info-col { flex: 1; min-width: 0; }

  .card-supplier-name {
    font-weight: 700;
    color: $color-text-primary;
    font-size: 0.9375rem;
    margin-bottom: 0.25rem;
  }

  .card-meta {
    font-size: 0.8125rem;
    color: $color-text-secondary;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    margin-bottom: 0.25rem;

    .psr-id   { font-weight: 600; color: $color-text-primary; }
    .sep      { color: lighten($color-text-secondary, 15%); }
    .email-text { color: $color-text-secondary; }
  }

  .card-spendfile {
    font-size: 0.8125rem;
    color: $color-text-secondary;
    strong { color: $color-text-primary; }
  }

  .card-details {
    font-size: 0.8125rem;
    color: $color-text-secondary;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.25rem;

    .detail-icon { width: 12px; height: 12px; flex-shrink: 0; }
    .detail-label { color: $color-text-secondary; }
    strong { color: $color-text-primary; }
    .sep { color: lighten($color-text-secondary, 15%); }
  }
}

// ─── Reason field ──────────────────────────────────────────────────────────────
.reason-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.reason-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .reason-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: $color-text-primary;
  }

  .optional-badge {
    font-size: 0.8125rem;
    color: $color-text-secondary;
    background: #f3f4f6;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
  }

  .required-badge {
    font-size: 0.8125rem;
    color: $color-rejected;
    background: $color-danger-light;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-weight: 600;
  }
}

.reason-textarea {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1.5px solid $color-border;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
  color: $color-text-primary;
  transition: border-color 0.2s;

  &::placeholder { color: lighten($color-text-secondary, 15%); }

  &:focus {
    outline: none;
    border-color: $color-rejected;
    box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
  }

  &.--error {
    border-color: $color-rejected;
    box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
  }
}

.reason-error {
  font-size: 0.8125rem;
  color: $color-rejected;
  margin-top: -0.125rem;
}

// ─── Email section ─────────────────────────────────────────────────────────────
.email-section {
  border: 1px solid $color-border;
  border-radius: 8px;
  padding: 0.875rem;
  background: white;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.email-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .email-icon {
    width: 18px;
    height: 18px;
    color: $color-text-secondary;
    flex-shrink: 0;
  }
}

.email-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  color: $color-text-primary;
  margin: 0;

  .email-checkbox {
    width: 1rem;
    height: 1rem;
    accent-color: $color-rejected;
    cursor: pointer;
    flex-shrink: 0;
  }
}

.email-to {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.875rem;
  color: $color-text-secondary;

  .email-to-label {
    font-weight: 600;
    color: $color-text-primary;
    padding-top: 0.2rem;
    flex-shrink: 0;
  }
}

.email-recipients {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  flex: 1;
}

.recipient-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: #fff0f1;
  border: 1px solid #f5c6cb;
  border-radius: 20px;
  padding: 0.2rem 0.625rem 0.2rem 0.4rem;
  font-size: 0.8125rem;
  color: $color-rejected;
  font-weight: 500;

  svg {
    width: 13px;
    height: 13px;
    color: $color-rejected;
    flex-shrink: 0;
  }
}

.recipients-count {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  color: $color-text-secondary;
  background: #f3f4f6;
  border: 1px solid $color-border;
  border-radius: 10px;
  padding: 0.1rem 0.5rem;
  white-space: nowrap;
  align-self: center;
}

// ─── Footer buttons ────────────────────────────────────────────────────────────
.modal-actions-wrapper {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  padding-top: 0.5rem;
}

.modal-btn-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.125rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  svg { width: 18px; height: 18px; stroke-width: 2.5; flex-shrink: 0; }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }

  &.modal-btn-secondary {
    background: white;
    border: 1px solid $color-border;
    color: $color-text-primary;
    &:hover { border-color: $color-text-secondary; background: #f9fafb; transform: translateY(-1px); }
  }

  &.modal-btn-danger {
    background: $color-rejected;
    border: 1px solid $color-rejected;
    color: white;
    &:hover { background: darken($color-rejected, 8%); transform: translateY(-1px); box-shadow: 0 3px 8px rgba($color-rejected, 0.3); }
  }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
