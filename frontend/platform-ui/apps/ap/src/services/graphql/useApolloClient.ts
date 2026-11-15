import { watch, ref } from "vue";

import { apolloClient } from "./apolloClient";
import useEntity from "@/modules/home/entityCard/composables/useEntity";
import { authWarningState } from "@/utils/authWarningState";

// Keep track of pending resets
let resetPromise: Promise<void> | null = null;

const useApolloClient = () => {
  const { entitySelectedTrackingNumber } = useEntity();
  const isResetting = ref(false);

  // Invalidate cache if selected entity changed
  // watch(entitySelectedTrackingNumber, async () => {
  //   await apolloClientResetStore();
  // });

  const apolloClientResetStore = async () => {
    // Skip reset if we're in the middle of auth redirection
    if (authWarningState.hasShown401Warning || authWarningState.isRedirecting) {
      if (import.meta.env.DEV) console.log('Skipping Apollo store reset during auth redirection');
      return;
    }

    if (isResetting.value) {
      if (import.meta.env.DEV) console.log('Store reset already in progress, waiting...');
      return resetPromise;
    }

    try {
      isResetting.value = true;
      
      // Create a new reset promise
      resetPromise = (async () => {
        try {
          // Stop all active queries before resetting
          apolloClient.stop();
          
          // Reset the entire store when changing routes
          await apolloClient.resetStore();
          
          // Only refetch if we're not in an auth error state
          if (!authWarningState.hasShown401Warning && !authWarningState.isRedirecting) {
            await apolloClient.reFetchObservableQueries(false); // false = don't refetch inactive queries
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Error during Apollo cache reset:', error);
          }
          // Don't throw, we want to continue even if reset fails
        }
      })();

      // Wait for the reset to complete
      await resetPromise;
    } finally {
      isResetting.value = false;
      resetPromise = null;
    }
  };

  // Watch for entity changes and reset store
  watch(entitySelectedTrackingNumber, async (newValue, oldValue) => {
    if (newValue !== oldValue && !authWarningState.hasShown401Warning && !authWarningState.isRedirecting) {
      await apolloClientResetStore();
    }
  });

  return {
    apolloClientResetStore,
    isResetting
  };
};

export default useApolloClient;
