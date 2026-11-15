<template>
<CalculumModal :size="'lg'" :showClose="true" :title="$t('home.entityCard.creditRatingAndBuyerLeverage')" @close="$emit('close')">
  <template v-slot:modalContent>
    <div class="row px-4 mb-4">
      <div class="col-12 d-flex align-items-center">
        <TabStrip class="rating-leverage-tab-wrapper" @select="changeTab" :selected="selectedTabIndex" :tabs="tabs">
          <template v-if="tabs.length > 1" v-slot:program="{ props }">
            <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'"><span class="rating-leverage-tabs" :title="props.title">{{ props.title }}</span></Tooltip>
            <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'"><span class="rating-leverage-tabs" :title="props.title">{{ props.title }}</span></Tooltip>
          </template>
        </TabStrip>
      </div>
    </div>
    <div class="row p-1 bg-gray-100 rounded-lg" v-if="selectedTabIndex === 0">
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
                  <td scope="row"><span class="d-flex">{{ creditScore.source }}</span>
                    <CalculumTooltipIcon class="ml-2" :infoText="'('+creditScore.percent+'%) Name Matched: ' + creditScore.matchName + ', Date: ' +  formatData.getMonthDayAndYear(creditScore.creditDate.date) " v-if="creditScore.percent != 'N/A'" :size="15"></CalculumTooltipIcon>
                  </td>
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
                  <td scope="row"><span class="d-flex">{{ creditScore.source }}</span>
                    <CalculumTooltipIcon class="ml-2" v-if="creditScore.percent != 'N/A'" :infoText="'('+creditScore.percent+'%) Name Matched: ' + creditScore.matchName + ', Date: ' +  formatData.getMonthDayAndYear(creditScore.creditDate.date) " :size="15"></CalculumTooltipIcon>
                  </td>
                  <td class="text-capitalize">{{ creditScore.creditRating }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div class="div d-flex flex-column justify-conteent-center aling-items-center" v-if="selectedTabIndex === 1">
      <div class="row padding-top">
        <div class="col-12">
          <p> <span>{{ $t('home.entityCard.buyerLeverageMateriality') }}
              <CalculumTooltipIcon class="ml-2" :infoText="$t('home.entityCard.buyerLeverageTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-2" :style="`color: ${entityCharacteristics.buyerLeverage.color}`">{{ entityCharacteristics.buyerLeverage.description }}</span></p>
          <LevelDashesChart :level="levelByGradeLevelText(entityCharacteristics.buyerLeverage.description)" :total-levels="3"></LevelDashesChart>
        </div>
      </div>
      <div class="row mb-2 padding-top">
        <div class="col-12">
          <p><span>{{ $t('global.supplierLeverageMateriality') }}
              <CalculumTooltipIcon class="ml-2" :infoText="$t('global.supplierLeverageTooltip')"></CalculumTooltipIcon></span><span class="font-semibold ml-2" :style="`color: ${entityCharacteristics.supplierLeverage.color}`">{{ entityCharacteristics.supplierLeverage.description }}</span></p>
          <LevelDashesChart :level="levelByGradeLevelText(entityCharacteristics.supplierLeverage.description)" :total-levels="3"></LevelDashesChart>
        </div>
      </div>
    </div>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onMounted,
  reactive,
  ref,
  toRefs,
} from "vue";
import { fontIcons } from "@/resources/assets/assets";
import { TabStrip } from "@progress/kendo-vue-layout";
import { useI18n } from "vue-i18n";
import { useUser } from "@/composables";
import * as colorsGroups from "@/utils/ColorsGroups";
import * as formatData from "@/utils/FormatData";
import CalculumModal from "@/modules/components/CalculumModal.vue";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import { LevelDashesChart } from "@ada/design-system";
import { useUserStore } from '@/stores/user';

export default defineComponent({
  name: "ModalCreditRatingAndBuyerLeverage",
  components: {
    TabStrip,
    CalculumTooltipIcon,
    LevelDashesChart,
    CalculumModal,
  },
  props: {
    entityCharacteristics: { type: Object, required: true },
    levelColor: {
      type: String,
      required: false,
      default: colorsGroups.noLevel,
    },
    creditModal: { type: Object, required: true },
  },
  emits: ["close"],
  setup() {
    interface Tab {
      id: string;
      title: string;
    }

    interface ModalCreditRatingAndBuyerLeverage {
      defaultTabView: string;
      tabs: Tab[];
      selectedTabIndex: number;
    }

    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const rol = ref();
    const { userSessionRoles } = useUser();
    const userStore = useUserStore();
    const isSuperAdmin = computed(() => userStore.isSuperAdmin);

    const modalData = reactive<ModalCreditRatingAndBuyerLeverage>({
      defaultTabView: "credit",
      tabs: [
        {
          id: "credit",
          title: translate.t("home.entityCard.creditRating"),
        },
        {
          id: "buyerLeverage",
          title: translate.t("home.entityCard.buyerLeverageMateriality"),
        },
      ],
      selectedTabIndex: 0,
    });

    /**
     * Get level given grade level text
     */
    function levelByGradeLevelText(gradeLevelText: string): number {
      switch (gradeLevelText) {
        case "Low":
          return 1;
        case "Medium":
          return 2;
        case "High":
          return 3;
        default:
          return 0;
      }
    }

    function changeTab(e: { selected: number }) {
      modalData.selectedTabIndex = e.selected;
    }

    onMounted(() => {
      rol.value = userSessionRoles.value.findIndex(
        (x: any) => x === "ROLE_COMPANY_ADMIN",
      );
    });

    return {
      ...toRefs(modalData),
      changeTab,
      fontIcons,
      formatData,
      isSuperAdmin,
      levelByGradeLevelText,
      rol,
    };
  },
});
</script>

<style lang="scss" scoped>
@import '@/resources/assets/styles/variables/_colors.scss';
.icon-close {
  cursor: pointer;
  font-size: 40px;
  height: 18px;
  position: absolute;
  right: 0;
  right: 20px;
  top: 20px;
  width: 18px;
  z-index: 999;
}

.padding-top {
  margin-top: 24px;
}
</style>
