<template>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<CalculumModal v-if="showModalEdit" :size="'lg'" :showClose="true" :title="'Change Image Content'" @close="showModalEdit = false">
  <template v-slot:modalContent>
    <div class="d-flex gap-2"><span class="upload-files-calculum mt-4" @click="modyfyImage">{{ `${$t('global.chooseAFile')}  (${$t('global.maxUploadSize', { size: maxImageMb })})`  }}
        <div class="icon"><i class="fa-solid fa-upload"></i></div></span></div>
    <input :id="imageData.id" type="file" accept=".jpg,.png" name="logo-value-proposition" style="display: none" @change="onChangeLogo"/>
  </template>
</CalculumModal>
<div class="card content-editor mb-4" v-if="imageData.visibility || editionMode">   <img class="img-fluid" v-if="urlImage" :src="urlImage ? urlImage : ''" alt="" @hover="true"/><span class="font-semibold" v-else>{{ `${$t('global.uploadAnImage')} (${$t('global.maxUploadSize', { size: maxImageMb })})` }}</span>
  <div class="overlay-vp-editor" v-if="editionMode">
    <Tooltip :open-delay="50" :anchor-element="'target'" :position="'bottom'" style="max-width: 20ch">
      <div class="d-flex gap-2">
        <div class="icon-subcomponent" @click="showModalEdit = true" :title="'Edit Content'"><i class="fa-solid fa-pencil text-sm" :title="'Edit Content'"></i></div>
        <div class="icon-subcomponent" @click="$emit('change-content', imageData, null, 'delete')" :title="'Delete Content'"><i class="fa-solid fa-trash-can text-sm" :title="'Delete Content'"></i></div>
        <div class="icon-subcomponent" v-if="imageData.visibility" :title="'Hide Content'" @click="$emit('change-content', imageData, null, 'showOrHide')"><i class="fa-solid fa-eye-slash text-sm" :title="'Hide Content'"></i></div>
        <div class="icon-subcomponent" v-if="!imageData.visibility" :title="'Show Content'" @click="$emit('change-content', imageData, null, 'showOrHide')"><i class="fa-solid fa-eye text-base" :title="'Show Content'">        </i></div>
      </div>
    </Tooltip>
  </div>
</div>
</template>
<script lang="ts">

import { defineComponent, computed, PropType, ref, reactive, toRefs } from 'vue'
import { ObjectUtils } from "@/utils";
import { useI18n } from 'vue-i18n';
import  { ImageType } from '@/modules/valueProposition/types';
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { getMediaUrl } from "@/services/media/mediaActions";
import { CalculumLoading } from '@ada/design-system'
import { useToast } from 'vue-toastification'
import { useValuePropositionStore } from '@/stores/valueProposition'
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB } from '@/utils/uploadLimits'

export default defineComponent({

    name: 'ImageComponent',
    components: { CalculumModal, Tooltip, CalculumLoading },
    props: { 
        editionMode: { type: Boolean, required: false, default: false},
        objectImage: { type: Object as PropType<ImageType>, required: true },
    },
    emits: ['change-image-content','change-content'],
    setup( props, { emit }) {


        const imageValue = ref(null)
        const valuePropositionStore = useValuePropositionStore()
        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
        const toast = useToast()

        interface DataInterface {
            allowedMimeTypes: Array<string>,
            showModalEdit: boolean,            
            imageData: ImageType,
            loading: boolean,
            maxFileSize: number
        }

        const data: DataInterface = reactive<DataInterface>({
            allowedMimeTypes:[
            'image/png',
            'image/jpeg'
            ],
            showModalEdit: false,            
            imageData: ObjectUtils.cloneDeep(props.objectImage),
            loading: false,
            maxFileSize: MAX_IMAGE_BYTES,
        })
        

        function modyfyImage () {
            const fileDOM: any | null = document.getElementById(data.imageData.id)
            if (fileDOM !== null) {
                fileDOM.click()
            }
        }

        /**
         * Function to manage the upload of a new image.
         * @param {any} event - The event when the user select a new image.
         * If the image is valid, it will be uploaded to the server and the component will emit an event with the new image data.
         */
        async function onChangeLogo (event: any) {
            imageValue.value = event.target.files[0]
            const file = event.target.files[0]

            if (imageValue.value) {
                const isValid = await ObjectUtils.validateFileType(imageValue.value, data.allowedMimeTypes);
                if (!isValid) {                
                    imageValue.value = null
                    return
                }

                if (file.size > data.maxFileSize) {
                    toast.error(translate.t('global.fileTooLargeMb', { size: MAX_IMAGE_MB }));
                    return
                }



                data.showModalEdit = false
                data.loading = true

                const params = {                
                    file: imageValue.value,
                    callbackSuccess: (callbackSuccessData: any) => {          
                        data.loading = false
                        data.imageData.image=callbackSuccessData
                        emit('change-content', data.imageData, {obj:data.imageData}, 'image')
                    },
                    callbackError: () => { 
                        data.loading = false
                    }
                }
                valuePropositionStore.postUploadImagesValueProposition(params)
            }
        }

        
        const urlImage = computed(() => {
            let logo = data.imageData.image
            logo = getMediaUrl(logo)            
            return logo
        })


        

        function cancelUpdateImage () {
            imageValue.value = null
        }

        return {
            ...toRefs(data),
            urlImage,
            modyfyImage,
            onChangeLogo,
            cancelUpdateImage,
            imageValue,
            maxImageMb: MAX_IMAGE_MB

        }

    }
})

</script>

<style scoped>    
    .card {
        min-height: 50px !important;
    }
</style>
