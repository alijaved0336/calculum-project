<template>
<div class="row mb-1">
  <div class="col">
    <span class="text-gray-600 text-sm font-semibold text-capitalize">{{ $t('home.overview.dataQualityAndRequired.qualityDataReceived') }}: </span>
    <span class="ms-1 text-gray-500 text-sm font-bold" :style="{'color': bgColorForChartLineTop}"> {{ levelTextTop }}</span>
  </div>
</div>
<div class="row mb-2">
  <div class="col">
    <LevelDashesChart :level="levelTop" :level-color="bgColorForChartLineTop" :total-levels="3"></LevelDashesChart>
  </div>
</div>
<div class="row mb-1">
  <div class="col"><span class="text-gray-600 text-sm font-semibold text-capitalize">{{ $t('home.overview.dataQualityAndRequired.confidanceScore') }}: </span><span class="ms-1 text-gray-500 text-sm font-bold" :style="{'color': bgColorForChartLineBottom}"> {{ levelTextBottom }}</span></div>
</div>
<div class="row mb-2">
  <div class="col">
    <LevelDashesChart :level="levelBottom" :level-color="bgColorForChartLineBottom" :total-levels="5"></LevelDashesChart>
  </div>
</div>
</template>
<script lang="ts">
import { reactive, toRefs, defineComponent, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { setQuality, setConfidenceScore } from '../../utils'
import * as colorsGroups from '../../utils/ColorsGroups'
import LevelDashesChart from '../charts/LevelDashesChart.vue'

// Types
import type { PropType } from 'vue'
import type { DataQualityAndRequiredData } from './types'

export default defineComponent({
  name: 'OverviewDataQualityAndRequired',
  components: {
    LevelDashesChart
  },
  props: {
    data: { type: Object as PropType<DataQualityAndRequiredData>, required: true }
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const quality = ref()
    const score = ref()
    const overviewDataQualityAndRequired = reactive({
      bgColorForChartLineTop: '',
      bgColorForChartLineBottom: '',
      keyQuality: 1225,
      keyScore: 9787,
      loading: false,
      qualityColor: '',
      qualityPercent: '',
      qualityString: '',
      scorecolor: '',
      scorePercent: '',
      scoreString: '',
      levelTop: 1,
      levelBottom: 1,
      levelTextTop: '',
      levelTextBottom: '',
    })

    /**
     * Get level based on color for top portion
     * @param color
     */
    function getLevelBasedOnColorTop(color: string) {
      if (color === colorsGroups.low) {
        return 1
      } else if (color === colorsGroups.medium) {
        return 2
      } else if (color === colorsGroups.veryHigh) {
        return 3
      } else {
        return 0
      }
    }

    /**
     * Get level based on color for bottom portion
     * @param color
     */
    function getLevelBasedOnColorBottom(color: string) {
      if (color === colorsGroups.veryLow) {
        return 1
      } else if (color === colorsGroups.low) {
        return 2
      } else if (color === colorsGroups.medium) {
        return 3
      } else if (color === colorsGroups.high) {
        return 4
      } else if (color === colorsGroups.veryHigh) {
        return 5
      } else {
        return 0
      }
    }


    /**
     * Get color for top level dashes
     * @param value
     */
    function getColorForTopTheLevelDashes(value: any) {
      if (value <= 0 && value <= 30) {
        overviewDataQualityAndRequired.levelTextTop = translate.t('home.overview.limited')
        return colorsGroups.low // limited
      }
      else if (value > 30 && value <= 60) {
        overviewDataQualityAndRequired.levelTextTop = translate.t('home.overview.adequate')
        return colorsGroups.medium // adequete
      }
      else if (value >= 61 && value <= 100) {
        overviewDataQualityAndRequired.levelTextTop = translate.t('home.overview.substantial')
        return colorsGroups.veryHigh// substantial
      }
      else {
        overviewDataQualityAndRequired.levelTextTop = translate.t('global.notAvailable')
        return colorsGroups.noLevel
      }

    }

    /**
     * Get color for bottom level dashes
     */
    function getColorForBottomLevelDashes(value: any) {
      if (value <= 0 && value <= 20) {
        //very low
        overviewDataQualityAndRequired.levelTextBottom = translate.t('home.overview.veryLow')
        return colorsGroups.veryLow
      } else if (value > 20 && value <= 40) {
        //low
        overviewDataQualityAndRequired.levelTextBottom = translate.t('home.overview.low')
        return colorsGroups.low

      } else if (value > 40 && value <= 60) {
        //medium
        overviewDataQualityAndRequired.levelTextBottom = translate.t('home.overview.medium')

        return colorsGroups.medium

      } else if (value > 60 && value <= 80) {
        //high
        overviewDataQualityAndRequired.levelTextBottom = translate.t('home.overview.high')
        return colorsGroups.high

      } else if (value > 80 && value <= 100) {
        overviewDataQualityAndRequired.levelTextBottom = translate.t('home.overview.veryHigh')
        return colorsGroups.veryHigh
      } else {
        overviewDataQualityAndRequired.levelTextBottom = translate.t('global.notAvailable')
        return colorsGroups.noLevel
      }
    }

    function getQuality() {
      quality.value = setQuality(props.data.quality)

      overviewDataQualityAndRequired.qualityString = translate.t('home.overview.' + quality.value[0])
      overviewDataQualityAndRequired.qualityPercent = quality.value[1] ?? 0
      overviewDataQualityAndRequired.qualityColor = quality.value[2]
      overviewDataQualityAndRequired.keyQuality++

      score.value = setConfidenceScore(props.data.confidenceScoreLabel)

      overviewDataQualityAndRequired.scoreString = translate.t('home.overview.' + score.value[0])
      overviewDataQualityAndRequired.scorePercent = score.value[1] ?? 0
      overviewDataQualityAndRequired.scorecolor = score.value[2] ?? 0
      overviewDataQualityAndRequired.bgColorForChartLineTop = getColorForTopTheLevelDashes(Number(overviewDataQualityAndRequired.qualityPercent.split('%')[0]))
      overviewDataQualityAndRequired.bgColorForChartLineBottom = getColorForBottomLevelDashes(Number(overviewDataQualityAndRequired.scorePercent.split('%')[0]))

      overviewDataQualityAndRequired.levelTop = getLevelBasedOnColorTop(overviewDataQualityAndRequired.bgColorForChartLineTop)
      overviewDataQualityAndRequired.levelBottom = getLevelBasedOnColorBottom(overviewDataQualityAndRequired.bgColorForChartLineBottom)

      overviewDataQualityAndRequired.keyScore++;
    }

    watch(() => props.data, () => {
      getQuality()
    }, { immediate: true })

    return {
      ...toRefs(overviewDataQualityAndRequired),
      colorsGroups,
      quality,
      getColorForTopTheLevelDashes,
      getColorForBottomLevelDashes,
    }
  }
})
</script>
<style lang="scss" scoped>

.chart_title {
  font-size: 1em;
  color: #667085;
  font-weight: 500 !important;
  text-transform: capitalize;
}
</style>
