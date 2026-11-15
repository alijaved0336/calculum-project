<template>
<div class="grid-nine-boxes" v-if="programInrecalculation || loading || loadingDataBoxes || !allowsBoxes">
  <div class="box" v-for="index in 9" :key="index">
    <Skeleton class="skeletons-bg" :shape="'rectangle'" :style="{ width: '100%', height: '150px' }"></Skeleton>
  </div>
</div>
<div class="grid-chart" v-else>
  <div class="chart-axis chart-y-axis d-flex justify-content-between"><span>{{ $t('global.low') }} </span><span>{{ yAxisTitle }}</span><span>{{ $t('global.high') }}   </span></div>
  <div class="grid-nine-boxes">
    <NineBoxesBox v-for="box in 9" :key="box" :boxNumber="boxNumber(box)" :boxInfo="boxInfo(box)" :boxGroup="String(boxGroup(box))" :selectedLevelType="selectedLevel" :boxTitle="boxTitle" :typeOf9Boxes="typeOf9Boxes" @selectedBoxes="$emit('selectedBoxes')"></NineBoxesBox>
  </div>
  <div class="chart-axis chart-x-axis d-flex justify-content-between"><span>{{ $t('global.low') }} </span><span>{{ xAxisTitle }}</span><span>{{ $t('global.high') }} </span></div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs } from 'vue'
import NineBoxesBox from './NineBoxesBox.vue'
import { Skeleton } from '@progress/kendo-vue-indicators';

export default defineComponent({
  name: 'NineBoxes',
  components: {
    NineBoxesBox,
    Skeleton
  },
  props: {
    boxesInfo: { type: Object, required: true },
    selectedLevel: { type: String, required: false, default: 'spend' },
    programInrecalculation: { type: Boolean, required: false, default: true },
    allowsBoxes: { type: Boolean, required: false, default: true },
    loading: { type: Boolean, required: false, default: true },
    loadingDataBoxes: { type: Boolean, required: false, default: true },
    yAxisTitle: { type: String, required: true },    
    xAxisTitle: { type: String, required: true },
    boxTitle: { type: String, required: true },
    typeOf9Boxes: { type: String, required: true },
  },
  emits: ['selectedBoxes'],
  setup(props) {
    interface Data {
      /**
       * Map the box number in the iteration to the real box name:
       * 
       *   7  4  1
       *   8  5  2
       *   9  6  3
       * 
       * This order is arranged by the level of buyer impact 
       * and the probability of success.
       */
      boxNumberMap: {
        [key: number]: string
      },
      /**
       * ? -: Add the real box group
       * Specify the group of each box:
       * 
       *  High: 1, 2, 3
       *  Medium: 4, 5, 6
       *  Medium-Low: 7, 8
       *  Low: 9
       */
      boxGroupMap: {
        [key: number]: string
      },
      boxGroupMapFinancing: {
        [key: number]: string
      },
      boxGroupMapVcard: {
        [key: number]: string
      }
      // loadingNineBoxes: boolean,  // Loading state
    }

    const data = reactive<Data>({
      boxNumberMap: {
        1: '7',
        2: '4',
        3: '1',
        4: '8',
        5: '5',
        6: '2',
        7: '9',
        8: '6',
        9: '3'
      },
      // ? -: Add the real box group
      boxGroupMapFinancing: {
        1: 'box-group-color-gray-600',
        2: 'box-group-color-primary-700',
        3: 'box-group-color-primary-700',
        4: 'box-group-color-gray-500',
        5: 'box-group-color-gray-600',
        6: 'box-group-color-primary-700',
        7: 'box-group-color-gray-400',
        8: 'box-group-color-gray-500',
        9: 'box-group-color-gray-600',
      },
      boxGroupMap: {
        1: 'box-group-color-gray-600',
        2: 'box-group-color-blue-700',
        3: 'box-group-color-blue-700',
        4: 'box-group-color-gray-500',
        5: 'box-group-color-gray-600',
        6: 'box-group-color-blue-700',
        7: 'box-group-color-gray-400',
        8: 'box-group-color-gray-500',
        9: 'box-group-color-gray-600',
      },
      boxGroupMapVcard: {
        1: 'box-group-color-gray-600',
        2: 'box-group-color-teal-700',
        3: 'box-group-color-teal-700',
        4: 'box-group-color-gray-500',
        5: 'box-group-color-gray-600',
        6: 'box-group-color-teal-700',
        7: 'box-group-color-gray-400',
        8: 'box-group-color-gray-500',
        9: 'box-group-color-gray-600',
      }
      // loadingNineBoxes: true
    })

    return {
      // Send the data to template as refs
      ...toRefs(data),

      // Get the real box number
      boxNumber: ((box: number) => {
        return data.boxNumberMap[box]
      }),

      // Get the box group
      boxGroup: ((box: number) => {

        switch (props.typeOf9Boxes) {
          case 'scf9Box':
          case 'financing':
            return data.boxGroupMapFinancing[box]
          case 'cashFlow':
            return data.boxGroupMap[box]
          case 'vcard':
            return data.boxGroupMapVcard[box]
          default:          
            break
        }
      }),

      // Get the data corresponding to the box number
      boxInfo: ((box: number) => {
        return props.boxesInfo[data.boxNumberMap[box]]
      }),
    }
  }
})
</script>

<style lang="scss" scoped>
@import '@/resources/assets/styles/variables/_colors.scss';

/**
* The grid chart is a 2x2 grid that contains the y-axis, the nine boxes and the x-axis.
*/
.grid-chart {
  display: grid;
  grid-template-columns: min-content;
  grid-template-rows: min-content;
}

/**
* Chart axis
*/
.chart-axis {
  padding-block: 3px;
  padding-inline: 10px;
  background-color: $color-gray-200;

  /**
  * Axis labels
  */
  span {
    font-size: 12px;
    font-weight: 500;
    color: $color-gray-500;
  }
}

/**
* Chart x-axis
*/
.chart-x-axis {
  height: min-content;
  grid-column: 1 / 3;
  padding-left: 48px;
  max-height: 24px;
  border-radius: 0 4px 4px 4px;
}

/**
* Chart y-axis
*/
.chart-y-axis {
  writing-mode: vertical-lr;
  transform: rotate(180deg);
  max-width: 24px;
  border-radius: 0 0 4px 4px;
  
}


</style>