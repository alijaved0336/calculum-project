import { RouteRecordRaw } from 'vue-router'
import { queryRouters } from "@/utils";
import * as AdminRouting from './AdminRouting'
import BackendAdmin from '@/modules/adminBackend/views/AdminBackend.vue'
import CreateCompanyAdminNewFlow from '@/modules/adminBackend/views/CreateCompanyAdminNewFlow.vue'
import CompaniesAdmin from '@/modules/adminBackend/views/CompaniesAdmin.vue'
import UIGroupsAdmin from '@/modules/adminBackend/views/UIGroupsAdmin.vue'
import UpdateUIGroupAdmin from '@/modules/adminBackend/views/UpdateUIGroupAdmin.vue'
import CompanyUsers from '@/modules/adminBackend/views/CompanyUsers.vue'
import AdminProcess from '@/modules/adminBackend/views/AdminProcess.vue'
import ClustersController from '@/modules/adminBackend/views/ClustersController.vue'
/** For Company edits */
import AdminCompanyInfo from '@/modules/home/views/HomeCompanyInfo.vue'
import AdminCompanyFinancial from '@/modules/home/views/manageAccount/HomeFinancialData.vue'
import AdminCompanyPreferences from '@/modules/home/views/HomePreferences.vue'
import AdminCompanySpendFiles from '@/modules/home/views/HomeAllSpendFiles.vue'
import AdminCompanyTeams from '@/modules/home/views/HomeManageTeam.vue'
import EditCompanyAdmin from '@/modules/adminBackend/views/EditCompanyAdmin.vue'
import AdminDataController from '@/modules/adminBackend/views/AdminDataController.vue'
import CompanyUsersGlobal from '@/modules/adminBackend/views/CompanyUsersGlobal.vue'
/** Catalo */
import AdminSpendsController from '@/modules/adminBackend/views/AdminSpendsController.vue'
/** AdminInvitationController */
import AdminInvitationController from '@/modules/adminBackend/views/AdminInvitationController.vue'
import StatisticsAdmin from '@/modules/adminBackend/views/StatisticsAdmin.vue'
import AuditAdmin from '@/modules/adminBackend/views/AuditAdmin.vue'
import SupportBotSetupAdmin from '@/modules/adminBackend/views/SupportBotSetupAdmin.vue'
import NegotiationAgentSetupAdmin from '@/modules/adminBackend/views/NegotiationAgentSetupAdmin.vue'
import { useUserStore } from '@/stores/user'
import * as Routing from '@/services/router/Routing'

function canAccessToAdminRoutes(): void {
  
  const userStore = useUserStore()
  if (userStore.isSuperAdmin) {
    return
  } else {
    Routing.home.openHome()
  }

}

function accessForAdminNSalesNDataRoutes(): void {
  const userStore = useUserStore()

  if (userStore.isSalesTeam || userStore.isSuperAdmin || userStore.isDataTeam) {
    return
  } else {
    Routing.home.openHome()
  }

}


function accessForAdminNSalesRoutes(): void {
  const userStore = useUserStore()

  if (userStore.isSalesTeam || userStore.isSuperAdmin) {
    return
  } else {
    Routing.home.openHome()
  }

}

function accessForAdminNDataRoutes(): void {
  const userStore = useUserStore()

  if (userStore.isSuperAdmin || userStore.isDataTeam) {
    return
  } else {
    Routing.home.openHome()
  }

}

function canAccessSpendCatalog(): void {
  
  if (import.meta.env.DEV) {    
    return
  }
  
  const userStore = useUserStore()
  let availableUsers = ['oliver@calculum.ai', 'carlos@calculum.ai', 'joel@calculum.ai', 'sergio@calculum.ai', 'amir@calculum.ai', 'daniela@calculum.ai', 'afsar@calculum.ai', 'eric@calculum.ai']
  if (!userStore.isSuperAdmin || !userStore.getUser || !availableUsers.includes(userStore.getUser.email)) {
    Routing.home.openHome()
  }
}

export const getRoutes: Array<RouteRecordRaw> = [
  {
    path: '/admin',
    name: AdminRouting.backendAdmin,
    component: BackendAdmin,
    redirect: { name: AdminRouting.createCompanyAdminNewFlow },
    children: [
      {
        path: '/admin/create_company',
        name: AdminRouting.createCompanyAdminNewFlow,
        component: CreateCompanyAdminNewFlow,        
        beforeEnter: accessForAdminNSalesNDataRoutes
      },
      {
        path: '/admin/edit_company/:idCompany',
        name: AdminRouting.editCompanyAdmin,
        component: EditCompanyAdmin,
        props: true,        
        beforeEnter: accessForAdminNSalesNDataRoutes
      },
      {
        path: '/admin/data',
        name: AdminRouting.adminData,
        component: AdminDataController,
        beforeEnter: accessForAdminNDataRoutes
      },
      {
        path: '/admin/companies',
        name: AdminRouting.companiesAdmin,
        component: CompaniesAdmin,
        beforeEnter: accessForAdminNSalesNDataRoutes
      },
      {
        path: '/admin/companies/:id',
        name: AdminRouting.companyUsers,
        component: CompanyUsers,
        props: route => queryRouters.setQuerys(route),
        beforeEnter: accessForAdminNSalesRoutes
      },
      {
        path: '/admin/company_info',
        name: AdminRouting.adminCompanyInfo,
        component: AdminCompanyInfo,
        beforeEnter: canAccessToAdminRoutes
      },
      {
        path: '/admin/company_financial',
        name: AdminRouting.adminCompanyFinancial,
        component: AdminCompanyFinancial,
        beforeEnter: canAccessToAdminRoutes
      },
      {
        path: '/admin/company_preferences',
        name: AdminRouting.adminCompanyPreferences,
        component: AdminCompanyPreferences,
        beforeEnter: canAccessToAdminRoutes
      },
      {
        path: '/admin/company_files',
        name: AdminRouting.adminCompanySpendFiles,
        component: AdminCompanySpendFiles,
        beforeEnter: canAccessToAdminRoutes
      },
      {
        path: '/admin/company_teams',
        name: AdminRouting.adminCompanyTeams,
        component: AdminCompanyTeams,
        props: true,
        beforeEnter: canAccessToAdminRoutes
      },
      {
        path: '/admin/ui_groups',
        name: AdminRouting.uiGroupsAdmin,
        component: UIGroupsAdmin,
        beforeEnter: accessForAdminNSalesNDataRoutes
      },
      {
        path: '/admin/ui_groups/view/:groupId',
        name: AdminRouting.updateUIGroupAdmin,
        component: UpdateUIGroupAdmin,
        props: true,
        beforeEnter: canAccessToAdminRoutes
      },      
      {
        path: '/admin/process_data',
        name: AdminRouting.adminProcess,
        component: AdminProcess,
        beforeEnter: canAccessToAdminRoutes
      },
      {
        path: '/admin/clusters',
        name: AdminRouting.clustersAdmin,
        component: ClustersController,
        beforeEnter: canAccessToAdminRoutes
      },
      {
        path: '/admin/catalog',
        name: AdminRouting.listCatalogView,
        component: AdminSpendsController,
        beforeEnter: canAccessSpendCatalog
      },
      {
        path: '/admin/invitations',
        name: AdminRouting.invitationsView,
        component: AdminInvitationController,
        beforeEnter: accessForAdminNSalesNDataRoutes
      },
      {
        path: '/admin/statistics',
        name: AdminRouting.statisticsAdmin,
        component: StatisticsAdmin,
        beforeEnter: canAccessToAdminRoutes
      },
      {
        path: '/admin/audit',
        name: AdminRouting.auditAdmin,
        component: AuditAdmin,
        beforeEnter: canAccessToAdminRoutes
      },
      {
        path: '/admin/company_users_global',
        name: AdminRouting.companyUsersGlobal,
        component: CompanyUsersGlobal,
        beforeEnter: accessForAdminNSalesRoutes
      },
      {
        path: '/admin/support_bot_setup',
        name: AdminRouting.supportBotSetupAdmin,
        component: SupportBotSetupAdmin,
        beforeEnter: canAccessToAdminRoutes
      },
      {
        path: '/admin/negotiation_bot_setup',
        name: AdminRouting.negotiationBotSetupAdmin,
        component: NegotiationAgentSetupAdmin,
        beforeEnter: canAccessToAdminRoutes
      },
    ]
  }
]
