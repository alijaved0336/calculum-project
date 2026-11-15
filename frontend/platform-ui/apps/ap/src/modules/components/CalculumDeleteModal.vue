<template>
<CalculumModal v-if="forDeleteDataChangeRow" @close="handleClose" :size="'md'" :showClose="true" :title="$t('global.deleteModal.title')">
  <template v-slot:modalContent>
    <div class="delete-modal-content">
      <div class="modal-header-section">
        <div class="icon-wrapper">
          <svg class="warning-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <div class="header-content">
          <h3 class="modal-subtitle">{{ $t('global.deleteModal.title') }}</h3>
          <p class="message-text">{{ $t('global.deleteModal.messageDefault') }}</p>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <div class="modal-actions-wrapper">
      <button class="modal-btn-action modal-btn-secondary" @click="handleClose" :disabled="loading" :title="$t('global.cancel') || 'Cancel'"><span>{{ $t('global.cancel') }}</span></button>
      <button class="modal-btn-action modal-btn-danger" @click="deleteEmit" :disabled="loading" :title="$t('global.delete') || 'Delete'">
        <template v-if="!loading">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg><span>{{ $t('global.delete') }}</span>
        </template><span v-else role="status" aria-live="polite"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span><span class="ms-2">{{ $t('global.deleting') || 'Deleting...' }}</span></span>
      </button>
    </div>
  </template>
</CalculumModal>
<CalculumModal :size="'md'" :showClose="true" :title="$t('global.deleteModal.title')" @close="() => $emit('hide')" v-if="forDeleteCompanyFile || forDeleteSpendFile || forDeleteEMISFile || forDeleteUser">
  <template v-slot:modalContent>
    <p>{{ forDeleteUser ? $t('global.confirmDeleteUser')  : $t('global.deleteModal.message') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="() => $emit('hide')" :disabled="loading" style="z-index: 1; width: fit-content"> <span>{{ $t('global.cancel') }}</span></button>
    <button class="btn btn-primary font-md" @click="deleteEmit()" :disabled="loading" style="z-index: 1; width: fit-content;"> <span v-if="!loading">{{ $t('global.delete') }}</span><span v-else role="status" aria-live="polite"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span><span class="ms-2">{{ $t('global.deleting') || 'Deleting...' }}</span></span></button>
  </template>
</CalculumModal>
<CalculumModal :size="'md'" :showClose="true" :title="$t('home.plan.programToPlan2.confirm')" @close="() => $emit('hide')" v-if="show">
  <template v-slot:modalContent>
    <p>{{ $t('home.plan.programToPlan2.deleteGroupsMessage') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="() => $emit('hide')" style="z-index: 1; width: fit-content"> <span>{{ $t('global.no') }}</span></button>
    <button class="btn btn-primary font-md" @click="$emit('submit')" style="z-index: 1; width: fit-content;"> <span>{{ $t('global.yes') }}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import iconClose from '@/resources/assets/images/icons/iconClose.vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
export default defineComponent({
  name: 'CalculumDeleteModal',
  components: {
    iconClose, CalculumModal
  },
  props: {
    forDeleteDataChangeRow: { type: Boolean, default: false },
    forDeleteUser: { type: Boolean, default: false },
    forDeleteEMISFile: { type: Boolean, default: false },
    forDeleteSpendFile: { type: Boolean, default: false },
    forDeleteCompanyFile: { type: Boolean, default: false },
    show: { type: Boolean, default: false },
    /** Parent must set to true when delete handler starts and false when it completes or fails. */
    loading: { type: Boolean, default: false },
  },
  emits: ['hide', 'discard', 'submit', 'deleteEMISFile', 'deleteSpendFile', 'deleteCompanyFile', 'delete'],
  setup(props, { emit }) {
    /**
     * Emits the appropriate delete event. The parent's handler must perform the async
     * deletion and update the loading prop (true when starting, false when done or on error).
     */
    function deleteEmit() {
      if (props.forDeleteEMISFile) {
        emit('deleteEMISFile')
      }
      if (props.forDeleteCompanyFile) {
        emit('deleteCompanyFile')
      }
      if (props.forDeleteSpendFile) {
        emit('deleteSpendFile')
      }
      if (props.forDeleteUser || props.forDeleteDataChangeRow) {
        emit('delete')
      }
    }

    const handleClose = () => {
      emit('hide')
    }

    return {
      deleteEmit,
      handleClose
    }
  }
})
</script>

<style scoped lang="scss">
// Color Variables
$color-primary: #ff2c4f;
$color-rejected: #dc3545;
$color-danger: #dc3545;
$color-danger-dark: #c82333;
$color-text-primary: #1d2939;
$color-text-secondary: #667085;
$color-border: #eaecf0;
$color-danger-light: #fee2e2;
$color-danger-border: #fca5a5;

// Override inner-modal padding for this modal
:deep(.inner-modal) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.delete-modal-content {
  padding: 0;
  
  .modal-header-section {
    display: flex;
    gap: 0.875rem;
    margin-bottom: 0;
    padding: 0.75rem;
    background: linear-gradient(135deg, $color-danger-light 0%, lighten($color-danger-light, 3%) 100%);
    border-radius: 12px;
    border-left: 4px solid $color-danger;
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
        color: $color-danger;
        stroke-width: 2.5;
        animation: pulse 2s ease-in-out infinite;
      }
    }
    
    .header-content {
      flex: 1;
      
      .modal-subtitle {
        font-size: 15px;
        font-weight: 700;
        color: $color-text-primary;
        margin: 0 0 0.25rem 0;
        line-height: 1.3;
      }
      
      .message-text {
        font-size: 13px;
        color: $color-text-secondary;
        margin: 0;
        line-height: 1.5;
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
  font-size: 13px;
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
      border-color: $color-danger;
      background: lighten($color-danger, 40%);
      color: $color-danger;
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
