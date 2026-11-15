<template>
<div class="component-editor-container" v-if="showModalEdit" @click.self="cancelEdition">
  <div class="d-flex component-editor-body">
    <div class="row mt-2">
      <div class="col-12 d-flex container-buttons"><span class="cursor-pointer" @click="cancelEdition"><i class="fa-solid fa-xmark"></i></span></div>
    </div>
    <div class="row mt-2">
      <div class="col-12">
        <Editor v-model="textToEditor" :tools="advancedTools" :default-content="textToEditor" :content-style="edt" :fontName="fontNames" @change="onEditorChange"></Editor>
      </div>
    </div>
    <div class="row mt-2">
      <div class="col-12 d-flex container-buttons-edition">
        <button class="btn outline-secondary-btn font-md text-capitalize modal-btn" @click="cancelEdition">{{ $t('global.cancel') }}        </button>
        <button class="btn btn-primary font-md text-capitalize modal-btn" @click="saveText">{{ $t('global.save') }}</button>
      </div>
    </div>
  </div>
</div>
<div class="card content-editor mb-4" v-if="introductionData.visibility || editionMode">
  <div class="px-7">
    <div v-html="textToEditor"></div><img class="img-logo-introduction" :src="showLogo ? showLogo : ''"/>
  </div>
  <div class="overlay-vp-editor" v-if="editionMode">
    <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'" style="max-width: 20ch">
      <div class="d-flex gap-2">
        <div class="icon-subcomponent" @click="showModal" :title="'Edit Content'"><i class="fa-solid fa-pencil text-sm" :title="'Edit Content'"></i></div>
        <div class="icon-subcomponent" @click="$emit('change-content', introductionData, null, 'delete')" :title="'Delete Content'"><i class="fa-solid fa-trash-can text-sm" :title="'Delete Content'"></i></div>
        <div class="icon-subcomponent" v-if="introductionData.visibility" :title="'Hide Content'" @click="$emit('change-content', introductionData, null, 'showOrHide')"><i class="fa-solid fa-eye-slash text-sm" :title="'Hide Content'"> </i></div>
        <div class="icon-subcomponent" v-if="!introductionData.visibility" :title="'Show Content'" @click="$emit('change-content', introductionData, null, 'showOrHide')"> <i class="fa-solid fa-eye text-base" :title="'Show Content'">    </i></div>
      </div>
    </Tooltip>
  </div>
</div>
</template>

<script lang="ts">
import { ObjectUtils } from '@/utils';
import { defineComponent, PropType, reactive, ref, toRefs, computed } from 'vue'
import { IntroductionType } from '../types';
import { Editor } from "@progress/kendo-vue-editor";
import { basicTools, advancedTools, fontNames } from '../data/editor';
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { getMediaUrl } from "@/services/media/mediaActions";

export default defineComponent({
    name: 'IntroductionComponent',
    components: { Editor, Tooltip },
    props: {
        editionMode: { type: Boolean, required: false, default: false },
        objectContent: { type: Object as PropType<IntroductionType>, required: true },
        logo: { type: String, required: false, default: '' },
    },
    emits: ['change-content'],
    setup(props, { emit }) {

        interface DataInterface {
            showModalEdit: boolean,
            introductionData: IntroductionType
        }

        const data: DataInterface = reactive<DataInterface>({
            showModalEdit: false,
            introductionData: ObjectUtils.cloneDeep(props.objectContent)
        })



        const textDefaultToShow = ref(props.objectContent.text)
        const textToEditor = ref(ObjectUtils.cloneDeep(textDefaultToShow.value))


        const onEditorChange = (event: any) => {
            textToEditor.value = event.html;
        };


        const showModal = () => {
            data.showModalEdit = true
        }
        const saveText = () => {
            data.introductionData.text = textToEditor.value
            emit('change-content', data.introductionData, {obj: data.introductionData}, 'introduction')
            data.showModalEdit = false
        }

        const cancelEdition = () => {
            data.showModalEdit = false
            textToEditor.value = ObjectUtils.cloneDeep(textDefaultToShow.value)
        }

        const showLogo = computed(() => {
            if (props.logo) {
                let logo = props.logo
                logo = getMediaUrl(logo)                
                return logo
            } else {
                return null
            }
        })
        const edt = {
            height: '60vh', width: '100%',
            'line-height': '1.5'
        }
        return {
            ...toRefs(data),
            showModal, basicTools, textDefaultToShow, saveText, onEditorChange,
            textToEditor, cancelEdition, advancedTools, showLogo, edt, fontNames
        }
    }
})
</script>

<style lang="scss" scoped>
.modal-btn {
    z-index: 1;
    width: fit-content;
}

.card {
    min-height: 50px !important;
}

.img-logo-introduction {
    height: 60px;
    width: auto;
    max-width: 100%;
    object-fit: contain;
    display: block;
}

.content-with-lists ul {
    list-style-type: disc;
    padding-left: 20px;
}
</style>