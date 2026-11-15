<template>
<CalculumModal @close="$emit('close')" :size="'sm'" :showClose="true" :title="titleText">
  <template v-slot:modalContent>
    <p>{{ type === 'edit' ? renameText : removeText }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="userClickedCancel" style="z-index: 1; width: fit-content"><span>{{$t('global.cancel')}}</span></button>
    <button class="btn btn-primary font-md" @click="userClickedYes" style="z-index: 1; width: fit-content"><span>{{$t('global.continue')}}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
  name: 'CalculumManageCommodityModal',
  components: { CalculumModal },
  props: {
    type: {
      type: String as () => 'edit' | 'delete',
      default: 'delete',
    },
    titleOverride: { type: String, default: '' },
    renameOverride: { type: String, default: '' },
    removeOverride: { type: String, default: '' },
  },
  emits: ['close', 'approve'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const titleText = computed(() => props.titleOverride || t('home.analyze.commodities.title'))
    const renameText = computed(() => props.renameOverride || t('home.analyze.commodities.rename'))
    const removeText = computed(() => props.removeOverride || t('home.analyze.commodities.remove'))
    function userClickedCancel() {
      emit('close')
    }
    function userClickedYes() {
      emit('approve')
    }
    return {
      titleText,
      renameText,
      removeText,
      userClickedCancel,
      userClickedYes,
    }
  }
})
</script>
