<template>
<div id="ia-negotiation-container"></div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, onUnmounted, onActivated, onDeactivated } from 'vue';
import { useEntityCardStore } from '@/stores/entityCard';

export default defineComponent({
  name: 'IaNegotiation',
   props: {
    entityId: {
      type: String as PropType<string | null>,
      default: null
    },
    entityName: {
      type: String as PropType<string | null>,
      default: null
    },
    entityLevel: {
      type: String as PropType<'supplier' | 'parent' | 'potential-supplier' | 'potential-parent' | null>,
      default: null
    },
    spendfileVersion: {
      type: String as PropType<string | null>,
      default: null
    },
    tenantId: {
      type: String as PropType<string | null>,
      default: null
    }
  },
  setup() {
    const entityCardStore = useEntityCardStore();

    const isModalShowing = computed(() => entityCardStore.getIsModalEntityShowing);

    function foo() {
      // TODO: implement actions to run when the assistant is unloaded      
    }

    function pauseAssistant() {
      // TODO: implement actions to run when the tab is switched away (KeepAlive deactivate)      
    }

    function resumeAssistant() {
      // TODO: implement actions to run when the tab is switched back to (KeepAlive activate)      
    }

    onDeactivated(() => {
      pauseAssistant();
    });

    onActivated(() => {
      resumeAssistant();
    });

    // triggerAssistantExit() is called synchronously by the store on every
    // path that closes the modal (setIsModalEntityShowing(false),
    // setSelectedEntity(null), resetEntityCardState) and by EntityCardOverview
    // before it forces a full remount on entity change. Using a direct
    // callback (instead of a reactive ref + watch) avoids racing against the
    // same Vue flush that unmounts/deactivates this component - the callback
    // always runs at the exact moment triggerAssistantExit() is called.
    let hasExited = false;
    const unregisterAssistantExit = entityCardStore.onAssistantExit(() => {
      if (hasExited) return;
      hasExited = true;
      foo();
    });

    onUnmounted(() => {
      unregisterAssistantExit();

      // Safety net for any real teardown not already covered by the exit
      // callback - e.g. the Activity side panel itself closing (unmounting
      // ActivityPanelWrapper/IaNegotiation for real) while the modal stays
      // open. KeepAlive means a plain tab switch never reaches this hook
      // (that only triggers onDeactivated), so this only fires on a genuine
      // unmount.
      if (!hasExited) {
        hasExited = true;
        foo();
      }
    });

    return { isModalShowing };
  }
});
</script>
