<template>
<ModalAdvancedMode v-if="showAdvancedModeModal" :programId="advancedModeConfig.programId" :entityUuid="advancedModeConfig.entityUuid" :companyType="advancedModeConfig.companyType" :title="advancedModeConfig.title" :type="advancedModeConfig.type" :columnUuid="advancedModeConfig.columnUuid" :columnNumber="advancedModeConfig.columnNumber" :initialValue="advancedModeConfig.initialValue" @close="showAdvancedModeModal = false" @saved="onAdvancedModeSaved"></ModalAdvancedMode>
<CalculumManageCommodityModal v-if="showConfirmTeamModal" type="delete" :titleOverride="$t('home.analyze.manageTeam.title')" :removeOverride="$t('home.analyze.manageTeam.remove')" @close="cancelTeamAction" @approve="confirmTeamAction" @cancel="cancelTeamAction"></CalculumManageCommodityModal>
<CalculumManageCommodityModal v-if="showConfirmCommodityModal" :type="pendingCommodityAction?.type ?? 'delete'" @close="cancelCommodityAction" @approve="confirmCommodityAction" @cancel="cancelCommodityAction"></CalculumManageCommodityModal>
<CalculumManageCommodityModal v-if="showConfirmCustomColumnModal" :type="pendingCustomColumnAction?.type ?? 'delete'" @close="cancelCustomColumnAction" @approve="confirmCustomColumnAction" @cancel="cancelCustomColumnAction"></CalculumManageCommodityModal>
<CalculumModalConfirmAction v-if="showConfirmAllSpendModal" :actionDescription="$t('home.entityCard.details.confirmAllSpendChange')" @confirm-action="confirmAllSpendAction" @hide-modal="cancelAllSpendAction"></CalculumModalConfirmAction>
<CalculumModal v-if="showSMEModal" :size="'lg'" :title="$t('home.entityCard.companyDetails.general.smeCardTitle')" :showClose="true" @close="showSMEModal = false">
  <template v-slot:modalContent>
    <div class="d-flex flex-column gap-4 py-2">
      <div class="d-flex flex-column" v-if="smeModalContent.name"><span class="text-gray-400 text-md font-semibold">{{ $t('home.entityCard.companyDetails.general.source') }}</span><span class="font-bold text-gray-600 text-lg">{{ smeModalContent.name }}</span></div>
      <div class="d-flex flex-column" v-if="smeModalContent.card">
        <div class="text-gray-600 text-md" v-html="smeModalContent.card"></div>
      </div>
      <div class="d-flex flex-column" v-if="smeModalContent.otherDescription"><span class="text-gray-400 text-md font-semibold mb-2">{{ $t('home.entityCard.companyDetails.general.additionalInformation') }}</span>
        <div class="text-gray-600 text-md" v-html="smeModalContent.otherDescription"></div>
      </div>
    </div>
  </template>
</CalculumModal>
<CalculumModal v-if="showFullDescriptionModal" :size="'lg'" :title="$t('global.companyDescription')" :showClose="true" @close="showFullDescriptionModal = false">
  <template v-slot:modalContent>
    <div class="d-flex flex-column"><span class="text-sm font-semibold text-gray-700">{{ supplierDescription }}</span></div>
  </template>
</CalculumModal>
<div class="row">
   <!-- Overview -->
  <div class="col-lg-12">
    <div class="row">
      <div class="col-lg-2">
        <div class="card-custom shadow-none flex-grow-1 relative">
          <div class="card-body" :class="{'bg-blur': loading.supplierDetail}">
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <DetailBox v-else :title="$t('global.country').toLocaleUpperCase()" :value="StringUtils.capitalizeFirstLetter(supplierDetail.country ?? '-')" :isTooltip="true" :titleTag="supplierDetail.country" :tooltipInfoText="$t('home.entityCard.details.countryTooltip')"></DetailBox>
          </div>
        </div>
      </div>
      <div class="col-lg-2">
        <div class="card-custom shadow-none flex-grow-1 relative">
          <div class="card-body" :class="{'bg-blur': loading.supplierDetail || loading.industry}">
            <Skeleton v-if="loading.supplierDetail || loading.industry" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <div id="entity-details-industry-anchor" v-else>
              <DetailBox :title="$t('home.entityCard.details.industry').toLocaleUpperCase()" :value="industryDisplayValue" :isTooltip="true" :tooltipInfoText="$t('home.entityCard.details.industryTooltip')" :showEditOption="isSuperAdmin" @openEdit="toggleManageIndustry"></DetailBox>
              <Popup :anchor="'entity-details-industry-anchor'" :show="showManageIndustry" popup-class="entity-details-industry-popup">
                <ManageIndustryAction v-if="showManageIndustry" :currentValue="industryCommodity.industryName" :currentCodeValue="industryDisplayValue" :option="'supplierIndustry'" @call-action="handleIndustryChange"></ManageIndustryAction>
              </Popup>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-2">
        <div class="card-custom shadow-none flex-grow-1 relative">
          <div class="card-body" :class="{'bg-blur': loading.supplierDetail || loading.commodity}">
            <Skeleton v-if="loading.supplierDetail || loading.commodity" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <div id="entity-details-commodity-anchor" v-else>
              <DetailBox :title="$t('home.entityCard.details.commodities').toLocaleUpperCase()" :value="industryCommodity.commodity ?? '-'" :isTooltip="true" :titleTag="industryCommodity.commodity" :tooltipInfoText="$t('home.entityCard.details.commoditiesTooltip')" :showEditOption="isAdmin" :editTooltip="$t('home.entityCard.details.tooltipEditCommodity')" @openEdit="toggleManageCommodity"></DetailBox>
              <Popup :anchor="'entity-details-commodity-anchor'" :show="showManageCommodity" popup-class="entity-details-commodity-popup">
                <ManageCommodityAction v-if="showManageCommodity" :key="commodityActionKey" :option="'commodity'" :selectedProgramId="removeIRI(programUuid)" :currentValue="industryCommodity.commodity ?? null" :entityCardMode="true" @call-action="handleCommodityChange" @request-confirm="handleCommodityConfirmRequest" @open-advanced-mode="handleOpenAdvancedModeCommodity"></ManageCommodityAction>
              </Popup>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-2">
        <div class="card-custom shadow-none flex-grow-1 relative">
          <div class="card-body" :class="{'bg-blur': loading.supplierDetail || loading.ultimateParent}">
            <Skeleton v-if="loading.supplierDetail || loading.ultimateParent" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <div id="entity-details-ultimate-parent-anchor" v-else>
              <DetailBox :title="$t('home.entityCard.details.ultimateParent').toLocaleUpperCase()" :value="supplierOwnership.ultimateParent ?? '-'" :isTooltip="true" :titleTag="supplierOwnership.ultimateParent" :tooltipInfoText="$t('home.entityCard.details.ultimateParentTooltip')" :showEditOption="isSuperAdmin" @openEdit="toggleManageUltimaParent"></DetailBox>
              <Popup :anchor="'entity-details-ultimate-parent-anchor'" :show="showManageUltimaParent" popup-class="entity-details-ultimate-parent-popup">
                <ManageUltimateParentAction v-if="showManageUltimaParent" :currentValue="supplierOwnership.ultimateParent" :option="'supplierUltimateParent'" :selectedProgramId="removeIRI(companyId)" :type="'supplier'" @call-action="handleUltimaParentChange"></ManageUltimateParentAction>
              </Popup>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-2">
        <div class="card-custom shadow-none flex-grow-1 relative">
          <div class="card-body" :class="{'bg-blur': loading.supplierDetail}">
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <DetailBox v-else :title="$t('home.entityCard.details.ownership').toLocaleUpperCase()" :value="supplierOwnership.ownership ?? '-'" :titleTag="supplierOwnership.ownership" :isTooltip="true" :tooltipInfoText="$t('home.entityCard.details.ownershipTooltip')"></DetailBox>
          </div>
        </div>
      </div>
      <div class="col-lg-2">
        <div class="card-custom shadow-none flex-grow-1 relative">
          <div class="card-body" :class="{'bg-blur': loading.supplierDetail}">
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <DetailBox v-else :title="$t('global.url').toLocaleUpperCase()" :value="supplierLocation.domain ?? '-'" :isUrl="true" :isTooltip="true" :tooltipText="supplierLocation.domain ?? undefined" @clickUrl="gotoURL(supplierLocation.domain)" :semiBold="true" :tooltipInfoText="$t('home.entityCard.details.urlTooltip')"></DetailBox>
          </div>
        </div>
      </div>
    </div>
  </div><!-- Description-->
  <div class="col-lg-12">
    <div class="card-custom shadow-none flex-grow-1 relative" :class="{'bg-blur': loading.supplierDetail}">
      <div class="card-body" :class="{'bg-blur': loading.supplierDetail}">
        <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
        <DetailBox v-else :title="$t(`home.entityCard.companyDetails.general.description`).toLocaleUpperCase()" :value="supplierDescription" :semiBold="true"></DetailBox>
      </div>
    </div>
  </div><!-- Row 3: Relationship, SME, Location -->
  <div class="col-lg-4 d-flex flex-column">
    <div class="card-custom shadow-none flex-grow-1 relative" :class="{'bg-blur': loading.supplierDetail}">
      <div class="card-body" :class="{'bg-blur': loading.supplierDetail}">
        <div class="row">
          <div class="col-12 mb-5">
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <DetailBox v-else :value="''" :title="$t('home.entityCard.details.relationship').toLocaleUpperCase()"></DetailBox>
          </div>
          <div class="col-6 mb-6">
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <DetailBox v-else :title="$t('home.entityCard.details.buyingEntity'+companyType.replace('potential-', ''))" :value="supplierDetail.buyingEntity ?? '-'" :tooltipInfoText="$t('home.entityCard.details.buyingEntityTooltip')" :titleTag="supplierDetail.buyingEntity" :isTooltip="true"></DetailBox>
          </div>
          <div class="col-6 mb-6">
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <DetailBox v-else :title="$t('home.entityCard.details.buyingCountry'+companyType.replace('potential-', ''))" :value="supplierDetail.buyingCountry ?? '-'" :tooltipInfoText="$t('home.entityCard.details.buyingCountryTooltip')" :titleTag="supplierDetail.buyingCountry" :isTooltip="true"></DetailBox>
          </div>
          <div class="col-6 mb-6">
            <Skeleton v-if="loading.supplierDetail || loading.procurementTeam" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <div id="entity-details-team-anchor" v-else>
              <DetailBox :title="$t('home.entityCard.details.procurementTeam'+companyType.replace('potential-', ''))" :value="supplierDetail.procurementTeam ?? '-'" :tooltipInfoText="$t('home.entityCard.details.procurementTeamTooltip')" :titleTag="supplierDetail.procurementTeam" :isTooltip="true" :showEditOption="isAdmin" :editTooltip="$t('home.entityCard.details.tooltipEditProcurementTeam')" @openEdit="toggleManageTeam"></DetailBox>
              <Popup :anchor="'entity-details-team-anchor'" :show="showManageTeam" popup-class="entity-details-team-popup">
                <ManageTeamAction v-if="showManageTeam" :option="'manageTeam'" :currentValue="supplierDetail.procurementTeam ?? null" :entityCardMode="true" @call-action="handleTeamChange" @open-advanced-mode="handleOpenAdvancedModeTeam" @request-confirm="handleTeamConfirmRequest"></ManageTeamAction>
              </Popup>
            </div>
          </div>
          <div class="col-6 mb-6">
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <DetailBox v-else :title="$t('home.entityCard.details.relationshipSince')" :value="supplierDetail.relationshipSince ?? '-'" :tooltipInfoText="$t('home.entityCard.details.relationshipSinceTooltip')" :titleTag="supplierDetail.relationshipSince" :isTooltip="true"></DetailBox>
          </div>
          <div class="col-6 mb-6">
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <DetailBox v-else :title="$t('home.entityCard.details.dateOfLastTermNegotiation')" :value="supplierDetail.dateOfLastTermNegotiation ?? '-'" :tooltipInfoText="$t('home.entityCard.details.dateOfLastTermNegotiationTooltip')" :titleTag="supplierDetail.dateOfLastTermNegotiation" :isTooltip="true"></DetailBox>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-lg-4 d-flex flex-column">
    <div class="card-custom shadow-none flex-grow-1 relative" :class="{'bg-blur': loading.supplierDetail}">
      <div class="card-body" :class="{'bg-blur': loading.supplierDetail}">
        <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
        <SmeDetailBox v-else :isSME="smeRelatedIsSme" :smeSource="smeRelatedSmeSource" @show-modal-sme-details="showModalSmeDetails"></SmeDetailBox>
      </div>
    </div>
  </div>
  <div class="col-lg-4 d-flex flex-column">
    <div class="card-custom shadow-none flex-grow-1 relative" :class="{'bg-blur': loading.supplierDetail}">
      <div class="card-body" :class="{'bg-blur': loading.supplierDetail}">
        <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
        <DetailBox v-else :title="$t('home.entityCard.details.location').toLocaleUpperCase()" :value="''"></DetailBox>
        <div class="mt-5 mb-8 w-100 h-52 p-5 rounded-lg d-flex justify-content-center align-items-center bg-gray-200" v-if="supplierLocation.latitude === null || supplierLocation.longitude === null"><span>{{ $t('home.entityCard.mapWillBeAvailableShortly')}}</span></div>
        <LocationMap class="mt-5 mb-5" v-else :key="'map-' + chartKey" :api-key="GOOGLE_MAP_KEY" :latitude="supplierLocation.latitude ?? 0" :longitude="supplierLocation.longitude ?? 0"></LocationMap>
        <div class="row">
          <div class="col-6">
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <div class="d-flex flex-column" v-else><span class="text-gray-400 text-md font-semibold">{{ $t('global.address') }}</span><span class="text-lg text-gray-700 font-bold">{{ fullAddressDisplay }}</span></div>
          </div>
          <div class="col-6">
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <DetailBox v-else :title="$t('label.phone')" :value="supplierLocation.phoneNumber ?? '-'" :isTooltip="true" :titleTag="supplierLocation.phoneNumber"></DetailBox>
          </div>
        </div>
      </div>
    </div>
  </div><!-- Row 4: Identification, Custom Values -->
  <div class="col-lg-4 d-flex flex-column">
    <div class="card-custom shadow-none flex-grow-1 relative" :class="{'bg-blur': loading.supplierDetail}">
      <div class="card-body" :class="{'bg-blur': loading.supplierDetail}">
        <div class="row">
          <div class="col-12 mb-5">
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <DetailBox v-else :value="''" :title="$t('home.entityCard.details.iNumber')"></DetailBox>
          </div>
          <div class="col-12 mb-3">
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <DetailBox v-else :title="$t('home.entityCard.details.taxID')" :value="supplierDetail.idNumber ?? '-'" :semiBold="true" :tooltipInfoText="$t('home.entityCard.details.taxIDTooltip')" :titleTag="supplierDetail.idNumber" :isTooltip="true"></DetailBox>
          </div>
          <div class="col-12">
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <DetailBox v-else :title="$t('home.entityCard.details.externalID')" :value="supplierDetail.externalID ?? '-'" :semiBold="true" :tooltipInfoText="$t('home.entityCard.details.externalIDTooltip')" :titleTag="supplierDetail.externalID" :isTooltip="true"></DetailBox>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-lg-8 d-flex flex-column">
    <div class="card-custom shadow-none flex-grow-1 relative" :class="{'bg-blur': loading.supplierDetail}">
      <div class="card-body" :class="{'bg-blur': loading.supplierDetail}">
        <div class="row custom-fields-row">
          <div class="col-lg-12">
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <DetailBox v-else :value="''" :title="$t('home.entityCard.details.customColumnValue').toLocaleUpperCase()"></DetailBox>
          </div>
          <div class="col-lg-3" v-if="customValuesData.length > 0" v-for="item in customValuesData" :key="item.key">
            <Skeleton v-if="loading.supplierDetail || loadingCustomColumnKey === item.key" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <div :id="'entity-details-custom-col-' + item.key + '-anchor'" v-else>
              <DetailBox :title="item.label" :value="item.value ?? '-'" :titleTag="item.value" :isTooltip="true" :showEditOption="isAdmin" :editTooltip="$t('home.entityCard.details.tooltipEditCustomField')" @openEdit="() => toggleCustomColumn(item.key)"></DetailBox>
              <Popup :anchor="'entity-details-custom-col-' + item.key + '-anchor'" :show="activeCustomColumnKey === item.key" popup-class="entity-details-custom-col-popup">
                <ManageCustomColumnAction v-if="activeCustomColumnKey === item.key" :option="('customColumn' as ActionFromEditProgram)" :selectedProgramId="removeIRI(programUuid)" :columnUuid="String(item.columnNumber)" :columnName="item.label" :currentValue="item.value ?? null" :columnType="item.columnType" :entityCardMode="true" @call-action="(keyId, isEmit, payload) => handleCustomColumnChange(keyId, isEmit, payload, item)" @request-confirm="(action) => handleCustomColumnConfirmRequest(action, item)" @open-advanced-mode="() => handleOpenAdvancedModeCustomColumn(item)"></ManageCustomColumnAction>
              </Popup>
            </div>
          </div>
          <div class="col-lg-12 d-flex align-items-center justify-content-center" v-else>
            <Skeleton v-if="loading.supplierDetail" shape="rectangle" style="width: 100%; height: 20px; border-radius: 4px;"></Skeleton>
            <DetailBox v-else :title="$t('home.entityCard.details.noCustomDataValues')" :value="''"></DetailBox>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import {
  defineComponent,
  reactive,
  toRefs,
  onMounted,
  onBeforeUnmount,
  computed,
  ref,
} from "vue";
import { Popup } from "@progress/kendo-vue-popup";
import { CalculumLoading, LocationMap } from '@ada/design-system'
import { useAppStore } from "@/stores/app";
import { useEntityCardStore } from "@/stores/entityCard";
import { useAnalyzeStore } from "@/stores/analyze";
import { useGlobalFiltersStore } from "@/stores/globalFilters";
import { convertFiltersToREST, getNumberWithDecimals } from "@/utils/FormatData";
import CalculumTooltipIcon from "@/modules/components/CalculumTooltipIcon.vue";
import { CustomValuesData, EntityCardCompanyDetails } from "../types";
import smeBadge from "@/resources/assets/images/icons/smeBadge.vue";
import InformationCircleSvg from "@/resources/assets/images/icons/svg/nav/InformationCircleSvg.vue";
import CalculumModal from "@/modules/components/CalculumModal.vue";
import DOMPurify from "dompurify";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import OpenURL from "@/modules/components/OpenURL.vue";
import DetailBox from "@/modules/home/entityCard/components/details/DetailBox.vue";
import { StringUtils, removeIRI } from "@/utils";
import { mapCompanyTypeToLevel } from "@/utils/levelOfGrid";
import SmeDetailBox from "@/modules/home/entityCard/components/details/SmeDetailBox.vue";
import { useSpendFile, useUser } from "@/composables";
import ManageTeamAction from "@/modules/components/grid/menuActions/ManageTeamAction.vue";
import ManageCommodityAction from "@/modules/components/grid/menuActions/ManageCommodityAction.vue";
import ManageCustomColumnAction from "@/modules/components/grid/menuActions/ManageCustomColumnAction.vue";
import ManageIndustryAction from "@/modules/components/grid/menuActions/ManageIndustryAction.vue";
import ManageUltimateParentAction from "@/modules/components/grid/menuActions/ManageUltimateParentAction.vue";
import CalculumManageCommodityModal from "@/modules/components/CalculumManageCommodityModal.vue";
import { useConfirmAllSpendModal } from "@/composables/useConfirmAllSpendModal";
import CalculumModalConfirmAction from "@/modules/components/CalculumModalConfirmAction.vue";
import ModalAdvancedMode from "@/modules/home/entityCard/components/modals/ModalAdvancedMode.vue";
import { ActionFromEditProgram } from "@/modules/components/types";
import { useToast } from "vue-toastification";
import { deleteCompanyTeam } from "@/modules/adminBackend/api/company";
import { useGridMenuActionsStore } from "@/stores/gridMenuActions";
import { Skeleton } from "@progress/kendo-vue-indicators";
interface SmeRelatedInterface {
  isSME: boolean;
  smeSource: string;
}

function formatIsicValues(industryIsic: string[]): string {
  if (!industryIsic || industryIsic.length === 0) {
    return "-";
  }

  return industryIsic
    .map((value, index) => {
      const isLastTwo = index >= industryIsic.length - 2;
      return isLastTwo ? value : `${value}, `;
    })
    .join("");
}

export default defineComponent({
  name: "EntityCardCompanyDetails",
  components: {
    CalculumLoading,
    CalculumModal,
    CalculumTooltipIcon,
    LocationMap,
    InformationCircleSvg,
    smeBadge,
    Tooltip,
    OpenURL,
    DetailBox,
    SmeDetailBox,
    ManageTeamAction,
    ManageCommodityAction,
    ManageCustomColumnAction,
    ManageIndustryAction,
    ManageUltimateParentAction,
    Popup,
    CalculumManageCommodityModal,
    CalculumModalConfirmAction,
    ModalAdvancedMode,
    Skeleton,
  },
  props: {
    smeRelated: {
      type: Object as () => SmeRelatedInterface,
      required: false,
      default: () => ({ isSME: false, smeSource: "" }),
    },
    companyId: { type: String, required: true },
    isSuperAdmin: { type: Boolean, required: false, default: false },
    programUuid: { type: String, required: true },
    companyType: { type: String, required: true },
  },
  setup(props) {
    const appStore = useAppStore();
    const entityCardStore = useEntityCardStore();
    const spendFileVersionActive = useSpendFile();
    const { userIsAdmin } = useUser();
    const isAdmin = computed(() => userIsAdmin.value);

    const analyzeStore = useAnalyzeStore();
    const globalFiltersStore = useGlobalFiltersStore();
    const gridMenuActionsStore = useGridMenuActionsStore();
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const toast = useToast();
    const showManageTeam = ref(false);
    const showManageCommodity = ref(false);
    const showManageIndustry = ref(false);
    const showManageUltimaParent = ref(false);
    const activeCustomColumnKey = ref<string | null>(null);
    const loadingCustomColumnKey = ref<string | null>(null);
    const { showConfirmAllSpendModal, pendingAllSpendAction, confirmAllSpendAction, cancelAllSpendAction, requestConfirmation } = useConfirmAllSpendModal();
    const showConfirmTeamModal = ref(false);
    const pendingTeamDeleteId = ref<string | null>(null);
    const showConfirmCommodityModal = ref(false);
    const pendingCommodityAction = ref<{ valueOld: string | null; valueNew: string | null; type: "edit" | "delete" } | null>(null);
    const showConfirmCustomColumnModal = ref(false);
    const pendingCustomColumnAction = ref<{ valueOld: string | null; valueNew: string | null; type: "edit" | "delete"; item: CustomValuesData } | null>(null);
    const commodityActionKey = ref(0);
    const showAdvancedModeModal = ref(false);
    const advancedModeConfig = ref<{
      programId: string;
      entityUuid: string;
      companyType: string;
      title: string;
      type: "commodity" | "customColumn" | "team";
      columnUuid: string | undefined;
      columnNumber: number | undefined;
      initialValue: string | null;
    }>({
      programId: "",
      entityUuid: "",
      companyType: "",
      title: "",
      type: "commodity",
      columnUuid: undefined,
      columnNumber: undefined,
      initialValue: null,
    });
    const data = reactive<EntityCardCompanyDetails>({
      showFullDescription: false,
      showFullDescriptionModal: false,
      chartKey: new Date().getUTCMilliseconds(),
      characteristics: {
        companySizeDescription: "",
        region: "",
      },
      currency: appStore.getCurrencyTo,
      loading: {
        userPrograms: false,
        supplierDetail: false,
        industryCommodity: false,
        spendInformation: false,
        supplierOwnership: false,
        supplierDescription: false,
        locationForSupplier: false,
        customFields: false,
        procurementTeam: false,
        commodity: false,
        customColumn: false,
        industry: false,
        ultimateParent: false,
      },
      selectedProgram: null,
      showSMEModal: false,
      customFieldsData: {} as any,
      customFieldsList: [] as Array<{
        key: string;
        label: string;
        value: string;
      }>,
      supplierDetail: {
        idNumber: "-",
        externalID: "-",
        founded: "-",
        type: "",
        buyingEntity: "-",
        buyingCountry: "-",
        procurementTeam: "-",
        relationshipSince: "-",
        country: "-",
        idType: null,
        supplierName: "",
        supplierWomanOwnedBusiness: "-",
        supplierEthnicMinorityOwnedBusiness: "-",
        supplierVeteranOwnedBusiness: "-",
        averageDaysToApproveInvoice: "-",
        dateOfLastTermNegotiation: "-",
      },
      industryCommodity: {
        industryName: "-",
        industryNaics: "-",
        industryIsic: "-",
        commodity: "-",
        unspsc: "-",
      },
      supplierOwnership: {
        ownership: "-",
        parentIndustry: "-",
        ultimateParent: "-",
      },
      supplierDescription: "-",
      supplierLocation: {
        address: "-",
        state: "-",
        zipCode: "-",
        latitude: null,
        longitude: null,
        phone: "-",
        city: "-",
        domain: null,
        phoneNumber: "-",
      },
      customValuesData: [],
    });

    function buildFilters(programUuid: string) {
      return {
        telerikFilter: null,
        targetProgramUuid: programUuid,
        globalFilter: convertFiltersToREST(globalFiltersStore.getFiltersApplied),
        currencyRate: appStore.getCurrencyAmount,
      };
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const insidePopup =
        target.closest(".entity-details-industry-popup") ||
        target.closest(".entity-details-commodity-popup") ||
        target.closest(".entity-details-ultimate-parent-popup") ||
        target.closest(".entity-details-team-popup") ||
        target.closest(".entity-details-custom-col-popup");
      if (!insidePopup) {
        closeManageIndustry();
        closeManageCommodity();
        closeManageUltimaParent();
        closeManageTeam();
        closeCustomColumn();
      }
    };

    onMounted(() => {
      getSupplierDetail();
      getSupplierCharacteristics();
      getIndustryCommodity();
      getSupplierDescription();
      getLocationForSupplier();
      getSupplierOwnership();
      document.addEventListener("click", handleClickOutside);
    });

    onBeforeUnmount(() => {
      document.removeEventListener("click", handleClickOutside);
    });

    /**
     * Identification Number
     */

    function mapSupplierDetailFields(callbackSuccessData: any) {
      const fieldMappings = [
        { source: "idNumber", target: "idNumber" },
        { source: "idType", target: "idType" },
        { source: "externalId", target: "externalID" },
        { source: "foundedYear", target: "founded" },
        { source: "buyerName", target: "buyingEntity" },
        { source: "buyerCountry", target: "buyingCountry" },
        { source: "team", target: "procurementTeam" },
        { source: "relationSince", target: "relationshipSince" },
        { source: "supplierCountry", target: "country" },
        { source: "supplierName", target: "supplierName" },
        {
          source: "averageDaysToApproveInvoice",
          target: "averageDaysToApproveInvoice",
        },
        {
          source: "dateOfLastTermNegotiation",
          target: "dateOfLastTermNegotiation",
        },
      ];

      fieldMappings.forEach(({ source, target }) => {
        if (callbackSuccessData[source] !== null) {
          (data.supplierDetail as any)[target] = callbackSuccessData[source];
        }
      });
    }

    function mapBooleanFields(callbackSuccessData: any) {
      const booleanFields = [
        {
          source: "supplierEthnicMinorityOwnedBusiness",
          target: "supplierEthnicMinorityOwnedBusiness",
        },
        {
          source: "supplierWomanOwnedBusiness",
          target: "supplierWomanOwnedBusiness",
        },
        {
          source: "supplierVeteranOwnedBusiness",
          target: "supplierVeteranOwnedBusiness",
        },
      ];

      booleanFields.forEach(({ source, target }) => {
        if (callbackSuccessData[source] !== null) {
          (data.supplierDetail as any)[target] = callbackSuccessData[source]
            ? "Yes"
            : "No";
        }
      });
    }

    function getSupplierDetail() {
      data.loading.supplierDetail = true;
      const params = {
        companyId: props.companyId,
        callbackSuccess: (callbackSuccessData: any) => {
          mapSupplierDetailFields(callbackSuccessData);
          mapBooleanFields(callbackSuccessData);
          getCustomValuesFields(callbackSuccessData);
          data.loading.supplierDetail = false;
        },
        callbackError: () => {
          data.loading.supplierDetail = false;
        },
      };
      entityCardStore.getEntityCardSupplierDetail(params);
    }

    function getCustomValuesFields(callbackSuccessData: any) {
      const datapointsTitles =
        spendFileVersionActive.spendFileVersionActiveNameCustomDataPoints.value;

      const MAX_CUSTOM_DATAPOINTS = 26;
      const customDataPoints = Array.from(
        { length: MAX_CUSTOM_DATAPOINTS },
        (_, index) => callbackSuccessData[`customDataPoint${index + 1}`],
      );

      const result: CustomValuesData[] = customDataPoints
        .map((value, index) => {
          const isNumeric = index >= 20;
          const titleFromSpendFile = datapointsTitles[index];
          const label = titleFromSpendFile ?? (isNumeric
            ? translate.t(`global.globalFilters.customDataPoint${index + 1}`)
            : undefined);
          const formattedValue = value !== null && value !== undefined
            ? (isNumeric ? getNumberWithDecimals(value, 2) : String(value))
            : null;
          return {
            key: label,
            label,
            value: formattedValue,
            columnNumber: index + 1,
            columnType: isNumeric ? "number" as const : "text" as const,
          };
        })
        .filter(
          (item) =>
            item.value !== null &&
            item.value !== undefined &&
            item.value !== "",
        );

      data.customValuesData = result;      
    }

    /**
     * Retrieve characteristics from server
     */
    function getSupplierCharacteristics() {
      data.loading.supplierDetail = true;

      const params = {
        companyId: props.companyId,
        callbackSuccess: (callbackSuccessData: any) => {
          data.characteristics.companySizeDescription =
            callbackSuccessData.characteristics.companySizeDescription;
          data.characteristics.region =
            callbackSuccessData.characteristics.region;

          data.loading.supplierDetail = false;
        },
        callbackError: (callbackErrorData: any) => {
          data.loading.supplierDetail = false;
        },
      };

      entityCardStore.getCharacteristics(params);
    }

    /**
     * Industry Commodity
     */

    function mapIndustryCommodityFields(callbackSuccessData: any) {
      const simpleFields = [
        { source: "industryName", target: "industryName" },
        { source: "industryNaics", target: "industryNaics" },
        { source: "commodity", target: "commodity" },
        { source: "unspsc", target: "unspsc" },
      ];

      simpleFields.forEach(({ source, target }) => {
        if (callbackSuccessData[source] !== null) {
          (data.industryCommodity as any)[target] = callbackSuccessData[source];
        }
      });

      data.industryCommodity.industryIsic = formatIsicValues(
        callbackSuccessData.industryIsic,
      );
    }

    function getIndustryCommodity() {
      data.loading.industryCommodity = true;
      const params = {
        companyId: props.companyId,
        callbackSuccess: (callbackSuccessData: any) => {
          mapIndustryCommodityFields(callbackSuccessData);
          data.loading.industryCommodity = false;
        },
        callbackError: () => {
          data.loading.industryCommodity = false;
        },
      };
      entityCardStore.getEntityCardIndustryCommodity(params);
    }

    /**
     * Get the location for the supplier and update the data accordingly from API.
     * Route: /api/spend_parsed_companies/{id}
     *
     * @return {void}
     */
    function getLocationForSupplier(): void {
      // Enable loading
      data.loading.locationForSupplier = true;

      const params = {
        companyId: props.companyId,
        callbackSuccess: (callbackSuccessData: any) => {
          if ("location" in callbackSuccessData) {
            data.supplierLocation.latitude =
              callbackSuccessData.location.latitude;
            data.supplierLocation.longitude =
              callbackSuccessData.location.longitude;
            if ("phone" in callbackSuccessData.location)
              data.supplierLocation.phone =
                callbackSuccessData.location.phone ?? null;
          }
          if ("address" in callbackSuccessData)
            data.supplierLocation.address = callbackSuccessData.address ?? null;
          if ("city" in callbackSuccessData)
            data.supplierLocation.city = callbackSuccessData.city ?? null;
          if ("state" in callbackSuccessData)
            data.supplierLocation.state = callbackSuccessData.state ?? null;
          if ("zipCode" in callbackSuccessData)
            data.supplierLocation.zipCode = callbackSuccessData.zipCode ?? null;
          if ("domain" in callbackSuccessData)
            data.supplierLocation.domain = callbackSuccessData.domain ?? null;
          if ("phoneNumber" in callbackSuccessData)
            data.supplierLocation.phoneNumber =
              callbackSuccessData.phoneNumber ?? null;
          data.supplierDetail.type = callbackSuccessData.companyType;

          // Disable loading
          data.loading.locationForSupplier = false;
        },
        callbackError: (callbackErrorData: any) => {
          if (import.meta.env.DEV) {
            console.error(
              "** Error in get location for supplier",
              callbackErrorData,
            );
          }

          // Disable loading
          data.loading.locationForSupplier = false;
        },
      };
      entityCardStore.getLocationForSupplier(params);
    }

    /**
     * Description
     */

    function getSupplierDescription() {
      data.loading.supplierDetail = true;
      const params = {
        companyId: props.companyId,
        callbackSuccess: (callbackSuccessData: any) => {
          if (callbackSuccessData.description !== null)
            data.supplierDescription = callbackSuccessData.description;
          if (data.supplierDescription) {
            data.showFullDescription = data.supplierDescription.length > 200;
          }

          data.loading.supplierDetail = false;
        },
        callbackError: () => {
          data.loading.supplierDetail = false;
        },
      };
      entityCardStore.getEntityCardSupplierDescription(params);
    }

    /**
     * Ownership
     */

    function getSupplierOwnership() {
      data.loading.supplierOwnership = true;
      const params = {
        companyId: props.companyId,
        callbackSuccess: (callbackSuccessData: any) => {
          if (callbackSuccessData.ownership !== null)
            data.supplierOwnership.ownership = callbackSuccessData.ownership;
          if (callbackSuccessData.parentIndustry !== null)
            data.supplierOwnership.parentIndustry =
              callbackSuccessData.parentIndustry;
          if (callbackSuccessData.ultimateParent !== null)
            data.supplierOwnership.ultimateParent =
              callbackSuccessData.ultimateParent;
          data.loading.supplierOwnership = false;
        },
        callbackError: () => {
          data.loading.supplierOwnership = false;
        },
      };
      entityCardStore.getEntityCardSupplierOwnership(params);
    }
    function loadedPrograms(state: boolean) {
      data.loading.userPrograms = state;
    }

    function selectProgram(newValue: string | null) {
      data.selectedProgram = newValue;
      if (newValue !== null) {
        // ? - Fill with functions that need program
      }
    }

    /**
     * shows the sme details modal
     */
    function showModalSmeDetails() {
      data.showSMEModal = true;
    }

    const industryDisplayValue = computed(() => {
      const name = data.industryCommodity.industryName;
      const code = data.industryCommodity.industryNaics;
      if (!name || name === '-') return code && code !== '-' ? code : '-';
      if (!code || code === '-') return name;
      return `${code}-${name}`;
    });

    const smeRelatedIsSme = computed(() => {
      return props.smeRelated?.isSME;
    });

    const smeRelatedSmeSource = computed(() => {
      return props.smeRelated?.smeSource;
    });

    const smeModalContent = computed(() => {
      const useNotSmeDefault = !smeRelatedIsSme.value && !smeRelatedSmeSource.value;
      const sourceKey = useNotSmeDefault ? 'notSME' : (smeRelatedSmeSource.value || 'default');
      const baseKey = `home.entityCard.companyDetails.sources.${sourceKey}`;
      const nameRaw = translate.t(`${baseKey}.name`);
      const cardRaw = translate.t(`${baseKey}.card`);
      const otherRaw = translate.t(`${baseKey}.otherDescription`);
      const name = typeof nameRaw === 'string' ? nameRaw : '';
      const card = typeof cardRaw === 'string' && cardRaw.trim() !== '' ? DOMPurify.sanitize(cardRaw) : '';
      const otherDescription = typeof otherRaw === 'string' && otherRaw.trim() !== '' ? DOMPurify.sanitize(otherRaw) : '';
      return { name, card, otherDescription };
    });

    function gotoURL(url: any) {
      if (!url || typeof url !== "string") return;
      const validURL = /^https?:\/\//.test(url) ? url : `https://${url}`;
      window.open(validURL, "_blank", "noopener,noreferrer");
    }
    const fullAddressDisplay = computed(() => {
      const parts: string[] = [];
      if (data.supplierLocation.address) parts.push(data.supplierLocation.address);
      if (data.supplierLocation.city) parts.push(data.supplierLocation.city);
      if (data.supplierLocation.state) parts.push(data.supplierLocation.state);
      if (data.supplierLocation.zipCode) parts.push(data.supplierLocation.zipCode);
      if (data.supplierDetail.country) parts.push(data.supplierDetail.country);
      return parts.length ? parts.join(', ') : '-';
    });

    /**
     * Handle team change from ManageTeamAction component
     * Updates the procurement team for the current supplier using the analyze store
     *
     * @param keyId - Action key identifier ('manageTeam')
     * @param isEmit - Whether to emit the action
     * @param payload - Contains the selected team and removeGroup flag
     */
    function handleTeamChange(
      keyId: ActionFromEditProgram,
      isEmit: boolean,
      payload: any,
    ) {
      const selectedTeam = payload.param;
      const teamIri = selectedTeam ? selectedTeam["@id"] : null;
      // Prepare the changed parameter for the API
      const changed = {
        key: keyId,
        value: teamIri ? removeIRI(teamIri) : null,
      };

      // Prepare params for analyzeStore.postProgramSpendConfigurationbyGroups
      const programUuid = removeIRI(props.programUuid);
      const levelOfGrid = mapCompanyTypeToLevel(props.companyType);
      // Prepare filters for the API call
      const filters = {
        telerikFilter: null, // No telerik filter in Entity Card context
        targetProgramUuid: programUuid,
        globalFilter: convertFiltersToREST(
          globalFiltersStore.getFiltersApplied,
        ),
        currencyRate: appStore.getCurrencyAmount,
      };
      closeManageTeam();
      requestConfirmation(() => {
        data.loading.procurementTeam = true;
        analyzeStore.postProgramSpendConfigurationbyGroups({
          program: programUuid,
          changed: changed,
          uuids: [removeIRI(props.companyId)],
          level: levelOfGrid,
          filters: filters,
          all: false,
          callbackSuccess: () => {
            if (selectedTeam) {
              data.supplierDetail.procurementTeam = selectedTeam.name;
              toast.success(translate.t("home.entityCard.details.procurementTeamUpdated"));
            } else {
              data.supplierDetail.procurementTeam = "-";
              toast.success(translate.t("home.entityCard.details.procurementTeamCleared"));
            }
            data.loading.supplierDetail = false;
            data.loading.procurementTeam = false;
          },
          callbackError: (error: any) => {
            data.loading.supplierDetail = false;
            data.loading.procurementTeam = false;
            toast.error(translate.t("home.entityCard.details.procurementTeamUpdateFailed"));
            if (import.meta.env.DEV) console.error("handleTeamChange - Error updating procurement team:", error);
          },
        });
      });
    }

    const loadingSupplierDetail = computed(() => {
      return data.loading.supplierDetail || data.loading.procurementTeam;
    });
    function closeAllManagePopups() {
      showManageTeam.value = false;
      showManageCommodity.value = false;
      showManageIndustry.value = false;
      showManageUltimaParent.value = false;
      activeCustomColumnKey.value = null;
    }

    function toggleManageTeam() {
      const wasOpen = showManageTeam.value;
      closeAllManagePopups();
      showManageTeam.value = !wasOpen;
    }
    function closeManageTeam() {
      showManageTeam.value = false;
    }

    function toggleManageCommodity() {
      const wasOpen = showManageCommodity.value;
      closeAllManagePopups();
      showManageCommodity.value = !wasOpen;
    }
    function closeManageCommodity() {
      showManageCommodity.value = false;
    }

    function toggleManageIndustry() {
      const wasOpen = showManageIndustry.value;
      closeAllManagePopups();
      showManageIndustry.value = !wasOpen;
    }
    function closeManageIndustry() {
      showManageIndustry.value = false;
    }

    function toggleManageUltimaParent() {
      const wasOpen = showManageUltimaParent.value;
      closeAllManagePopups();
      showManageUltimaParent.value = !wasOpen;
    }
    function closeManageUltimaParent() {
      showManageUltimaParent.value = false;
    }

    function handleIndustryChange(keyId: ActionFromEditProgram, isEmit: boolean, payload: any) {
      if (!isEmit) return;
      const selectedValue: number | null = payload.param ?? null;
      const programUuid = removeIRI(props.programUuid);
      const levelOfGrid = mapCompanyTypeToLevel(props.companyType);
      const changed = { key: keyId, value: selectedValue };
      const filters = buildFilters(programUuid);
      closeManageIndustry();
      requestConfirmation(() => {
        data.loading.industry = true;
        analyzeStore.postProgramSpendConfigurationbyGroups({
          program: programUuid,
          changed,
          uuids: [removeIRI(props.companyId)],
          level: levelOfGrid,
          filters,
          all: false,
          callbackSuccess: () => {
            data.loading.industry = false;
            getIndustryCommodity();
            toast.success(translate.t("home.entityCard.details.industryUpdated"));
          },
          callbackError: (error: any) => {
            data.loading.industry = false;
            if (import.meta.env.DEV) console.error("handleIndustryChange error:", error);
            toast.error(translate.t("home.entityCard.details.industryUpdateFailed"));
          },
        });
      });
    }

    function handleUltimaParentChange(keyId: ActionFromEditProgram, isEmit: boolean, payload: any) {
      if (!isEmit) return;
      const selectedValue: string | null = payload.param ?? null;
      const programUuid = removeIRI(props.programUuid);
      const levelOfGrid = mapCompanyTypeToLevel(props.companyType);
      const changed = { key: keyId, value: selectedValue };
      const filters = buildFilters(programUuid);
      closeManageUltimaParent();
      requestConfirmation(() => {
        data.loading.ultimateParent = true;
        analyzeStore.postProgramSpendConfigurationbyGroups({
          program: programUuid,
          changed,
          uuids: [removeIRI(props.companyId)],
          level: levelOfGrid,
          filters,
          all: false,
          callbackSuccess: () => {
            data.loading.ultimateParent = false;
            getSupplierOwnership();
            toast.success(translate.t("home.entityCard.details.ultimateParentUpdated"));
          },
          callbackError: (error: any) => {
            data.loading.ultimateParent = false;
            if (import.meta.env.DEV) console.error("handleUltimaParentChange error:", error);
            toast.error(translate.t("home.entityCard.details.ultimateParentUpdateFailed"));
          },
        });
      });
    }

    function handleTeamConfirmRequest(action: { itemId: string; type: "delete" }) {
      pendingTeamDeleteId.value = action.itemId;
      showManageTeam.value = false;
      showConfirmTeamModal.value = true;
    }

    async function confirmTeamAction() {
      showConfirmTeamModal.value = false;
      if (!pendingTeamDeleteId.value) return;
      const itemId = pendingTeamDeleteId.value;
      pendingTeamDeleteId.value = null;
      try {
        const response = await deleteCompanyTeam(itemId);
        if (response.success) {
          gridMenuActionsStore.removeTeam(itemId);
          toast.success("Team deleted successfully");
        } else {
          toast.error("Failed to delete team. Please try again.");
        }
      } catch (error: any) {
        if (import.meta.env.DEV) console.error("confirmTeamAction error:", error);
        toast.error("Network error. Please check your connection.");
      }
    }

    function cancelTeamAction() {
      showConfirmTeamModal.value = false;
      pendingTeamDeleteId.value = null;
      showManageTeam.value = true;
    }

    function handleCommodityConfirmRequest(action: { valueOld: string | null; valueNew: string | null; type: "edit" | "delete" }) {
      pendingCommodityAction.value = action;
      showManageCommodity.value = false;
      showConfirmCommodityModal.value = true;
    }

    function confirmCommodityAction() {
      showConfirmCommodityModal.value = false;
      if (!pendingCommodityAction.value) return;
      const { valueOld, valueNew, type } = pendingCommodityAction.value;
      pendingCommodityAction.value = null;
      data.loading.commodity = true;
      analyzeStore.renameSpendFieldValue({
        programId: removeIRI(props.programUuid),
        previousValue: valueOld,
        newValue: valueNew,
        callbackSuccess: () => {
          data.loading.commodity = false;
          commodityActionKey.value++;
          if (type === "edit" && valueOld !== null) {
            if (data.industryCommodity.commodity === valueOld) {
              data.industryCommodity.commodity = valueNew ?? "-";
            }
          } else if (type === "delete" && valueOld !== null) {
            if (data.industryCommodity.commodity === valueOld) {
              data.industryCommodity.commodity = "-";
            }
          }
        },
        callbackError: (err: any) => {
          data.loading.commodity = false;
          if (import.meta.env.DEV) console.error("confirmCommodityAction error:", err);
        },
      });
    }

    function cancelCommodityAction() {
      showConfirmCommodityModal.value = false;
      pendingCommodityAction.value = null;
      showManageCommodity.value = true;
    }

    function setCustomColumnValue(key: string, value: string | null) {
      const target = data.customValuesData.find((c) => c.key === key);
      if (target) target.value = value ?? "-";
    }

    function toggleCustomColumn(key: string) {
      const wasOpen = activeCustomColumnKey.value === key;
      closeAllManagePopups();
      activeCustomColumnKey.value = wasOpen ? null : key;
    }

    function closeCustomColumn() {
      activeCustomColumnKey.value = null;
    }

    function handleCustomColumnChange(
      keyId: ActionFromEditProgram,
      isEmit: boolean,
      payload: any,
      item: CustomValuesData,
    ) {
      if (!isEmit) return;
      const selectedValue: string | null = payload.param ?? null;
      const programUuid = removeIRI(props.programUuid);
      const levelOfGrid = mapCompanyTypeToLevel(props.companyType);
      const changed = {
        key: keyId,
        columnNumber: item.columnNumber,
        value: selectedValue,
      };
      const filters = buildFilters(programUuid);
      closeCustomColumn();
      requestConfirmation(() => {
        loadingCustomColumnKey.value = item.key;
        analyzeStore.postProgramSpendConfigurationbyGroups({
          program: programUuid,
          changed,
          uuids: [removeIRI(props.companyId)],
          level: levelOfGrid,
          filters,
          all: false,
          callbackSuccess: () => {
            loadingCustomColumnKey.value = null;
            setCustomColumnValue(item.key, selectedValue);
            toast.success(translate.t("home.entityCard.details.customColumnUpdated"));
          },
          callbackError: (error: any) => {
            loadingCustomColumnKey.value = null;
            if (import.meta.env.DEV) console.error("handleCustomColumnChange error:", error);
            toast.error(translate.t("home.entityCard.details.customColumnUpdateFailed"));
          },
        });
      });
    }

    function handleCustomColumnConfirmRequest(
      action: { valueOld: string | null; valueNew: string | null; type: "edit" | "delete" },
      item: CustomValuesData,
    ) {
      pendingCustomColumnAction.value = { ...action, item };
      closeCustomColumn();
      showConfirmCustomColumnModal.value = true;
    }

    function confirmCustomColumnAction() {
      showConfirmCustomColumnModal.value = false;
      if (!pendingCustomColumnAction.value) return;
      const { valueOld, valueNew, type, item } = pendingCustomColumnAction.value;
      pendingCustomColumnAction.value = null;
      loadingCustomColumnKey.value = item.key;
      analyzeStore.renameCustomColumnValue({
        programId: removeIRI(props.programUuid),
        columnNumber: String(item.columnNumber),
        previousValue: valueOld,
        newValue: valueNew,
        callbackSuccess: () => {
          loadingCustomColumnKey.value = null;
          const target = data.customValuesData.find((c) => c.key === item.key);
          if (target) {
            if (type === "edit") target.value = valueNew ?? "-";
            else if (type === "delete") target.value = "-";
          }
        },
        callbackError: (err: any) => {
          loadingCustomColumnKey.value = null;
          if (import.meta.env.DEV) console.error("confirmCustomColumnAction error:", err);
        },
      });
    }

    function cancelCustomColumnAction() {
      showConfirmCustomColumnModal.value = false;
      pendingCustomColumnAction.value = null;
    }

    function handleOpenAdvancedModeCustomColumn(item: CustomValuesData) {
      advancedModeConfig.value = {
        programId: removeIRI(props.programUuid),
        entityUuid: removeIRI(props.companyId),
        companyType: props.companyType,
        title: item.label,
        type: "customColumn",
        columnUuid: String(item.columnNumber),
        columnNumber: item.columnNumber,
        initialValue: item.value && item.value !== "-" ? item.value : null,
      };
      showAdvancedModeModal.value = true;
      closeCustomColumn();
    }

    function handleCommodityChange(
      keyId: ActionFromEditProgram,
      isEmit: boolean,
      payload: any,
    ) {
      if (!isEmit) return;

      const selectedValue: string | null = payload.param ?? null;
      const programUuid = removeIRI(props.programUuid);
      const levelOfGrid = props.companyType;
      const changed = { key: keyId, value: selectedValue };
      const filters = buildFilters(programUuid);
      closeManageCommodity();
      requestConfirmation(() => {
        data.loading.commodity = true;
        analyzeStore.postProgramSpendConfigurationbyGroups({
          program: programUuid,
          changed,
          uuids: [removeIRI(props.companyId)],
          level: levelOfGrid,
          filters,
          all: false,
          callbackSuccess: () => {
            data.loading.commodity = false;
            data.industryCommodity.commodity = selectedValue ?? "-";
            toast.success(translate.t("home.entityCard.details.commodityUpdated"));
          },
          callbackError: (error: any) => {
            data.loading.commodity = false;
            if (import.meta.env.DEV) console.error("handleCommodityChange error:", error);
            toast.error(translate.t("home.entityCard.details.commodityUpdateFailed"));
          },
        });
      });
    }

    function handleOpenAdvancedModeCommodity() {
      const currentCommodity = data.industryCommodity.commodity;
      advancedModeConfig.value = {
        programId: removeIRI(props.programUuid),
        entityUuid: removeIRI(props.companyId),
        companyType: props.companyType,
        title: translate.t("home.entityCard.details.commodities"),
        type: "commodity",
        columnUuid: undefined,
        columnNumber: undefined,
        initialValue: currentCommodity && currentCommodity !== "-" ? currentCommodity : null,
      };
      showAdvancedModeModal.value = true;
      closeManageCommodity();
    }

    function handleOpenAdvancedModeTeam() {
      const currentTeam = data.supplierDetail.procurementTeam;
      advancedModeConfig.value = {
        programId: removeIRI(props.programUuid),
        entityUuid: removeIRI(props.companyId),
        companyType: props.companyType,
        title: translate.t("home.entityCard.details.procurementTeamsupplier"),
        type: "team",
        columnUuid: undefined,
        columnNumber: undefined,
        initialValue: currentTeam && currentTeam !== "-" ? currentTeam : null,
      };
      showAdvancedModeModal.value = true;
      closeManageTeam();
    }


    function onAdvancedModeSaved() {
      if (advancedModeConfig.value.type === "commodity") {
        getIndustryCommodity();
      } else {
        getSupplierDetail();
      }
    }

    return {
      ...toRefs(data),
      // LocationMap (design-system) reads no environment of its own - the app that owns the key
      // has to supply it.
      GOOGLE_MAP_KEY: import.meta.env.VITE_GOOGLE_MAP_KEY,
      smeModalContent,
      fullAddressDisplay,
      loadedPrograms,
      selectProgram,
      showModalSmeDetails,
      industryDisplayValue,
      smeRelatedIsSme,
      smeRelatedSmeSource,
      gotoURL,
      StringUtils,
      isAdmin,
      handleTeamChange,
      toggleManageTeam,
      showManageTeam,
      loadingSupplierDetail,
      closeManageTeam,
      showManageCommodity,
      toggleManageCommodity,
      closeManageCommodity,
      handleCommodityChange,
      showManageIndustry,
      toggleManageIndustry,
      closeManageIndustry,
      handleIndustryChange,
      showManageUltimaParent,
      toggleManageUltimaParent,
      closeManageUltimaParent,
      handleUltimaParentChange,
      showConfirmAllSpendModal,
      pendingAllSpendAction,
      confirmAllSpendAction,
      cancelAllSpendAction,
      showConfirmTeamModal,
      pendingTeamDeleteId,
      handleTeamConfirmRequest,
      confirmTeamAction,
      cancelTeamAction,
      showConfirmCommodityModal,
      pendingCommodityAction,
      commodityActionKey,
      handleCommodityConfirmRequest,
      confirmCommodityAction,
      cancelCommodityAction,
      activeCustomColumnKey,
      loadingCustomColumnKey,
      showConfirmCustomColumnModal,
      pendingCustomColumnAction,
      toggleCustomColumn,
      closeCustomColumn,
      handleCustomColumnChange,
      handleCustomColumnConfirmRequest,
      confirmCustomColumnAction,
      cancelCustomColumnAction,
      handleOpenAdvancedModeCustomColumn,
      showAdvancedModeModal,
      advancedModeConfig,
      handleOpenAdvancedModeCommodity,
      handleOpenAdvancedModeTeam,
      onAdvancedModeSaved,
      removeIRI,
    };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

h6 {
  color: $color-gray-600 !important;
  font-weight: 600 !important;
}

.text-ellipsis {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.detail-overview {
  height: auto;
  min-height: 104px;
}

.text-limit-200 {
  display: inline-block;
  max-width: 200ch;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.col-custom {
  flex: 0 0 calc(100% / 12 * 1.5); /* 1.5 columnas */
  max-width: calc(100% / 12 * 1.5);
  width: 100%;
}
.custom-fields-row {
  row-gap: 12px;
}

.card-custom {
  position: relative;
  border: 1px solid #eaecf0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 18px;
  flex-flow: column nowrap;
  transition: all 0.3s ease;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
  background: white;
}
</style>
