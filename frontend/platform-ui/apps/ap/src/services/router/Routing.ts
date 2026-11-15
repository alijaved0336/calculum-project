import router from '@/services/router'
import * as AdminRouting from '@/modules/adminBackend/AdminRouting'
import * as AuthRouting from '@/modules/auth/AuthRouting'
import * as HomeRouting from '@/modules/home/HomeRouting'
import * as UploadFilesRouting from '@/modules/uploadFiles/UploadFilesRouting'
import * as ValuePropositionRouting from '@/modules/valueProposition/ValuePropositionRouting'

export const main = 'Main'
export const relogin = 'Relogin'

export const openMain = (...params: any) => route(main, ...params)
export const openRelogin = (...params: any) => route(relogin, ...params)

/** ************* */
/** Routing calls */
/** ************* */

export const admin = AdminRouting
export const auth = AuthRouting
export const home = HomeRouting
export const uploadFilesRouting = UploadFilesRouting
export const valuePropositionRouting = ValuePropositionRouting

export const goBack = () => {
  router.back()
}

export const route = (name: string, params?: any) => {

  if (params) {
    router.push({ name, params })
    return
  }
  router.push({ name })
}
