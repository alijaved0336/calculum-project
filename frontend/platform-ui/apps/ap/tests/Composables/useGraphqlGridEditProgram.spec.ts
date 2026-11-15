/**
 * Tests for useGraphqlGridEditProgram — edit-program store watch,
 * levelOfGrid guard, action-key mapping, and manage-team row dropdown.
 * Does not mount CalculumGridGraphql.vue (DistinctValues spec documents why).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";

const { getRandomInt } = vi.hoisted(() => {
  let n = 0;
  return { getRandomInt: () => ++n };
});

vi.mock("@/utils", () => ({
  NumberUtils: { getRandomInt },
}));

import type { ActionFromEditProgram } from "@/modules/components/types";
import { useGridMenuActionsStore } from "@/stores/gridMenuActions";
import {
  isGraphqlGridEditProgramForThisLevel,
  useGraphqlGridEditProgram,
  type GraphqlGridEditProgramHandlers,
  type GraphqlGridEditProgramPayload,
  type UseGraphqlGridEditProgramOptions,
} from "@/modules/components/grid/calculum-grid-graphql/composables/useGraphqlGridEditProgram";

function createHandlers(): GraphqlGridEditProgramHandlers {
  return {
    gridAddGroup: vi.fn(),
    gridAddVGroup: vi.fn(),
    gridExclude: vi.fn(),
    showTargetModal: vi.fn(),
    showTargetClearModal: vi.fn(),
    closeHarmonizationModal: vi.fn(),
    closeMoveBetweenModal: vi.fn(),
    negotiationStatusOnChanged: vi.fn(),
  };
}

function expectNoHandlerCalls(handlers: GraphqlGridEditProgramHandlers) {
  Object.values(handlers).forEach((fn) => {
    expect(fn).not.toHaveBeenCalled();
  });
}

let currentWrapper: ReturnType<typeof mount> | undefined;

function mountEditProgram(
  overrides: Partial<UseGraphqlGridEditProgramOptions> = {},
) {
  const handleEditProgramAction = ref(true);
  const levelOfGrid = ref("spends");
  const handlers = createHandlers();
  const emit = vi.fn();

  const options: UseGraphqlGridEditProgramOptions = {
    handleEditProgramAction,
    levelOfGrid,
    handlers,
    emit,
    ...overrides,
  };

  let api: ReturnType<typeof useGraphqlGridEditProgram> | undefined;

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useGraphqlGridEditProgram(options);
        return {};
      },
      template: "<div />",
    }),
  );

  currentWrapper = wrapper;

  return {
    api: api!,
    handleEditProgramAction,
    levelOfGrid,
    handlers,
    emit,
    wrapper,
    store: useGridMenuActionsStore(),
  };
}

async function dispatch(
  store: ReturnType<typeof useGridMenuActionsStore>,
  action: ActionFromEditProgram,
  payload: GraphqlGridEditProgramPayload,
) {
  store.changeAction(action, payload);
  await nextTick();
}

describe("isGraphqlGridEditProgramForThisLevel", () => {
  it.each([
    ["unset (null)", null, "spends", true],
    ["unset (undefined)", undefined, "spends", true],
    ["matching spends", "spends", "spends", true],
    ["matching parents", "parents", "parents", true],
    ["other level parents vs spends", "parents", "spends", false],
    ["other level spends vs suppliers", "spends", "suppliers", false],
  ] as const)("%s", (_name, payloadLevel, gridLevel, expected) => {
    expect(
      isGraphqlGridEditProgramForThisLevel(payloadLevel, gridLevel),
    ).toBe(expected);
  });
});

describe("useGraphqlGridEditProgram", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    currentWrapper?.unmount();
    currentWrapper = undefined;
    vi.useRealTimers();
  });

  it("does not watch trackingNumber when handleEditProgramAction is false", async () => {
    const { handlers, emit, store } = mountEditProgram({
      handleEditProgramAction: false,
    });

    await dispatch(store, "vcardGroup", {
      isEmit: true,
      levelOfGrid: "spends",
      param: "grid-add-vgroup",
      param1: "vg1",
    });

    expectNoHandlerCalls(handlers);
    expect(emit).not.toHaveBeenCalled();
  });

  it("ignores store actions for a different levelOfGrid", async () => {
    const { handlers, emit, store } = mountEditProgram();

    await dispatch(store, "vcardGroup", {
      isEmit: true,
      levelOfGrid: "parents",
      param: "grid-add-vgroup",
      param1: "vg1",
    });

    expectNoHandlerCalls(handlers);
    expect(emit).not.toHaveBeenCalled();
  });

  it("runs when payload levelOfGrid is unset", async () => {
    const { handlers, store } = mountEditProgram();

    await dispatch(store, "vcardGroup", {
      isEmit: true,
      param: "grid-add-vgroup",
      param1: "vg1",
    });

    expect(handlers.gridAddVGroup).toHaveBeenCalledWith("vg1");
  });

  it.each([
    {
      name: "vcardGroup add",
      action: "vcardGroup" as const,
      payload: {
        isEmit: true,
        removeGroup: false,
        param: "grid-add-vgroup",
        param1: "vg1",
      },
      handler: "gridAddVGroup" as const,
      args: ["vg1"],
    },
    {
      name: "vcardGroup remove",
      action: "vcardGroup" as const,
      payload: {
        isEmit: true,
        removeGroup: true,
        param: "grid-add-group",
        param1: null,
        param2: "vCard",
        param3: null,
      },
      handler: "gridAddGroup" as const,
      args: [null, "vCard", null],
    },
    {
      name: "setTarget",
      action: "setTarget" as const,
      payload: {
        isEmit: true,
        param: "actualPaymentTerms",
        param1: 30,
      },
      handler: "showTargetModal" as const,
      args: [{ key: "actualPaymentTerms", value: 30 }],
    },
    {
      name: "setTarget clear",
      action: "setTarget" as const,
      payload: { isEmit: true, removeGroup: true },
      handler: "showTargetClearModal" as const,
      args: [],
    },
    {
      name: "financingGroup add",
      action: "financingGroup" as const,
      payload: {
        isEmit: true,
        param: "grid-add-group",
        param1: "fg1",
        param2: "financingGroup",
      },
      handler: "gridAddGroup" as const,
      args: ["fg1", "financingGroup"],
    },
    {
      name: "financingGroup remove",
      action: "financingGroup" as const,
      payload: {
        isEmit: true,
        removeGroup: true,
        param: "grid-add-group",
        param1: null,
        param2: "financingGroup",
        param3: null,
      },
      handler: "gridAddGroup" as const,
      args: [null, "financingGroup", null],
    },
    {
      name: "harmonizationGroup remove",
      action: "harmonizationGroup" as const,
      payload: {
        isEmit: true,
        removeGroup: true,
        param: "grid-add-group",
        param1: null,
        param2: "harmonizationGroup",
        param3: null,
      },
      handler: "gridAddGroup" as const,
      args: [null, "harmonizationGroup", null],
    },
    {
      name: "harmonizationGroup open modal",
      action: "harmonizationGroup" as const,
      payload: {
        isEmit: false,
        param: "spend",
        param1: null,
      },
      handler: "closeHarmonizationModal" as const,
      args: ["spend"],
    },
    {
      name: "includeExclude",
      action: "includeExclude" as const,
      payload: {
        isEmit: true,
        param: "grid-exclude",
        param1: true,
      },
      handler: "gridExclude" as const,
      args: [true],
    },
    {
      name: "moveBetween",
      action: "moveBetween" as const,
      payload: {
        isEmit: true,
        param: "move",
        param1: { id: "phase-1" },
      },
      handler: "closeMoveBetweenModal" as const,
      args: [{ id: "phase-1" }],
    },
    {
      name: "updateStatus",
      action: "updateStatus" as const,
      payload: { isEmit: true, param: "contacted" },
      handler: "negotiationStatusOnChanged" as const,
      args: ["contacted"],
    },
  ])("$name maps to $handler", async ({ action, payload, handler, args }) => {
    const { handlers, store } = mountEditProgram();

    await dispatch(store, action, { ...payload, levelOfGrid: "spends" });

    expect(handlers[handler]).toHaveBeenCalledWith(...args);
  });

  it.each([
    {
      name: "exportPdf",
      action: "exportPdf" as const,
      payload: { isEmit: true },
      event: "show-multiple-export-modal" as const,
      args: ["spends"],
    },
    {
      name: "manageTeam move",
      action: "manageTeam" as const,
      payload: { isEmit: true, removeGroup: false, param: { id: "t1" } },
      event: "manage-team-move" as const,
    },
    {
      name: "manageTeam remove",
      action: "manageTeam" as const,
      payload: { isEmit: true, removeGroup: true, param: { id: "t1" } },
      event: "manage-team-remove" as const,
    },
    {
      name: "commodity move",
      action: "commodity" as const,
      payload: { isEmit: true, removeGroup: false, param: { id: "c1" } },
      event: "manage-commodity-move" as const,
    },
    {
      name: "commodity remove",
      action: "commodity" as const,
      payload: { isEmit: true, removeGroup: true },
      event: "manage-commodity-remove" as const,
    },
    {
      name: "customColumn move",
      action: "customColumn" as const,
      payload: { isEmit: true, removeGroup: false, param: { id: "col1" } },
      event: "manage-custom-column-move" as const,
    },
    {
      name: "customColumn remove",
      action: "customColumn" as const,
      payload: { isEmit: true, removeGroup: true },
      event: "manage-custom-column-remove" as const,
    },
    {
      name: "supplierIndustry",
      action: "supplierIndustry" as const,
      payload: { isEmit: true, param: { id: "ind1" } },
      event: "manage-supplier-industry-move" as const,
    },
    {
      name: "supplierCreditRating",
      action: "supplierCreditRating" as const,
      payload: { isEmit: true, param: { id: "cr1" } },
      event: "manage-supplier-credit-rating-move" as const,
    },
    {
      name: "supplierUltimateParent",
      action: "supplierUltimateParent" as const,
      payload: { isEmit: true, param: { id: "up1" } },
      event: "manage-supplier-ultima-parent-move" as const,
    },
  ])("$name maps to $event", async ({ action, payload, event, args }) => {
    const { emit, store, handlers } = mountEditProgram();

    await dispatch(store, action, { ...payload, levelOfGrid: "spends" });

    expectNoHandlerCalls(handlers);
    if (args) {
      expect(emit).toHaveBeenCalledWith(event, ...args);
    } else {
      expect(emit).toHaveBeenCalledWith(
        event,
        expect.objectContaining(payload),
      );
    }
  });

  it("does not call handlers when isEmit is false (except harmonization open)", async () => {
    const { handlers, emit, store } = mountEditProgram();

    await dispatch(store, "vcardGroup", {
      isEmit: false,
      levelOfGrid: "spends",
      param: "grid-add-vgroup",
      param1: "vg1",
    });

    expectNoHandlerCalls(handlers);
    expect(emit).not.toHaveBeenCalled();
  });

  it("does not map unknown action keys", async () => {
    const { handlers, emit, store } = mountEditProgram();

    await dispatch(store, "columnNumber", {
      isEmit: true,
      levelOfGrid: "spends",
    });

    expectNoHandlerCalls(handlers);
    expect(emit).not.toHaveBeenCalled();
  });

  it("toggles the same manage-team row key and switches to another row", () => {
    const { api } = mountEditProgram();

    api.onManageTeamOpen({ open: true, rowKey: "row-a" });
    expect(api.activeManageTeamRowKey.value).toBe("row-a");

    api.onManageTeamOpen({ open: true, rowKey: "row-a" });
    expect(api.activeManageTeamRowKey.value).toBe(null);

    api.onManageTeamOpen({ open: true, rowKey: "row-a" });
    api.onManageTeamOpen({ open: true, rowKey: "row-b" });
    expect(api.activeManageTeamRowKey.value).toBe("row-b");

    api.onManageTeamOpen({ open: false, rowKey: "row-b" });
    expect(api.activeManageTeamRowKey.value).toBe("row-b");
  });

  it("keeps manage-team open when switching rows via the toggle in one click", async () => {
    vi.useFakeTimers();
    const { api } = mountEditProgram();

    api.onManageTeamOpen({ open: true, rowKey: "row-a" });
    await vi.runAllTimersAsync();

    const toggle = document.createElement("div");
    toggle.className = "manage-team-wrapper";
    document.body.appendChild(toggle);

    api.onManageTeamOpen({ open: true, rowKey: "row-b" });
    toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(api.activeManageTeamRowKey.value).toBe("row-b");

    toggle.remove();
    vi.useRealTimers();
  });

  it("closes manage-team on a true outside document click", async () => {
    vi.useFakeTimers();
    const { api } = mountEditProgram();

    api.onManageTeamOpen({ open: true, rowKey: "row-a" });
    await vi.runAllTimersAsync();

    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(api.activeManageTeamRowKey.value).toBe(null);

    vi.useRealTimers();
  });

  it("handleTeamChange dispatches manage-team and closes the row dropdown", () => {
    const { api, emit } = mountEditProgram();

    api.onManageTeamOpen({ open: true, rowKey: "row-a" });
    api.handleTeamChange("manageTeam", true, {
      param: { id: "t1" },
      removeGroup: false,
    });

    expect(emit).toHaveBeenCalledWith(
      "manage-team-move",
      expect.objectContaining({
        isEmit: true,
        levelOfGrid: "spends",
        uuid: "row-a",
        param: { id: "t1" },
        removeGroup: false,
      }),
    );
    expect(api.activeManageTeamRowKey.value).toBe(null);
  });
});
