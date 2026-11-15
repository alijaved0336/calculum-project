<template>
<div class="d-flex flex-column statuses-cards" :class="`${info.key}-class`">
  <div class="d-flex vertical-aligments-center"><span class="text-base font-bold mr-2">{{ $t(`home.manageModule.${info.key}`) }}</span><span class="badge-number">{{ info.number > 99 ? `+` : ``}}{{`${info.number} ${levelOfGrid}`}}</span></div>
  <div class="row">
    <div  :class="isVcardEnabled ? 'col-sm-12 col-md-12 col-lg-6 col-xl-6' : 'col-12' " class="d-flex flex-column"><span class="text-sm center-text status-text title-section">{{ $t(`home.manageModule.${negotiationStatus}Type`) }}</span><span class="text-3xl font-bold center-text">{{ info.value }}</span></div>
    <div v-if="isVcardEnabled" class="col-sm-12 col-md-12 col-lg-6 col-xl-6 d-flex flex-column"><span class="text-sm center-text status-text title-section">{{ $t(`home.manageModule.${negotiationStatus}RebateType`) }}</span><span class="text-3xl font-bold center-text">{{ info.valueRebate }}  </span></div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'StatusesCards',
  props: {
    info: { type: Object, required: true },
    negotiationStatus: { type: String, default: 'cashFlow' },
    levelOfGrid: { type: String, default: '-' },
    isVcardEnabled: { type: Boolean, required: false }
  }
})
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

.statuses-cards {
  // Matches the item-list card's fixed width one column below (CardsByStatus.vue's
  // `.card`, inside StatusesCardsScroll.vue's `.statuses-scroll-cards`), which is
  // always inset by 0.5rem — the scroll container's own `padding-right`, reserved for
  // its scrollbar. This card has no scrollbar of its own, so it's shrunk to match
  // rather than inflating the scroll container to reclaim that space.
  width: calc(100% - 0.5rem);
  border-radius: 8PX;
  gap: 10px;
  padding: 0.75rem 0.75rem;
  color: #ffffff;

  @media screen and (max-width: 1295px) {
    height: 150px;
  }
}

.center-text {
  text-align: center;
}





.status-text {
  @media screen and (max-width: 1440px) {
    font-size: 0.75rem !important;
  }
}

.title-section {
  @media screen and (max-width: 1379px) {
    height: 40px;
  }
}

.badge-number {
  background: rgba(242, 244, 247, 0.30);
  padding: 2px 6px;
  border-radius: 1rem;
  font-size: 12px;
  text-align: center;
}
</style>
