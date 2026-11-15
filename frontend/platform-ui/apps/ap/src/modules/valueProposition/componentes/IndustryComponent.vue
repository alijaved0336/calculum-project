<template>
<div class="component-editor-container" v-if="showModalEdit" @click.self="cancelEdition">
  <div class="d-flex component-editor-body">
    <div class="row mt-2">
      <div class="col-12 d-flex container-buttons"><span class="cursor-pointer" @click="cancelEdition"><i class="fa-solid fa-xmark"></i></span></div>
      <div class="col-lg-12">
        <Editor v-model="textToEditorLeft" :tools="basicTools" :default-content="textToEditorLeft" :content-style="{ height: '25vh' }" @change="onEditorChangeLeft"></Editor>
      </div>
      <div class="col-lg-12 mt-4">
        <Editor v-model="textToEditorRight" :tools="basicTools" :default-content="textToEditorRight" :content-style="{ height: '25vh' }" @change="onEditorChangeRight"></Editor>
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
<div class="content-editor mb-4" v-if="objData.visibility || editionMode">
  <div class="row row-100">
    <div class="col-lg-6 info-box-left">
      <div v-html="textToEditorLeft"></div>
    </div>
    <div class="col-lg-6 info-box-right">
      <div class="content-with-lists" v-html="textToEditorRight"></div>
    </div>
  </div>
  <div class="overlay-vp-editor" v-if="editionMode">
    <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'" style="max-width: 20ch">
      <div class="d-flex gap-2">
        <div class="icon-subcomponent" @click="showModal" :title="'Edit Content'"><i class="fa-solid fa-pencil text-sm" :title="'Edit Content'">           </i></div>
        <div class="icon-subcomponent" @click="$emit('change-content', objData, null, 'delete')" :title="'Delete Content'"><i class="fa-solid fa-trash-can text-sm" :title="'Delete Content'"></i></div>
        <div class="icon-subcomponent" v-if="objData.visibility" :title="'Hide Content'" @click="$emit('change-content', objData, null, 'showOrHide')"><i class="fa-solid fa-eye-slash text-sm" :title="'Hide Content'"> </i></div>
        <div class="icon-subcomponent" v-if="!objData.visibility" :title="'Show Content'" @click="$emit('change-content', objData, null, 'showOrHide')"> <i class="fa-solid fa-eye text-base" :title="'Show Content'">  </i></div>
      </div>
    </Tooltip>
  </div>
</div>
</template>

<script lang="ts">
import { ObjectUtils } from '@/utils';
import { defineComponent, PropType, reactive, ref, toRefs } from 'vue'
import { IndustryType } from '../types';
import { Editor } from "@progress/kendo-vue-editor";
import { basicTools, advancedTools } from '../data/editor';
import { Tooltip } from '@progress/kendo-vue-tooltip'

export default defineComponent({
    name: 'IndustryComponent',
    components: { Editor, Tooltip },
    props: {
        editionMode: { type: Boolean, required: false, default: false },
        objectContent: { type: Object as PropType<IndustryType>, required: true },
    },
    emits: ['change-content'],
    setup(props, { emit }) {
        interface DataInterface {
            showModalEdit: boolean,
            objData: IndustryType
        }
        const data: DataInterface = reactive<DataInterface>({
            showModalEdit: false,
            objData: ObjectUtils.cloneDeep(props.objectContent)
        })

        const textDefaultToShowLeft = ref(props.objectContent.textLeft)
        const textDefaultToShowRight = ref(props.objectContent.textRight)
        const textToEditorLeft = ref(ObjectUtils.cloneDeep(textDefaultToShowLeft.value))
        const textToEditorRight = ref(ObjectUtils.cloneDeep(textDefaultToShowRight.value))
        const onEditorChangeLeft = (event: any) => {
            textToEditorLeft.value = event.html;
        };
        const onEditorChangeRight = (event: any) => {
            textToEditorRight.value = event.html;
        };
        const showModal = () => {
            data.showModalEdit = true
        }
        const saveText = () => {
            data.objData.textLeft = textToEditorLeft.value
            data.objData.textRight = textToEditorRight.value
            emit('change-content', data.objData, { obj: data.objData }, 'industry')
            data.showModalEdit = false
        }
        const cancelEdition = () => {
            data.showModalEdit = false
            textToEditorLeft.value = ObjectUtils.cloneDeep(textDefaultToShowLeft.value)
            textToEditorRight.value = ObjectUtils.cloneDeep(textDefaultToShowRight.value)
        }
        return {
            ...toRefs(data),
            showModal, basicTools, textDefaultToShowLeft, textDefaultToShowRight, saveText, onEditorChangeLeft, onEditorChangeRight,
            textToEditorLeft, textToEditorRight, cancelEdition, advancedTools
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

.info-box-left {
    padding: 16px;
    border-radius: 0.2rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    background-color: #FF2C4F;
    color: white;
}

.info-box-right {
    padding: 16px;
    background-color: #fff;
    border-radius: 0.2rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.content-with-lists :deep(ul) {
    list-style-type: disc;
    padding-left: 20px;
}
</style>