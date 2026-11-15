<template>
<div class="d-flex flex-column">
  <ArcGauge class="mb-2" :value="percentage" :colors="colors" :center-render="'extraData'">
    <template #extraData="{ props }">
      <div class="row">
        <div class="col-12">
          <div class="d-flex flex-column" v-if="showSkeleton || activeSkeleton">
            <Skeleton class="skeletons-bg" :shape="'text'"></Skeleton>
            <Skeleton class="skeletons-bg" :shape="'text'"></Skeleton>
          </div>
          <div class="d-flex flex-column" v-else><span class="text-sm font-medium text-gray-500">{{ percentage === null ? `0` : `${percentage}%` }} </span><span class="text-5xl text-3xl font-semibold text-gray-700">{{ middleNumber }}</span></div>
        </div>
      </div>
    </template>
  </ArcGauge>
  <div class="d-flex justify-content-between bottom-section" :class="cardsInARowCountClass">
    <div class="d-flex flex-column label-left gap-2">
      <SkeletonRectangle v-if="showSkeleton || activeSkeleton"></SkeletonRectangle><span class="font-semibold text-gray-700 text-xl" v-else> {{ result }}</span><span class="text-gray-500 text-xs">{{ startTitle }}</span>
    </div>
    <div class="d-flex flex-column label-right gap-2">
      <SkeletonRectangle v-if="showSkeleton || activeSkeleton"></SkeletonRectangle><span class="font-semibold text-gray-700 text-xl" v-else>{{ target }}</span><span class="text-gray-500 text-xs">{{ $t('home.plan.planPhase.target') }}  </span>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, computed, ComputedRef } from "vue";

import { ArcGauge } from "@progress/kendo-vue-gauges";
import SkeletonRectangle from "@/modules/home/components/skeletons/SkeletonRectangle.vue";

export default defineComponent({
  name: "GeneralGaugeBar",
  components: { ArcGauge, SkeletonRectangle },
  props: {
    title: { type: String, required: true, default: "" },
    result: { type: Number, required: true, default: 0 },
    target: { type: String, required: true, default: "0" },
    percentage: { type: Number, required: true, default: 0 },
    middleNumber: { type: String, required: true, default: "0" },
    showSkeleton: { type: Boolean, required: true, default: true },
    activeSkeleton: { type: Boolean, required: true, default: true },
    cardsInARowCount: { type: Number, default: 4 },
    startTitle: { type: String, required: false, default: "Contractual" },
  },
  setup(props) {
    interface DataInterface {
      colors: {
        color: string;
      }[];
    }

    const data = reactive<DataInterface>({
      colors: [
        {
          color: "#2e90fa",
        },
      ],
    });

    const cardsInARowCountClass: ComputedRef<string> = computed(() => {
      return `cards-in-a-row-${props.cardsInARowCount}`;
    });

    return {
      ...toRefs(data),
      cardsInARowCountClass,
    };
  },
});
</script>

<style lang="scss" scoped>
// Fix bottom section spacing to be consistent with the arc gauge
.bottom-section.cards-in-a-row-3 {
  @media (min-width: 2801px) {
    padding-inline: 240px;
  }

  @media (min-width: 2601px) and (max-width: 2800px) {
    padding-inline: 180px;
  }

  @media (min-width: 2401px) and (max-width: 2600px) {
    padding-inline: 160px;
  }

  @media (min-width: 2301px) and (max-width: 2400px) {
    padding-inline: 120px;
  }

  @media (min-width: 2101px) and (max-width: 2300px) {
    padding-inline: 96px;
  }

  @media (min-width: 2001px) and (max-width: 2100px) {
    padding-inline: 64px;
  }

  @media (min-width: 1901px) and (max-width: 2000px) {
    padding-inline: 52px;
  }

  @media (min-width: 1801px) and (max-width: 1900px) {
    padding-inline: 32px;
  }

  @media (min-width: 1701px) and (max-width: 1800px) {
    padding-inline: 16px;
  }

  @media (min-width: 1600px) and (max-width: 1700px) {
    padding-inline: 8px;
  }

  @media (max-width: 1600px) {
    padding-inline: 0px;
  }

  .label-left {
    @media (min-width: 1580px) {
      text-align: center;
    }
  }

  .label-right {
    text-align: right;

    @media (min-width: 1580px) {
      text-align: center;
    }
  }
}

// Fix bottom section spacing to be consistent with the arc gauge
.bottom-section.cards-in-a-row-4 {
  @media (min-width: 3401px) {
    padding-inline: 170px;
  }

  @media (min-width: 3001px) and (max-width: 3400px) {
    padding-inline: 120px;
  }

  @media (min-width: 2801px) and (max-width: 3000px) {
    padding-inline: 84px;
  }

  @media (min-width: 2701px) and (max-width: 2800px) {
    padding-inline: 64px;
  }

  @media (min-width: 2501px) and (max-width: 2700px) {
    padding-inline: 52px;
  }

  @media (min-width: 2451px) and (max-width: 2500px) {
    padding-inline: 48px;
  }

  @media (min-width: 2401px) and (max-width: 2450px) {
    padding-inline: 40px;
  }

  @media (min-width: 2351px) and (max-width: 2400px) {
    padding-inline: 32px;
  }

  @media (min-width: 2301px) and (max-width: 2350px) {
    padding-inline: 24px;
  }

  @media (min-width: 2101px) and (max-width: 2300px) {
    padding-inline: 16px;
  }

  @media (max-width: 2100px) {
    padding-inline: 0;
  }

  .label-left {
    @media (min-width: 2150px) {
      text-align: center;
    }
  }

  .label-right {
    text-align: right;

    @media (min-width: 2150px) {
      text-align: center;
    }
  }
}
</style>
