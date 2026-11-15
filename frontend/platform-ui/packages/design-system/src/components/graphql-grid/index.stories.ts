import type { Meta, StoryObj } from "@storybook/vue3";
import { computed, ref, watch } from "vue";
import { propDoc } from "@ds-storybook/argTypes";
import GraphqlGrid from "./Index.vue";
import { buildDemoRows, queryGraphqlGridMock } from "./mock";
import {
  GRAPHQL_GRID_DEFAULT_PAGE_SIZES,
  type GraphqlGridColumn,
  type GraphqlGridDataState,
  type GraphqlGridFilterDescriptor,
  type GraphqlGridSelectState,
  type GraphqlGridSortDescriptor,
} from "./types";

const allRows = buildDemoRows(137);

const baseColumns: GraphqlGridColumn[] = [
  {
    field: "supplierName",
    title: "Supplier name",
    customTooltip: "Legal supplier name as stored in the source system",
    width: 180,
    sortable: true,
    filter: "text",
  },
  { field: "email", title: "Email", width: 220, sortable: true, filter: "text" },
  { field: "spend", title: "Spend", width: 120, sortable: true, filter: "numeric" },
  { field: "updatedAt", title: "Updated", width: 130, sortable: true, filter: "date" },
  { field: "contactStatus", title: "Status", width: 130, sortable: true, filter: "text" },
  { field: "industry", title: "Industry", width: 140, sortable: true, filter: "text" },
];

const overflowColumns: GraphqlGridColumn[] = [
  { field: "supplierName", title: "Supplier name", width: 200, sortable: true, filter: "text" },
  { field: "spendAlias", title: "Spend Alias", width: 160, sortable: true, filter: "text" },
  { field: "boxesVcard", title: "9 Boxes Vcard", width: 140, sortable: true, filter: "text" },
  { field: "economicPi", title: "Economic PI", width: 130, sortable: true, filter: "text" },
  { field: "scfGroup", title: "SCF Group", width: 220, sortable: true, filter: "text" },
  {
    field: "buyingEntity",
    title: "Buying Entities",
    width: 160,
    sortable: true,
    filter: "text",
  },
  { field: "country", title: "Country (Supplier)", width: 180, sortable: true, filter: "text" },
  { field: "contactStatus", title: "Status", width: 140, sortable: true, filter: "text" },
  { field: "email", title: "Email", width: 220, sortable: true, filter: "text" },
  { field: "spend", title: "Spend", width: 120, sortable: true, filter: "numeric" },
  { field: "updatedAt", title: "Updated", width: 130, sortable: true, filter: "date" },
  { field: "phaseName", title: "Phase", width: 140, sortable: true, filter: "text" },
];

type GraphqlGridStoryArgs = {
  sortable?: boolean;
  selectable?: boolean;
  loading?: boolean;
  hideColumnSelector?: boolean;
  allowExport?: boolean;
  exportLabel?: string;
  optionsLabel?: string;
  columnMenu?: boolean;
  take?: number;
  height?: string;
  dataItemKey?: string;
  selectedField?: string;
  pageable?: boolean;
  pageableInfo?: boolean;
  items?: unknown;
  columns?: unknown;
  total?: number;
  skip?: number;
  sort?: unknown;
  select?: unknown;
  filter?: unknown;
  columnSelectorDefaultColumns?: unknown;
};

const meta: Meta<GraphqlGridStoryArgs> = {
  title: "Components/GraphqlGrid",
  component: GraphqlGrid,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `
Controlled Kendo Grid shell for GraphQL lists. The parent owns the query.

- **Paging / sort / filter** → \`datastatechange\` → map to GraphQL variables and refetch. Pager sits under the table (Previous / page numbers / Next) when there is more than one page; the entire pager (including items-per-page / range) is hidden when \`pageable\` is \`false\`, or when \`Math.ceil(total / take) <= 1\` and \`info\` is off. The right block (items per page + \`1 - 20 of N\`) is off by default; \`pageable: { info: true }\` shows it. Hide only the dropdown with \`pageable: { pageSizes: false }\`.
- **Column menu** → DS \`DropdownPanel\` on the header "..." (sort + nested filter). Kendo's stock column-menu popup is off. Optional column \`customTooltip\` shows a Kendo tooltip on the header title text (no fallback to \`title\`).
- **Selection** → Kendo checkbox + \`select\` map keyed by \`dataItemKey\` (page-scoped select-all by default).
- **Column visibility** → built-in ColumnSelector above the table (\`v-model:columns\`); hide with \`hideColumnSelector\`.
- \`autoProcessData\` is off — sorting/paging/filtering are server-side (parent / mock), matching production GraphQL usage.
- Storybook mock uses Kendo \`process\` from \`@progress/kendo-data-query\` so sort and filter match Grid.
        `.trim(),
      },
    },
    controls: {
      sort: "requiredFirst",
    },
  },
  argTypes: {
    // —— useful controls ——
    sortable: propDoc({
      description:
        "Enable Kendo column sorting (asc → desc → unsort when allowUnsort).",
      type: "boolean",
      control: "boolean",
      defaultValue: "false",
    }),
    selectable: propDoc({
      description: "Enable checkbox multi-selection (current page select-all).",
      type: "boolean",
      control: "boolean",
      defaultValue: "false",
    }),
    loading: propDoc({
      description: "Show loading overlay over the grid.",
      type: "boolean",
      control: "boolean",
      defaultValue: "false",
    }),
    hideColumnSelector: propDoc({
      description:
        "Hide the built-in column show/hide selector above the table.",
      type: "boolean",
      control: "boolean",
      defaultValue: "false",
    }),
    allowExport: propDoc({
      description:
        "Show the options (⋮) button next to the column selector, with an Export Excel entry. Choosing it emits `export`.",
      type: "boolean",
      control: "boolean",
      defaultValue: "false",
    }),
    exportLabel: propDoc({
      description: "Label of the export entry in the options menu.",
      type: "string",
      control: "text",
      defaultValue: '"Export Excel"',
    }),
    optionsLabel: propDoc({
      description: "Accessible label / tooltip of the options (⋮) button.",
      type: "string",
      control: "text",
      defaultValue: '"Options"',
    }),
    columnMenu: propDoc({
      description:
        "Show the DS DropdownPanel column menu (sort + nested filter) on header cells.",
      type: "boolean",
      control: "boolean",
      defaultValue: "true",
    }),
    take: {
      description:
        "Page size. Also changed from the pager dropdown (items per page).",
      control: { type: "select" },
      options: [...GRAPHQL_GRID_DEFAULT_PAGE_SIZES],
      table: {
        type: { summary: "number" },
        defaultValue: { summary: "20" },
      },
    },
    height: propDoc({
      description:
        'Grid height CSS value. `"auto"` sizes to row count; a fixed value (e.g. `"420px"`) keeps a scrollable viewport.',
      type: "string",
      control: "text",
      defaultValue: '"auto"',
    }),
    dataItemKey: propDoc({
      description: "Stable row id field for selection (not array index).",
      type: "string",
      control: "text",
      defaultValue: '"id"',
    }),
    selectedField: propDoc({
      description: "Boolean field used by Kendo checkbox selection.",
      type: "string",
      control: "text",
      defaultValue: '"selected"',
    }),
    pageable: propDoc({
      description:
        "Show the pager under the table when there is more than one page.",
      type: "boolean",
      control: "boolean",
      defaultValue: "true",
    }),
    pageableInfo: propDoc({
      description:
        "Show the right pager block (items per page + 1 - 20 of N).",
      type: "boolean",
      control: "boolean",
      defaultValue: "false",
    }),
    // —— hide parent-owned / non-interactive in Controls ——
    items: { table: { disable: true }, control: false },
    columns: { table: { disable: true }, control: false },
    total: { table: { disable: true }, control: false },
    skip: { table: { disable: true }, control: false },
    sort: { table: { disable: true }, control: false },
    select: { table: { disable: true }, control: false },
    filter: { table: { disable: true }, control: false },
    columnSelectorDefaultColumns: { table: { disable: true }, control: false },
  },
  args: {
    sortable: true,
    selectable: true,
    loading: false,
    hideColumnSelector: false,
    allowExport: false,
    exportLabel: "Export Excel",
    optionsLabel: "Options",
    columnMenu: true,
    take: 20,
    height: "auto",
    dataItemKey: "id",
    selectedField: "selected",
    pageable: true,
    pageableInfo: false,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

function sortKey(sort: GraphqlGridSortDescriptor[]) {
  return JSON.stringify(sort ?? []);
}

function filterKey(filter: GraphqlGridFilterDescriptor | undefined) {
  return JSON.stringify(filter ?? null);
}

function useMockGrid(options?: {
  columns?: GraphqlGridColumn[];
  initialTake?: number;
}) {
  const columns = ref(
    (options?.columns ?? baseColumns).map((column) => ({ ...column })),
  );
  const skip = ref(0);
  const take = ref(options?.initialTake ?? 20);
  const sort = ref<GraphqlGridSortDescriptor[]>([]);
  const filter = ref<GraphqlGridFilterDescriptor | undefined>(undefined);
  const select = ref<GraphqlGridSelectState>({});
  const loading = ref(false);

  const result = computed(() =>
    queryGraphqlGridMock(allRows, {
      skip: skip.value,
      take: take.value,
      sort: sort.value,
      filter: filter.value,
    }),
  );

  const items = computed(() => result.value.items);
  const total = computed(() => result.value.total);
  const selectedCount = computed(
    () => Object.values(select.value).filter(Boolean).length,
  );

  function onDataStateChange(state: GraphqlGridDataState) {
    const nextSort = state.sort ?? [];
    const sortChanged = sortKey(nextSort) !== sortKey(sort.value);
    const nextFilter = state.filter;
    const filterChanged = filterKey(nextFilter) !== filterKey(filter.value);
    const nextTake = state.take ?? take.value;

    loading.value = true;
    sort.value = nextSort;
    filter.value = nextFilter;
    take.value = nextTake;
    // Match typical GraphQL UX: new sort or filter starts at page 1.
    skip.value = sortChanged || filterChanged ? 0 : (state.skip ?? 0);

    window.setTimeout(() => {
      loading.value = false;
    }, 80);
  }

  return {
    columns,
    skip,
    take,
    sort,
    filter,
    select,
    loading,
    items,
    total,
    selectedCount,
    onDataStateChange,
    syncTake(next: unknown) {
      const value = Number(next) || 20;
      if (value === take.value) {
        return;
      }
      take.value = value;
      skip.value = 0;
    },
  };
}

type GridStoryArgs = Record<string, unknown>;

function renderMockGrid(options?: {
  columns?: GraphqlGridColumn[];
  extraGridSlot?: string;
}) {
  return (args: GridStoryArgs) => ({
    components: { GraphqlGrid },
    setup() {
      const grid = useMockGrid({
        columns: options?.columns,
        initialTake: Number(args.take) || 20,
      });

      watch(
        () => args.take,
        (next) => grid.syncTake(next),
      );

      watch(
        () => args.loading,
        (next) => {
          grid.loading.value = Boolean(next);
        },
      );

      const pagerSettings = computed(() => {
        if (args.pageable === false) {
          return false;
        }
        return { info: args.pageableInfo === true };
      });

      return { args, pagerSettings, ...grid };
    },
    template: `
      <div>
        <p
          v-if="args.selectable"
          style="margin: 0 0 0.75rem; font: 500 0.875rem/1.4 var(--font-family-base); color: var(--color-text-2);"
        >
          Selected rows: {{ selectedCount }}
        </p>
        <GraphqlGrid
          v-model:columns="columns"
          :items="items"
          :total="total"
          :skip="skip"
          :take="take"
          :sort="sort"
          :filter="filter"
          :loading="loading"
          :sortable="args.sortable"
          :selectable="args.selectable"
          :column-menu="args.columnMenu"
          :hide-column-selector="args.hideColumnSelector"
          :allow-export="args.allowExport"
          :export-label="args.exportLabel"
          :options-label="args.optionsLabel"
          :pageable="pagerSettings"
          :height="args.height"
          :data-item-key="args.dataItemKey"
          :selected-field="args.selectedField"
          v-model:select="select"
          @datastatechange="onDataStateChange"
        >${options?.extraGridSlot ?? ""}
        </GraphqlGrid>
      </div>
    `,
  });
}

/**
 * Primary playground: paging, page size, sorting, selection, column selector.
 * ColumnSelector sits above the table, not inside Kendo GridToolbar; `v-model:columns` proves the round-trip.
 */
export const Default: Story = {
  render: renderMockGrid(),
};

/** Narrow host + many fixed-width columns → horizontal scroll. */
export const HorizontalOverflow: Story = {
  name: "Horizontal overflow",
  args: {
    selectable: true,
    sortable: true,
    take: 10,
    height: "auto",
  },
  decorators: [
    () => ({
      template:
        '<div style="width: 28rem; max-width: 100%; border: 1px dashed var(--border-color-default); padding: 0.5rem;"><story /></div>',
    }),
  ],
  render: renderMockGrid({ columns: overflowColumns }),
};

export const Loading: Story = {
  name: "Loading",
  args: {
    columns: baseColumns,
    items: [],
    total: 0,
    skip: 0,
    take: 20,
    loading: true,
    height: "auto",
    sortable: false,
    selectable: false,
    hideColumnSelector: true,
  },
};

export const ColumnSelectorHidden: Story = {
  ...Default,
  name: "Column selector hidden",
  args: {
    hideColumnSelector: true,
  },
};

/**
 * `allowExport` renders the `GraphqlGridExportMenu` options (⋮) button beside the column selector (see its own
 * story): opening ⋮ shows the Export Excel entry, which emits `export` and closes the panel.
 */
export const WithExportMenu: Story = {
  ...Default,
  name: "With export menu",
  args: {
    allowExport: true,
  },
};

export const PagerInfo: Story = {
  ...Default,
  name: "Pager info",
  args: {
    pageableInfo: true,
  },
};

const customHostCellColumns: GraphqlGridColumn[] = [
  {
    field: "supplierName",
    title: "Supplier name",
    width: 220,
    sortable: true,
    filter: "text",
    cell: "customHostCell",
  },
  ...baseColumns.slice(1),
];

/**
 * Hosts can pass unlisted cell slot names (`column.cell` + matching `#slot`) through
 * GraphqlGrid onto Kendo — AP cells like `#entityColumnTemplate` use this path.
 */
export const CustomHostCell: Story = {
  name: "Custom host cell",
  args: {
    hideColumnSelector: true,
    selectable: false,
    sortable: true,
    take: 10,
    height: "auto",
  },
  render: renderMockGrid({
    columns: customHostCellColumns,
    extraGridSlot: `
          <template #customHostCell="{ props }">
            <span style="font-weight: 600; color: var(--color-text-interactive-button-default);">
              {{ props.dataItem[props.field] }}
            </span>
          </template>`,
  }),
};
