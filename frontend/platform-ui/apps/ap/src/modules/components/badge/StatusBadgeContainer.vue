<template>
<div class="status-badge-container rounded-xl" :style="`background-color: ${statusColorByStatus}`"><span class="text-sm font-bold">{{ status }}</span></div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import * as colorsGroups from '@/utils/ColorsGroups'
export default defineComponent({
  name: "StatusBadgeContainer",
  props: {
    status: { type: String, required: true },
  },
  setup(props: any) {



    const statusColorByStatus = computed(() => {
        switch (props.status) {
            case "Active":
                return colorsGroups.medium
            default:
                return colorsGroups.noLevel
        }
    })


    return {
        statusColorByStatus
    };
  },
}) 
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors";

.status-badge-container {
    width: fit-content;
    padding: 4px 16px !important;    
    display: flex;
    align-items: center;
    justify-content: center;    
    color: #fff;
}

.status-badge-title {
    color: $color-gray-700 !important;
}

</style>