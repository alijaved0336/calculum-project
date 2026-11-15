<template>
<div class="d-flex flex-column" v-if="!isTooltip">
  <div class="d-flex gap-2"><span class="text-gray-450 text-xl font-semibold text-uppercase" :class="{'mb-4':title!==''}">{{ title }}</span><i class="fa-solid fa-pencil text-sm cursor-pointer mt-1" v-if="showEditOption" :title="editTooltip" :id="pencilId" @click.stop="$emit('openEdit')"></i></div><span class="text-gray-500 text-lg" :class="showClass">{{ value }}</span><span class="text-gray-400 text-sm" v-if="additionalText">{{ additionalText }}</span>
</div>
<div class="d-flex flex-column" v-if="isTooltip" v-on="handleClick">
  <div class="d-flex gap-2"><span class="text-gray-400 text-md font-semibold">{{ title }}
      <CalculumTooltipIcon v-if="tooltipInfoText" :infoText="tooltipInfoText" :class="'bg-danger-500'"></CalculumTooltipIcon></span><i class="fa-solid fa-pencil text-sm cursor-pointer mt-1" v-if="showEditOption" :title="editTooltip" :id="pencilId" @click.stop="$emit('openEdit')"></i></div>
  <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'">
    <div class="d-flex min-width-0" :class="isUrl ? 'flex-row' : 'flex-column'"><span class="text-lg text-ellipsis cursor-pointer" ref="valueSpanRef" :title="value" :class="showClass">{{ value }}</span>
      <OpenURL class="ml-2 cursor-pointer text-url" v-if="isUrl && value!='-'" :color="showColor"></OpenURL><span class="text-gray-400 text-sm" v-if="additionalText && !fromMap">{{ additionalText }}</span><span class="text-lg text-ellipsis" v-else-if="additionalText && fromMap" :class="showClass">{{ additionalText }}</span>
    </div>
  </Tooltip>
</div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted, onUpdated, watch } from 'vue'
import { Tooltip } from "@progress/kendo-vue-tooltip";
import OpenURL from '@/modules/components/OpenURL.vue';
import { ColorsUtils } from '@/utils';
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue';

export default defineComponent({
    name: 'DetailBox',
    components: {
        Tooltip,
        OpenURL,
        CalculumTooltipIcon
    },
    props: {
        titleTag: {
            type: String,
            required: false, default: '-'
        },
        title: {
            type: String,
            required: true
        },
        value: {
            type: String,
            required: true, default: '-'
        }, isUrl: {
            type: Boolean,
            required: false, default: false
        },
        isTooltip: {
            type: Boolean,
            required: false, default: false
        },
        tooltipText: {
            type: String,
            required: false, default: ''
        },
        tooltipInfoText: {
            type: String,
            required: false, default: ''
        },
        semiBold: {
            type: Boolean,
            required: false, default: false
        },
        additionalText: {
            type: String,
            required: false, default: ''
        },fromMap:{
            type: Boolean,
            required: false, default: false
        },
        showEditOption:{
            type: Boolean,
            required: false, default: false
        },
        editTooltip: {
            type: String,
            required: false, default: ''
        },
        pencilId: {
            type: String,
            required: false, default: ''
        }
    },
    emits: ['clickUrl','openEdit'],
    setup(props, { emit }) {
        const valueSpanRef = ref<HTMLElement | null>(null)
        const isTruncated = ref(false)

        function checkTruncation() {
            const el = valueSpanRef.value
            if (el) {
                isTruncated.value = el.scrollWidth > el.clientWidth
            }
        }

        onMounted(checkTruncation)
        onUpdated(checkTruncation)
        watch(() => props.value, checkTruncation)

        const isUrlIsTooltip = computed(() => {
            return props.isUrl && props.isTooltip
        })
        const handleClick = computed(() => {
            if (props.isUrl) {
                return { click: () => emit('clickUrl') }
            }
            return {}
        })
        const showClass = computed(() => {
            let result = ''
            if (props.isUrl) {
                result += ' text-url'
            } else {
                result += ' text-gray-700'
            }
            if (props.semiBold) {
                result += ' font-semibold'
            } else {
                result += ' font-bold'
            }
            return result
        })
        const showColor = computed(() => {
            if (props.isUrl) {
                return ColorsUtils.blueDark[600]
            }
            return '#344054'
        })
        return {
            valueSpanRef,
            isTruncated,
            isUrlIsTooltip,
            handleClick, showClass, showColor
        }
    }
})
</script>
<style scoped lang="scss">
@import '@/resources/assets/styles/variables/_colors.scss';

.text-url {
    color: $color-blue-dark-600 !important;
}

.text-ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}

.min-width-0 {
    min-width: 0;
}
</style>
