<template>
<CalculumModal v-if="forCloneRow" @close="handleClose" :size="'md'" :showClose="true" :title="$t('global.deleteModal.clone.title')">
  <template v-slot:modalContent>
    <div class="clone-modal-content">
      <div class="modal-header-section">
        <div class="icon-wrapper">
          <svg class="clone-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
        </div>
        <div class="header-content">
          <h3 class="modal-subtitle">{{ $t('global.deleteModal.clone.title') }}</h3>
          <p class="message-text">{{ $t('global.deleteModal.clone.message') }}</p>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <div class="modal-actions-wrapper">
      <button class="modal-btn-action modal-btn-secondary" @click="handleClose" :title="$t('global.cancel') || 'Cancel'"><span>{{ $t('global.cancel') }}</span></button>
      <button class="modal-btn-action modal-btn-primary" @click="deleteEmit" :title="$t('global.clone') || 'Clone'">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg><span>{{ $t('global.clone') }}</span>
      </button>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent} from 'vue'
import iconClose from '@/resources/assets/images/icons/iconClose.vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
export default defineComponent({
  name: 'CalculumDeleteModal',
  props: { 
    forCloneRow: {type: Boolean, required: false}, 
    },
  components: {
    iconClose, CalculumModal
  }  ,
  emits: ['hide', 'discard', 'submit', 'clone'],
  setup(props, {emit}) {
    function deleteEmit(){
      if (props.forCloneRow) {
        emit('clone')
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
$color-info: #3b82f6;
$color-info-light: #dbeafe;
$color-info-dark: #2563eb;
$color-text-primary: #1d2939;
$color-text-secondary: #667085;
$color-border: #eaecf0;
$color-info-border: #93c5fd;

// Override inner-modal padding for this modal
:deep(.inner-modal) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.clone-modal-content {
  padding: 0;
  
  .modal-header-section {
    display: flex;
    gap: 0.875rem;
    margin-bottom: 0;
    padding: 0.75rem;
    background: linear-gradient(135deg, $color-info-light 0%, lighten($color-info-light, 3%) 100%);
    border-radius: 12px;
    border-left: 4px solid $color-info;
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
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
      
      .clone-icon {
        width: 22px;
        height: 22px;
        color: $color-info;
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
  
  &.modal-btn-primary {
    &:hover:not(:disabled) {
      border-color: $color-info;
      background: lighten($color-info, 40%);
      color: $color-info;
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
