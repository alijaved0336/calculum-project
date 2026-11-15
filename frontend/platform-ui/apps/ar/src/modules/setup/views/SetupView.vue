<template>
<CalculumLayout :container-class="'setup-section'" :container-id="'setup-header-menu'">
  <template #slotTop>
    <div class="setup-top">
      <div class="d-flex align-items-center gap-3">
        <h1 class="setup-title">{{ t('arSetup.title') }}</h1>
        <span v-if="mocked" class="mocked-badge" data-test="setup-mocked">{{ t('arSetup.mockedNotice') }}</span>
      </div>
      <CustomTabs
        v-if="hasAccess && context.hasVersion"
        :items="tabItems"
        :model-value="activeTab"
        appearance="segmented"
        data-test="setup-tabs"
        @update:model-value="requestTab"
      />
    </div>
  </template>
  <template #slotContent>
    <div v-if="!hasAccess" class="alert alert-danger" role="alert" data-test="setup-no-access">{{ t('arSetup.noAccess') }}</div>
    <output v-else-if="!context.hasVersion" class="alert d-block alert-info" data-test="setup-no-version">{{ t('arSetup.noVersion') }}</output>
    <div v-else class="setup-sections">
      <SetupLockBanner />

      <div v-show="activeTab === 'payment-terms'" class="setup-sections" data-test="tab-payment-terms">
        <SetupStrategies />
        <SetupHarmonizationGroups />
      </div>
      <div v-show="activeTab === 'client-standard'" class="setup-sections" data-test="tab-client-standard">
        <ClientStandardTab @go-to-payment-terms="requestTab('payment-terms')" />
      </div>
      <!-- Not mounted until its tab is ready: its sections fetch on mount, and the impact limits route is gone (AB#20134). -->
      <div v-if="cashFlowReady" v-show="activeTab === 'cash-flow'" class="setup-sections" data-test="tab-cash-flow">
        <SetupCashFlowCalculation />
        <SetupSectionCard :title="t('arSetup.cashFlowLimits.title')" :description="t('arSetup.cashFlowLimits.description')">
          <SetupCashFlowImpactLimits />
        </SetupSectionCard>
      </div>
    </div>

    <CustomDialog
      :visible="pending !== null"
      :title="t('arSetup.common.confirm')"
      :show-logo="true"
      data-test="unsaved-modal"
      @close="cancelPending"
    >
      <p class="setup-dialog-text">{{ t('arSetup.unsavedChanges') }}</p>
      <template #actions>
        <CustomButton :text="t('arSetup.common.save')" variant="accent" data-test="unsaved-save" @click="savePending" />
        <CustomButton :text="t('arSetup.common.discard')" data-test="unsaved-discard" @click="discardPending" />
      </template>
    </CustomDialog>
  </template>
</CalculumLayout>
</template>

<script lang="ts">
import { computed, defineComponent, ref, toRef } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { CalculumLayout, CustomButton, CustomDialog, CustomTabs } from '@ada/design-system'
import { useSession } from '@ada/auth'
import { useContextStore } from '@/stores/context'
import { SETUP_API_MOCKED, SETUP_TAB_READY } from '../api'
import { provideSetupLock } from '../composables/useSetupLock'
import { provideSetupSections, type SetupSectionHandle, type SetupTabId } from '../composables/useSetupSections'
import { SETUP_TABS, hasSetupAccess } from '../setupAccess'
import SetupLockBanner from '../components/SetupLockBanner.vue'
import SetupSectionCard from '../components/SetupSectionCard.vue'
import SetupStrategies from '../components/SetupStrategies.vue'
import SetupHarmonizationGroups from '../components/SetupHarmonizationGroups.vue'
import ClientStandardTab from '../components/clientStandard/ClientStandardTab.vue'
import SetupCashFlowCalculation from '../components/SetupCashFlowCalculation.vue'
import SetupCashFlowImpactLimits from '../components/SetupCashFlowImpactLimits.vue'

/** The tab a route param names; no tab (or an unknown or not-ready one) means Payment Terms Reduction. */
function tabOf(param: unknown): SetupTabId {
  return SETUP_TABS.includes(param as SetupTabId) && SETUP_TAB_READY[param as SetupTabId] ? param as SetupTabId : 'payment-terms'
}

/**
 * AB#20702 (impl plan K): Receivables Setup, three tabs kept in the address (FR-02). It owns the
 * shared lock (L) and the unsaved-changes registry: switching tab or leaving Setup with a dirty
 * section asks Cancel / Discard / Save (FR-10, AC-11).
 */
export default defineComponent({
  name: 'SetupView',
  components: {
    CalculumLayout,
    CustomTabs,
    CustomButton,
    CustomDialog,
    SetupLockBanner,
    SetupSectionCard,
    SetupStrategies,
    SetupHarmonizationGroups,
    ClientStandardTab,
    SetupCashFlowCalculation,
    SetupCashFlowImpactLimits,
  },
  setup() {
    const { t } = useI18n({ useScope: 'global' })
    const route = useRoute()
    const router = useRouter()
    const context = useContextStore()
    const { session } = useSession()

    const lock = provideSetupLock(toRef(context, 'saleFileVersionId'))
    const sections = provideSetupSections()
    lock.refresh()

    const hasAccess = computed(() => hasSetupAccess(session.value?.roles))
    const activeTab = computed<SetupTabId>(() => tabOf(route.params.tab))
    const tabItems = computed(() => [
      { id: 'payment-terms', label: t('arSetup.tabs.paymentTerms') },
      {
        id: 'client-standard',
        label: context.companyName
          ? t('arSetup.tabs.clientStandard', { client: context.companyName })
          : t('arSetup.tabs.clientStandardFallback'),
      },
      { id: 'cash-flow', label: t('arSetup.tabs.cashFlow') },
    ].filter((item) => SETUP_TAB_READY[item.id as SetupTabId]))

    /** The navigation waiting on the unsaved-changes modal, and the dirty sections it saves or drops. */
    const pending = ref<{ sections: SetupSectionHandle[]; proceed: () => void } | null>(null)

    function goToTab(tab: SetupTabId): void {
      router.replace({ params: { ...route.params, tab } })
    }

    /** Holds the navigation behind the modal while `dirty` has unsaved edits; true lets it through. */
    function holdFor(dirty: SetupSectionHandle[], proceed: () => void): boolean {
      if (dirty.length === 0) return true
      pending.value = { sections: dirty, proceed }
      return false
    }

    function requestTab(tab: string): void {
      const next = tab as SetupTabId
      if (next === activeTab.value) return
      if (holdFor(sections.dirtyIn(activeTab.value), () => goToTab(next))) goToTab(next)
    }

    function cancelPending(): void {
      pending.value = null
    }

    function discardPending(): void {
      pending.value?.sections.forEach((section) => section.discard())
      const proceed = pending.value?.proceed
      pending.value = null
      proceed?.()
    }

    async function savePending(): Promise<void> {
      const results = await Promise.all((pending.value?.sections ?? []).map((section) => section.save()))
      const proceed = pending.value?.proceed
      pending.value = null
      if (results.every(Boolean)) proceed?.()
    }

    // A tab change through the address (not the tab bar) reuses this view, so it is held here.
    // Only the tab being left is saved or dropped; the other tabs keep their edits.
    onBeforeRouteUpdate((to) => {
      if (tabOf(to.params.tab) === activeTab.value) return true
      return holdFor(sections.dirtyIn(activeTab.value), () => { router.replace(to) })
    })

    // Leaving Setup leaves every tab, so every dirty section goes through the modal.
    onBeforeRouteLeave((to) => holdFor(SETUP_TABS.flatMap((tab) => sections.dirtyIn(tab)), () => { router.push(to) }))

    return {
      t, context, mocked: SETUP_API_MOCKED, cashFlowReady: SETUP_TAB_READY['cash-flow'], hasAccess, activeTab, tabItems, requestTab,
      pending, cancelPending, discardPending, savePending,
    }
  },
})
</script>

<style lang="scss" scoped>
@import "variables/colors";

.setup-top {
  display: flex;
  flex-direction: column;
  // The tab strip hugs its tabs instead of stretching across the page.
  align-items: flex-start;
  gap: 1rem;
}

.setup-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: $color-gray-900;
}

.setup-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.setup-dialog-text {
  margin: 0;
  text-align: center;
  color: $color-gray-500;
}

.mocked-badge {
  padding: 0.125rem 0.625rem;
  border-radius: 1rem;
  background: $color-warning-100;
  color: $color-warning-700;
  font-size: 0.75rem;
  font-weight: 500;
}
</style>
