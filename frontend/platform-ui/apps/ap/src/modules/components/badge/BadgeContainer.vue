<template>
<div class="d-flex align-items-center justify-content-between badge_container">
  <div class="d-flex align-items-center" @click="$emit('edit-item', ruleObj)">
    <Tooltip class="ellipsis" :open-delay="100" :anchor-element="'target'" :position="'top'">
      <div class="d-flex align-items-center"><span class="ml-1 ellipsis_p" :title="BadgeRelated.showValues(ruleObj)"><span class="field_title mr-2" :title="BadgeRelated.showValues(ruleObj)">{{BadgeRelated.showTitle(ruleObj)}}</span>{{BadgeRelated.showValues(ruleObj)}}</span></div>
    </Tooltip>
  </div>
  <iconClose class="remove_icon_badge_container ml-2" @click="$emit('remove-item', ruleObj, index)"></iconClose>
</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import iconClose from "@/resources/assets/images/icons/iconClose.vue";
import * as BadgeRelated from "@/utils/BadgeRelated";

export default defineComponent({
  name: "BadgeContainer",
  components: {
    iconClose,
  },
  props: {
    ruleObj: { type: Object, required: true },
    index: { type: Number, required: true }
  },
  emits: ["edit-item", "remove-item"],
  setup(props, { emit }) {
    return {
      BadgeRelated,
    };
  },
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/_colors.scss";
</style>
