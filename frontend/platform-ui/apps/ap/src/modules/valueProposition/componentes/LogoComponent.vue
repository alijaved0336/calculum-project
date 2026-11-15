<template>
<CalculumLoading v-if="loading" :modal="true"></CalculumLoading>
<div class="image-editor d-flex" :class="logoType"><img class="img-logo" :src="urlImage ? urlImage : ''"/>
  <div class="logo-edit-overlay" v-if="editionMode">
    <div class="icon" @click="modyfyImage"><i class="fa-solid fa-pencil text-sm"></i></div><span class="text-xs font-semibold mt-1" @click="modyfyImage">{{ `${$t('global.chooseAFile')}  (${$t('global.maxUploadSize', { size: maxImageMb })})` }}</span>
  </div>
  <input :id="logoType" type="file" accept=".jpg,.png" name="logo-value-proposition" style="display: none" @change="onChangeLogo"/>
</div>
</template>
<script lang="ts">

import { defineComponent, computed, ref, reactive, toRefs } from 'vue'
import { ObjectUtils } from "@/utils";
import { useI18n } from 'vue-i18n';
import { getMediaUrl } from "@/services/media/mediaActions";
import { CalculumLoading } from '@ada/design-system'
import { useToast } from 'vue-toastification'
import { useValuePropositionStore } from '@/stores/valueProposition'
import { MAX_IMAGE_BYTES, MAX_IMAGE_MB } from '@/utils/uploadLimits'

export default defineComponent({

    name: 'LogoComponent',
    components: { CalculumLoading },
    props: {
        editionMode: { type: Boolean, required: false, default: false },
        objectImage: { type: String, required: true },
        logoType: { type: String, required: true },
    },
    emits: ['change-main-logos'],
    setup(props, { emit }) {

        const imageValue = ref(null)
        const valuePropositionStore = useValuePropositionStore()
        const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
        const toast = useToast()

        interface DataInterface {
            allowedMimeTypes: Array<string>,
            loading: boolean,
            maxFileSize: number
        }

        const data: DataInterface = reactive<DataInterface>({
            allowedMimeTypes: [
                'image/png',
                'image/jpeg'
            ],
            loading: false,
            maxFileSize: MAX_IMAGE_BYTES,
        })


        function modyfyImage() {
            const fileDOM: any | null = document.getElementById(props.logoType)
            if (fileDOM !== null) {
                fileDOM.click()
            }
        }

        async function onChangeLogo(event: any) {
            imageValue.value = event.target.files[0]
            const file = event.target.files[0]

            if (imageValue.value) {
                const isValid = await ObjectUtils.validateFileType(imageValue.value, data.allowedMimeTypes);
                if (!isValid) {
                    imageValue.value = null
                    return
                }

                if (file.size > data.maxFileSize) {
                    toast.error(translate.t('global.fileTooLargeMb', { size: MAX_IMAGE_MB }))
                    return
                }


                data.loading = true
                const params = {
                    file: imageValue.value,
                    callbackSuccess: (callbackSuccessData: any) => {
                        data.loading = false
                        emit('change-main-logos', callbackSuccessData, props.logoType)
                    },
                    callbackError: () => {
                        data.loading = false
                    }
                }
                valuePropositionStore.postUploadImagesValueProposition(params)
            }
        }


        const urlImage = computed(() => {
            let logo=props.objectImage
            logo=getMediaUrl(logo)
            return logo
            
        })

        function cancelUpdateImage() {
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

<style scoped lang="scss">
.image-editor {
    overflow: hidden;
    height: 60px;
}

.partner-logo {
    justify-content: end;
}

.img-logo {
    height: 60px;
    width: auto;
    max-width: 100%;
    object-fit: contain;
    display: block;
}

/* Named away from the generic "overlay" token the global bootstrap-overrides stylesheet
   targets for calculum-ui's teleported modals (see CalculumModalIdle.vue). */
.logo-edit-overlay {
    cursor: pointer;
    display: flex;
    flex-direction: row;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    gap: 15px;
    opacity: 0;
    transition: opacity 0.3s ease;
    width: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
}

.image-editor:hover .logo-edit-overlay {
    opacity: 1;
}

.icon {
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    width: 25px;
    height: 25px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    cursor: pointer;
    font-size: 18px;

    &:hover {
        background-color: rgba(0, 0, 0, 0.9);
    }
}



img {
    width: 100%;
}
</style>
