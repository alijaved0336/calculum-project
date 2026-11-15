<template>
  <div 
    class="calculum-modal higher-z-index" 
    @click.self="handleClose"
  >
    <div
      class="calculum-modal-content-custom content-higher-z-index"
      :class="{ 
        'potential-theme': entityTypeComputed, 
        'default-bg': !entityTypeComputed, 
        'potential-bg': entityTypeComputed,
        'loading': isLoading
      }"
    >
      <EntityCardOverview
        :potential-theme="entityTypeComputed"
        :no-footer-display="noFooterDisplay"
        :company-id="entityComputed.companyId"
        :domain="entityComputed.domain"
        :spend-volume="entityComputed.spendVolume"
        :country="entityComputed.country"
        :selected-tab-index="entityComputed.selectedTabIndex"
        @close="handleClose"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, onUnmounted, PropType, ref, onMounted, watch } from 'vue'
import { useEntityCardStore } from '@/stores/entityCard'
import EntityCardOverview from '../../views/EntityCardOverview.vue'
import useApolloClient from "@/services/graphql/useApolloClient";
import axios, { CancelTokenSource } from 'axios';
import { useUserStore } from '@/stores/user'

// Types
import type { EntityCard } from '@/types'

export default defineComponent({
  name: 'ModalEntity',
  components: { EntityCardOverview },
  props: {
    entity: { type: Object as PropType<EntityCard.SelectedEntityObj>, required: true },
    highZIndex: { type: Boolean, required: false, default: false },
    noFooterDisplay: { type: Boolean, required: false, default: true },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const entityCardStore = useEntityCardStore()    
    const { apolloClientResetStore } = useApolloClient();
    const isClosing = ref(false)
    const isLoading = ref(false)
    let cancelTokenSource: CancelTokenSource = axios.CancelToken.source();
    const userStore = useUserStore()

    // Computed properties
    const entityTypeComputed = computed(() => {
      return entityCardStore.getEntityType === 'potential-supplier' || 
             entityCardStore.getEntityType === 'potential-parent'
    })
    
    const entityComputed = computed(() => entityCardStore.getSelectedEntity)

    // Handle modal closing
    const handleClose = async () => {

      if (isClosing.value) return
      isClosing.value = true
      
      // First emit close to update UI immediately
      emit('close')
      
      // Then perform cleanup asynchronously
      try {
        // Cancel any pending HTTP requests
        cancelTokenSource.cancel('Modal closed');
        cancelTokenSource = axios.CancelToken.source();

        // Reset store state completely
        entityCardStore.resetEntityCardState();
        
        // Clear Apollo cache
        await apolloClientResetStore()

        // Force cleanup
        // cleanup.forceGarbageCollection() // This line was removed as per the edit hint

      } catch (error) {
        console.error('Error during modal cleanup:', error)
      } finally {
        isClosing.value = false
      }
      
      let titleAda = 'ADA'
      if (userStore.getCompany?.uiGroup && userStore.getCompany?.uiGroup.removeAdaCalculumReferences === true) {
        titleAda = 'Term Negotiation'
      }
      document.title = titleAda

    }

    // Watch for changes in the selected entity
    watch(() => entityCardStore.getSelectedEntity, async (newEntity, oldEntity) => {
      if (newEntity?.companyId !== oldEntity?.companyId) {
        isLoading.value = true
        try {
          // Cancel any pending requests
          cancelTokenSource.cancel('Entity changed');
          cancelTokenSource = axios.CancelToken.source();
          
          // Clear Apollo cache
          await apolloClientResetStore()
          
          // Small delay to allow animations
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.error('Error updating entity:', error)
        } finally {
          isLoading.value = false
        }
      }
    }, { deep: true }) // Add deep watching to catch all changes

    // Cleanup on component unmount
    onUnmounted(() => {
      if (!isClosing.value) {
        handleClose()
      }
    })

    // Initialize on mount
    onMounted(() => {
      // Create new cancel token source
      cancelTokenSource = axios.CancelToken.source();
    })

    return {
      entityComputed,
      entityTypeComputed,
      handleClose,
      isLoading
    }
  }
})
</script>

<style lang="scss" scoped>
// Variables
@import '@/resources/assets/styles/variables/_colors.scss';
@import '@/resources/assets/styles/variables/_dimensions.scss';

.calculum-modal {
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  height: calc(100vh * #{$zoom-compensation});
  justify-content: center;
  left: 0;
  position: fixed;
  top: 0;
  transition: all ease 0.3s;
  width: calc(100vw * #{$zoom-compensation});
  z-index: 1060; // BS convention
  &.higher-z-index {
    z-index: 1062;
  }

  &.normal-z-index {
    z-index: 1060;
  }

  .calculum-modal-content-custom {
    align-items: flex-start;
    background: white; //Use utility class instead.
    border-radius: 8px; // Same as cards. Use utility class instead.
    height: fit-content; 
    justify-content: flex-start;
    max-height: calc(125vh * #{$zoom-compensation} - 2%);
    overflow: auto; 
    padding: 1.5rem; // Same as cards. Use utility class instead.
    position: relative;

    &.loading {
      opacity: 0.7;
      pointer-events: none;
    }

    &.default-bg {
      background: #fff;
    }

    &.potential-bg {
      background: $color-gray-700;
    }

    .content-higher-z-index {
      z-index: 1063;
    }

    .content-normal-z-index {
      z-index: 1061;
    }

    p {
      font-size: 14px;
      font-weight: 400;
      line-height: 1.5;
      color: $color-gray-600;
    }
  }
}

.calculum-modal-zindex-popover {
  z-index: 1070 !important; // BS convention
}

.container-buttons {
  flex: 1 0 auto;
  justify-content: end;
  gap: 1rem;
}

span.plus-circle {
  margin-right: 5px;
  display: flex;
  align-items: center;
  width: 25px;
  height: 25px;
  justify-content: center;
  background: #fff;
  border-radius: 50%;
  padding: 5px;
  color: $color-primary-500;
  font-size: 15px;
}

@media (min-width: 1441px) {
  .calculum-modal-content-custom {
    width: calc(96vw * #{$zoom-compensation});
  }
}

@media (max-width:1440px) {
  .calculum-modal-content-custom {
    width: calc(96vw * #{$zoom-compensation});
  }
}

@media (max-width:1280px) {
  .calculum-modal-content-custom {
    width: calc(99vw * #{$zoom-compensation});
  }
}
</style>

