<template>
<td :class="sticky ? 'k-grid-content-sticky' : ''">
  <div
    class="row d-flex align-items-center" :class="{ 'cursor-pointer': isPilotAcountComputed }"
    @click="openEntityModal"
  >
    <div class="col-1">
      <img
        v-if="!letterAsIcon.value"
        :alt="getLetterAsIcon()"
        :src="domainForIcon()"
        style="width: 40px; height: 40px; min-width: 40px; min-height: 40px; object-fit:contain ;  object-position: center;"        
        @error="onIconFails()"
      />
      <div
        v-if="letterAsIcon.value && getLetterAsIcon() !== false"
        :class="{ 'text-as-logo-circle': letterAsIcon.value }"
      >
        <span
          v-if="letterAsIcon.value && getLetterAsIcon() !== false"
          class="text-capitalize font-weight-bold"          
          >{{ getLetterAsIcon() }}</span
        >
      </div>
    </div>
    <div class="col-11">
      <Tooltip
        v-if="behavior === 'provider' && forSupplier"
        class="ellipsis_tooltip_custom_text"
        :open-delay="100"
        :anchor-element="'target'"
        :position="'bottom'"
      >
        <p
          v-if="returnEntityTypeValue(dataItem.entityType) !== '-'"
          :title="returnEntityTypeValue(dataItem.entityType)"
          class="pt-3 space-between-img-and-text ellipsis_custom_with_image"
          :class="{ 'cursor-pointer': isPilotAcountComputed }"
        >
          {{ returnEntityTypeValue(dataItem.entityType) }}
        </p>
        <p v-else class="pt-3 ml-5 ellipsis_custom_with_image">-</p>
      </Tooltip>

      <Tooltip
        v-else-if="behavior === 'provider'"
        class="ellipsis_tooltip_custom_text"
        :open-delay="100"
        :anchor-element="'target'"
        :position="'bottom'"
      >
        <p
          v-if="returnEntityTypeValue(dataItem.entityType) !== '-'"
          :title="returnEntityTypeValue(dataItem.entityType)"
          class="pt-3 space-between-img-and-text ellipsis_custom_with_image"
          :class="{ 'cursor-pointer': isPilotAcountComputed }"
        >
          {{ dataItem.provider.name ?? "-" }}
        </p>
        <p v-else class="pt-3 ml-5 ellipsis_custom_with_image">-</p>
      </Tooltip>

      <Tooltip
        v-else-if="behavior === 'buyer'"
        class="ellipsis_tooltip_custom_text"
        :open-delay="100"
        :anchor-element="'target'"
        :position="'bottom'"
      >
        <p
          v-if="returnEntityTypeValue(dataItem.entityType) !== '-'"
          :title="returnEntityTypeValue(dataItem.entityType)"
          class="pt-3 space-between-img-and-text ellipsis_custom_with_image"
          :class="{ 'cursor-pointer': isPilotAcountComputed }"
        >
          {{
            dataItem.buyer.name
              ? dataItem.buyer.name
              : dataItem.buyer.list ?? "-"
          }}
        </p>
        <p v-else class="pt-3 ml-5 ellipsis_custom_with_image">-</p>
      </Tooltip>

      <Tooltip
        v-else-if="behavior === 'providerParent'"
        class="ellipsis_tooltip_custom_text"
        :open-delay="100"
        :anchor-element="'target'"
        :position="'bottom'"
      >
        <p
          v-if="returnEntityTypeValue(dataItem.entityType) !== '-'"
          :title="returnEntityTypeValue(dataItem.entityType)"
          class="pt-3 space-between-img-and-text ellipsis_custom_with_image"
        >
          {{ dataItem.providerParent.name ?? "-" }}
        </p>
        <p v-else class="pt-3 ml-5 ellipsis_custom_with_image">-</p>
      </Tooltip>

      <Tooltip
        v-else
        class="ellipsis_tooltip_custom_text"
        :open-delay="100"
        :anchor-element="'target'"
        :position="'bottom'"
      >
        <p
          v-if="returnEntityTypeValue(dataItem.entityType) !== '-'"
          :title="returnEntityTypeValue(dataItem.entityType)"
          class="pt-3 space-between-img-and-text ellipsis_custom_with_image"
        >
          {{ dataItem.providerParent.name ?? "-" }}
        </p>
        <p v-else class="pt-3 ml-5 ellipsis_custom_with_image">-</p>
      </Tooltip>
    </div>
  </div>
</td>
</template>

<script lang="ts">
import { computed, defineComponent, reactive } from "vue";
import { getNestedValue } from "@progress/kendo-vue-grid";
import { getMediaUrl } from "@/services/media/mediaActions";
import { ImageType } from "@/services/media/mediaTypes";
import { useI18n } from "vue-i18n";
import { Tooltip } from "@progress/kendo-vue-tooltip";
import { removeIRI, StringUtils } from "@/utils";
import { useEntityCardStore } from '@/stores/entityCard';
import * as calculateLimitText from "@/utils/gridCellRelated";
import { useUser } from "@/composables";
export default defineComponent({
name: "CompanyAbstractInfoColumn",
components: {
  Tooltip
},
props: {
  companyType: { type: String, required: false, default: "" },
  dataItem: { type: Object, required: true },
  field: { type: String, required: true },
  forSupplier: { type: Boolean, required: false, default: false },
  behavior: { type: String, default: "Parent" },
  sticky: { type: Boolean, required: false, default: false },
  forPlanEdit: { type: Boolean, required: false, default: false },
  gridLevel: { type: String, required: false, default: "" },
  entireData: { type: Array, required: true }
},
emits: ["change-tab"],
setup(props, { emit }) {
  const { isPilotAccount } = useUser();
  const entityCardStore = useEntityCardStore();
  const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
  const letterAsIcon = reactive({
    value: false
  });

  function domainForIcon() {
    if (props.behavior === "buyer") {
      return getMediaUrl(props.dataItem.buyer.iconUrl, ImageType.MEDIA);
    }

    if (props.behavior === "providerParent") {
      return getMediaUrl(
        props.dataItem.providerParent.iconUrl,
        ImageType.MEDIA
      );
    }

    if (props.behavior === "provider") {
      return getMediaUrl(props.dataItem.provider.iconUrl, ImageType.MEDIA);
    }
  }

  function returnEntityTypeValue(entityType: string) {
    if (props.behavior === "providerParent") {
      return props.dataItem.providerParent.name ?? "-";
    }
    if (entityType === "parent") {
      return props.dataItem.provider.name ?? "-";
    } else {
      if (
        props.dataItem.provider.name !== null ||
        props.dataItem.provider.name !== undefined
      ) {
        return (
          props.dataItem.provider.name +
          " " +
          translate.t("global.supplierType")
        );
      } else {
        return "-";
      }
    }
  }

  function getLetterAsIcon() {
    const abstractCompanyStruct = getNestedValue(
      props.behavior,
      props.dataItem
    );
    if (
      abstractCompanyStruct !== undefined &&
      abstractCompanyStruct !== null
    ) {
      const name = abstractCompanyStruct.name;

      const list = abstractCompanyStruct.list;
      if (list !== undefined && list !== null) {
        return false;
      }

      if (name !== undefined && name !== null) {
        return name.substring(0, 1);
      }

      return false;
    }
  }

  function onIconFails() {
    letterAsIcon.value = true;
  }

  function setEntityDetails(dataItem:any, isParent = false, removeIRI = false) {
    const companyId = removeIRI
      ? StringUtils.removeIRI(dataItem.provider["@id"])
      : dataItem.provider["@id"];
    const domain = isParent
      ? dataItem.providerParentDomain
      : dataItem.provider.domain;

    entityCardStore.setSelectedEntity({
      companyId: companyId,
      domain: domain,
      spendVolume: dataItem.spendVolume,
      country: dataItem.countryName,
      negotiationStatus: dataItem.negotiationStatus
    });

    entityCardStore.setIsModalEntityShowing(true);
  }

  function changeTabIndex(dataItem:any, entireData:any) {
    let index = entireData.findIndex(
      (item:any) => item["uuid"] === dataItem["uuid"]
    );
    emit("change-tab", index + 1);
  }

  function openEntityModal() {
    if (isPilotAccount()) {
      if (true) {
        // Do nothing, return
        return;
      } else {
        // Call the same logic as below
        if (props.companyType) {
          if (props.behavior !== "buyer") {
            if (props.companyType === "parent") {
              setEntityDetails(props.dataItem, true);
            }
            if (props.companyType === "supplier") {
              changeTabIndex(props.dataItem, props.entireData);
            }
          }
        } else {
          if (props.behavior !== "buyer") {
            if (
              props.dataItem.level === "spend" ||
              props.dataItem.level === "supplier"
            ) {
              setEntityDetails(props.dataItem, false, true);
            }
          }
        }
      }
    } else {
      if (props.companyType) {
        if (props.behavior !== "buyer") {
          if (props.companyType === "parent") {
            setEntityDetails(props.dataItem, true);
          }
          if (props.companyType === "supplier") {
            changeTabIndex(props.dataItem, props.entireData);
          }
        }
      } else {
        if (props.behavior !== "buyer") {
          if (
            props.dataItem.level === "spend" ||
            props.dataItem.level === "supplier"
          ) {
            setEntityDetails(props.dataItem, false, true);
          }
        }
      }
    }
  }

  const isPilotAcountComputed = computed(() => {
    return isPilotAccount()
  })

  return {
    calculateLimitText,
    domainForIcon,
    isPilotAcountComputed,
    getLetterAsIcon,
    getMediaUrl,
    ImageType,
    letterAsIcon,
    onIconFails,
    openEntityModal,
    returnEntityTypeValue
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
cursor: pointer;
}
</style>
