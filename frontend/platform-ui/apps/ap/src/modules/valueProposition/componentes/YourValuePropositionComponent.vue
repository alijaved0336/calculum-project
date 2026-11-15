<template>
<div class="component-editor-container" v-if="showModalEdit" @click.self="cancelEdition">
  <div class="d-flex component-editor-body">
    <div class="row mt-2">
      <div class="col-12 d-flex container-buttons"><span class="cursor-pointer" @click="cancelEdition"><i class="fa-solid fa-xmark"></i></span></div>
    </div>
    <div class="row mt-2">
      <div class="col-6">
        <div class="form-group">
          <label for="title">
            <input class="form-control required" id="title" name="title" v-model="objData.title" placeholder="Set the main section title"/><span>{{ 'Main title' }}           </span>
          </label>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label for="leftTitle">
            <input class="form-control required" id="leftTitle" name="leftTitle" v-model="objData.leftTitle" placeholder="Set the header 1"/><span>{{ 'Header 1' }}                                   </span>
          </label>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label for="middleTitle">
            <input class="form-control required" id="middleTitle" name="middleTitle" v-model="objData.middleTitle" placeholder="Set the header 2"/><span>{{ 'Header 2' }}                                   </span>
          </label>
        </div>
      </div>
      <div class="col-6">
        <div class="form-group">
          <label for="rightTitle">
            <input class="form-control required" id="rightTitle" name="rightTitle" v-model="objData.rightTitle" placeholder="Set the header 3"/><span>{{ 'Header 3' }}</span>
          </label>
        </div>
      </div>
    </div>
    <div class="row mt-2">
      <div class="col-12">
        <div class="form-group">
          <label for="leftText">
            <textarea class="form-control required" id="leftText" name="leftText" v-model="objData.leftText" placeholder="Set the script 1"></textarea><span>{{ 'Script 1' }}</span>
          </label>
        </div>
      </div>
      <div class="col-12">
        <div class="form-group">
          <label for="middleText">
            <textarea class="form-control required" id="middleText" name="middleText" v-model="objData.middleText" placeholder="Set the script 2"></textarea><span>{{ 'Script 2' }}</span>
          </label>
        </div>
      </div>
      <div class="col-12">
        <div class="form-group">
          <label for="rightText">
            <textarea class="form-control required" id="rightText" name="rightText" v-model="objData.rightText" placeholder="Set the script 3"></textarea><span>{{ 'Script 3' }}</span>
          </label>
        </div>
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
<div class="card content-editor mb-4" v-if="objData.visibility || editionMode">
  <div class="card-body">
    <StickyHeaderWrapper><span class="text-gray-700 text-2xl cursor-pointer truncate-title font-semibold">{{ objData.title }} </span></StickyHeaderWrapper>
    <div class="row">
      <div class="col-lg-4">
        <h2 class="text-gray-700 text-xl text-primary-500 font-semibold">{{ objData.leftTitle }} </h2><span class="font-medium">{{ objData.leftText }}</span>
      </div>
      <div class="col-lg-4 pr-5">
        <h2 class="text-gray-700 text-xl text-primary-500 font-semibold">{{ objData.middleTitle }} </h2><span class="font-medium">{{ objData.middleText }}</span>
      </div>
      <div class="col-lg-4">
        <h2 class="text-gray-700 text-xl text-primary-500 font-semibold">{{ objData.rightTitle }} </h2><span class="font-medium">{{ objData.rightText }}</span>
      </div>
    </div>
    <div class="overlay-vp-editor" v-if="editionMode">
      <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'" style="max-width: 20ch">
        <div class="d-flex gap-2">
          <div class="icon-subcomponent" @click="showModalEdit = true" :title="'Edit Content'"><i class="fa-solid fa-pencil text-sm" :title="'Edit Content'"></i></div>
          <div class="icon-subcomponent" @click="$emit('change-content', objData, null, 'delete')" :title="'Delete Content'"><i class="fa-solid fa-trash-can text-sm" :title="'Delete Content'"></i></div>
          <div class="icon-subcomponent" v-if="objData.visibility" :title="'Hide Content'" @click="$emit('change-content', objData, null, 'showOrHide')"><i class="fa-solid fa-eye-slash text-sm" :title="'Hide Content'"></i></div>
          <div class="icon-subcomponent" v-if="!objData.visibility" :title="'Show Content'" @click="$emit('change-content', objData, null, 'showOrHide')"><i class="fa-solid fa-eye text-base" :title="'Show Content'">        </i></div>
        </div>
      </Tooltip>
    </div>
  </div>
</div>
</template>
<script lang="ts">

import { defineComponent, computed, PropType, ref, reactive, toRefs } from 'vue'
import { ObjectUtils } from "@/utils";
import { YourValuePropositionType } from '@/modules/valueProposition/types';
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { getMediaUrl } from "@/services/media/mediaActions";
import StickyHeaderWrapper from '@/modules/components/StickyHeaderWrapper.vue';

export default defineComponent({

    name: 'YourValuePropositionComponent',
    components: { Tooltip, StickyHeaderWrapper },
    props: {
        editionMode: { type: Boolean, required: false, default: false },
        objectContent: { type: Object as PropType<YourValuePropositionType>, required: true },
        logo: { type: String, required: false, default: '' },
    },
    emits: ['change-content'],
    setup(props, { emit }) {

        interface DataInterface {
            showModalEdit: boolean,
            objData: YourValuePropositionType
            objDataInitial: YourValuePropositionType
        }

        const data: DataInterface = reactive<DataInterface>({
            showModalEdit: false,
            objData: ObjectUtils.cloneDeep(props.objectContent),
            objDataInitial: ObjectUtils.cloneDeep(props.objectContent)
        })

        const showLogo = computed(() => {
            if (props.logo) {
                return getMediaUrl(props.logo)
            } else {
                return null
            }
        })

        function saveText() {
            emit('change-content', data.objData, {obj:data.objData}, 'yourValueProposition')
            data.showModalEdit = false
        }

        function cancelEdition() {
            data.objData = ObjectUtils.cloneDeep(data.objDataInitial)
            data.showModalEdit = false

        }


        return {
            ...toRefs(data),
            showLogo,
            saveText,
            cancelEdition
        }

    }
})

</script>

<style lang="scss" scoped>
.card {
    min-height: 100px !important;
}
</style>
