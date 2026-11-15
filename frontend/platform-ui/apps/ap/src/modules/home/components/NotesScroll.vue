<template>
  <div
    ref="scrollableStatuses"
    class="d-flex flex-column statuses-scroll-cards show-scroll w-100"
    :style="{ height: gridHeight }"
  >
    <div class="row">
      <div
        v-if="summaryData.length <= 0"
        class="col-12"
      >
        <NoDataAvailable
          :icon="'notes-icon'"
          :message="$t('home.homePage.noNotes')"
        ></NoDataAvailable>
      </div>
      <NotesScrollCards
        v-for="note in summaryData"
        v-else
        :note-data="note"
      ></NotesScrollCards>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, toRefs, reactive, ref } from "vue";
import type { PropType } from "vue";
import type { noteInterface } from "@/types/homeView";
import NotesScrollCards from "@/modules/home/components/NotesScrollCards.vue";
import NoDataAvailable from "@/modules/components/NoDataAvailable.vue";
import type { DataInterfaceCardsScroll } from "@/modules/home/types";

export default defineComponent({
  name: "NotesScroll",
  components: { NotesScrollCards, NoDataAvailable },
  props: {
    summaryData: {
      type: Array as PropType<noteInterface[]>,
      required: true,
      default: () => [],
    },
  },
  setup(props, { emit }) {
    const scrollableStatuses = ref<HTMLElement | null>(null);

    const data = reactive<DataInterfaceCardsScroll>({
      cards: [],
      collectionData: "",
      loadingData: false,
      loadMore: false,
      sortString: "",
      gridHeight: "",
    });

    onMounted(() => {
      setGridHeight();
    });

    window.onresize = () => {
      setGridHeight();
    };

    function setGridHeight() {
      const getSubMain = document.getElementById("container-main-id");
      if (getSubMain) {
        const setHeightValue = getSubMain.clientHeight - 510;
        let setHeight = setHeightValue < 800 ? 800 : setHeightValue;
        data.gridHeight = setHeight + "px";
      }
    }
    return {
      ...toRefs(data),
      scrollableStatuses,
    };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

.show-spinner-cards {
  justify-content: center;
}

.spinner-absolute {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  margin: auto;
  z-index: 999;
}

.statuses-scroll-cards {
  height: max-content !important;
  max-height: 800px !important;
  overflow: hidden;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.no-data {
  padding: 0rem 1.5rem;
}
</style>
