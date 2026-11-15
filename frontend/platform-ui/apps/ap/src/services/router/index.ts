import { RouteRecordRaw } from "vue-router";
import { createAppRouter } from "@ada/core";
import * as Routing from "@/services/router/Routing";
import { useUserStore } from '@/stores/user'


// Views
import Logout from "@/modules/main/Logout.vue";
import Main from "@/modules/main/Main.vue";
import PageNotFound from "@/modules/PageNotFound.vue";
import ReLogin from "@/modules/main/ReLogin.vue";
import LoginContactSupport from "@/modules/auth/views/LoginContactSupport.vue";
import LoginContactSupportSuccess from "@/modules/auth/views/LoginContactSupportSuccess.vue";

// Other modules routes
import * as AdminBackendRoutes from "@/modules/adminBackend/AdminRoutes";
import * as AuthRoutes from "@/modules/auth/AuthRoutes";
import * as AuthRouting from "@/modules/auth/AuthRouting";
import * as HomeRoutes from "@/modules/home/HomeRoutes";
import * as UploadFilesRoutes from "@/modules/uploadFiles/UploadFilesRoutes";
import * as ValuePropositionRoutes from "@/modules/valueProposition/ValuePropositionRoutes";


let defaultRoutes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: Routing.main,
    props: true,
    component: Main
  },
  {
    path: "/relogin",
    name: Routing.relogin,
    component: ReLogin
  },
  {
    path: "/signout",
    component: Logout
  },
  {
    path: "/contact-support",
    name: AuthRouting.loginContactSupport,
    component: LoginContactSupport,
    meta: {
      title: "Contact Support"
    }
  },
  {
    path: "/contact-support-success",
    name: AuthRouting.loginContactSupportSuccess,
    component: LoginContactSupportSuccess
  },
  {
    path: "/:pathMatch(.*)*",
    component: PageNotFound
  }
];

defaultRoutes = defaultRoutes
  .concat(AdminBackendRoutes.getRoutes)
  .concat(AuthRoutes.getRoutes)
  .concat(HomeRoutes.getRoutes)
  .concat(UploadFilesRoutes.getRoutes)
  .concat(ValuePropositionRoutes.getRoutes)

const router = createAppRouter(defaultRoutes, 'ADA');

router.beforeEach((to, from, next) => {
  if (!to.meta?.title) {
    const userStore = useUserStore()
    const removeAdaRefs = userStore.getCompany?.uiGroup?.removeAdaCalculumReferences === true
    window.document.title = removeAdaRefs ? 'Term Negotiation' : 'ADA';
  }
  next();
});

export default router;
