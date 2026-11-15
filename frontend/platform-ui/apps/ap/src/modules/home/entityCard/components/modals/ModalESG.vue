<template>
<CalculumModal @close="$emit('close')" :size="'md'" :showClose="true" :title="$t('global.esgRating')">
  <template v-slot:modalContent>
    <div class="row p-1 bg-gray-100 rounded-lg">
      <div class="col-4 bg-white p-4 rounded-lg">
        <p class="mb-3"><span class="mr-1 font-semibold">{{ $t('global.external') }}:</span><span>{{ $t('home.entityCard.modalESG.externalParagraph') }}</span></p>
        <p v-if="data.links?.report"><a :href="data.links?.report" target="_blank">{{ $t('global.esgReport') }}
            <PdfIcon class="h-4 w-4 ml-3"></PdfIcon></a></p>
        <p v-else><span class="font-semibold">{{ $t('global.esgReport') + ": " }}</span><span>{{ $t('global.notAvailable') }}</span></p>
      </div>
      <div class="col-8 p-4 d-flex flex-column justify-content-between">
        <div class="row mb-2">
          <div class="col-6 d-flex align-items-center">
            <p class="mb-0 text-4xl font-bold">{{ data.rating ?? $t('global.notAvailable') }}</p>
          </div>
          <div class="col-6 d-flex align-items-center">
            <CalculumArcCircle class="ml-auto" :level="esgLevelNumberComputed" :grade-level-text="data.ratingLabel ?? $t('global.notAvailable')" :level-color="levelColorByLevelComputed"></CalculumArcCircle>
          </div>
        </div>
        <div class="row">
          <div class="col-12">
            <table class="table table-bordered mb-0">
              <thead>
                <tr>
                  <th class="font-normal bg-light th-left" scope="col">{{ $t('global.source') }}</th>
                  <th class="font-normal bg-light text-nowrap" scope="col">{{ $t('global.overallScore') }}</th>
                  <th class="font-normal bg-light" scope="col">E</th>
                  <th class="font-normal bg-light" scope="col">S</th>
                  <th class="font-normal bg-light" scope="col">G</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-capitalize" scope="row">
                    <LogoSustainalytics class="w-30"></LogoSustainalytics>
                  </td>
                  <td>{{ data.sustainalytics?.overallScore ?? $t('global.notAvailable') }}</td>
                  <td>{{ data.sustainalytics?.E ?? $t('global.notAvailable') }}</td>
                  <td>{{ data.sustainalytics?.S ?? $t('global.notAvailable') }}</td>
                  <td>{{ data.sustainalytics?.G ?? $t('global.notAvailable') }}</td>
                </tr>
                <tr>
                  <td class="text-capitalize" scope="row">
                    <LogoRefinitiv class="w-30"></LogoRefinitiv>
                  </td>
                  <td>{{ data.refinitiv?.overallScore ?? $t('global.notAvailable') }}</td>
                  <td>{{ data.refinitiv?.E ?? $t('global.notAvailable') }}</td>
                  <td>{{ data.refinitiv?.S ?? $t('global.notAvailable') }}</td>
                  <td>{{ data.refinitiv?.G ?? $t('global.notAvailable') }}</td>
                </tr>
                <tr>
                  <td class="text-capitalize" scope="row">
                    <LogoMSCI class="w-30"></LogoMSCI>
                  </td>
                  <td>{{ data.msci?.overallScore ?? $t('global.notAvailable') }}</td>
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </template>
</CalculumModal>
</template>
<script lang="ts">
import { defineComponent, computed, PropType } from 'vue'
import { ESG } from '../../types'
import { getLevelColor, getLevelNumber } from '@/utils'
import CalculumArcCircle from '@/modules/components/charts/CalculumArcCircle.vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import LogoMSCI from '@/resources/assets/images/LogoMSCI.vue'
import LogoRefinitiv from '@/resources/assets/images/LogoRefinitiv.vue'
import LogoSustainalytics from '@/resources/assets/images/LogoSustainalytics.vue'
import PdfIcon from '@/resources/assets/images/icons/PdfIcon.vue'

export default defineComponent({
  name: 'ModalESG',
  components: {
    CalculumArcCircle,
    CalculumModal,
    CalculumTooltipIcon,
    LogoMSCI,
    LogoRefinitiv,
    LogoSustainalytics,
    PdfIcon
  },
  props: {
    data: { type: Object as PropType<Partial<ESG>>, required: false, default: () => { } },
  },
  emits: ['close'],
  setup(props) {
    /*** Computed */
    const esgLevelNumberComputed = computed(() => {
      return getLevelNumber(props.data.ratingLabel)
    })

    const levelColorByLevelComputed = computed(() => {
      return getLevelColor(esgLevelNumberComputed.value)
    })
    /*** END Computed */

    return {
      esgLevelNumberComputed,
      levelColorByLevelComputed,
    }
  }
})
</script>  