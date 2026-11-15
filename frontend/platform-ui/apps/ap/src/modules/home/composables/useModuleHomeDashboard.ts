
import * as Routing from "@/services/router/Routing";
import { useUserStore } from "@/stores/user";

/**
 * Home
 */
const useModuleHomeDashboard = () => {
  const userStore = useUserStore();
  
  /**
   * Navigates to the categorize section.
   *
   * @returns {void}
   */
  const moduleHomeDashboardOpen = (): void => {
    userStore.setLastSectionVisitedbyUser('home')
    Routing.home.openHome();
  }

  return {
    moduleHomeDashboardOpen,
    
  };
};

export default useModuleHomeDashboard;
