<template>
<CalculumModal @close="$emit('close')" :size="'lg'" :showClose="true" :title="$t('home.entityCard.modalDetails.waccFinancing')">
  <template v-slot:modalContent>
    <div class="row p-1 bg-gray-100 rounded-lg">
      <div class="col-5 bg-white p-4 rounded-lg">
        <h4 class="text-lg font-semibold mb-1">{{ $t('home.entityCard.modalDetails.costOfDebt') }}</h4>
        <p class="mb-3">{{ $t('home.homeCompanySettings.costOfDebtTooltip') }}</p>
        <h4 class="text-lg font-semibold mb-1">{{ $t('home.entityCard.modalDetails.taxPreWacc') }}</h4>
        <p class="mb-3">{{ $t('home.homeCompanySettings.taxPreWaccTooltip') }}</p>
        <h4 class="text-lg font-semibold mb-1">{{ $t('home.entityCard.modalDetails.taxAfterWacc') }}</h4>
        <p class="mb-3">{{ $t('home.homeCompanySettings.taxAfterWaccTooltip') }}</p>
      </div>
      <div class="col-7 p-4 d-flex flex-column justify-content-between">
        <div class="row">
          <div class="col-12">
            <table class="table table-bordered">
              <thead>
                <tr>
                  <th class="text-capitalize bg-light th-left" scope="col"> </th>
                  <th class="text-capitalize bg-light th-left" scope="col">{{ $t('home.entityCard.modalDetails.rate') }}</th>
                  <th class="text-capitalize bg-light" scope="col">{{ $t('home.entityCard.modalDetails.source') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-capitalize">{{ $t('home.entityCard.modalDetails.costOfDebt') }}</td>
                  <td class="text-capitalize">{{ formatPercentage(financingModal?.fundingCosts?.entity.value)  }}</td>
                  <td class="text-capitalize">{{ financingModal?.fundingCosts?.entity.Source }}</td>
                </tr>
                <tr>
                  <td class="text-capitalize">{{ $t('home.entityCard.modalDetails.taxPreWacc') }}</td>
                  <td class="text-capitalize">{{ formatPercentage(financingModal?.wacc?.preTax)  }}</td>
                  <td class="text-capitalize">{{ financingModal?.wacc?.source }}</td>
                </tr>
                <tr>
                  <td class="text-capitalize">{{ $t('home.entityCard.modalDetails.taxAfterWacc') }}</td>
                  <td class="text-capitalize">{{ formatPercentage(financingModal?.wacc?.afterTax)  }}</td>
                  <td class="text-capitalize">{{ financingModal?.wacc?.source }}</td>
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
import { formatPercentage } from '@/utils/FormatData'
import { useUser } from '@/composables'
import { useUserStore } from '@/stores/user'

export default defineComponent({
  name: 'CalculumCreditRatingTableModal',
  components: {
    CalculumTooltipIcon,
    CalculumModal
  },
  emits: ['close'],
  props: {
    financingModal: { type: Object, required: true }
  },
  setup() {
    const userStore = useUserStore()

    const rol = ref()

    const isSuperAdmin = computed(() => userStore.isSuperAdmin)

    const { userSessionRoles } = useUser()

    onMounted(() => {
      rol.value = userSessionRoles.value.findIndex((x: any) => x === 'ROLE_COMPANY_ADMIN')
    })

    return {
      rol,
      fontIcons,
      isSuperAdmin,
      formatData,
      formatPercentage
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
