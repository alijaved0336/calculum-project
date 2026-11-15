<template>
<div class="col-lg-4 col-xl-3 module-entity-cards">
  <div class="card" :class="{ 'potential': isAnPotentialEntity, 'cursor-pointer': (isSuperAdmin || !notAvailableCard), 'shadow-none': (!isSuperAdmin || notAvailableCard) }"><span class="remove-recent" v-if="showCloseAction" @click="postDeleteNewRecentEntityCard">
      <Tooltip :open-delay="100" :anchor-element="'target'" :position="'top'">
        <CalculumCloseWithoutTestID :title="'Remove the Shortcut to the Supplier in the Recent list.'"></CalculumCloseWithoutTestID>
      </Tooltip></span>
    <div class="card-body d-flex flex-column justify-content-between" @click="$emit('openEntityModal', supplier)" :class="{ 'blur-effect': notAvailableCard }">
      <CalculumLoading class="blur" v-if="loadingData" block="block"></CalculumLoading>
      <div class="div">
        <div class="row">
          <div class="col-12 d-flex justify-content-between flex-wrap">
            <div class="d-flex flex-column card-names w-100">
              <div class="d-flex align-items-center justify-content-between">
                <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'"> <span class="name current-name font-xl" :title="name" :class="{ 'potential-type': isAnPotentialEntity }">{{ name }}</span></Tooltip><span class="d-flex align-items-center text-sm type-company pill-badge px-2 py-1 offset-left offset-left-card" v-if="smeFeatureEnabled && isSME">
                  <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'">
                    <smeBadge class="sme-badge-icon small" :title="$t(`global.smeSource.tooltip${setSMESource}`)"></smeBadge>
                  </Tooltip></span><span class="d-flex align-items-center text-sm pill-badge pending-approval-badge px-2 py-1 offset-left offset-left-card" v-if="showPendingApprovalBadge">
                  <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'"><span :title="$t('home.entityCard.pendingApprovalTooltip')">{{ $t('home.entityCard.pendingApproval') }}</span></Tooltip></span>
              </div>
              <div class="d-flex gap-3 mb-2" v-if="receivedName"><span class="text-sm">{{ `${$t('home.entityCard.receivedName')}` }}</span>
                <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'"><span class="name-receivedName font-bold text-sm" :title="receivedName">{{ receivedName }}</span></Tooltip>
              </div>
              <Tooltip :open-delay="100" :anchor-element="'target'" :position="'bottom'"> <span class="name original-name" :title="name" :class="{ 'potential-type': isAnPotentialEntity }">{{ originalSupplierName }}</span></Tooltip>
              <div class="d-flex mt-1 mb-2"><img v-if="!ImagesErrorBoolean" :src="logoUrlFromBucketS3" @error="imagesError" style="width: auto !important;max-height: 35px; min-height: 35px; max-width: 150px;" loading="lazy"/>
                <div class="circle" v-else><span class="text-capitalize font-weight-bold">{{ letterOfDomain }}</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="row mb-3" v-if="companyType === 'supplier' || isAnPotentialEntity">
          <div class="col-12 d-flex"><span class="buyers-label" :class="{ 'potential-type': isAnPotentialEntity }">{{ $t('home.entityCard.parent') }}:</span><span class="tags-card" :title="parentName ?? 'No parent available'" :class="{ 'potential-bg': isAnPotentialEntity, 'potential-color': isAnPotentialEntity, 'include-mix-blend': companyType === 'supplier' }">{{ parentName ?? $t('global.notAvailable') }}</span></div>
        </div>
        <div class="row mb-3">
          <div class="col-12 d-flex"><span class="country-label" :class="{ 'potential-type': isAnPotentialEntity }">{{ $t('home.entityCard.country') }}</span><span class="tags-card tags-card-number country-text" :class="{ 'potential-bg': isAnPotentialEntity, 'potential-color': isAnPotentialEntity, 'include-mix-blend': companyType === 'supplier' }">  {{ getCountry(country) }}</span></div>
        </div>
        <div class="row mb-3">
          <div class="col-12 d-flex"><span class="buyers-label" :class="{ 'potential-type': isAnPotentialEntity }">{{ $t('home.entityCard.buyer') }}: </span><span class="tags-card" :title="buyers" :class="{ 'potential-bg': isAnPotentialEntity, 'potential-color': isAnPotentialEntity, 'include-mix-blend': companyType === 'supplier' }">{{ buyers }}    </span></div>
        </div>
        <div class="row mb-3">
          <div class="col-12">
            <div class="d-flex align-volume-items"><span class="buyers-label" :class="{ 'potential-type': isAnPotentialEntity }">{{ `${ $t('global.spendVolume')}${ showForecastVolume ? " (F)" : "" }` }}:</span><span class="tags-card" :class="{ 'potential-bg': isAnPotentialEntity, 'potential-color': isAnPotentialEntity, 'include-mix-blend': companyType === 'supplier' }">{{ showForecastVolume ? forecastValueComputed : spendVolumeToFixed }}</span>
              <div class="d-flex forecast-icon-wrapper gap-1 align-volume-items" v-if="showForecastVolume">
                <IconChartForecast v-if="isForeCastPositiveValue" :color="'#15b79e'"></IconChartForecast>
                <IconChartForecastDown v-if="!isForeCastPositiveValue" :color="'#ff2c4f'"></IconChartForecastDown><span class="text-sm font-medium" id="foreCastComputed" v-if="foreCastComputedIfExists" :class="isForeCastPositiveValue ? 'text-forecast' : 'text-forecast-warning' "> {{ `${foreCastPercentageComputedBigNumbers}%` }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="row mx-0 mb-3 justify-content-between"></div>
        <div class="d-flex flex-column">
          <div class="d-flex"><span class="buyers-label" :class="{ 'potential-type': isAnPotentialEntity }">{{ $t('global.spendLines') }}:</span><span class="tags-card tags-card-number" :class="{ 'potential-bg': isAnPotentialEntity, 'potential-color': isAnPotentialEntity, 'include-mix-blend': companyType === 'supplier' }">{{ spendsAmount }}</span></div>
        </div>
      </div>
      <div class="div mt-2">
        <div class="row mx-0 d-flex justify-content-between">
          <div class="d-flex align-items-center gap-2">
            <div class="d-flex align-items-center" :class="{ 'justify-content-around': showRemoveRecentCard && !loadingData }"><span class="type-company text-sm" v-if="companyType != 'supplier'" :class="companyType + '-type'">{{ companyType }}</span></div>
          </div>
          <div class="d-flex align-items-center">
            <PillLabelNumberBadgeParentSupplierLevel v-if="companyType === 'parent' || isAnPotentialEntity" :label="negotiationStatusFormatted" :label-classes="negotiationStatusPillColorClasses" :labels="negotiationStatusCodes"></PillLabelNumberBadgeParentSupplierLevel>
            <PillLabelNumberBadgeParentSupplierLevel v-if="companyType === 'supplier'" :label="negotiationStatusFormatted" :label-classes="negotiationStatusPillColorClasses" :labels="negotiationStatusCodes"></PillLabelNumberBadgeParentSupplierLevel>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { computed, ref, defineComponent, PropType } from "vue";

import { fontIcons, images } from "@/resources/assets/assets";
import { getMediaUrl } from "@/services/media/mediaActions";
import { ImageType } from "@/services/media/mediaTypes";
import { StringUtils, IsSMEUtils } from "@/utils";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useEntityCardStore } from '@/stores/entityCard';
import { CalculumLoading } from '@ada/design-system'
import PillLabelNumberBadgeParentSupplierLevel from "@/modules/components/PillLabelNumberBadgeParentSupplierLevel.vue";
import useNegotiationStatus from "@/modules/negotiationStatus/composables/useNegotiationStatus";
import { useUser } from "@/composables";
import star from "@/resources/assets/images/icons/starIcon.vue";
import smeBadge from "@/resources/assets/images/icons/smeBadge.vue";
import CalculumCloseWithoutTestID from '@/modules/components/CalculumCloseWithoutTestID.vue'
import IconChartForecast from "@ada/design-system/assets/icons/iconChartForecast.vue";
import IconChartForecastDown from "@ada/design-system/assets/icons/iconChartForecastDown.vue";
import { calculateForecastValues } from '@/utils/ForecastUtils';

import type { EntityType, NegotiationStatus } from "@/types";

export default defineComponent({
  name: "EntityCardRecentSearchCompany",
  components: {
    CalculumLoading,
    PillLabelNumberBadgeParentSupplierLevel,
    smeBadge,
    star,
    Tooltip,
    CalculumCloseWithoutTestID,
    IconChartForecast,
    IconChartForecastDown
  },
  props: {
    buyers: { type: String, required: true },
    companyType: { type: String as PropType<EntityType>, default: "supplier" },
    country: { type: String, required: false, default: "" },
    domain: { type: String, required: true },
    id: { type: String, required: false, default: "" },
    industry: { type: String, required: true },
    logoUrl: { type: String, required: true },
    name: { type: String, required: true },
    negotiationStatus: {
      type: Object as PropType<NegotiationStatus>,
      required: true,
    },
    negotiationStatusCodes: { type: String, default: "" },
    originalSupplierName: { type: String, required: true },
    parentName: { type: String, required: true },
    region: { type: String, required: true },
    showRemoveRecentCard: { type: Boolean, default: false },
    spendsAmount: { type: Number, required: true },
    spendVolume: { type: Number, required: false, default: 0 },
    pilot: { type: Boolean, default: false },
    isSME: { type: Boolean, default: false },
    smeSource: { type: String, default: "default" },
    supplier: { type: Object, required: true },
    showCloseAction: { type: Boolean, default: false },
    receivedName: { type: String, default: "" },
    // true / false only for potential suppliers; null for anything that cannot be pending
    isApprovedAndReadyToPublish: {
      type: Boolean as PropType<boolean | null>,
      default: null,
    },
  },
  emits: ["removedRecentCard", "openEntityModal"],
  setup(props, { emit }) {
    const entityCardStore = useEntityCardStore();
    const {
      user,
      isPilotAccount,
      useFeatureSME,
      useFeatureForecastVolume,
      userIsSuperAdmin,
      userSalesRoleEnabled,
      userDataRoleEnabled,
    } = useUser();
    const loadingData = ref(false);

    const ImagesErrorBoolean = ref(false);

    const spendVolumeToFixed = computed(() => { return StringUtils.formatBigNumbers(Number(props.spendVolume)) });

    /** checks if user has featureSME enabled */
    const smeFeatureEnabled = computed(() => {
      return useFeatureSME.value;
    })

    const isSuperAdmin = computed(() => {
      return user ? (user?.value?.isSuperAdmin ?? false) : false;
    });
    const logoUrlFromBucketS3 = computed(() => {
      if (props.logoUrl) {
        return getMediaUrl(props.logoUrl, ImageType.MEDIA);
      } else {
        imagesError(true);
        return "";
      }
    });

    const isAnPotentialEntity = computed(() => {
      if (
        props.companyType === "potential-supplier" ||
        props.companyType === "potential-parent"
      ) {
        return true;
      }
      return false;
    });

    /**
     * An unapproved potential supplier is only visible to the internal teams in the first place,
     * so the badge is both a status marker and a reminder of why a customer cannot see this card.
     * Keyed on an explicit `=== false` because null means "not applicable", not "pending".
     */
    const showPendingApprovalBadge = computed(() => {
      const isInternalUser =
        userIsSuperAdmin.value ||
        userSalesRoleEnabled.value ||
        userDataRoleEnabled.value;

      return (
        isInternalUser &&
        isAnPotentialEntity.value &&
        props.isApprovedAndReadyToPublish === false
      );
    });

    /**
     * Returns false if the user is a super admin.
     * Returns true if the user is a pilot account and the card is a pilot card.
     * else returns false
     */
    const notAvailableCard = computed(() => {
      if (user.value?.isSuperAdmin) {
        return false;
      }
      if (!isPilotAccount()) {
        return false;
      }
      return !props.pilot;
    });

    const letterOfDomain = computed(() => {
      if (props.name) {
        return props.name.substring(0, 1);
      }

      return "";
    });

    function imagesError(e: any) {
      ImagesErrorBoolean.value = !ImagesErrorBoolean.value;
    }

    /**
     * Retrieves the country name from the input string and returns it in title case.
     *
     * @param {string | null | undefined} country - the input string representing the country
     * @return {string} the country name in title case
     */
    function getCountry(country: string | null | undefined): string {
      if (country === null || country === undefined) {
        if (import.meta.env.DEV) {
          console.log(
            "** Error in get country. Country param is null or undefined",
            country,
          );
        }

        return "";
      }

      let str = country.split(" ");

      let countryName = "";

      str.forEach(function (section: any) {
        countryName +=
          section.charAt(0).toUpperCase() + section.substring(1) + " ";
      });

      return countryName;
    }

    // *** Negotiation Status ***

    const {
      negotiationStatusGetStatusTranslated,
      negotiationStatusGetPillColorClasses,
    } = useNegotiationStatus();

    const negotiationStatusFormatted = computed(() => {
      return negotiationStatusGetStatusTranslated(props.negotiationStatus);
    });

    const negotiationStatusPillColorClasses = computed(() => {
      return negotiationStatusGetPillColorClasses(props.negotiationStatus);
    });

    // *** END Negotiation Status ***

    // *** API Calls ***

    function postDeleteNewRecentEntityCard() {
      const params = {
        companyId: props.id,
        callbackSuccess: () => {
          emit("removedRecentCard", props.id);
        },
        callbackError: (callbackErrorData: any) => {
          if (import.meta.env.DEV)
            console.log(
              "** Error in deleteRecentEntityCard",
              callbackErrorData,
            );
        },
      };
      entityCardStore.postDeleteNewRecentEntityCard(params);
    }

    // *** END API Calls ***


    const setSMESource = computed(() => {
      return IsSMEUtils.generateSMESourceKey(props.smeSource)
    })

    
    const forecastValues = computed(() => {
      return calculateForecastValues(props.spendVolume, props.supplier.forecastVolume);
    });

    const foreCastComputedIfExists = computed(() => forecastValues.value.foreCastComputedIfExists);
    const forecastValueComputed = computed(() => forecastValues.value.forecastValueComputed);    
    const isForeCastPositiveValue = computed(() => forecastValues.value.isForeCastPositiveValue);
    const foreCastPercentageComputedBigNumbers = computed(() => forecastValues.value.foreCastPercentageComputedBigNumbers);

    //- Validate the role and the value to show the forecast
    const showForecastVolume = computed(() => {
      return useFeatureForecastVolume.value && foreCastComputedIfExists.value
    })




    return {
      fontIcons,
      getCountry,
      images,
      imagesError,
      ImagesErrorBoolean,
      isAnPotentialEntity,
      isSuperAdmin,
      showPendingApprovalBadge,
      letterOfDomain,
      loadingData,
      logoUrlFromBucketS3,
      negotiationStatusFormatted,
      negotiationStatusPillColorClasses,
      notAvailableCard,
      postDeleteNewRecentEntityCard,
      smeFeatureEnabled,
      spendVolumeToFixed,
      StringUtils,
      setSMESource,
      foreCastPercentageComputedBigNumbers,
      foreCastComputedIfExists,
      isForeCastPositiveValue,
      forecastValueComputed,      
      showForecastVolume,
    };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

// ? - Remove this when all views are updated
.card {
  padding: 0;
  margin-bottom: 16px;
  min-height: 297px;
  width: 100%;
}

.card-body {
  padding: 24px 24px 16px;
}

// For screens smaller than 1440px set min-height to 320px
@media (max-width: 1439px) {
  .card {
    min-height: 320px;
  }
}

// Apply cursor pointer to all elements inside card
.card.cursor-pointer * {
  cursor: pointer;
}

.card-type {
  width: 23%;
  text-align: center;
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
  line-height: 18px;
  text-transform: capitalize;
}

.original-name {
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 20px;
  color: $color-gray-500;
  flex: none;
  order: 0;
  flex-grow: 0;

  &.potential-type {
    color: #fff;
  }
}

.current-name {
  color: $color-gray-600;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  display: inline-block;
  max-width: 100%;

  &:not(.potential-type):hover {
    color: $color-primary-600;
  }

  &.potential-type {
    color: #fff;
  }
}

.d-flex.align-items-center.justify-content-between > :first-child {
  overflow: hidden;
  min-width: 0;
  flex: 1;
}

span.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

span.name-receivedName {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 100%;
}

.d-flex.gap-3.mb-2 > :last-child {
  overflow: hidden;
  min-width: 0;
  flex: 1;
}

span.buyer-item.my-1.mx-1 {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  max-width: 65%;
}

span.buyer-item.my-1.mx-1:hover {
  text-overflow: unset;
  overflow: unset;
  white-space: unset;
  max-width: 65%;
}

.buyers-label,
.country-label {
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 20px;
  color: $color-gray-500;
  flex: none;
  order: 0;
  flex-grow: 0;

  &.potential-type {
    color: #fff;
  }
}

.negotiated {
  border-right: 6px solid $color-green;
}

.partially_negotiated {
  border-right: 6px solid $color-orange;
}

.circle {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 10px;
  gap: 10px;
  width: 35px;
  height: 35px;
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

.card:hover .remove-card {
  opacity: 1;
}

.remove-card {
  position: relative;
  top: -15px;
  font-size: 24px;
  color: $color-gray-400;
  cursor: pointer;
  opacity: 0;

  &:hover {
    color: $color-gray-600;
  }

  &.potential {
    color: #fff;
  }
}

.card-names {
  width: 80%;
}

.remove-recent {
  position: absolute;
  top: 10px;
  right: 15px;
}

.forecast-icon-wrapper,
#foreCastComputed {
  order: 2;
}

// Amber on the dark ($color-gray-700) potential card, so the badge reads as a warning
// without competing with the negotiation-status pill at the bottom of the card.
.pending-approval-badge {
  flex: none;
  white-space: nowrap;
  border-radius: 16px;
  font-weight: 600;
  background-color: $color-warning-100;
  color: $color-warning-800;
}

</style>
