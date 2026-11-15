import { watch } from 'vue';
import { useHomeStore } from '@/stores/home';
import { useUserStore } from '@/stores/user';
import { loadTidio, setTidioUser, unloadTidio, showTidio } from '@/utils/tidio';
import { hasFeatureRole } from '@/utils';
import { FEATURE_ROLES } from '@/constants/featureRoles';

export default function TidioPlugin() {
  const userStore = useUserStore();
  const homeStore = useHomeStore();

  const isSupportBotEnabledForCompany = (user: any): boolean => {

    if (!user?.activeCompany) {
      if (import.meta.env.DEV) console.log('** Tidio Plugin: No active company for user');
      return false;
    }

    const userRoles = user.roles;

    // If user roles aren't available yet, preserve the existing experience
    if (!userRoles || userRoles.length === 0) {
      if (import.meta.env.DEV) console.log('** Tidio Plugin: User roles not yet loaded for', user.activeCompany?.name);
      return true;
    }

    const hasSupportBotRole = hasFeatureRole(userRoles, FEATURE_ROLES.SUPPORT_BOT);

    if (import.meta.env.DEV) {
      console.log('** Tidio Plugin: Company', user.activeCompany?.name, 'support bot enabled =', hasSupportBotRole);
      console.log('** Tidio Plugin: User roles =', userRoles);
    }

    return hasSupportBotRole ?? false;
  };

  const updateTidio = (user: any): void => {
    if (!import.meta.env.VITE_TIDIO_PUBLIC_KEY) {
      if (import.meta.env.DEV) console.log('** Tidio Plugin: No public key configured');
      return;
    }

    if (!user) {
      if (import.meta.env.DEV) console.log('** Tidio Plugin: No user loaded, unloading Tidio');
      unloadTidio();
      return;
    }

    // Check if the company has the support bot feature enabled
    if (!isSupportBotEnabledForCompany(user)) {
      if (import.meta.env.DEV) console.log('** Tidio Plugin: Support bot disabled or roles not loaded for company', user.activeCompany?.name);
      unloadTidio();
      return;
    }

    if (import.meta.env.DEV) console.log('** Tidio Plugin: Loading Tidio for user', user.email);

    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || '';

    loadTidio(import.meta.env.VITE_TIDIO_PUBLIC_KEY, () => {
      setTidioUser({
        email: user.email,
        name,
        language: user.language,
        company: user.activeCompany?.name,
        activeCompanyId: user.activeCompany?.['@id'],
      }, () => {
        showTidio();
      });
    });
  };



  // Trigger Tidio after global loading completes
  watch(
    () => homeStore.getGlobalLoading,
    (isLoading) => {
      if (isLoading === false && userStore.getUser) {
        if (import.meta.env.DEV) console.log('** Tidio Plugin: Global loading finished, updating Tidio');
        updateTidio(userStore.getUser);
      }
    },
    {
      immediate: true,
    },
  );


}
