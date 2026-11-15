<template>
<div class="d-flex-flex-column">
  <h1 class="mb-1 font-bold text-base mb-6"><span class="text-gray-700 text-2xl cursor-pointer truncate-title font-semibold">{{ $t("home.match.dataReceived") }}          </span></h1>
  <div class="text-left"><span class="mr-2">{{ $t("global.total") }}:</span><span class="font-bold">{{ totalShow }}</span></div>
  <Tooltip :anchor-element="'target'" :position="'top'">
    <div class="d-flex mb-3 mt-7" :class="heigthClass">
      <div class="pb-1 d-flex align-items-end text-white" v-for="(info, index) in infoData" :data-toggle="'tooltip'" :title="FormatData.getNumberWithDecimals(info.value, 0)" :data-placement="'top'" :key="index" :class="setClass(info.percentage, info.key)" :style="[{ width: setPercentage(info.percentage) + '%' }, setColor(info.key)]"><span class="ml-1" v-if="setPercentage(info.percentage) > 10">{{ showPercentage ? `${info.percentage}%` : StringUtils.formatBigNumbers(info.value) }}</span></div>
    </div>
  </Tooltip>
  <div class="d-flex justify-content-center align-items-center text-center mt-5 gap-2">
    <div class="d-flex mr-1 dots-container" v-for="(info, index) in infoData" :key="index">
      <div class="dot mr-1" :class="`${info.key}-class`" :style="setColor(info.key)"></div><span class="text-sm font-medium text-gray-500 mr-1">{{ info.key }} </span><span class="text-sm font-semibold text-gray-700">{{ showPercentage ? `${info.percentage}%` : StringUtils.formatBigNumbers(info.value) }}</span>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType, ref } from 'vue'
import { Tooltip } from '@progress/kendo-vue-tooltip';
import { Info } from '../types';
import { chartsGetItemColorMatch, getRandomAlternatingColors, getStrictDarkColors } from '../../components/utils/utilsCharts';
import { FormatData, StringUtils } from '@/utils';

export default defineComponent({
    name: 'HomeStackedBar',
    components: { Tooltip },
    props: {
        infos: { type: Array as PropType<Info[]>, required: true, default: () => [] },
        heigthClass: { type: String, required: false, default: 'min-h-14' },
        showPercentage: { type: Boolean, required: false, default: false },
        target: { type: String, required: false, default: '' },
    },
    setup(props) {        
        const colorsGot = ref<{ key: string, color: { backgroundColor: string } }[]>([]);
        function getColors() {
            getStrictDarkColors(['gray', 'graycool', 'blue', 'bluelight'], props.infos.length).forEach((item: any, index: number) => {
                const data = {
                    key: props.infos[index].key, color: { backgroundColor: item }
                }
                colorsGot.value.push(data)
            })
        }
        const infoData = computed(() => {
            const infoData = props.infos.slice();
            const index = infoData.findIndex((item: any) => item.percentage < 0);
            if (index >= 0) {
                let elemento = infoData.splice(index, 1)[0];
                infoData.unshift(elemento)
            }
            return infoData
        })

        function setPercentage(percentage: number) {
            if (percentage < 0) {
                return (percentage * -1)
            }
            return percentage
        }

        function setClass(percetage: number, statusclass: string) {
            return percetage < 0 ? `negative-percentage ${statusclass}-class` : `${statusclass}-class`
        }
        getColors()
        function setColor(key: string) {
            const stackedColor = ["included", "excluded", "matched", "unmatched"]
            if (!stackedColor.find(i => i === key)) {
                const get = colorsGot.value.find(i => i.key === key)
                if (get) {
                    return get.color
                } else {
                    return getRandomAlternatingColors(['gray', 'teal', 'blue'], props.infos.length)[0]
                }
            } else {
                return {backgroundColor:chartsGetItemColorMatch(key)}
            }
        }
        const totalShow = computed(() => {
            StringUtils.formatBigNumbers(props.infos[0].total);
            return StringUtils.formatBigNumbers(props.infos[0].total);
        })
        return {
            infoData,
            setPercentage,
            setClass,
            FormatData, 
            setColor, 
            totalShow,
            StringUtils
        }



    }
})
</script>
<style scoped lang="scss">
.d-flex>div.negative-percentage {
    position: relative;
}

.d-flex>div.negative-percentage::after {
    content: '';
    position: absolute;
    top: 0px;
    left: 100%;
    width: 2px;
    height: 120%;
    background-color: black;
}

.d-flex>div.negative-percentage::before {
    content: '0';
    position: absolute;
    bottom: -25px;
    left: 100.5%;
    transform: translateX(-50%);
    color: #98a2b3 !important;
    font-size: 12px;

}
</style>