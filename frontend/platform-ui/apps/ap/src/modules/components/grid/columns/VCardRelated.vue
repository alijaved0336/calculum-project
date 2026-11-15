<template>
  <td
    v-if="vCardGroupName"
    class="text-center group-name-td"
  >
    <div
      class="d-flex align-items-center justify-content-center full-width-container"
    >
      <tooltip :open-delay="100" :anchor-element="'target'" :position="'top'">
        <span v-if="dataItem.vCardGroupName" class="finan-style" :style="buttonStyle" :title="badgeVisual.name" >{{ badgeVisual.name }}</span>
      </tooltip>
     
      <!-- if no group name-->
      <span
        v-if="!dataItem.vCardGroupName"
        class="text-center w-100"
      >
        -
      </span>
      <!-- if there are remaining groups which is split by '|' -->      
      <span        
        v-if="remainingGroups > 0"
        class="group-count-circle bg-gray-200 font-medium"
      >
        +{{ remainingGroups }}
      </span>
    </div>
  </td>
  <td
    v-if="vCardAcceptanceType"
    class="text-center"
  >
    <span>
      {{
        dataItem.vCardAcceptanceType
          ? getvCardAcceptanceTypeString(dataItem.vCardAcceptanceType)
          : "-"
      }}
    </span>
  </td>
  <td
    v-if="vCardGroupRebate"
    class="text-right"
  >
    {{ getPercentForVCardGroupRebate() }}
  </td>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import * as colorsGroups from "@/utils/ColorsGroups";
import * as formatData from "@/utils/FormatData";
import { useI18n } from "vue-i18n";
import { Tooltip } from '@progress/kendo-vue-tooltip'
import { getNestedValue } from "@progress/kendo-vue-grid";

export default defineComponent({
  name: "VCardRelated",
  components: {  tooltip: Tooltip },
  props: {
    dataItem: { type: Object, default: null },
    vCardGroupName: { type: Boolean, default: false },
    vCardGroupRebate: { type: Boolean, default: false },
    vCardAcceptanceType: { type: Boolean, default: false },
    itemIndex: { type: Number, default: 0, required: false },
    field: { type: String, required: true },
  },
  setup(props) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });

    const remainingGroups = computed(() => {
      // Use actual data for itemIndex > 0 or a hardcoded example for testing
      const vCardGroupName = props.dataItem?.vCardGroupName ?? "";

      // Split by "|" and filter out empty groups
      const splitGroups =
        vCardGroupName?.split("|").filter((group: string) => group.trim()) ||
        [];

      // Return the number of groups after the first one
      return splitGroups.length > 1 ? splitGroups.length - 1 : 0;
    });

    const getVCardGroupName = (vCardGroupName: string | null | undefined) => {
      if (!vCardGroupName || vCardGroupName.trim() === "") {
        return "-";
      }

      let splitgroups = vCardGroupName.split("|");
      return splitgroups[0];
    };

    const groupColors = [
      colorsGroups.firstGroup,
      colorsGroups.secondGroup,
      colorsGroups.thirdGroup,
      colorsGroups.fourthGroup,
    ];
    const backgroundColor = computed(
      () => groupColors[props.itemIndex % groupColors.length],
    );

    const textColor = computed(() => {
      return formatData.colorText(backgroundColor.value);
    });

    const badgeVisual = computed(() => ({
      name: getVCardGroupName(props.dataItem.vCardGroupName),
      backgroundColor: backgroundColor.value,
      textColor: textColor.value,
    }));

    const buttonStyle = computed(() => {
      const bgColor = props.dataItem.vCardColor ? props.dataItem.vCardColor.split("|")[0] : badgeVisual.value.backgroundColor;
      const textColor = props.dataItem.vCardColor ? formatData.colorText(props.dataItem.vCardColor.split("|")[0]) : badgeVisual.value.textColor;

      return {
        background: bgColor,
        color: textColor,        
        border: "none",
        cursor: "default",
      };
    });

    function getPercentForVCardGroupRebate() {

      const value = getNestedValue(props.field, props.dataItem);


      if (
        value === null ||
        value === undefined
      ) {
        return "-";
      } else {
        let val = value;

        if (props.field === "vCardGroupRebate") {
          return formatData.getNumberWithDecimals(val, 2) + "%";          
        } else {
          return formatData.converToPercentage(val);
        }
      }
    }

    function formatedCurrency(cashValue: number) {
      if (cashValue == null || cashValue === undefined || isNaN(cashValue)) {
        return "-";
      }
      return formatData.getNumberWithDecimals(cashValue, 1);
    }

    function getvCardAcceptanceTypeString(
      vCardAcceptanceType: string | null | undefined,
    ) {
      if (!vCardAcceptanceType) {
        return "-";
      }
      const types = vCardAcceptanceType.split("|");
      if (types.length > 1) {
        return translate.t("global.multiple");
      }
      return types[0];
    }

    return {
      badgeVisual,
      buttonStyle,
      formatData,
      formatedCurrency,
      getPercentForVCardGroupRebate,
      getvCardAcceptanceTypeString,
      remainingGroups,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors";
.button-pill {
  min-height: 40px;
  max-height: 40px;
  width: 260px; /* Fixed width for the pill button */
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50px;
  padding: 5px 10px; /* Consistent padding */
  border: none;
  cursor: pointer;
}

.group-count-circle {
  flex-shrink: 0;
  width: 40px; /* Fixed width for the circle */
  height: 40px;
  border-radius: 50%;
  display: flex;
  color: #000;
  align-items: center;
  justify-content: center;
  margin-left: -1rem;
  // position: absolute; /* Change to absolute for better overlap control */
  // right: calc(-0.5rem); /* Adjust the position for the circle, so it overlaps the button */
}

.full-width-container {
  width: 260px; /* Ensure total width remains 260px */
  display: flex;
  justify-content: flex-start;
  position: relative;
}

.group-name-td {
  width: 260px; /* Keep the td element width consistent */
}
</style>
