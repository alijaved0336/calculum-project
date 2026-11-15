import { route } from '@/services/router/Routing'

export const uploadSpendFile = 'uploadSpendFile'


export const openUploadSpendFile = (...params: any) => route(uploadSpendFile, ...params)