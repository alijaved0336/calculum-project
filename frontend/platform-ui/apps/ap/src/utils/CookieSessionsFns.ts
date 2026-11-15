
import useFirebase from "@/composables/firebase/useFirebase";
import { isNullOrUndefined, RedirectSection } from "@/utils";
import * as Routing from "@/services/router/Routing";
import { useUserStore } from "@/stores/user";
import { useHomeStore } from "@/stores/home";
import { unloadTidio } from "@/utils/tidio";
import type { UserSession } from "@/types";



function getIDPsToLoginAndLogout() { 
  const homeStore = useHomeStore();
  const getIdpsToLogin = homeStore.getIdpsToLogin;
  if (import.meta.env.DEV) console.log('** getIDPsToLoginAndLogout', getIdpsToLogin);
  return getIdpsToLogin;
}

export const getFlowToLogout = async (): Promise<any> => {
  // This used to call the module's default export (the composable factory), so
  // logging out never actually signed out of Firebase nor closed its listeners
  // — inactivity logout and the admin navbar both left a live session behind.
  await useFirebase().logoutFirebase();
  unloadTidio();
  const getIdps = getIDPsToLoginAndLogout();
  if (isNullOrUndefined(getIdps)) {
    globalThis.location.href = `${import.meta.env.VITE_BASE_URL}/api/auth/logout`;
  }
  else {
    globalThis.location.href = `${import.meta.env.VITE_BASE_URL}/api/auth/logout?idps=${getIdps}`;
  }
}

export const getFlowResetPassword = async (): Promise<any> => {
  globalThis.location.href = `${import.meta.env.VITE_BASE_URL}/api/auth/reset-password`;
};


export const authLogin = async (): Promise<any> => {
  const getIdps = getIDPsToLoginAndLogout();
  if (isNullOrUndefined(getIdps) || getIdps === 'google,microsoft' || getIdps === 'google' || getIdps === 'microsoft') {
    globalThis.location.href = `${import.meta.env.VITE_BASE_URL}/api/auth/login`;
  }
  else {
    globalThis.location.href = `${import.meta.env.VITE_BASE_URL}/api/auth/login?idps=${getIdps}&autheticationSource=enterpriseIdpAuthentication`;
  }
};

export function getSessionInfo() {
  const userStore = useUserStore();
  const homeStore = useHomeStore();
  const params = {
    callbackSuccess: (callbackSuccessData: any) => {
      if (import.meta.env.DEV)
        console.log("** getSessionInfo success: ", callbackSuccessData);

      if (!callbackSuccessData?.data) {
        if (import.meta.env.DEV) console.error('** getSessionInfo: Invalid response data')
        return
      }
      userStore.setSourceAccount(callbackSuccessData.data.authenticationSource);
      homeStore.setIdpsToLogin(null);
      

      getFirebaseToken();
    },
    callbackError: (errorResponse: any) => {
      if (import.meta.env.DEV) console.error("** getSessionInfo error", errorResponse);
    },
  };
  userStore.getSessionInfo(params);
}

export function getFirebaseToken() {
  const userStore = useUserStore();
  const params = {
    callbackSuccess: (callbackSuccessData: any) => {
      if (import.meta.env.DEV)
        console.log("** getFirebaseToken success: ", callbackSuccessData);
      userStore.setEventToken(callbackSuccessData.data.eventToken);
      whoAmI();
    },
    callbackError: (errorResponse: any) => {
      if (import.meta.env.DEV) console.error("** getFirebaseToken error", errorResponse);
      whoAmI();
    },
  };
  userStore.getFirebaseToken(params);
}

export function whoAmI() {
  const userStore = useUserStore();
  const params = {
    callbackSuccess: (sessionData: UserSession) => {
      checkNewSpendFileVersion(sessionData)
    },
    callbackError: (errorResponse: any) => {
      if (import.meta.env.DEV) console.error('** getWhoAmI error, now i go to login using authLogin', errorResponse)
      // No `errorb2c`: this passed the whole response object, which stringified to
      // `[object Object]` on the screen. It is in the DEV log above instead, where it is readable.
      Routing.auth.openErrorScreen({
        errorType: 'error',
        message: 'get-data'
      })
    },
  };
  userStore.whoAmI(params);
}

export function checkNewSpendFileVersion(session: UserSession) {
  const userStore = useUserStore()
  const lastVersion = session.lastActiveSpendFileVersion

  if (!lastVersion) {
    return validateRoutes()
  }

  const activeVersion = session.activeSpendFileVersion
  const latestIri = `/api/spend_file_versions/${lastVersion.uuid}`

  if (activeVersion?.['@id'] === latestIri) {
    return validateRoutes()
  }

  const versions = session.activeCompany?.spendFileVersions ?? []
  const latestVersion = versions.find(v => v['@id'] === latestIri)

  if (!latestVersion) {
    return validateRoutes()
  }

  userStore.setPendingNewSpendFileVersion(latestVersion)
  validateRoutes()
}

function validateRoutes() {
  RedirectSection.sectionTogo();
}
