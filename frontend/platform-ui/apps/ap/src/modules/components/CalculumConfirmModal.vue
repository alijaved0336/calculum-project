<template>
<CalculumModal v-if="isDeleteModalShowing && !isModalForChanginTemplateOrProgramShowing && !show" @close="() => $emit('hide')" :size="'lg'" :showClose="false" :title="$t('home.plan.programToPlan2.confirm')">
  <template v-slot:modalContent>
    <p v-if="!isForUiGroup">{{ $t('home.plan.programToPlan2.deleteConfirm') }}</p>
    <p v-if="isForUiGroup">{{ $t('adminBackend.uiGroupsAdmin.deleteConfirm') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="() => $emit('hide')" style="z-index: 1; width: fit-content">{{ $t('button.cancel') }}</button>
    <button class="btn btn-primary font-md" @click="() => $emit('delete')" style="z-index: 1; width: fit-content;">{{ $t('global.delete') }}</button>
  </template>
</CalculumModal>
<CalculumModal :size="'lg'" :showClose="false" :title="$t('home.plan.programToPlan2.confirm')" @close="() => $emit('hide')" v-if="show && !isModalForChanginTemplateOrProgramShowing && !isModalForSetupStrategiesShowing">
  <template v-slot:modalContent>
    <p>{{ $t('home.plan.programToPlan2.confirmMessage') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="() => $emit('hide')" style="z-index: 1; width: fit-content"> <span>{{ $t('button.cancel') }}</span></button>
    <button class="btn outline-secondary-btn font-md" @click="$emit('discard')" style="z-index: 1; width: fit-content"> <span>{{ $t('button.discardChanges') }}</span></button>
    <button class="btn btn-primary font-md" @click="$emit('submit')" style="z-index: 1; width: fit-content;"> <span>{{ $t('global.save') }}</span></button>
  </template>
</CalculumModal>
<CalculumModal :size="'lg'" :showClose="false" :title="$t('home.plan.programToPlan2.confirm')" @close="() => $emit('close-with-template-or-program-selection')" v-if="isModalForChanginTemplateOrProgramShowing">
  <template v-slot:modalContent>
    <p>{{ $t('home.plan.programToPlan2.confirmTemplateMessage') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="() => $emit('close-with-template-or-program-selection')" style="z-index: 1; width: fit-content"> <span>{{ $t('button.cancel') }}</span></button>
    <button class="btn btn-primary font-md" @click="$emit('continue-with-template-or-program-selection', thisSelectedDropdownValue)" style="z-index: 1; width: fit-content;"> <span>{{ $t('global.continue') }}</span></button>
  </template>
</CalculumModal>
<CalculumModal :size="'lg'" :showClose="false" :title="$t('global.confirm')" :zIndex="zIndex" @close="() => $emit('hide')" v-if="show && isModalForSetupStrategiesShowing">
  <template v-slot:modalContent>
    <p>{{ $t('home.homePreference.unsavedChanges') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="() => $emit('hide')" style="z-index: 1; width: fit-content"> <span>{{ $t('button.cancel') }}</span></button>
    <button class="btn outline-secondary-btn font-md" @click="$emit('discard')" style="z-index: 1; width: fit-content"> <span>{{ $t('button.discardChanges') }}</span></button>
    <button class="btn btn-primary font-md" @click="$emit('submit')" style="z-index: 1; width: fit-content;"> <span>{{ $t('global.save') }}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
  name: 'CalculumConfirmModal',
  components: { CalculumModal },
  props: {
    show: { type: Boolean, default: false },
    isModalForChanginTemplateOrProgramShowing: { type: Boolean, required: false },
    thisSelectedDropdownValue: { type: String, required: false, default: '' },
    isDeleteModalShowing: { type: Boolean, required: false },
    isForUiGroup: { type: Boolean, required: false },
    isModalForSetupStrategiesShowing: { type: Boolean, required: false },
    zIndex: { type: Boolean, default: false },
  },
  emits: ['hide', 'discard', 'submit', 'continue-with-template-or-program-selection', 'close-with-template-or-program-selection', 'delete']
})
</script>
