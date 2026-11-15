<template>
<CalculumModal @close="$emit('close')" :size="'xl'" :showClose="true" :title="$t('home.entityCard.modalDetails.title')">
  <template v-slot:modalContent>
    <div class="row p-1 bg-gray-100 rounded-lg">
      <div class="col-4 bg-white p-4 rounded-lg">
        <h4 class="text-lg font-semibold mb-1">{{ 'External' }}</h4>
        <p class="mb-3">{{ $t('home.entityCard.modalDetails.external') }}</p>
        <h4 class="text-lg font-semibold mb-1">{{ 'External (Parent)' }}  </h4>
        <p class="mb-3">{{ $t('home.entityCard.modalDetails.parent') }}</p>
        <h4 class="text-lg font-semibold mb-1">{{ 'Internal' }}</h4>
        <p class="mb-3">{{ $t('home.entityCard.modalDetails.internal') }}</p>
      </div>
      <div class="col-8 p-4 d-flex flex-column justify-content-between">
        <div class="row">
          <div class="col-2">
            <div class="row">
              <div class="col-12"><span class="w-100 text-base font-semibold details-source text-gray-400">{{ $t('home.entityCard.modalDetails.source') }}</span></div>
            </div>
            <div class="row">
              <div class="col-12"><span class="text-base font-semibold text-capitalize">{{ creditModal.supplier.source }}</span></div>
            </div>
          </div>
          <div class="col-10"> <span class="text-5xl font-semibold">{{ creditModal?.supplier?.adaScoreRef ?? '' }}</span></div>
        </div>
        <div class="row">
          <div class="col-6">
            <h5>{{ creditModal.supplier.companyName  }}</h5>
          </div>
          <div class="col-6">
            <h5 v-if="creditModal.parent">{{creditModal.parent.parentName}} {{ $t('home.entityCard.modalDetails.parentParentesis') }}</h5>
            <h5 v-else>{{ $t('home.entityCard.modalDetails.noParentAvailable') }}</h5>
          </div>
        </div>
        <div class="row">
          <div class="col-6">
            <table class="table table-bordered">
              <thead>
                <tr>
                  <th class="text-capitalize bg-light th-left" scope="col">{{ $t('home.entityCard.modalDetails.source') }}</th>
                  <th class="text-capitalize bg-light" scope="col">{{ $t('home.entityCard.modalDetails.ratings') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-capitalize" scope="row">{{ creditModal.supplier.source }}</td>
                  <td class="text-capitalize">{{ creditModal?.supplier?.adaScoreRef ?? '' }}</td>
                </tr>
                <tr v-for="(creditScore,i) in creditModal.supplier?.sourceMatches" :key="i" v-if="isSuperAdmin">
                  <td scope="row"><span class="d-flex">{{ creditScore.source }}
                      <CalculumTooltipIcon class="ml-2" :infoText="'('+creditScore.percent+'%) Name Matched: ' + creditScore.matchName + ', Date: ' +  formatData.getMonthDayAndYear(creditScore.creditDate.date) " v-if="creditScore.percent != 'N/A'" :size="15"></CalculumTooltipIcon></span></td>
                  <td class="text-capitalize">{{ creditScore.creditRating }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="col-6">
            <table class="table table-bordered" v-if="creditModal.parent">
              <thead>
                <tr>
                  <th class="text-capitalize bg-light th-left" scope="col">{{ $t('home.entityCard.modalDetails.source') }}</th>
                  <th class="text-capitalize bg-light" scope="col">{{ $t('home.entityCard.modalDetails.ratings') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-capitalize" scope="row">{{ creditModal.parent.source }}</td>
                  <td class="text-capitalize">{{ creditModal.parent.adaScoreRef }}</td>
                </tr>
                <tr v-for="(creditScore,i) in creditModal.parent?.sourceMatches" :key="i" v-if="isSuperAdmin">
                  <td scope="row"><span class="d-flex">{{ creditScore.source }}
                      <CalculumTooltipIcon class="ml-2" v-if="creditScore.percent != 'N/A'" :infoText="'('+creditScore.percent+'%) Name Matched: ' + creditScore.matchName + ', Date: ' +  formatData.getMonthDayAndYear(creditScore.creditDate.date) " :size="15"></CalculumTooltipIcon></span></td>
                  <td class="text-capitalize">{{ creditScore.creditRating }}</td>
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
import { defineComponent, onMounted, ref, computed } from 'vue'
import { fontIcons } from '@/resources/assets/assets'
import * as formatData from '@/utils/FormatData'
import CalculumTooltipIcon from '@/modules/components/CalculumTooltipIcon.vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { useUser } from '@/composables'
import { useUserStore } from '@/stores/user'

export default defineComponent({
  name: 'CalculumCreditRatingTableModal',
  components: {
    CalculumTooltipIcon,
    CalculumModal
  },
  props: {
    creditModal: { type: Object, required: true }
  },
  emits: ['close'],
  setup() {
    const userStore = useUserStore()
    const rol = ref()

    const { userSessionRoles } = useUser();

    const isSuperAdmin = computed(() => userStore.isSuperAdmin)

    onMounted(() => {
      rol.value = userSessionRoles.value.findIndex((x: any) => x === 'ROLE_COMPANY_ADMIN')
    })

    return {
      rol,
      fontIcons,
      isSuperAdmin,
      formatData
    }
  }
})
</script>

<style lang="scss" scoped>
@import '@/resources/assets/styles/variables/_colors.scss';

.icon-close {
  cursor: pointer;
  font-size: 40px;
  position: absolute;
  right: 0;
  right: 20px;
  top: 20px;
  z-index: 999;
}

// ? - Remove this after change global "modal > p" styles
.details-source {
  color: $color-gray-400 !important;
}

.icon-svg {
  width: 18px !important;
  height: 18px !important;
  cursor: pointer;
}
</style>
