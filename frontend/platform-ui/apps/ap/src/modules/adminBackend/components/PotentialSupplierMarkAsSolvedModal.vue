<template>
<CalculumModal :size="'md'" :showClose="true" :title="$t('adminBackend.potentialSupplierRequest.modal.markAsSolved.title') || 'Mark as Solved'" @close="handleClose">
  <template v-slot:modalContent>
    <div class="psr-modal-content">
      <div class="confirm-banner">
        <div class="confirm-icon-wrapper">
          <svg class="confirm-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="confirm-text"><strong>{{ $t('adminBackend.potentialSupplierRequest.modal.markAsSolved.confirmTitle') }}</strong>
          <p>{{ $t('adminBackend.potentialSupplierRequest.modal.markAsSolved.confirmMessage')  }}</p>
        </div>
      </div>
      <div class="request-cards-list">
        <div class="request-card" v-for="req in requests" :key="req['@id']">
          <div class="card-flag-col"><span class="flag-lg">{{ getFlagEmoji(req.country.localizedName) }}</span></div>
          <div class="card-info-col">
            <div class="card-supplier-name">{{ req.name }}</div>
            <div class="card-meta"><span>{{ $t('adminBackend.potentialSupplierRequest.modal.requestedBy') }}</span><span class="capitalize"> {{ req.createdBy.firstName }} {{ req.createdBy.lastName }}</span><span class="sep">·</span><span class="email-text capitalize">{{ req.createdBy.email }}</span></div>
            <div class="card-spendfile"><span>{{ $t('adminBackend.potentialSupplierRequest.columns.spendFile') }}:</span><strong> {{ req.spendFileVersion.name }}</strong><span v-if="req.spendFileVersion.version"> (Ver. {{ req.spendFileVersion.version }})</span></div>
            <div class="card-details"><span class="detail-label">{{ $t('adminBackend.potentialSupplierRequest.columns.country') }}:</span><strong>{{ req.country.localizedName }}</strong><span class="sep">·</span><span class="detail-label">{{ $t('adminBackend.potentialSupplierRequest.columns.currency') }}:</span><strong>{{ req.currency.code }}</strong></div>
          </div>
        </div>
      </div>
      <div class="match-section"><span class="match-label">{{ $t('adminBackend.potentialSupplierRequest.modal.markAsSolved.matchSupplier') }}</span>
        <SearchableDropdown v-if="unmatchedSuppliers.length > 0 && !loadingSomeApi" v-model="potentialIdMatch" :items="unmatchedSuppliers" value-key="id" label-key="name" :placeholder="$t('adminBackend.potentialSupplierRequest.modal.markAsSolved.matchPlaceholder') " :show-clear-option="true"></SearchableDropdown><span class="font-medium" v-if="unmatchedSuppliers.length === 0 && !loadingSomeApi">{{ $t('global.noMatchSuppliers')}}</span>
      </div>
      <div class="email-section">
        <div class="email-header">
          <label class="email-checkbox-label">
            <input class="email-checkbox" type="checkbox" v-model="sendEmail"/><span v-if="uniqueEmails.length <= 1">{{ $t('adminBackend.potentialSupplierRequest.modal.markAsSolved.sendEmail')  }}</span><span v-else>{{ $t('adminBackend.potentialSupplierRequest.modal.markAsSolved.sendEmailMultiple')  }}</span>
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
              </svg><span>{{ email }}</span></span></div><span class="recipients-count" v-if="uniqueEmails.length > 1">{{ uniqueEmails.length }} {{ $t('adminBackend.potentialSupplierRequest.modal.markAsSolved.recipients') }}</span>
        </div>
        <div class="email-message-field" v-if="sendEmail">
          <div class="email-message-header"><span class="email-message-label">{{ $t('adminBackend.potentialSupplierRequest.modal.markAsSolved.emailMessage') }}</span><span class="optional-badge">{{ $t('global.optional') || 'Optional' }}</span></div>
          <textarea class="email-textarea" v-model="emailMessage" rows="3" maxlength="500"></textarea>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <div class="modal-actions-wrapper" v-if="!loadingSomeApi">
      <button class="modal-btn-action modal-btn-secondary" @click="handleClose" :disabled="loading "><span>{{ $t('global.cancel') || 'Cancel' }}</span></button>
      <button class="modal-btn-action modal-btn-primary" @click="handleConfirm" :disabled="loading || !potentialIdMatch"><span class="spinner-border spinner-border-sm" v-if="loading" aria-hidden="true"></span>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg><span>{{ $t('adminBackend.potentialSupplierRequest.modal.markAsSolved.confirm') }}</span>
      </button>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, PropType } from 'vue'
import { useToast } from 'vue-toastification'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { SearchableDropdown } from '@ada/design-system'
import { PotentialSupplierRequest } from "@/types";
import { getUnmatchedPotentialSuppliers } from '@/modules/adminBackend/api/potentialSupplierRequests'
import { useI18n } from 'vue-i18n'

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return ''
  return [...countryCode.toUpperCase()].map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
}

export default defineComponent({
  name: 'PotentialSupplierMarkAsSolvedModal',
  components: { CalculumModal, SearchableDropdown },
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
    const toast = useToast()
    const sendEmail = ref(true)
    const emailMessage = ref('Your potential supplier was processed and is now available in the Potential Suppliers tab.')
    const unmatchedSuppliers = ref<any[]>([])
    const potentialIdMatch = ref('')
    const loadingSomeApi = ref(false)
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })

    onMounted(async () => {
      if (!props.requests.length) return
      const numericId = props.requests[0]['@id'].split('/').pop()
      if (!numericId) return
      loadingSomeApi.value = true
      try {
        const result = await getUnmatchedPotentialSuppliers(numericId)
        if (result.success) {
          const raw = result.data
          unmatchedSuppliers.value = Array.isArray(raw) ? raw : (raw?.['hydra:member'] ?? [])
          const requestCountryIri = props.requests[0].country?.['@id']
          if (requestCountryIri) {
            const match = unmatchedSuppliers.value.find((s: any) => s.country?.['@id'] === requestCountryIri)
            if (match) potentialIdMatch.value = match.id
          }
        }
      } catch (e) {
        console.error('Failed to load unmatched suppliers:', e)
        toast.error(translate.t('adminBackend.potentialSupplierRequest.modal.markAsSolved.errorGettingSuggestions'))
      } finally {
        loadingSomeApi.value = false
      }
    })

    const uniqueEmails = computed(() => {
      return [...new Set(props.requests.map(r => r.createdBy.email).filter(Boolean))]
    })

    function handleConfirm() {
      emit('confirm', {
        sendEmail: sendEmail.value,
        emailMessage: sendEmail.value ? emailMessage.value.trim() : '',
        potentialIdMatch: potentialIdMatch.value
      })
    }

    function handleClose() {
      emit('close')
    }

    return {
      sendEmail,
      emailMessage,
      uniqueEmails,
      unmatchedSuppliers,
      potentialIdMatch,
      getFlagEmoji,
      handleConfirm,
      handleClose,
      loadingSomeApi
    }
  }
})
</script>

<style lang="scss" scoped>
$color-primary: #ff2c4f;
$color-solved: #28a745;
$color-border: #eaecf0;
$color-text-primary: #1d2939;
$color-text-secondary: #667085;
$color-success-light: #d4edda;

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

// ─── Confirmation banner ───────────────────────────────────────────────────────
.confirm-banner {
  display: flex;
  gap: 0.875rem;
  padding: 0.875rem;
  background: linear-gradient(135deg, $color-success-light, lighten($color-success-light, 3%));
  border-radius: 10px;
  border-left: 4px solid $color-solved;
  animation: slideIn 0.25s ease-out;

  .confirm-icon-wrapper {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(40, 167, 69, 0.15);
  }

  .confirm-icon {
    width: 22px;
    height: 22px;
    color: $color-solved;
    stroke-width: 2.5;
  }

  .confirm-text {
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

  .card-info-col {
    flex: 1;
    min-width: 0;
  }

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

    .psr-id { font-weight: 600; color: $color-text-primary; }
    .sep    { color: lighten($color-text-secondary, 15%); }
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

// ─── Match supplier ────────────────────────────────────────────────────────────
.match-section {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.match-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-text-primary;
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
    accent-color: $color-primary;
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
  background: #f0f4ff;
  border: 1px solid #c7d7fc;
  border-radius: 20px;
  padding: 0.2rem 0.625rem 0.2rem 0.4rem;
  font-size: 0.8125rem;
  color: #1a56db;
  font-weight: 500;

  svg {
    width: 13px;
    height: 13px;
    color: #4b72db;
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

.email-message-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.email-message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .email-message-label {
    font-size: 0.875rem;
    color: $color-text-secondary;
  }

  .optional-badge {
    font-size: 0.8125rem;
    color: $color-text-secondary;
    background: #f3f4f6;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
  }
}

.email-textarea {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1.5px solid $color-border;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
  color: $color-text-primary;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: $color-solved;
    box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
  }
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

  &.modal-btn-primary {
    background: $color-primary;
    border: 1px solid $color-primary;
    color: white;
    &:hover { background: darken($color-primary, 8%); transform: translateY(-1px); box-shadow: 0 3px 8px rgba($color-primary, 0.3); }
  }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
