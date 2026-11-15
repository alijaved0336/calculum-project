<template>
<td>
  <Tooltip class="ellipsis_tooltip_custom_text" :open-delay="100" :anchor-element="'target'" :position="'bottom'">
    <div @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
      <p class="pt-3 ml-2 ellipsis_custom custom-td-cell-for-grid" v-if="checkPropValue(dataItem?.spendFileVersionNotes) && !showTextarea" :title="dataItem?.spendFileVersionNotes">{{ truncateNote }}</p>
      <textarea class="form-control change-alias" v-model="notes" @change="changeNote" v-else @blur="handleTextareaBlur" ref="textareaRef" placeholder="Add note..."></textarea><span class="counter" v-if="showTextarea" :class="{ 'text-danger': remainingChars.alert }">{{ remainingChars.result }}</span>
    </div>
  </Tooltip>
</td>
</template>

<script lang="ts">
import { checkPropValue } from '@/utils/gridCellRelated';
import { Tooltip } from '@progress/kendo-vue-tooltip';
import { computed, ComputedRef, defineComponent, nextTick, reactive, ref, watch } from 'vue';
import { useAdminBackendStore } from '@/stores/adminBackend';
import { useToast } from "vue-toastification";
import { useI18n } from 'vue-i18n';

export default defineComponent({
  name: "AdminNotes",
  components: {
    Tooltip,
  },
  inject: {
    kendoIntlService: { default: null }
  },

  props: {
    dataItem: { type: Object, required: true },
    behavior: { type: String, default: 'adminNotes' },
  },
  emits: ['update-row-data-notes'],
  setup(props, { emit }) {
    const adminBackendStore = useAdminBackendStore()
    const toast = useToast()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const lastnotes = ref<string>(props.dataItem.spendFileVersionNotes)
    const showTextarea = ref(false);
    const hoverTimer = ref<number | null>(null)
    const textareaRef = ref<HTMLTextAreaElement | null>(null)
    const maxLength = 1000
    const remainingCharsAlert = 50
    const maxLengthReched = "“Note must be 1000 characters or fewer.”"
    const remainingChars = computed<{ alert: boolean, result: string, reached: boolean }>(() => {
      const remaining = maxLength - (notes.value?.length || 0)
      let showMessage = {
        alert: false,
        result: `${remaining} / ${maxLength}`,
        reached: false
      }
      if (remaining < remainingCharsAlert) {
        showMessage.alert = true
        if (remaining <= 0) {
          showMessage.result = maxLengthReched
          showMessage.reached = true
        }
      }
      return showMessage
    })
    const truncateNote: ComputedRef<string> = computed(() => {
      let resultNote:string=props.dataItem.spendFileVersionNotes;
      if (!resultNote || resultNote==='Add note...') {
        notes.value = ''
        lastnotes.value = ''
      }
      if (resultNote.length > 50) {
        return resultNote.slice(0, 50) + '...';
      }
      return resultNote
    })
    const notes = ref<string>(props.dataItem.spendFileVersionNotes)

    watch(props, () => {
      notes.value = props.dataItem.spendFileVersionNotes
      lastnotes.value = props.dataItem.spendFileVersionNotes
    })
    function changeNote(event: any) {
      event.preventDefault()
      const params = reactive({
        spendFileVersionUUID: props.dataItem.uuid,
        spendFileVersionNotes: notes.value,
        callbackSuccess: () => {          
          emit('update-row-data-notes', props.dataItem.uuid, notes.value)
          toast.success(translate.t('global.noty.success.update.note'));
        },
        callbackError: (callbackFailData: any) => {
          notes.value = lastnotes.value
          toast.error(translate.t('global.noty.error.update.note'));
        }
      })
      adminBackendStore.updateSpendNotes(params)
    }

    const handleMouseEnter = (): void => {
      clearTimeout(hoverTimer.value as number)
      hoverTimer.value = window.setTimeout(() => {
        showTextarea.value = true
        nextTick(() => {
          textareaRef.value?.focus()
        })
      }, 50)
    }

    const handleMouseLeave = (): void => {
      clearTimeout(hoverTimer.value as number)
      if (!textareaRef.value?.matches(':focus')) {
        showTextarea.value = false
      }
    }

    const handleTextareaBlur = (): void => {
      showTextarea.value = false
    }
    return {
      truncateNote,
      checkPropValue,
      notes,
      changeNote,
      showTextarea,
      handleMouseEnter,
      handleMouseLeave,
      handleTextareaBlur,
      textareaRef,
      maxLength,
      remainingChars,
      remainingCharsAlert
    }
  }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

textarea.form-control.change-alias {
  border: none;
  background-color: transparent;
  &::placeholder {
    opacity: 0;
  }
}

textarea.form-control.change-alias:hover,
textarea.form-control.change-alias:focus {
  border: 1px solid black;
  padding: 5px 10px;
  background-color: white;
  &::placeholder {
    opacity: 1;
  }
}

.counter {
  right: 5px;
  bottom: 5px;
  font-size: 12px;
  color: #666;
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 5px;
  border-radius: 3px;

  &.text-danger {
    color: #ff2c4f;
    font-weight: bold;
  }
}
</style>