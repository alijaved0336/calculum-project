<template>
<CalculumModal @close="$emit('hide-modal')" :size="'md'" :title="$t('global.confirmAction')" :showClose="true">
  <template v-slot:modalContent>
    <p v-html="actionDescription"></p>
    <div class="warning-box"><i class="fa-solid fa-triangle-exclamation"></i><span>{{ $t('global.calculationsPending') }}</span></div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="$emit('hide-modal')" style="z-index: 1; width: fit-content"><span>{{ $t('global.no') }}</span></button>
    <button class="btn btn-primary font-md" @click="$emit('confirm-action')" style="z-index: 1; width: fit-content"><span>{{ $t('global.yes') }}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
export default defineComponent({
  name: 'CalculumModalConfirmAction',
  components: {
    CalculumModal
  },
  props: {
    actionDescription: { type: String, required: true},
    withoutNavbar: { type: Boolean, required: false, default: false }
  },
  emits: ['confirm-action','hide-modal'],
  setup() {
    return {
    }
  }
})
</script>

<style scoped lang="scss">
.warning-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  background-color: #fffbeb;
  border: 1px solid #f59e0b;

  i {
    color: #f59e0b;
    font-size: 14px;
    margin-top: 2px;
    flex-shrink: 0;
  }

  span {
    font-size: 13px;
    color: #92400e;
    line-height: 1.4;
  }
}
</style>
