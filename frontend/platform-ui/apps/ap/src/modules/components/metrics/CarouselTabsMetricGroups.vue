<template>
<div class="d-flex align-items-center">
  <button class="nav-button nav-button-prev" @click="prevSlide" :disabled="currentIndex === 0" v-if="currentIndex !== 0 && metricsGroups.length > 4">
    <svg width="20" height="20" viewbox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M16.1435 8.68619H5.7182L10.2729 4.13152C10.6369 3.76752 10.6369 3.17019 10.2729 2.80619C10.0985 2.63142 9.86175 2.5332 9.61487 2.5332C9.36799 2.5332 9.13125 2.63142 8.95687 2.80619L2.8062 8.95686C2.4422 9.32086 2.4422 9.90886 2.8062 10.2729L8.95687 16.4235C9.32087 16.7875 9.90887 16.7875 10.2729 16.4235C10.6369 16.0595 10.6369 15.4715 10.2729 15.1075L5.7182 10.5529H16.1435C16.6569 10.5529 17.0769 10.1329 17.0769 9.61952C17.0769 9.10619 16.6569 8.68619 16.1435 8.68619Z" fill="#667085"></path>
    </svg>
  </button>
  <div class="carousel-overflow mb-2">
    <div class="carousel-container">
      <div class="carousel-track" :style="{ transform: `translateX(${offset}px)` }">
        <MetricGroup class="mr-2 cursor-pointer" v-for="(metric, index) in metricsGroups" :title="$t('global.metricCategories.'+metric.groupName )" :active="metric.groupName === groupSelected" :groupKey="metric.groupName" @sendGroup="activeGroup" :key="index" :getItemwidth="getItemwidth" :programInrecalculation="programInrecalculation">             </MetricGroup>
      </div>
    </div>
  </div>
  <button class="nav-button nav-button-next" @click="nextSlide" :disabled="currentIndex === metricsGroups.length - 1" v-if="currentIndex !== metricsGroups.length - 1 && metricsGroups.length > 4">
    <svg width="20" height="20" viewbox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M3.85646 8.68619H14.2818L9.72713 4.13152C9.36313 3.76752 9.36313 3.17019 9.72713 2.80619C9.90151 2.63142 10.1382 2.5332 10.3851 2.5332C10.632 2.5332 10.8688 2.63142 11.0431 2.80619L17.1938 8.95686C17.5578 9.32086 17.5578 9.90886 17.1938 10.2729L11.0431 16.4235C10.6791 16.7875 10.0911 16.7875 9.72713 16.4235C9.36313 16.0595 9.36313 15.4715 9.72713 15.1075L14.2818 10.5529H3.85646C3.34313 10.5529 2.92313 10.1329 2.92313 9.61952C2.92313 9.10619 3.34313 8.68619 3.85646 8.68619Z" fill="#667085"> </path>
    </svg>
  </button>
</div>
</template>
  
<script lang="ts">
import { reactive, toRefs, defineComponent, computed, onMounted } from 'vue'
import MetricGroup from "./MetricGroup.vue";

export default defineComponent({
  name: 'CarouselMetricGroups',
  components: { MetricGroup },
  props: {
    metricsGroups: { type: Array, required: true },
    groupSelected: { type: String, required: true },
    loadingChartData: { type: Boolean, default: false },
    programInrecalculation: { type: Boolean, default: false }
  },
  emits: ['send-group'],
  setup(props, { emit }) {


    interface DataInterface {
      currentIndex: number,
      offset: number
      loadingChartData: boolean,
      groupSelected: string

    }

    const data = reactive<DataInterface>({
      currentIndex: 0,
      offset: 0,
      loadingChartData: false,
      groupSelected: props.groupSelected

    })

    onMounted(() => {
      if (props.metricsGroups.length >= 5) {
        const selectedMetric = props.metricsGroups.find((metric: any) => metric.groupName === props.groupSelected);
        if (selectedMetric) {
          const index = props.metricsGroups.indexOf(selectedMetric);

          if (index < data.currentIndex) {
            const times = data.currentIndex - index;
            for (let i = 0; i < times; i++) {
              prevSlide();
            }
          } else if (index > data.currentIndex) {
            const times = index - data.currentIndex;
            for (let i = 0; i < times; i++) {
              nextSlide();
            }
          }
        }
      }

    })

    function prevSlide() {
      if (data.currentIndex > 0) {
        data.currentIndex--;
        data.offset += 300
      }
    }

    function nextSlide() {
      if (data.currentIndex < props.metricsGroups.length - 1) {
        data.currentIndex++;
        data.offset -= 300
      }
    }

    const getItemwidth = computed<number>(() => {
      if (props.metricsGroups.length <= 4) {
        return 400
      }
      else {
        return 350
      }      
    })

    function activeGroup(group: any) {
      if (data.loadingChartData) {
        return
      }
      data.groupSelected = group
      emit('send-group', group)
    }

    return {
      ...toRefs(data),
      getItemwidth,
      prevSlide,
      nextSlide,
      activeGroup
    }
  }
})
</script>