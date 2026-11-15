<template>
<div class="test mb-0">
  <p class="text-gray-900 text-lg font-bold">{{ objDataContent.title }}</p>
  <div class="d-flex align-items-center justify-content-between"><span class="text-2xl font-bold">{{ objDataContent.letterGrade }}</span>
    <CalculumArcCircle :level="objDataContent.level" :grade-level-text="objDataContent.gradeLevelText" :level-color="levelColorByLevel" :width="objDataContent.arcCircleWidth" :height="objDataContent.arcCircleHeight" :radius="35" :fontSize="'xs'" :strokeTextWidth="0.3" :stroke-width="3"></CalculumArcCircle>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, computed } from 'vue';
import CalculumArcCircle from '@/modules/components/charts/CalculumArcCircle.vue';
import { ObjectUtils, getLevelColor } from '@/utils';

export default defineComponent({
    name: 'CredtRatingComponent',
    components: {
        CalculumArcCircle
    },
    props: {
        objData: {
            type: Object,
            required: true
        }
    },
    setup(props) {
        const data = reactive({
            objDataContent: ObjectUtils.cloneDeep(props.objData)
        })
        const levelColorByLevel = computed(() => {
            return getLevelColor(data.objDataContent.level)
        })
        return {
            ...toRefs(data),
            levelColorByLevel
        };
    }
});
</script>

<style scoped lang="scss">
.test {
    display: flex;
    flex-direction: column;
    letter-spacing: -0.5px;
    
    p {
        margin-bottom: -12px;
    }
    
    .d-flex {
        margin-top: -6px;
        margin-bottom: -18px;
    }
}
</style>