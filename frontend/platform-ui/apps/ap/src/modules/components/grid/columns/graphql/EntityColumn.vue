<template>
<td :class="field === 'entityName' ? 'k-grid-content-sticky' : ''">
  <div
    class="row d-flex align-items-center"
    :class="field !== 'buyerName' ? (isDisabled || disableClick ? '' : 'cursor-pointer') : ''"
    @click="openEntityModal"
  >
   <!-- Entity Img -->
    <div
      v-if="hasName()"
      class="col-1"
      :class="
        field !== 'buyerName' ? (isDisabled || disableClick ? '' : 'cursor-pointer') : ''
      "
    >
      <img
        v-if="hasIconUrl() && showLogo"
        :alt="getValue()"
        :src="domainForIcon()"
        class="entity-logo-img"
        style="width: 40px; height: 40px; min-width: 40px; min-height: 40px; object-fit:contain ;  object-position: center; background-color: #98a2b3;"
        @error="handleImageError"
      />
      <div
        v-else
        :class="{ 'cursor': isDisabled || !disableClick }"
      >
        <span class="text-capitalize font-weight-bold text-as-logo-circle">
          {{ getFirstLetter() }}
        </span>
      </div>
    </div>

    <!-- Entity Name -->
    <div
      class="col-11"
      :class="
        field !== 'buyerName' ? (isDisabled || disableClick ? ' ' : 'cursor-pointer') : ' '
      "
    >
      <Tooltip
        v-if="!isDisabled"
        class="ellipsis_tooltip_custom_text"
        :open-delay="100"
        :anchor-element="'target'"
        :position="'bottom'"
      >
        <p
          :title="isPilotAccount() ? '' : getValue() + printSupplier()"
          class="pt-3 space-between-img-and-text ellipsis_custom_with_image"
          :class="field !== 'buyerName' && !disableClick ? 'cursor-pointer' : ''"
        >
          {{ getValue() }} {{ printSupplier() }}
        </p>
      </Tooltip>

      <p
        v-else
        class="pt-3 space-between-img-and-text ellipsis_custom_with_image"
        :class="
          field !== 'buyerName' ? (isDisabled || disableClick ? '' : 'cursor-pointer') : ''
        "
      >
        {{ getValue() }} {{ printSupplier() }}
      </p>
    </div>
  </div>
</td>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, ref } from "vue";
import { getMediaUrl } from "@/services/media/mediaActions";
import { getNestedValue } from "@progress/kendo-vue-grid";
import { ImageType } from "@/services/media/mediaTypes";
import { StringUtils } from "@/utils";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { useEntityCardStore } from '@/stores/entityCard';
import { useUser } from "@/composables";
import * as calculateLimitText from "@/utils/gridCellRelated";

export default defineComponent({
name: "EntityColumn",
components: {
  Tooltip
},
props: {
  companyType: { type: String, required: false, default: "supplier" },
  dataItem: { type: Object, required: true },
  field: { type: String, required: true },
  forSupplier: { type: Boolean, default: false },
  isForParent: { type: Boolean, default: false },
  sticky: { type: Boolean, default: false },
  tab: { type: Number, default: 0 },
  levelOfGrid: { type: String, required: false, default: "spends" },
  childGridExpanded: { type: Boolean, required: false, default: false },
  restrictModal: { type: Boolean, required: false, default: false },
  disableClick: { type: Boolean, required: false, default: false }
},
emits: ["change-tab"],
setup(props, { emit }) {
  const { isPilotAccount, user } = useUser();
  const entityCardStore = useEntityCardStore();
  const letterAsIcon = reactive({
    value: false
  });

  const name = reactive({
    value: ""
  });

  const showLogo = ref(true)
  /**
   * disables the ui if disables , such as tooltip
   * hide the tooltip for entities which
   * are not part of the pilot account
   */
  const isDisabled = computed(() => {
    // Do not hide tooltip for super admin users
    if (user?.value?.isSuperAdmin) {
      return false;
    }

    if (props.restrictModal) {
      return true
    }

    if (isPilotAccount() && !props.dataItem.isPilot) {
      return true;
    }

    // Default is not to hide the tooltip
    return false;
  });

  function hasIconUrl() {
    if (props.field === "entityName") {
      return props.dataItem.entityMediaPath !== null;
    }
    if (props.field === "parentName") {
      return props.dataItem.parentLogoPath !== null;
    }

        return false;
  }

  function domainForIcon() {
    if (props.field === "entityName") {
      return getMediaUrl(props.dataItem.entityMediaPath, ImageType.MEDIA);
    }
    if (props.field === "parentName") {
      return getMediaUrl(props.dataItem.parentLogoPath, ImageType.MEDIA);
    }
    return "";
  }

  function getValue() {
    const value = getNestedValue(props.field, props.dataItem);
    if (value !== undefined && value !== null) {
      return value;
    } else {
      return "-";
    }
  }

  function hasName() {
    const value = getNestedValue(props.field, props.dataItem);
    if (value !== undefined && value !== null) {
      return true;
    } else {
      return false;
    }
  }

  function getFirstLetter() {
    const value = getValue();
    return value.substring(0, 1);
  }

  function printSupplier() {
    if (props.field === "entityName") {
      if (
        props.isForParent === true &&
        props.dataItem.entityType === "supplier"
      ) {
        return "(Supplier)";
      } else {
        return "";
      }
    } else {
      return "";
    }
  }

  /**
   * this open an entity modal when user clicks inside the column grid cell
   * if user is super admin, it will always allow to open modal
   * if user is not super admin , and under pilot company account,
   * this will depend in user is click on the actual level entity of that supplier, parent entities will be blocked, unless you are on parent level and clikcing the entity directly
   * default behavior, is everthing is available to the user, the modal opens directly
   */

  function openEntityModal(): void {

    if (props.disableClick) {
      return
    }

    if (user && user.value?.isSuperAdmin) {
      modalHelper();
    }

    if (isPilotAccount()) {
      // Parents will be disabled in supplier and spend levels
      if (props.childGridExpanded) {
        let allowToOpenModal = props.tab === 2 || props.tab === 1;
        if (!allowToOpenModal) {
          modalHelper();
        }
      } else {
        if (props.dataItem.isPilot && !props.restrictModal) {
          modalHelper();
        }
      }
    } else {
      // Default action
      modalHelper();
    }
  }

  /**
   * Helper function to handle modal functionality.
   *
   * This function is responsible for setting the selected entity and showing the modal based on the provided props.
   * It checks the value of `props.companyType` and `props.field` to determine the appropriate action.
   *
   * If `props.companyType` is equal to 'parent', it sets the selected entity using the `setSelectedEntity` mutation from the Vuex store and shows the modal using the `setIsModalEntityShowing` mutation.
   * If `props.companyType` is equal to 'supplier', it emits the 'change-tab' event with the value of `Number(props.dataItem.spenAlias.split(' ')[1])`.
   *
   * If `props.field` is equal to 'entityName', it sets the selected entity using the `setSelectedEntity` mutation from the Vuex store and shows the modal using the `setIsModalEntityShowing` mutation.
   * If `props.field` is equal to 'parentName' and `props.dataItem.parentUuid` is truthy, it sets the selected entity using the `setSelectedEntity` mutation from the Vuex store and shows the modal using the `setIsModalEntityShowing` mutation.
   *
   * @return {void}
   */
  function modalHelper(): void {
    if (!StringUtils.isNullUndefinedOrEmpty(props.companyType)) {
      if (props.companyType === "parent") {
        // Set selected entity
        entityCardStore.setSelectedEntity({
          companyId: props.dataItem.parentUuid,
          domain: props.dataItem.domain,
          spendVolume: props.dataItem.volume,
          country: props.dataItem.countryName,
          negotiationStatus: props.dataItem.negotiationStatus
        });

        // Show modal
        entityCardStore.setIsModalEntityShowing(true);
      }
      if (props.companyType === "supplier") {
        emit(
          "change-tab",
          Number(props.dataItem?.spenAlias?.split(" ")[1] || 0)
        );
      }

      return;
    }

    if (props.field === "entityName") {
      entityCardStore.setSelectedEntity({
        companyId: props.dataItem.entityUuid,
        domain: props.dataItem.domain,
        spendVolume: props.dataItem.volume,
        country: props.dataItem.countryName,
        negotiationStatus: props.dataItem.negotiationStatus
      });

      entityCardStore.setIsModalEntityShowing(true);
    }

    if (
      props.field === "parentName" &&
      props.dataItem.parentUuid
    ) {
      entityCardStore.setSelectedEntity({
        companyId: props.dataItem.parentUuid,
        domain: props.dataItem.domain,
        spendVolume: props.dataItem.volume,
        country: props.dataItem.countryName,
        negotiationStatus: props.dataItem.negotiationStatus
      });
      entityCardStore.setIsModalEntityShowing(true);
    }
  }

  function handleImageError() {
    showLogo.value = false    
  }

  return {
    calculateLimitText,
    domainForIcon,
    getMediaUrl,
    ImageType,
    isDisabled,
    letterAsIcon,
    name,
    hasName,
    hasIconUrl,
    getValue,
    getFirstLetter,
    openEntityModal,
    printSupplier,
    isPilotAccount,
    handleImageError,
    showLogo
  };
}
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";

.space-between-img-and-text {
margin-left: 1.57rem;
}

.text-as-logo-circle {
min-width: 40px;
max-width: 40px;
height: 40px;
-moz-border-radius: 50%;
-webkit-border-radius: 50%;
border-radius: 50%;
background: $color-gray-300;
border-width: 3px;
display: flex;
align-items: center;
justify-content: center;

&.cursor{
  cursor: pointer;
}
}
</style>
