<template>
<div class="d-flex" v-if="typeBoxes === 'cashFlow' && validBoxes.length > 0">
  <Tooltip :open-delay="50" :anchor-element="'target'" :position="'bottom'">
    <div class="d-flex align-items-center box-badges gap-2" v-for="box in validBoxes" :key="box.id" :id="`cfbox${box.id}`" :title="`${$t('global.boxes.cashFlow')} ${box.id}`">
      <BoxImage boxType="cashFlow" :boxId="box.id" :title="`${$t('global.boxes.cashFlow')} ${box.id}`" :tool-tip-text="`${$t('global.boxes.cashFlow')} ${box.id}`"></BoxImage><span :title="`${$t('global.boxes.cashFlow')} ${box.id}`">{{ $t("global.box") + " " + box.id }}</span>
    </div>
  </Tooltip>
</div>
<div class="d-flex" v-if="typeBoxes === 'financing' && validBoxes.length > 0">
  <Tooltip :open-delay="50" :anchor-element="'target'" :position="'bottom'">
    <div class="d-flex align-items-center box-badges gap-2" v-for="box in validBoxes" :key="box.id" :id="`financingbox${box.id}`">
      <BoxImage boxType="financing" :boxId="box.id" :title="`${$t('global.boxes.financing')} ${box.id}`" :tool-tip-text="`${$t('global.boxes.financing')} ${box.id}`">   </BoxImage><span :title="`${$t('global.boxes.financing')} ${box.id}`">{{ $t("global.box") + " " + box.id }}        </span>
    </div>
  </Tooltip>
</div>
<div class="d-flex" v-if="typeBoxes === 'scf9Box' && validBoxes.length > 0">
  <Tooltip :open-delay="50" :anchor-element="'target'" :position="'bottom'">
    <div class="d-flex align-items-center box-badges gap-2" v-for="box in validBoxes" :key="box.id" :id="`scf9Box${box.id}`">
      <BoxImage boxType="scf9Box" :boxId="box.id" :title="`${$t('global.boxes.scf9Box')} ${box.id}`" :tool-tip-text="`${$t('global.boxes.scf9Box')} ${box.id}`">   </BoxImage><span :title="`${$t('global.boxes.scf9Box')} ${box.id}`">{{ $t("global.box") + " " + box.id }}        </span>
    </div>
  </Tooltip>
</div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import BoxImage from "@/modules/home/entityCard/components/BoxImage.vue";
import { Tooltip } from "@progress/kendo-vue-tooltip";
export default defineComponent({
  name: "NineboxesBadges",
  components: {
    BoxImage,
    Tooltip
  },
  props: {
    infoBoxes: {
      type: Array as () => Array<number | string>, // Handle both numbers and strings
      required: true,
      default: () => []
    },
    typeBoxes: { type: String, required: true, default: "" }
  },
  setup(props) {
    const validBoxes = computed(() => {
      // Ensure that infoBoxes contains valid entries and filter out empty strings and invalid values
      return props.infoBoxes
        .filter(box => box !== "") // Filter out empty strings
        .map(box => ({ id: box }));
    });

    return {
      validBoxes
    };
  }
});
</script>
