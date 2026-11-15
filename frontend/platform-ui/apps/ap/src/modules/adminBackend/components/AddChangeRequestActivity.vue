<template>
<div class="add-activity-section">
  <div class="add-activity-form-compact">
    <div class="form-input-row">
      <input class="form-input" type="text" v-model="message" :placeholder="$t('adminBackend.dataChange.activities.messagePlaceholder') || 'Enter your message...'" maxlength="1000" @keydown.enter.prevent="handleSubmit" @keydown.escape="handleCancel" ref="inputRef"/>
    </div>
    <div class="form-controls-row">
      <select class="form-select-compact" v-model="selectedActivityType" @change="handleTypeChange">
        <option value="comment">{{ $t('adminBackend.dataChange.activities.comment') || 'Comment' }}</option>
        <option value="information_requested">{{ $t('adminBackend.dataChange.activities.informationRequested') || 'Request Information' }}</option>
      </select>
      <button class="btn-send" @click="handleSubmit" :disabled="!canSubmit || loading" :class="{ 'loading': loading }" :title="$t('adminBackend.dataChange.activities.submit') || 'Send'">
        <svg v-if="!loading" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
        </svg>
        <svg class="spinning" v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 6v6l4 2"></path>
        </svg>
      </button>
    </div>
    <div class="form-note" v-if="selectedActivityType === 'information_requested'">{{ $t('adminBackend.dataChange.activities.informationRequestedNote') || 'This request will be notified by email to the user who created the request.' }}</div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, nextTick } from 'vue'
import { useToast } from 'vue-toastification'
import { useI18n } from 'vue-i18n'

export default defineComponent({
  name: 'AddChangeRequestActivity',
  props: {
    changeRequestId: {
      type: String,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    const toast = useToast()
    const { t } = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const inputRef = ref<HTMLInputElement | null>(null)
    
    const selectedActivityType = ref<'comment' | 'information_requested'>('comment')
    const message = ref('')
    
    const canSubmit = computed(() => {
      return message.value.trim().length > 0 && selectedActivityType.value
    })
    
    const handleSubmit = () => {
      if (!canSubmit.value) {
        return
      }
      
      emit('submit', {
        message: message.value.trim(),
        activityType: selectedActivityType.value
      })
      
      // Clear input after submit
      message.value = ''
      nextTick(() => {
        inputRef.value?.focus()
      })
    }
    
    const handleCancel = () => {
      message.value = ''
      selectedActivityType.value = 'comment'
      emit('cancel')
    }
    
    const handleTypeChange = () => {
      // Keep focus on input when type changes
      nextTick(() => {
        inputRef.value?.focus()
      })
    }
    
    onMounted(() => {
      // Auto-focus input when component mounts
      nextTick(() => {
        inputRef.value?.focus()
      })
    })
    
    return {
      selectedActivityType,
      message,
      canSubmit,
      handleSubmit,
      handleCancel,
      handleTypeChange,
      inputRef
    }
  }
})
</script>

<style lang="scss" scoped>
.add-activity-section {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #eaecf0;
  flex-shrink: 0;
  display: flex;
  font-size: 1rem;
  flex-direction: column;
  
  .add-activity-form-compact {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 0.5rem;
    transition: all 0.2s ease;
    
    &:focus-within {
      border-color: #3b82f6;
      background: white;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .form-input-row {
      display: flex;
      width: 100%;
      
      .form-input {
        flex: 1;
        border: none;
        background: transparent;
        color: #1d2939;
        padding: 0.375rem 0.5rem;
        outline: none;
        width: 100%;
        
        &::placeholder {
          color: #9ca3af;
        }
      }
    }
    
    .form-controls-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      
      .form-select-compact {
        padding: 0.375rem 0.625rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-weight: 500;
        background: white;
        color: #1d2939;
        cursor: pointer;
        transition: all 0.2s ease;
        outline: none;
        
        &:hover {
          border-color: #9ca3af;
        }
        
        &:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
      }
      
      .btn-send {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        border-radius: 6px;
        background: #3b82f6;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
        
        svg {
          width: 16px;
          height: 16px;
          stroke-width: 2.5;
        }
        
        &:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
        }
        
        &:active:not(:disabled) {
          transform: translateY(0);
        }
        
        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: #9ca3af;
        }
        
        &.loading {
          opacity: 0.7;
        }
        
        .spinning {
          animation: spin 1s linear infinite;
        }
      }
    }
    
    .form-note {
      color: #667085;
      line-height: 1.4;
      margin-top: 0.25rem;
      padding-left: 0.5rem;
      font-style: italic;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
