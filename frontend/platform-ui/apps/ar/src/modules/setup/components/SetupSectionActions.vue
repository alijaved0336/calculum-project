<template>
<CustomButton :text="t('arSetup.common.cancel')" :disabled="!dirty || busy" data-test="section-cancel" @click="$emit('cancel')" />
<CustomButton :text="t('arSetup.common.saveChanges')" variant="accent" :disabled="!canSave" data-test="section-save" @click="$emit('save')" />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { CustomButton } from '@ada/design-system'

/** AB#20702: the redesign's section footer - Cancel drops the section's edits, Save changes saves it. */
export default defineComponent({
  name: 'SetupSectionActions',
  components: { CustomButton },
  props: {
    dirty: { type: Boolean, default: false },
    canSave: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
  },
  emits: ['cancel', 'save'],
  setup() {
    const { t } = useI18n({ useScope: 'global' })
    return { t }
  },
})
</script>
