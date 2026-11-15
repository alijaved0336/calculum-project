import { RouteRecordRaw } from 'vue-router'

import * as UploadFilesRouting from './UploadFilesRouting'
import UploadSpendFile from '@/modules/uploadFiles/views/UploadSpendFile.vue'

export const getRoutes: Array<RouteRecordRaw> = [
  {
    path: '/upload-files/spend-file/:invitationId?',
    name: UploadFilesRouting.uploadSpendFile,
    component: UploadSpendFile,
    props: true,
  }
]
