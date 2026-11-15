<template>
<CalculumModal :size="'md'" :showClose="true" :title="$t('adminBackend.dataChange.deny.title') || 'Reject Data Change Request'" @close="handleClose">
  <template v-slot:modalContent>
    <div class="deny-modal-content">
      <div class="modal-header-section">
        <div class="icon-wrapper">
          <svg class="warning-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <div class="header-content">
          <h3 class="modal-subtitle">{{ $t('adminBackend.dataChange.deny.title') || 'Reject Data Change Request' }}</h3>
          <p class="message-text">{{ $t('adminBackend.dataChange.deny.message') || 'Are you sure you want to reject this data change request? Please provide a reason for the rejection, this will be sent to the user.' }}</p>
        </div>
      </div>
      <div class="form-section">
        <div class="form-group">
          <div class="form-label-wrapper">
            <label class="form-label">{{ $t('adminBackend.dataChange.deny.reasonLabel') || 'Rejection Reason' }}</label><span class="optional-badge">{{ $t('global.optional') || 'Optional' }}</span>
          </div>
          <textarea class="form-textarea" v-model="rejectionMessage" :placeholder="$t('adminBackend.dataChange.deny.reasonPlaceholder') || 'Enter the reason for rejecting this request (optional)...'" rows="4" maxlength="1000"></textarea>
          <div class="char-count">{{ rejectionMessage.length }} / 1000</div>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <div class="modal-actions-wrapper">
      <button class="modal-btn-action modal-btn-secondary" @click="handleClose" :title="$t('global.cancel') || 'Cancel'"><span>{{ $t('global.cancel') || 'Cancel' }}</span></button>
      <button class="modal-btn-action modal-btn-danger" @click="handleConfirm" :title="$t('adminBackend.dataChange.deny.confirm') || 'Reject Request'">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12"></path>
        </svg><span>{{ $t('adminBackend.dataChange.deny.confirm') || 'Reject Request' }}</span>
      </button>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
  name: "DenyRequestModal",
  components: { CalculumModal },
  emits: ["confirm", "close"],
  setup(props, { emit }) {
    const rejectionMessage = ref("");

    const handleConfirm = () => {
      emit("confirm", rejectionMessage.value.trim() || "");
    };

    const handleClose = () => {
      emit("close");
    };

    return {
      rejectionMessage,
      handleConfirm,
      handleClose
    };
  }
});
</script>

<style lang="scss" scoped>
// Color Variables
$color-primary: #ff2c4f;
$color-rejected: #dc3545;
$color-warning: #f59e0b;
$color-warning-light: #fef3c7;
$color-warning-border: #fbbf24;
$color-text-primary: #1d2939;
$color-text-secondary: #667085;
$color-border: #eaecf0;
$color-bg: #f9fafb;
$color-danger-light: #fee2e2;
$color-danger-border: #fca5a5;

// Override inner-modal padding for this modal
:deep(.inner-modal) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.deny-modal-content {
  padding: 0;
  font-size: 1rem;

  .modal-header-section {
    display: flex;
    gap: 0.875rem;
    margin-bottom: 0.875rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, $color-danger-light 0%, lighten($color-danger-light, 3%) 100%);
    border-radius: 12px;
    border-left: 4px solid $color-rejected;
    animation: slideIn 0.3s ease-out;
    
    .icon-wrapper {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(220, 53, 69, 0.15);
      
      .warning-icon {
        width: 22px;
        height: 22px;
        color: $color-rejected;
        stroke-width: 2.5;
        animation: pulse 2s ease-in-out infinite;
      }
    }
    
    .header-content {
      flex: 1;
      
      .modal-subtitle {
        font-weight: 700;
        color: $color-text-primary;
        margin: 0 0 0.25rem 0;
        line-height: 1.3;
      }
      
      .message-text {
        color: $color-text-secondary;
        margin: 0;
        line-height: 1.5;
      }
    }
  }
  
  .form-section {
    padding: 0;
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0;
      
      .form-label-wrapper {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        
        .form-label {
          font-weight: 600;
          color: $color-text-primary;
          margin: 0;
        }
        
        .optional-badge {
          font-weight: 500;
          color: $color-text-secondary;
          background: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }
      }
      
      .form-textarea {
        width: 100%;
        padding: 0.875rem;
        border: 2px solid $color-border;
        border-radius: 8px;
        font-family: inherit;
        resize: vertical;
        min-height: 120px;
        transition: all 0.2s ease;
        background: white;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        
        &:focus {
          outline: none;
          border-color: $color-rejected;
          box-shadow: 0 0 0 4px rgba(220, 53, 69, 0.1), 0 2px 4px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }
        
        &::placeholder {
          color: lighten($color-text-secondary, 15%);
        }
      }
      
      .char-count {
        color: $color-text-secondary;
        text-align: right;
        font-weight: 500;
      }
    }
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.modal-actions-wrapper {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  padding-top: 0.5rem;
  margin-top: 0.5rem;
  width: 100%;
  margin-left: 0;
  margin-right: 0;
}

.modal-btn-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid $color-border;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: $color-text-primary;
  white-space: nowrap;
  
  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    stroke-width: 2.5;
  }
  
  &:hover:not(:disabled) {
    border-color: $color-primary;
    background: lighten($color-primary, 45%);
    color: $color-primary;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &.modal-btn-danger {
    &:hover:not(:disabled) {
      border-color: $color-rejected;
      background: lighten($color-rejected, 40%);
      color: $color-rejected;
    }
  }
  
  &.modal-btn-secondary {
    &:hover:not(:disabled) {
      border-color: $color-primary;
      background: lighten($color-primary, 45%);
      color: $color-primary;
    }
  }
}
</style>

