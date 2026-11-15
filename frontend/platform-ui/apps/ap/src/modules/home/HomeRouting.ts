import { route } from '@/services/router/Routing'
import * as CategorizeRouting from '@/modules/home/categorize/CategorizeRouting'
import * as CompareRouting from '@/modules/home/compare/CompareRouting'
import * as OverviewRouting from '@/modules/home/overview/OverviewRouting'
import * as AnalyzeRouting from '@/modules/home/analyze/AnalyzeRouting'
import * as PlanRouting from '@/modules/home/plan/PlanRouting'
import * as EntityCardRouting from '@/modules/home/entityCard/EntityCardRouting'
import * as ManageModuleRouting from '@/modules/home/manageModule/manageModuleRouting'

export const categorize = CategorizeRouting
export const compare = CompareRouting
export const analyze = AnalyzeRouting
export const plan = PlanRouting
export const entityCard = EntityCardRouting
export const overview = OverviewRouting
export const manageModule = ManageModuleRouting

export const home = 'Home'
export const homeDashBoard = 'HomeDashBoard'
export const receivablesMockup1 = 'ReceivablesMockup1'
export const receivablesMockup2 = 'ReceivablesMockup2'
export const receivablesMockup3 = 'ReceivablesMockup3'
export const receivablesMockup4 = 'ReceivablesMockup4'
export const receivablesMockup5 = 'ReceivablesMockup5'
export const homeCompareBar = 'HomeCompareBar'
export const homeCompareLine = 'HomeCompareLine'
export const homeOverviewLine = 'homeOverviewLine'
export const homeComparePotential = 'HomeComparePotential'
export const homeCategorize = 'HomeCategorize'
export const homeAnalyze = 'HomeAnalyze'
export const homeEntityCard = 'HomeEntityCard'
export const homeAllSpendFiles = 'HomeAllSpendFiles'
export const homeProfile = 'HomeProfile'
export const homeCompanyInfo = 'HomeCompanyInfo'
export const homePreferences = 'HomePreferences'
export const homeManageTeam = 'HomeManageTeam'
export const homeHelpSupport = 'HomeHelpSupport'
export const homeUserManual = 'HomeUserManual'
export const homeFinancialData = 'HomeFinancialData'
export const homeAllMessages = 'HomeAllMessages'
export const homeUploadResults = 'HomeUploadResults'
export const homeSearchResult = 'HomeSearchResult'
export const homeCompanySettings = 'HomeCompanySettings'
export const homeValueProposition = 'HomeValueProposition'

export const openHome = (...params: any) => route(home, ...params)
export const openHomeDashBoard = (...params: any) => route(homeDashBoard, ...params)
export const openReceivablesMockup1 = (...params: any) => route(receivablesMockup1, ...params)
export const openReceivablesMockup2 = (...params: any) => route(receivablesMockup2, ...params)
export const openReceivablesMockup3 = (...params: any) => route(receivablesMockup3, ...params)
export const openReceivablesMockup4 = (...params: any) => route(receivablesMockup4, ...params)
export const openReceivablesMockup5 = (...params: any) => route(receivablesMockup5, ...params)
export const openHomeCompareBar = (...params: any) => route(homeCompareBar, ...params)
export const openHomeCompareLine = (...params: any) => route(homeCompareLine, ...params)
export const openHomeOverviewLine = (...params: any) => route(homeOverviewLine, ...params)
export const openHomeComparePotential = (...params: any) => route(homeComparePotential, ...params)
export const openHomeCategorize = (...params: any) => route(homeCategorize, ...params)
export const openHomeAnalyze = (...params: any) => route(homeAnalyze, ...params)
export const openHomeEntityCard = (...params: any) => route(homeEntityCard, ...params)
export const openHomeAllSpendFiles = (...params: any) => route(homeAllSpendFiles, ...params)
export const openHomeAllMessages = (...params: any) => route(homeAllMessages, ...params)
export const openHomeUploadResults = (...params: any) => route(homeUploadResults, ...params)
export const openHomeProfile = (...params: any) => route(homeProfile, ...params)
export const openHomeCompanyInfo = (...params: any) => route(homeCompanyInfo, ...params)
export const openHomePreferences = (...params: any) => route(homePreferences, ...params)
export const openHomeManageTeam = (...params: any) => route(homeManageTeam, ...params)
export const openHomeHelpSupport = (...params: any) => route(homeHelpSupport, ...params)
export const openHomeUserManual = (...params: any) => route(homeUserManual, ...params)
export const openHomeFinancialData = (...params: any) => route(homeFinancialData, ...params)
export const openHomeSearchResult = (...params: any) => route(homeSearchResult, ...params)
export const openHomeCompanySettings = (...params: any) => route(homeCompanySettings, ...params)
export const openHomeValueProposition = (...params: any) => route(homeValueProposition, ...params)
