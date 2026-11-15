import { route } from '@/services/router/Routing'

// Type for route parameters - matches Vue Router's LocationAsRelativeRaw
type RouteParams = Record<string, unknown> | undefined

export const backendAdmin = 'BackendAdmin'
export const createCompanyAdminNewFlow = 'CreateCompanyAdminNewFlow'
export const companiesAdmin = 'CompaniesAdminView'
export const adminUploadData = 'AdminUploadData'
export const adminDownloadData = 'AdminDownloadData'
export const uiGroupsAdmin = 'UIGroupsAdmin'
export const updateUIGroupAdmin = 'updateUIGroupAdmin'
export const companyUsers = 'CompanyUsers'
export const adminProcess = 'AdminProcess'
export const clustersAdmin = 'ClustersAdmin'
export const adminData = 'AdminData'
export const listCatalogView = 'ListCatalogView'
export const invitationsView = 'InvitationsView'
export const companyUsersGlobal = 'CompanyUsersGlobal'

export const openBackendAdmin = (...params: RouteParams[]) => route(backendAdmin, ...params)
export const openCreateCompanyAdminNewFlow = (...params: RouteParams[]) => route(createCompanyAdminNewFlow, ...params)
export const openCompaniesAdmin = (...params: RouteParams[]) => route(companiesAdmin, ...params)
export const openAdminUploadData = (...params: RouteParams[]) => route(adminUploadData, ...params)
export const openAdminDownloadData = (...params: RouteParams[]) => route(adminDownloadData, ...params)
export const openUIGroupsAdmin = (...params: RouteParams[]) => route(uiGroupsAdmin, ...params)
export const openUpdateUIGroupAdmin = (...params: RouteParams[]) => route(updateUIGroupAdmin, ...params)
export const openCompanyUsers = (...params: RouteParams[]) => route(companyUsers, ...params)
export const openAdminProcess = (...params: RouteParams[]) => route(adminProcess, ...params)
export const openClustersAdmin = (...params: RouteParams[]) => route(clustersAdmin, ...params)
export const openAdminDataController = (...params: RouteParams[]) => route(adminData, ...params)

export const openListCatalogView = (...params: RouteParams[]) => route(listCatalogView, ...params)
export const openInvitationsView = (...params: RouteParams[]) => route(invitationsView, ...params)
export const openCompanyUsersGlobal = (...params: RouteParams[]) => route(companyUsersGlobal, ...params)
/** For Company Edits */

export const adminCompanyInfo = 'AdminCompanyInfo'
export const adminCompanyFinancial = 'adminCompanyFinancial'
export const adminCompanyPreferences = 'adminCompanyPreferences'
export const adminCompanySpendFiles = 'adminCompanySpendFiles'
export const adminCompanyTeams = 'adminCompanyTeams'
export const editCompanyAdmin = 'editCompanyAdmin'

export const openAdminCompanyInfo = (...params: RouteParams[]) => route(adminCompanyInfo, ...params)
export const openAdminCompanyFinancial = (...params: RouteParams[]) => route(adminCompanyFinancial, ...params)
export const openAdminCompanyPreferences = (...params: RouteParams[]) => route(adminCompanyPreferences, ...params)
export const openAdminCompanySpendFiles = (...params: RouteParams[]) => route(adminCompanySpendFiles, ...params)
export const openAdminCompanyTeams = (...params: RouteParams[]) => route(adminCompanyTeams, ...params)
export const openEditCompanyAdmin = (...params: RouteParams[]) => route(editCompanyAdmin, ...params)

// For Data Change
export const adminDataChange = 'AdminDataChange'
export const openAdminDataChange = (...params: RouteParams[]) => route(adminDataChange, ...params)

// Statistics section
export const statisticsAdmin = 'StatisticsAdmin'


export const openStatisticsAdmin = (...params: RouteParams[]) => route(statisticsAdmin, ...params)


// Audit section
export const auditAdmin = 'AuditAdmin'
export const openAuditAdmin = (...params: RouteParams[]) => route(auditAdmin, ...params)

// Support Bot Setup section
export const supportBotSetupAdmin = 'SupportBotSetupAdmin'
export const openSupportBotSetupAdmin = (...params: RouteParams[]) => route(supportBotSetupAdmin, ...params)

// Negotiation Bot Setup section
export const negotiationBotSetupAdmin = 'NegotiationBotSetupAdmin'
export const openNegotiationBotSetupAdmin = (...params: RouteParams[]) => route(negotiationBotSetupAdmin, ...params)
