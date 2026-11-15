<template>
  <div
    v-if="loadingData && cards.length == 0"
    class="d-flex show-spinner-cards"
  >
    <span class="spinner-border spinner-border-sm"></span>
  </div>
  <div
    ref="scrollableStatuses"
    class="d-flex flex-column statuses-scroll-cards show-scroll"
    :style="gridHeight ? { height: gridHeight } : {}"
  >
    <div
      v-if="showTabs"
      class="row d-flex w-100"
    >
      <TabStrip
        class="ml-2 mb-2"
        :selected="selectedTabIndex"
        :tabs="tabs"
        @select="onSelect"
      ></TabStrip>
    </div>
    <VueDraggable
      v-model="cards"
      tag="div"
      class="row"
      :group="dragGroup"
      draggable=".kanban-card-wrapper"
      ghost-class="card-dragging"
      :animation="150"
      :disabled="!isDraggable"
      :data-negotiation-status="negotiationStatus"
      @start="$emit('drag-start')"
      @end="$emit('drag-end')"
      @add="onCardAdded"
    >
      <div
        v-for="card in cards"
        :key="card.uuid"
        class="w-100 kanban-card-wrapper"
        :class="{ 'kanban-card-draggable': isDraggable }"
      >
        <div
          v-if="isDraggable"
          class="drag-handle-icon"
        >
          <svg
            class="drag-handle-svg"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 14 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle
              cx="2.27344"
              cy="2"
              r="2"
              fill="currentColor"
            ></circle>
            <circle
              cx="11.2734"
              cy="2"
              r="2"
              fill="currentColor"
            ></circle>
            <circle
              cx="2.27344"
              cy="10"
              r="2"
              fill="currentColor"
            ></circle>
            <circle
              cx="11.2734"
              cy="10"
              r="2"
              fill="currentColor"
            ></circle>
            <circle
              cx="2.27344"
              cy="18"
              r="2"
              fill="currentColor"
            ></circle>
            <circle
              cx="11.2734"
              cy="18"
              r="2"
              fill="currentColor"
            ></circle>
          </svg>
        </div>
        <CardsByStatus
          :levelof-grid="levelofGrid"
          :info="card"
          :show-teams="showTeams"
          :show-extra-data="showExtraData"
          :disable-entity="isCardNotAvailable(card)"
          :column-status="negotiationStatus"
          :status-code="statusCode"
          :is-draggable="isDraggable"
        ></CardsByStatus>
      </div>
      <div
        v-if="cards.length === 0"
        class="no-data"
      >
        <span class="text-base font-normal text-gray-400">{{
          !loadingData ? $t("home.manageModule.noResultsByStatus") : ""
        }}</span>
      </div>
    </VueDraggable>
  </div>
  <div
    v-if="loadingData && cards.length > 0"
    class="d-flex show-spinner-cards"
  >
    <span class="spinner-border spinner-border-sm"></span>
  </div>
</template>

<script lang="ts">
import { DataInterfaceCardsScroll, Filter, Filters } from "../types";
import {
  defineComponent,
  onMounted,
  watch,
  toRefs,
  reactive,
  ref,
  PropType,
} from "vue";
import { nodesEdges } from "../data/";
import { stageBreakdownFragment, planPhaseUuidFragment } from "../data/";
import { getDistinctStatusCodes } from "@/composables/usePartialNegotiationStatus";
import { setTabs } from "@/modules/home/manageModule/types";
import { TabStrip } from "@progress/kendo-vue-layout";
import { useGlobalFiltersStore } from "@/stores/globalFilters";
import { useUser } from "@/composables";
import { useHomeStore } from "@/stores/home";
import * as graphqlUtils from "@/utils/graphqlUtils";
import {
  safelyExtractNodes,
  safelyGetPaginationInfo,
} from "@/utils/graphqlUtils";
import CardsByStatus from "./CardsByStatus.vue";
import useSpendFile from "@/composables/useSpendFile";
import useApolloClient from "@/services/graphql/useApolloClient";
import { useAppStore } from "@/stores/app";
import { useConsistentFetch } from "@/composables/useConsistentFetch";
import { VueDraggable } from "vue-draggable-plus";

// Same literal group name across all 6 sibling column instances is what lets
// SortableJS move cards across columns (see KANBAN_GROUP_NAME usage below).
const KANBAN_GROUP_NAME = "manage-module-kanban";

interface FilterApply {
  selectedTeam: string | null;
  selectedCountry: string | null;
  selectedCommodity: string | null;
  selectedPhase: string | null;
}

export default defineComponent({
  name: "StatusesCardsScroll",
  components: { CardsByStatus, TabStrip, VueDraggable },
  props: {
    hideAgreedTerms: { type: Boolean, required: false, default: false },
    levelofGrid: { type: Number, required: true },
    negotiationStatus: { type: String, required: true },
    searchValue: { type: String, required: false, default: null },
    selectedProgramId: { type: String, required: true, default: null },
    setSorting: { type: String, required: true },
    showExtraData: { type: Boolean, required: false, default: false },
    showTabs: { type: Boolean, required: false, default: false },
    showTeams: { type: Boolean, required: false, default: true },
    isDraggable: { type: Boolean, required: false, default: false },
    filtersToApply: {
      type: Object as PropType<FilterApply>,
      required: false,
      default: () => {},
    },
    statusCode: { type: String, required: true },
    refreshAfterRecalculating: { type: Number, default: 0 },
  },
  emits: [
    "set-record-status",
    "select-tab",
    "card-moved",
    "drag-start",
    "drag-end",
    "send:telerik-filter",
  ],
  setup(props, { emit }) {
    const globalFiltersStore = useGlobalFiltersStore();
    const homeStore = useHomeStore();
    const { apolloClientResetStore, isResetting } = useApolloClient();
    let setGlobalFilter = graphqlUtils.convertGlobalFilterToGraphQL(
      globalFiltersStore.getFiltersApplied,
    );

    const { isPilotAccount, user } = useUser();

    const { spendFileVersionActiveId } = useSpendFile();

    let currencyRate: number = useAppStore().getCurrencyAmount;
    const scrollableStatuses = ref<HTMLElement | null>(null);

    const data = reactive<DataInterfaceCardsScroll>({
      cards: [],
      collectionData: "",
      loadingData: false,
      loadMore: false,
      sortString: "",
      gridHeight: "",
      selectedTabIndex: homeStore.getEntityLevelTabSelected,
      tabs: setTabs,
    });

    const pagination = ref({
      first: 20,
      after: 0,
      skip: 0,
    });

    const filters = ref<Filters>({
      filters: [],
      logic: "and",
    });

    const setFilters = (
      field: string,
      value: string,
      operatorField: string,
      operatorFilter: string,
    ) => {
      let filtersArray: Array<any> = [];
      const setfilterField: Filter = {
        field: field,
        operator: operatorField,
        value: value,
      };

      filtersArray.push(setfilterField);
      filters.value.filters.push({
        logic: operatorFilter,
        filters: filtersArray,
      });

      emit("send:telerik-filter", filters.value);
    };

    function onSelect(e: any) {
      apolloClientResetStore();
      setTimeout(function () {
        data.selectedTabIndex = e.selected;
        homeStore.setEntityLevelTabSelected(data.selectedTabIndex);
        emit("select-tab", data.selectedTabIndex);
      }, 500);
    }

    onMounted(() => {
      setGridHeight();
    });

    function initialCalls() {
      if (props.negotiationStatus !== "") {
        // Spend level: negotiationStatus is a single, non-rolled-up value per spend, so an
        // exact match is correct and sufficient.
        // Supplier/parent level: negotiationStatus is a rolled-up value (the entity's LOWEST
        // stage), so an exact match would miss a Partial entity in every column but its lowest
        // stage. negotiationStatusCodes holds the comma-joined list of every stage the entity's
        // spends actually sit in (e.g. "400,500"), so a "contains" match against this column's
        // numeric statusCode (not the column's name) surfaces the entity in every applicable
        // column — this goes through the generic TelerikFilter (telerikFilter arg), which builds
        // a plain LIKE on whatever field name is given, independent of per-property ApiFilter
        // annotations, so no backend change is required here.
        if (props.levelofGrid === 0) {
          setFilters("negotiationStatus", props.negotiationStatus, "eq", "or");
        } else {
          setFilters(
            "negotiationStatusCodes",
            props.statusCode,
            "contains",
            "or",
          );
        }
      }

      if (props.searchValue) {
        setFilters("entityName", props.searchValue, "contains", "and");
      }

      if (props.hideAgreedTerms) {
        setFilters("agreedCashFlow", "null", "isnull", "and");
      }

      switch (props.levelofGrid) {
        case 0:
          data.collectionData = "collectionQueryProgramListSpends";
          break;
        case 1:
          data.collectionData = "collectionQueryProgramListSuppliers";
          break;
        case 2:
          data.collectionData = "collectionQueryProgramListParents";
          break;
      }
      if (scrollableStatuses.value) {
        scrollableStatuses.value.addEventListener("scroll", getMoreCards);
      }
      setDatasorting(props.setSorting);
    }

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

    function getMoreCards() {
      if (scrollableStatuses.value) {
        const div = scrollableStatuses.value;
        const isAtEnd =
          div.scrollTop >= div.scrollHeight - div.clientHeight - 2;
        if (isAtEnd && data.loadMore && !data.loadingData) {
          pagination.value.after =
            pagination.value.after + pagination.value.first;
          fetchData();
        }
      }
    }

    watch(
      () => props.refreshAfterRecalculating,
      () => {
        fetchData(true);
      },
    );

    watch(
      () => props.levelofGrid,
      (newValue) => {
        pagination.value = {
          first: 20,
          after: 0,
          skip: 0,
        };
        data.cards = [];
        data.loadMore = false;
        switch (newValue) {
          case 0:
            data.collectionData = "collectionQueryProgramListSpends";
            break;
          case 1:
            data.collectionData = "collectionQueryProgramListSuppliers";
            break;
          case 2:
            data.collectionData = "collectionQueryProgramListParents";
            break;
        }
        fetchData();
      },
    );

    // AB#20300: the Agreed columns show agreedCashFlow on the card and every other column
    // shows modelCashFlow (CardsByStatus.vue setTargetType / isAgreedColumn). Asking the API
    // to order by modelCashFlow everywhere left the Agreed columns sorted by a figure the card
    // never displays, so they looked unsorted.
    const cashFlowSortField =
      props.negotiationStatus === "agreed" || props.negotiationStatus === "agreedExtended"
        ? "agreedCashFlow"
        : "modelCashFlow";

    function setDatasorting(value: string) {
      switch (value) {
        case "nameAsc":
          data.sortString = `order: { entityName: "asc" }`;
          fetchData();
          break;
        case "nameDesc":
          data.sortString = `order: { entityName: "desc" }`;
          fetchData();
          break;
        case "targetAsc":
          data.sortString = `order: { ${cashFlowSortField}: "asc" }`;
          fetchData();
          break;
        case "targetDesc":
          data.sortString = `order: { ${cashFlowSortField}: "desc" }`;
          fetchData();
          break;
        case "negotiationStatusUpdatedAt":
          data.sortString = `order: { negotiationStatusUpdatedAt: "desc" }`;
          fetchData();
          break;
      }
    }

    watch(
      () => props.searchValue,
      (newValue) => {
        pagination.value = {
          first: 20,
          after: 0,
          skip: 0,
        };
        data.cards = [];
        data.loadMore = false;

        updateFiltersbyField("entityName", "contains", newValue, true);
      },
    );

    watch(
      () => props.filtersToApply,
      (newValue) => {
        pagination.value = { first: 20, after: 0, skip: 0 };
        data.cards = [];
        data.loadMore = false;
        updateFiltersbyField(
          "teamName",
          "contains",
          newValue?.selectedTeam ?? "",
          false,
        );
        updateFiltersbyField(
          "entityCountryName",
          "eq",
          newValue?.selectedCountry ?? "",
          false,
        );
        updateFiltersbyField(
          "commodity",
          "contains",
          newValue?.selectedCommodity ?? "",
          true,
        );
      },
      { deep: true },
    );

    function updateFiltersbyField(
      fieldSearch: string,
      operator: string,
      value: string,
      callFetch: boolean = false,
    ) {
      //- remove any existing teamName filter groups (plain copy bypasses Vue proxy)
      const plainFilters: typeof filters.value.filters = JSON.parse(
        JSON.stringify(filters.value.filters),
      );
      filters.value = {
        logic: filters.value.logic,
        filters: plainFilters.filter(
          (group) => !group.filters.some((f) => f.field === fieldSearch),
        ),
      };

      //- add if the value is not empty
      if (value !== "") {
        setFilters(fieldSearch, value, operator, "and");
      }
      if (callFetch) fetchData();
    }

    watch(
      () => props.setSorting,
      (newValue) => {
        pagination.value = {
          first: 20,
          after: 0,
          skip: 0,
        };
        data.cards = [];
        data.loadMore = false;
        setDatasorting(newValue);
      },
    );

    /**
     * The global filter is baked into the query string as a literal (setGlobalFilter), read once
     * when setup() runs — which is why applying a filter only moved the header counts above (those
     * refetch through Overview's own watcher) while the columns kept showing the cards from before,
     * until a page reload re-ran setup().
     *
     * Same guard as Overview.vue's watcher: cleanupBeforeCompanyChange() empties the filters before
     * the new company's program/spendFileVersion have landed, and refetching in that window queries
     * with mismatched context. See docs/context/race-condition-company-change.md.
     */
    watch(
      () => globalFiltersStore.getFiltersApplied,
      (newValue) => {
        if (globalFiltersStore.getDisableWatchers) return;

        setGlobalFilter = graphqlUtils.convertGlobalFilterToGraphQL(newValue);
        refetch();
      },
      { deep: true },
    );

    /** Graphql data */

    let fetchController: AbortController | null = null;

    async function fetchData(isFromReadyStatus: boolean = false) {
      fetchController?.abort();
      fetchController = new AbortController();
      const signal = fetchController.signal;

      try {
        // Enable loading
        if (!isFromReadyStatus) {
          data.loadingData = true;
        }

        let queryString = getSpendsData(pagination.value);
        const response = await graphqlUtils.getCollectionData(
          queryString,
          signal,
        );

        if (signal.aborted) return;

        // Use safe utility function to extract nodes
        const nodes = safelyExtractNodes(response, "spends");

        if (nodes.length === 0) {
          data.cards = [];
          emit("set-record-status", false);
          return;
        }

        // Defensive re-filter at the supplier/parent level: initialCalls() already asks the
        // backend for entities whose negotiationStatusCodes contains this column's statusCode
        // (a LIKE match via TelerikFilter), so this is normally a no-op — it only trims a false
        // positive if the LIKE substring match were ever too loose for a given code (e.g. a
        // future code that's a substring of another).
        const freshNodes =
          props.levelofGrid !== 0 && props.negotiationStatus
            ? nodes.filter((node: any) =>
                getDistinctStatusCodes(node.negotiationStatusCodes).includes(
                  props.statusCode,
                ),
              )
            : nodes;

        if (isFromReadyStatus) {
          data.cards = [];
        }

        data.cards = [...data.cards, ...freshNodes];

        if (import.meta.env.DEV) console.info("Data: ", data.cards.length);

        if (props.hideAgreedTerms) {
          //filter each node if has property agreedCashFlow
          data.cards = data.cards.filter((node: any) => !node.agreedCashFlow);
        }

        if (data.cards.length <= 0) {
          if (import.meta.env.DEV) console.info("No data found");
          emit("set-record-status", false);
        } else {
          if (import.meta.env.DEV)
            console.info("Data found: ", data.cards.length);
          emit("set-record-status", true);
        }

        const paginationInfo = safelyGetPaginationInfo(response, "spends");
        data.loadMore = paginationInfo.hasNextPage;
      } catch (error: any) {
        if (error?.name === "AbortError" || signal.aborted) return;
        if (import.meta.env.DEV) console.error("Data fetching failed:", error);
      } finally {
        //
        data.loadingData = false;
      }
    }

    function getSpendsData(pagination: any): string {
      const graphqlFilterString = graphqlUtils.convertFiltersToGraphQL(
        filters.value,
      );
      // stageBreakdown is only requested at the supplier/parent level (levelofGrid 1/2) — it is
      // not a valid field on the spend-level GraphQL type (levelofGrid 0). See stageBreakdownFragment.
      let getEdges =
        props.levelofGrid === 0
          ? `${nodesEdges}\n${planPhaseUuidFragment}`
          : `${nodesEdges}\n${stageBreakdownFragment}`;

      if (props.levelofGrid === 1) {
        getEdges += `\n spendsIncludedCounts`;
      }

      if (props.levelofGrid === 2) {
        getEdges += `\n suppliersIncludedCounts`;
      }

      const paginationString = `first: ${pagination.first} ${
        pagination.after
          ? `, after: "${btoa((pagination.after - 1).toString())}"`
          : ""
      }`;
      const collectionQuery = data.collectionData;

      const phaseValue = props.filtersToApply?.selectedPhase;
      const phaseuuid = phaseValue ? `targetPhaseUuid: "${phaseValue}"` : null;

      const graphqlQuery = `
        {
          spends: ${collectionQuery}(
            ${isPilotAccount() ? "isPilot: true," : ""}
            targetProgramUuid: "${props.selectedProgramId}",
            targetSpendFileVersionUuid: "${spendFileVersionActiveId.value}",
            ${graphqlFilterString ? graphqlFilterString + "," : ""}
            currencyRate: ${currencyRate},
            fullDisabled: ${false},
            ${paginationString},
            ${setGlobalFilter ? setGlobalFilter : ""}
            ${data.sortString},
            ${phaseuuid ? phaseuuid : ""},
          ) {
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              node {
                ${getEdges}
              }
            }
          }
        }
      `;
      return graphqlQuery;
    }

    /**
     * if company is under pilot account , and the card is not a pilot entity, disable the card
     * else enable the card
     *
     * @param {any} card - The card to validate.
     * @return {boolean} Returns true if the card is a pilot entity, false otherwise.
     */
    function isCardNotAvailable(card: any) {
      if (user && user?.value?.isSuperAdmin) {
        return false;
      } else {
        let disableEntityCard = isPilotAccount() && !card.isPilot;
        if (disableEntityCard) {
          return true;
        } else {
          return false;
        }
      }
    }

    useConsistentFetch(
      [initialCalls],
      () => props.selectedProgramId,
      () => spendFileVersionActiveId.value,
    );

    const dragGroup = { name: KANBAN_GROUP_NAME, pull: true, put: true };

    // Fires only when a card is dropped into THIS column from another column —
    // vue-draggable-plus already spliced it out of the source list and into
    // data.cards by this point; evt.data is the moved card object itself.
    function onCardAdded(evt: any) {
      const movedCard = evt.data ?? data.cards[evt.newIndex];
      const fromStatus = evt.from?.dataset?.negotiationStatus as
        | string
        | undefined;
      emit("card-moved", {
        card: movedCard,
        fromStatus,
        toStatus: props.negotiationStatus,
      });
    }

    // Revert primitive used both when a gating dialog is cancelled and when the
    // status-change API call fails — see useKanbanDragAndDrop.ts.
    function removeCardByUuid(uuid: string) {
      const idx = data.cards.findIndex((c: any) => c.uuid === uuid);
      if (idx !== -1) data.cards.splice(idx, 1);
    }

    function moveCardIn(card: any) {
      data.cards.unshift(card);
    }

    // Used for Partial-entity moves: a stage change to one of an entity's stages can add/remove
    // its presence in other columns or merge into an existing card there — the server-computed
    // truth is refetched rather than attempting a local splice. See useKanbanDragAndDrop.ts.
    async function refetch() {
      pagination.value = { first: 20, after: 0, skip: 0 };
      data.cards = [];
      data.loadMore = false;
      await fetchData();
    }

    return {
      ...toRefs(data),
      isCardNotAvailable,
      scrollableStatuses,
      onSelect,
      isResetting,
      dragGroup,
      onCardAdded,
      removeCardByUuid,
      moveCardIn,
      refetch,
    };
  },
});
</script>

<style scoped lang="scss">
@import "src/resources/assets/styles/variables/colors";

.show-spinner-cards {
  justify-content: center;
}

.statuses-scroll-cards {
  // Fixed (not max-content): every column needs the same height regardless of how many
  // cards it holds, or a short column's SortableJS drop zone ends above a taller
  // sibling's, and dragging a card from below that point silently fails to move it.
  // Also keeps the `!important` from the previous rule, which already makes the
  // `:style="gridHeight ..."` binding below inert — no need to reintroduce its
  // #container-main-id-driven height calculation (see WI#19886).
  height: 800px !important;
  overflow: hidden;
  overflow-y: auto;
  padding-right: 0.5rem;

  * {
    cursor: pointer;
  }
}

// Without this, the VueDraggable-bound row only spans its cards' natural height,
// leaving empty space below the last card outside SortableJS's actual drop target
// box — drops landing there silently do nothing.
.statuses-scroll-cards > .row[data-negotiation-status] {
  flex-grow: 1;
  // Without this, the default multi-line flex align-content (stretch) spreads
  // wrapped card lines apart to fill the flex-grow'd height instead of leaving
  // the leftover space packed below the last card.
  align-content: flex-start;
  // The global `.row { margin-left/right: -8px }` override (_bootstrap-overrides.scss)
  // is meant to be compensated by `.row > [class^="col"] { padding-left/right: 8px }`
  // on its direct children — but this row's children are plain `.kanban-card-wrapper`
  // divs (no col-* class), so that compensation never applies. Zeroed here, scoped
  // only to this VueDraggable-rendered row via the data-negotiation-status attribute
  // (Vue forwards it from the `:data-negotiation-status="negotiationStatus"` binding
  // on `<VueDraggable>`), so no other `.row` in the app — including the sibling
  // TabStrip `.row.w-100` shown when `showTabs` is true (used by HomeDashBoard.vue) —
  // is affected.
  margin-left: 0;
  margin-right: 0;
}

.no-data {
  padding: 0rem 1.5rem;
}

.kanban-card-wrapper {
  position: relative;
}

.kanban-card-draggable {
  cursor: default;
}

.drag-handle-icon {
  display: none;
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  color: #9ca3af;
  z-index: 10;
  cursor: grab;
}

.drag-handle-svg {
  position: absolute;
  left: 24px;
  top: 12px;
  width: 12px;
  height: 18px;
}

.kanban-card-draggable:hover .drag-handle-icon {
  display: block;
}

.kanban-card-draggable:hover :deep(.card) {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transition: box-shadow 0.15s ease;
}

.card-dragging {
  opacity: 0.4;
  cursor: grabbing;
}
</style>
