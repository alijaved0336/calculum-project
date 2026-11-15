<template>
<div class="d-flex justify-content-between" v-for="(item, index) in formattingLimits" :key="index">
  <DetailBox :title="item.label" :value="''" :isTooltip="true"></DetailBox><span class="font-bold text-gray-600">{{ item.value }}</span>
</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import DetailBox from '@/modules/home/entityCard/components/details/DetailBox.vue';

export interface SmeLimitItem {
    label: string
    value: string
}

export default defineComponent({
    name: 'SmeClassificationCase',
    components: {
        DetailBox
    },
    props: {
        description: {
            type: String,
            required: true
        },
        limits: {
            type: Array as () => SmeLimitItem[],
            required: true,
            default: () => []
        }
    },
    setup(props) {
        const formattingLimits = computed(() => {
            return props.limits.map(item => ({
                label: item.label,
                value: item.value
            }))
        })
        return {
            formattingLimits
        }
    }
})
</script>

