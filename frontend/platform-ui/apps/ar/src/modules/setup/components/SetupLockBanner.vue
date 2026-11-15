<template>
<div v-if="lock.failed.value" class="alert alert-danger setup-lock-banner" role="alert">
  {{ t('arSetup.lock.failed') }}
</div>
<output v-else-if="lock.locked.value" class="alert alert-info setup-lock-banner d-flex align-items-center gap-2">
  <span class="spinner-border spinner-border-sm" aria-hidden="true" />
  <span>
    {{ stepText }}
  </span>
</output>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSetupLock } from '../composables/useSetupLock'

/** AB#20702 (impl plan L): the banner every Setup tab shows while the sale file recalculates. */
export default defineComponent({
  name: 'SetupLockBanner',
  setup() {
    const { t } = useI18n({ useScope: 'global' })
    const lock = useSetupLock()

    const stepText = computed(() => {
      const { currentStep, totalSteps } = lock.progress.value
      return currentStep !== null && totalSteps !== null
        ? t('arSetup.lock.recalculatingStep', { step: currentStep, total: totalSteps })
        : t('arSetup.lock.recalculating')
    })

    return { t, lock, stepText }
  },
})
</script>

<style lang="scss" scoped>
.setup-lock-banner {
  font-size: 0.875rem;
}
</style>
