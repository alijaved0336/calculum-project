<template>
  <div class="p-4">
    <!-- Header -->
    <slot name="header"></slot>

    <div class="row mx-auto justify-content-center w-4/5">
      <div v-for="(item, index) in items" :key="index" class="col-4 py-2">
        <div @click="$emit('checked-items-changed', item.key)"
          class="icon-box-container d-flex flex-column align-items-center rounded-lg p-2 border border-gray-300 transition-colors cursor-pointer"
          :class="item.checked ? 'bg-primary-400 text-white-0' : 'bg-white text-gray-500'">

          <!-- Dinamically loads the right icon -->
          <div class="icon-box">
            <component :is="item.iconName" class="cursor-pointer" />          
          </div>

          <p class="mb-0 text-center text-sm cursor-pointer line-height-normal">{{ item.value }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";
import IconEthnicMinorityOwned from '@/resources/assets/images/icons/iconEthnicMinorityOwned.vue'
import IconCorporation from "@/resources/assets/images/icons/IconCorporation.vue";
import IconLargeEnterprise from "@/resources/assets/images/icons/IconLargeEnterprise.vue";
import IconMedEnterprise from "@/resources/assets/images/icons/IconMedEnterprise.vue";
import IconMidMarketEnterprise from "@/resources/assets/images/icons/IconMidMarketEnterprise.vue";
import IconSmEnterprise from "@/resources/assets/images/icons/IconSmEnterprise.vue";
import IconVeteranOwned from '@/resources/assets/images/icons/iconVeteranOwned.vue'
import IconWomanOwned from '@/resources/assets/images/icons/iconWomenOwned.vue'
import IconEmerging from '@/resources/assets/images/icons/IconEmerging.vue'

export default defineComponent({
  name: "CardsOption",
  components: {
    IconEthnicMinorityOwned,
    IconCorporation,
    IconLargeEnterprise,
    IconMedEnterprise,
    IconMidMarketEnterprise,
    IconSmEnterprise,
    IconVeteranOwned,
    IconWomanOwned,
    IconEmerging
  },
  props: {
    items: {
      type: Array as PropType<Partial<{
        key: string;
        value: string;
        iconName: string;
        checked: boolean;
      }>[]>,
      required: false,
      default: []
    }
  },
  emits: ["checked-items-changed"],
});
</script>

<style scoped>
.line-height-normal {
  line-height: normal;
}

.icon-box-container {
  min-height: 105px;
}

.icon-box {
  width: 36px;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>