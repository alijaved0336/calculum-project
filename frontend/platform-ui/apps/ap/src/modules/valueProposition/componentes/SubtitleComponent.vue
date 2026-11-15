<template>
<StickyHeaderWrapper class="sticky-subtitle mb-4">
  <div class="row">
    <div class="col-lg-10 d-flex gap-2">
      <textarea class="form-control subtitle-content" :class="isHovered" v-model="subtitleText" :disabled="!editionMode" @change="handleChange" @keyup.enter="handleChange" :rows="currentRows" @input="adjustTextareaRows" ref="textAreaRef"></textarea>
    </div>
    <div class="col-lg-2 d-flex gap-2 actions-by-section" v-if="editionMode">
      <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'" style="max-width: 20ch">
        <div class="d-flex gap-2">
          <div class="icon-subcomponent" @click="$emit('change-content', subtitleData, null, 'delete')" :title="'Delete Content'"><i class="fa-solid fa-trash-can text-sm" :title="'Delete Content'"></i></div>
          <div class="icon-subcomponent" v-if="subtitleData.visibility" :title="'Hide Content'" @click="$emit('change-content', subtitleData, null, 'showOrHide')"><i class="fa-solid fa-eye-slash text-sm" :title="'Hide Content'"></i></div>
          <div class="icon-subcomponent" v-if="!subtitleData.visibility" :title="'Show Content'" @click="$emit('change-content', subtitleData, null, 'showOrHide')"> <i class="fa-solid fa-eye text-base" :title="'Show Content'"> </i></div>
        </div>
      </Tooltip>
    </div>
  </div>
</StickyHeaderWrapper>
</template>

<script lang="ts">
import { ObjectUtils } from '@/utils';
import { computed, defineComponent, nextTick, onMounted, PropType, reactive, ref, toRefs, watch } from 'vue'
import { SubtitleType } from '../types';
import { Editor } from "@progress/kendo-vue-editor";
import CalculumModal from '@/modules/components/CalculumModal.vue';
import { Tooltip } from '@progress/kendo-vue-tooltip'
import StickyHeaderWrapper from '@/modules/components/StickyHeaderWrapper.vue';

export default defineComponent({
    name: 'SubtitleComponent',
    components: { Editor, CalculumModal, Tooltip, StickyHeaderWrapper },
    props: {
        editionMode: { type: Boolean, required: false, default: false },
        objectContent: { type: Object as PropType<SubtitleType>, required: true },
    },
    emits: ['change-content'],
    setup(props, { emit }) {

        interface DataInterface {
            subtitleData: SubtitleType
        }

        const data: DataInterface = reactive<DataInterface>({
            subtitleData: ObjectUtils.cloneDeep(props.objectContent)
        })
        const subtitleText = ref<string>(data.subtitleData.text)
        const handleChange = (event: any) => {
            data.subtitleData.text = subtitleText.value
            emit('change-content', data.subtitleData, { obj: data.subtitleData }, 'subtitle');
        }
        const isHovered = computed(() => props.editionMode ? 'hover-enabled' : '')
        const textAreaRef = ref<HTMLTextAreaElement | null>(null)
        const currentRows = ref(1)

        const calculateRows = () => {
            if (!textAreaRef.value) return 1
            const textarea = textAreaRef.value
            const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20 // Fallback a 20px
            const padding = parseInt(getComputedStyle(textarea).paddingTop) +
                parseInt(getComputedStyle(textarea).paddingBottom)

            // Calculating rows
            const rows = Math.max(
                1,
                Math.ceil((textarea.scrollHeight - padding) / lineHeight)
            )

            return rows
        }

        const adjustTextareaRows = () => {
            nextTick(() => {
                currentRows.value = calculateRows()
            })
        }
        watch(
            subtitleText,
            () => {
                adjustTextareaRows()
            }
        )
        onMounted(() => {
            adjustTextareaRows()
        })
        return {
            ...toRefs(data),
            subtitleText, handleChange, isHovered, textAreaRef, adjustTextareaRows, currentRows
        }
    }
})
</script>

<style lang="scss" scoped>
.icon-subcomponent {
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    cursor: pointer;
    font-size: 18px;


    &:hover {
        background-color: rgba(0, 0, 0, 0.9);
        transform: rotate(360deg);
    }
}

.subtitle-content {
    background-color: transparent;
    font-size: 1.2rem !important;
    width: 100%;
    border: none;
    padding: 1px 1px;
    line-height: 2rem;
    font-weight: 700;
    resize: none;
}

.subtitle-content.hover-enabled:hover {
    padding: 1px 1px;
    border: 2px solid #ccc;
    border-radius: 5px;
    transition: all 0.3s ease;
    outline: none;
    background-color: white;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.1);

}

.actions-by-section {
    justify-content: end;
    padding-right: 10px;
}

.icon {
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    cursor: pointer;
    font-size: 18px;


    &-subsection {
        width: 30px;
        height: 30px;
    }



    &-controls {
        width: 25px;
        height: 25px;
        background-color: #ff2c4f;

        &:hover {
            background-color: #ff2c4f !important;
            transform: rotate(360deg);
        }
    }

    &-controls-private {
        width: 25px;
        height: 25px;
        background-color: #73e2a3;

        &:hover {
            background-color: #73e2a3 !important;
            transform: rotate(360deg);
        }
    }



    &:hover {
        background-color: rgba(0, 0, 0, 0.9);
        transform: rotate(360deg);
    }
}
</style>