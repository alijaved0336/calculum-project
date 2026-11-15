<template>
<div v-if="showExtraData" class="col-12 d-flex justify-content-between mb-2"><span class="text-xs font-normal text-gray-500 mt-2">{{ formatData.convertDateToPlanformat(info.negotiationStatusUpdatedAt) }}</span>
  <PillLabelNumberBadge :label-classes="negotiationStatusPillColorClasses" :label="negotiationStatusFormatted" :show-new-status="true"></PillLabelNumberBadge>
</div>
<div class="col-12 cursor-pointer">
  <div class="card" :class="[getBorderStatus(borderStatus), availableCursorClass, {'shadow-none': notAvailableEntity}]">
    <div class="card-body" :class="[availableCursorClass, {'blur-effect': notAvailableEntity }]" @click="openEntityModal">
      <div class="row" :class="availableCursorClass">
        <div class="col-xl-12 col-lg-12 col-md-12">
          <div class="d-flex" :class="headerCursorClass">
            <div class="row">
              <div class="col-2 align-items-header">
                <img v-if="!ImagesErrorBoolean" class="img-logo" :src="logoUrlFromBucketS3" loading="lazy" :alt="letterOfDomain" @error="imagesError"/>
                <div v-else class="circle"><span class="text-capitalize font-weight-bold">{{ letterOfDomain }}            </span></div>
              </div>
              <div class="col-10 align-items-header"><span class="text-base font-semibold text-gray-600 shorter-name" :data-toggle="'tooltip'" :title="info.entityName" :data-placement="'top'">{{ info.entityName }}</span></div>
            </div>
          </div>
          <div v-if="isPartial" class="d-flex mt-1 w-100">
              <div class="tags-card-partial">
                <Tooltip :anchor-element="'target'" :position="'top'">
                  <span :title="$t('home.manageModule.partialInfoNote')">{{ $t('home.manageModule.partialTag') }}</span>
                </Tooltip>
              </div>            
          </div>
          <div class="d-flex mt-1 w-100" :class="availableCursorClass"><span class="text-sm font-normal text-gray-500">{{ setLabelforSpends }}</span><span class="tags-card tags-card-number">{{ setValueforSpend }}</span></div>
          <div class="d-flex mt-1 w-100" :class="availableCursorClass"><span class="text-sm font-normal text-gray-500">{{ $t('global.paymentTermsD') }}:</span><span class="tags-card tags-card-number">{{ `${info.contractualPaymentTermsWithCashDiscounts ?? info.actualPaymentTerms} -> ${setPaymentTerms}`  }}</span></div>
          <div class="d-flex mt-1 w-100" :class="availableCursorClass"><span class="text-sm font-normal text-gray-500">{{  isAgreedColumn ? $t('home.manageModule.agreedType') : $t('global.cashFlowTarget') }}:</span><span class="tags-card tags-card-number">{{ setTargetType }}</span></div>
          <div v-if="vCardEnabled && info.isVCardApplied" class="d-flex mt-1 w-100" :class="availableCursorClass"><span class="text-sm font-normal text-gray-500">{{ isAgreedColumn ? $t('home.manageModule.agreedRebateType') : $t('global.rebateTarget') }}:</span><span class="tags-card tags-card-number">{{ setRebateType }}</span></div>
        </div>
      </div>
      <div v-if="showTeams" class="teams-sections">
        <div class="circle-teams">
          <Tooltip :anchor-element="'target'" :position="'top'"><span class="text-capitalize font-semibold" :title="info.teamName" :data-toggle="'tooltip'" :data-placement="'top'">{{ setValueTeamName }} </span></Tooltip>
        </div>
      </div>
      <div class="flag-sections">
        <div v-if="vCardEnabled && info.isVCardApplied" class="badge-section" >
          <IconBadgeManageRebate />
        </div>
        <Tooltip :anchor-element="'target'" :position="'top'">
          <div class="flag-country" :style="{ backgroundImage: 'url(' + getFlag() + ')' }" :title="info.entityCountryName" :data-toggle="'tooltip'" :data-placement="'top'" :class="availableCursorClass"></div>
        </Tooltip>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { CardsByStatus } from "../types";
import { defineComponent, computed, toRefs, reactive, ref } from "vue";
import { getMediaUrl } from "@/services/media/mediaActions";
import { ImageType } from "@/services/media/mediaTypes";
import { StringUtils } from "@/utils";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useI18n } from "vue-i18n";
import { useEntityCardStore } from '@/stores/entityCard';
import * as formatData from "@/utils/FormatData";
import PillLabelNumberBadge from "@/modules/components/PillLabelNumberBadge.vue";
import useNegotiationStatus from "@/modules/negotiationStatus/composables/useNegotiationStatus";
import { useUser } from "@/composables";
import IconBadgeManageRebate from "@/resources/assets/images/icons/IconBadgeManageRebate.vue";
import useCompany from "@/composables/useCompany";
import { isPartialEntity, getStageBreakdownEntry } from "@/composables/usePartialNegotiationStatus";

export default defineComponent({
  name: "CardsByStatus",
  components: { Tooltip, PillLabelNumberBadge,IconBadgeManageRebate },
  props: {
    disableEntity: { type: Boolean, required: false, default: false },
    info: { type: Object, required: true },
    levelofGrid: { type: Number, required: true },
    showExtraData: { type: Boolean, required: true, default: false },
    showTeams: { type: Boolean, required: true, default: true },
    // Which column this card instance is rendered in — NOT the same as info.negotiationStatus
    // (the entity-level rolled-up status), needed to look up this card's stage-scoped slice
    // of a Partial entity's stageBreakdown.
    columnStatus: { type: String, required: false, default: null },
    statusCode: { type: String, required: true },
    isDraggable: { type: Boolean, required: false, default: false },
  },
  emits: [],
  setup(props, { emit }) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    const entityCardStore = useEntityCardStore();
    const {
      negotiationStatusGetStatusTranslated,
      negotiationStatusGetPillColorClasses
    } = useNegotiationStatus();

    const data = reactive<CardsByStatus>({
      entitySelected: null
    });

    const { usevCardGroupsEnabled } = useCompany();

    const { user, isPilotAccount, useFeatureVirtualCard } = useUser();

    const ImagesErrorBoolean = ref(false);
    function imagesError(e: any) {
      ImagesErrorBoolean.value = !ImagesErrorBoolean.value;
    }

    /**
     * helper function to disable the modal for entity modal
     */
    const notAvailableEntity = computed(() => {
      if(user && user.value?.isSuperAdmin) { 
        return false 
      }
      else if (props.disableEntity) {
        return true;
      } else {
        return false;
      }
    });

    function getFlag() {
      return props.info.entityFlagUrl;
    }

    const logoUrlFromBucketS3 = computed(() => {
      if (props.info.entityMediaPath) {
        return getMediaUrl(props.info.entityMediaPath, ImageType.MEDIA);
      } else {
        imagesError(true);
        return undefined;
      }
    });

    const isPartial = computed(() => isPartialEntity(props.info.negotiationStatusCodes));

    const stageEntry = computed(() =>
      isPartial.value ? getStageBreakdownEntry(props.info.stageBreakdown, props.statusCode) : null
    );

    // stageCode -> status name, to resolve the border color for a Partial entity's stage-scoped
    // entry (stageEntry.stageCode is numeric, but getBorderStatus builds a "border-status-<name>"
    // class using the same status names as the non-Partial info.negotiationStatus).
    const STAGE_CODE_TO_STATUS: Record<number, string> = {
      100: "analyzed",
      150: "onHold",
      200: "planned",
      300: "contacted",
      400: "agreed",
      500: "agreedExtended"
    };

    const borderStatus = computed(() => {
      if (isPartial.value && stageEntry.value) {
        return STAGE_CODE_TO_STATUS[stageEntry.value.stageCode] ?? props.info.negotiationStatus;
      }
      return  props.isDraggable ? props.columnStatus : props.info.negotiationStatus;
    });

    // Which status this CARD (not the entity's rolled-up status) represents — for a Partial
    // entity, info.negotiationStatus is entity-level and may not match the column this card
    // instance is rendered in, so agreed/agreedExtended-specific fields must key off the column.
    const isAgreedColumn = computed(() =>
      props.columnStatus === "agreed" || props.columnStatus === "agreedExtended"
    );

    const setPaymentTerms = computed(() => {
      if (isPartial.value && stageEntry.value) {
        const stageTerms = isAgreedColumn.value
          ? stageEntry.value.avgPaymentTermsWithoutDiscount
          : stageEntry.value.avgPaymentTerms;
        return stageTerms ?? translate.t("global.notAvailable");
      }
      if (isAgreedColumn.value) {
        return (
          props.info.termsWithoutCashDiscount ??
          translate.t("global.notAvailable")
        );
      } else {
        return (
          props.info.modelPaymentTerms ?? translate.t("global.notAvailable")
        );
      }
    });

    const setTargetType = computed(() => {
      if (isPartial.value && stageEntry.value) {
        return stageEntry.value.cashFlowTarget
          ? StringUtils.formatBigNumbers(stageEntry.value.cashFlowTarget)
          : translate.t("global.notAvailable");
      }
      if (isAgreedColumn.value) {
        return props.info.agreedCashFlow ? StringUtils.formatBigNumbers(props.info.agreedCashFlow) : translate.t("global.notAvailable")
      } else {
        return props.info.modelCashFlow ? StringUtils.formatBigNumbers(props.info.modelCashFlow) : translate.t("global.notAvailable")
      }
    });

    const setRebateType = computed(() => {
        const rebate = isPartial.value && stageEntry.value ? stageEntry.value.vCardRebateFull : props.info.vCardRebateFull;
        return rebate ? StringUtils.formatBigNumbers(rebate) : translate.t("global.notAvailable");
    });

    const setValueforSpend = computed(() => {
      if (isPartial.value && stageEntry.value) {
        if (props.levelofGrid === 1) {
          return stageEntry.value.count <= 0 ? "-" : stageEntry.value.count;
        }
        if (props.levelofGrid === 2) {
          const count = stageEntry.value.count ?? props.info.count;
          return count <= 0 ? "-" : count;
        }
      }
      switch (props.levelofGrid) {
        case 0:
          return props.info.spendAlias;
        case 1:
          return props.info.spendsIncludedCounts <= 0 ? 
            "-" 
            : props.info.spendsIncludedCounts;
        case 2:
          return props.info.suppliersIncludedCounts <= 0
            ? "-"
            : props.info.suppliersIncludedCounts;
        default:
          return "-"; // Default return value when no cases match
      }
    });

    const setLabelforSpends = computed(() => {
      switch (props.levelofGrid) {
        case 0:
          return translate.t("global.spendLine") + ":";
        case 1:
          return translate.t("global.spendLines") + ":";
        case 2:
          return translate.t("global.suppliers") + ":";
        default:
          return translate.t("global.spendLine") + ":"; // Default to spendLine label
      }
    });

    const letterOfDomain = computed(() => {
      if (props.info.entityName) {
        return props.info.entityName.substring(0, 1);
      }

      return "";
    });

    const setValueTeamName = computed(() => {
      if (props.info && props.info.teamName && props.info.teamName !== "") {
        const splitNames = props.info.teamName.split(",");
        if (splitNames.length > 1) {
          return `+${splitNames.length}`;
        } else {
          const splitName = props.info.teamName.split(" ");
          let result = "";

          if (splitName.length > 1) {
            const firstLetter = splitName[0][0];
            const secoundLetter = splitName[1][0];
            result += firstLetter + secoundLetter;
          } else {
            const firstLetter = splitName[0][0];
            result += firstLetter;
          }
          return result;
        }
      }
      return "-";
    });

    const negotiationStatusPillColorClasses = computed(() => {
      try {
        return negotiationStatusGetPillColorClasses(
          props.info.negotiationStatus
        );
      } catch (error) {
        return "";
      }
    });

    const negotiationStatusFormatted = computed(() => {
      try {
        return negotiationStatusGetStatusTranslated(
          props.info.negotiationStatus
        );
      } catch (error) {
        return "";
      }
    });

    /**
     * if the entity is not available, do nothing.
     * Otherwise, sets the selected entity and shows the modal.
     * @return {void}
     */
    function openEntityModal() {
      if (user && user?.value?.isSuperAdmin || (isPilotAccount()  && props.info.isPilot) || !isPilotAccount() ) {
        data.entitySelected = {
          companyId: props.info.entityUuid,
          domain: "",
          spendVolume: props.info.volume,
          country: props.info.entityCountryName,
          companyTypeForTheme: props.info.entityType
        };

        entityCardStore.setEntityType(props.info.entityType);
        entityCardStore.setSelectedEntity(data.entitySelected);
        entityCardStore.setIsModalEntityShowing(true);
      }
    }

    /**
     * Returns a string that represents the border status based on the given status.
     *
     * @param {string} status - The status to generate the border status for.
     * @return {string} The generated border status.
     */
    function getBorderStatus(status: string) {
      return "border-status-" + status;
    }

    const vCardEnabled = computed((): boolean => {
      return useFeatureVirtualCard.value && usevCardGroupsEnabled.value;
    });

    // Whole card is a drag source when draggable, so most of it should hint "grab" rather
    // than "click here" - only the entity logo/name (headerCursorClass) keeps the click hint,
    // since that's the part that opens the entity modal.
    const draggableCursorClass = computed(() => (props.isDraggable ? "cursor-grab" : "cursor-pointer"));

    const availableCursorClass = computed(() => {
      if (notAvailableEntity.value) return "";
      return draggableCursorClass.value;
    });

    const headerCursorClass = computed(() => (notAvailableEntity.value ? "" : "cursor-pointer"));

    return {
      ...toRefs(data),
      availableCursorClass,
      borderStatus,
      formatData,
      getBorderStatus,
      getFlag,
      headerCursorClass,
      imagesError,
      ImagesErrorBoolean,
      isAgreedColumn,
      letterOfDomain,
      logoUrlFromBucketS3,
      negotiationStatusFormatted,
      negotiationStatusPillColorClasses,
      notAvailableEntity,
      openEntityModal,
      setLabelforSpends,
      setPaymentTerms,
      setTargetType,
      setValueforSpend,
      setValueTeamName,
      vCardEnabled,
      setRebateType,
      isPartial
    };
  }
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

// This wrapper isn't a real Bootstrap grid column — it's not a direct child of a
// `.row`, so it never receives the project's row-scoped gutter override
// (`.row > [class^="col"] { padding-left/right: 8px }` in _bootstrap-overrides.scss).
// It falls back to Bootstrap's own unconditional base rule for every `.col-*` class
// (`padding-left/right: 15px`), silently insetting `.card` by 30px total and making it
// render narrower than the sibling header card (StatusesCards.vue's `.statuses-cards`,
// which has no such wrapper). Zeroed here since no real grid gutter is needed.
.col-12.cursor-pointer {
  padding-left: 0;
  padding-right: 0;
}

.card {
  padding: 0;
  margin-bottom: 12px;
  min-height: auto;
  width: 100%;
}

.cursor-grab {
  cursor: grab;
}

.cursor-grab:active {
  cursor: grabbing;
}

.card-body {
  padding: 12px 1px 12px 12px;
}

.circle {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 10px;
  gap: 10px;
  width: 25px;
  height: 25px;
  background: $color-gray-100;
  border-radius: 50px;
  flex: none;
  order: 2;
  flex-grow: 0;
  cursor: pointer;

  span {
    font-style: normal;
    font-weight: 600;
    font-size: 16px;
    line-height: 24px;
    color: $color-gray-600;
  }
}

.circle-teams {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 10px;
  gap: 10px;
  width: 32px;
  height: 32px;
  background: $color-gray-100;
  border-radius: 50px;
  cursor: pointer;

  span {
    font-style: normal;
    font-weight: 600;
    font-size: 16px;
    line-height: 24px;
    color: $color-gray-500;
  }
}

.shorter-name {
  display: inline-block;
  width: 80%;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}



.img-logo {
  max-width: 100%;
  max-height: 30px;
  min-width: 100%;
  min-height: auto;
  object-fit: contain;
  object-position: center center;
}

.align-items-header {
  align-content: center;
  display: inline-grid;
}

.container-teams {
  display: flex;
  justify-content: end;
}

.shorter-teams {
  display: inline-block;
  width: 60%;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.teams-sections {
  position: absolute;
  top: 0.8rem;
  right: 1.5rem;
  width: 15%;
  display: flex;
  flex-direction: column;
  align-items: end;
  gap: 1px;
}

.flag-sections {
  position: absolute;
  bottom: 0.8rem;
  right: 0rem;
  width: 10%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}


.badge-section {
  background: $color-gray-100;
  padding: 2px 8px;
  border-radius: 45%;
}

.tags-card-partial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: $color-orange-500;
  color: $color-white;
  padding: 0.5px 4px;
  border-radius: 4px;

  span {
    font-weight: 600;
    font-size: 0.7rem;
    line-height: 1;
  }
}
</style>
