<template>
<CalculumModal :size="'md'" :showClose="true" :title="$t('adminBackend.dataChange.markAsSolved.title') || 'Mark as Solved'" @close="handleClose">
  <template v-slot:modalContent>
    <div class="mark-solved-modal-content">
      <div class="modal-header-section">
        <div class="icon-wrapper">
          <svg class="success-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="header-content">
          <h3 class="modal-subtitle">{{ $t('adminBackend.dataChange.markAsSolved.title') || 'Mark as Solved' }}</h3>
          <p class="message-text">{{ $t('adminBackend.dataChange.markAsSolved.message') || 'Are you sure you want to mark this data change request as solved? Please provide a resolution message, this will be sent to the user.' }}</p>
        </div>
      </div>
      <div class="form-section">
        <div class="form-group">
          <div class="form-label-wrapper">
            <label class="form-label">{{ $t('adminBackend.dataChange.markAsSolved.resolutionLabel') || 'Resolution Message' }}</label><span class="optional-badge">{{ $t('global.optional') || 'Optional' }}</span>
          </div>
          <textarea class="form-textarea" v-model="resolutionMessage" :placeholder="$t('adminBackend.dataChange.markAsSolved.resolutionPlaceholder') || 'Enter the resolution message (optional)...'" rows="4" maxlength="1000"></textarea>
          <div class="char-count">{{ resolutionMessage.length }} / 1000</div>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <div class="modal-actions-wrapper">
      <button class="modal-btn-action modal-btn-secondary" @click="handleClose" :title="$t('global.cancel') || 'Cancel'"><span>{{ $t('global.cancel') || 'Cancel' }}</span></button>
      <button class="modal-btn-action modal-btn-success" @click="handleConfirm" :title="$t('adminBackend.dataChange.markAsSolved.confirm') || 'Mark as Solved'">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg><span>{{ $t('adminBackend.dataChange.markAsSolved.confirm') || 'Mark as Solved' }}</span>
      </button>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
  name: "MarkAsSolvedModal",
  components: { CalculumModal },
  emits: ["confirm", "close"],
  setup(props, { emit }) {
    const resolutionMessage = ref("");

    const handleConfirm = () => {
      emit("confirm", resolutionMessage.value.trim() || "");
    };

    const handleClose = () => {
      emit("close");
    };

    return {
      resolutionMessage,
      handleConfirm,
      handleClose
    };
  }
});
</script>

<style lang="scss" scoped>
// Color Variables
$color-primary: #ff2c4f;
$color-solved: #28a745;
$color-success: #28a745;
$color-success-dark: #218838;
$color-warning: #f59e0b;
$color-warning-light: #fef3c7;
$color-warning-border: #fbbf24;
$color-text-primary: #1d2939;
$color-text-secondary: #667085;
$color-border: #eaecf0;
$color-bg: #f9fafb;
$color-success-light: #d4edda;
$color-success-border: #c3e6cb;

// Override inner-modal padding for this modal
:deep(.inner-modal) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.mark-solved-modal-content {
  padding: 0;
  font-size: 1rem;

  .modal-header-section {
    display: flex;
    gap: 0.875rem;
    margin-bottom: 0.875rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, $color-success-light 0%, lighten($color-success-light, 3%) 100%);
    border-radius: 12px;
    border-left: 4px solid $color-success;
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
      box-shadow: 0 2px 8px rgba(40, 167, 69, 0.15);
      
      .success-icon {
        width: 22px;
        height: 22px;
        color: $color-success;
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
          border-color: $color-success;
          box-shadow: 0 0 0 4px rgba(40, 167, 69, 0.1), 0 2px 4px rgba(0, 0, 0, 0.1);
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
  
  &.modal-btn-success {
    &:hover:not(:disabled) {
      border-color: $color-success;
      background: lighten($color-success, 40%);
      color: $color-success;
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
