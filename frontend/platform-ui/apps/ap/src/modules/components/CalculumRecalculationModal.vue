<template>
<CalculumModal v-if="show && forEditFinancing" @close="() => $emit('recalculate-details', 'cancel')" :size="'lg'" :showClose="true" :title="$t('global.confirm')">
  <template v-slot:modalContent>
    <p>{{ $t('home.analyze.recalculationMessage') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="() => $emit('recalculate-details', 'cancel')" style="width: fit-content"> <span>{{$t('global.cancel')}}</span></button>
    <button class="btn btn-primary font-md" @click="() => $emit('recalculate-details', 'continue')" style="width: fit-content"> <span>{{$t('global.continue')}}  </span></button>
  </template>
</CalculumModal>
<CalculumModal v-if="show && forEditHarmonization" @close="() => $emit('cancel')" :size="'lg'" :showClose="true" :title="$t('global.confirm')">
  <template v-slot:modalContent>
    <p>{{ $t('home.analyze.recalculationMessage') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="() => $emit('recalculate-details', 'cancel')" style="width: fit-content"> <span>{{$t('global.cancel')}}</span></button>
    <button class="btn btn-primary font-md" @click="() => $emit('recalculate-details', 'continue')" style="width: fit-content"> <span>{{$t('global.continue')}}</span></button>
  </template>
</CalculumModal>
<CalculumModal v-if="show && !forEditFinancing && !forEditHarmonization" @close="() => $emit('cancel')" :size="'lg'" :showClose="true" :title="$t('home.analyze.groupsConfiguration.calculatingProgress')">
  <template v-slot:modalContent>
    <p>{{ $t('home.analyze.groupsConfiguration.recalculating') }}</p>
  </template>
  <template v-slot:modalButtons>
    <button class="btn btn-primary font-md" @click="() => $emit('hide')" style="width: fit-content"> <span>{{$t('button.ok')}}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { fontIcons } from '@/resources/assets/assets'
import CalculumModal from '@/modules/components/CalculumModal.vue'

export default defineComponent({
  name: 'CalculumRecalculationModal',
  props: {
    show: { type: Boolean, default: false },
    forEditFinancing: { type: Boolean, required: false },
    forEditHarmonization: { type: Boolean, required: false }
  },
  components: { CalculumModal },
  emits: ['hide', 'recalculate-program', 'cancel', 'cancelAndGoToDifferentTab', 'recalcualte-program-harmonization', 'recalculate-details'],
  setup() {
    return {
      fontIcons
    }
  }
})
</script>