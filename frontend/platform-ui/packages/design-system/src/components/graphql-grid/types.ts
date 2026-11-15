import type { CompositeFilterDescriptor } from "@progress/kendo-data-query";

// Named alias, not inlined into Index.vue's props: Storybook's Vue docgen chokes on
// a nested generic like `Record<string, unknown>` written directly inside a prop's
// `PropType<...>` cast (mistakes the embedded `<`/`>` for HTML tags and corrupts the
// SFC before Vue's own compiler sees it). Referencing it by name avoids that.
export type GraphqlGridRow = Record<string, unknown>;

// Mirrors Kendo's own GridDataType - kept as a local alias (like the rest of this
// file) instead of importing it, so globalColumns.ts's plain `filter: "text"` values
// type-check without pulling a Kendo import into every column-data file.
export type GraphqlGridColumnFilterType = "text" | "numeric" | "boolean" | "date";

export interface GraphqlGridColumn {
  field: string;
  title?: string;
  /** Header-title tooltip. Omit or empty: no tooltip (does not fall back to `title`). */
  customTooltip?: string;
  width?: string | number;
  sortable?: boolean;
  /** Hidden columns still render in ColumnSelector's list, just unchecked. */
  hidden?: boolean;
  /** `false` locks the column visible - ColumnSelector disables its checkbox. */
  allowHide?: boolean;
  /** Column-menu filter input type - text, numeric, boolean or date. Omit to treat as text. */
  filter?: GraphqlGridColumnFilterType;

  /**
   * Which of the filter type's operators this column's menu may offer. Omit for all of them.
   *
   * For a column the backend can only be asked about in some of those ways. Offering an operator
   * nothing can honour gives the user a filter that either fails the request or is quietly dropped,
   * and both read as a broken grid rather than as an unsupported option. The per-ordinal
   * custom-attribute filters are the case this exists for: their vocabulary has `contains` and `eq`
   * but no `startswith` or `endswith`.
   */
  filterOperators?: string[];
  /** `false` opts this column out of GraphqlGrid's DropdownPanel column menu. */
  columnMenu?: boolean;
  [key: string]: unknown;
}

// A parent/grouping header - Kendo's own nested-column-header feature, rendered natively once
// passed through GraphqlGrid's "columns" prop. It exists purely to visually cluster its
// `children` under one header; its own `hidden`/`filterable` are never read anywhere, since
// ColumnSelector only ever shows/hides individual `children` (see ColumnSelector.vue and
// flattenGraphqlGridColumns below). Not every GraphqlGrid consumer groups its columns this way -
// most still pass a flat GraphqlGridColumn[].
export interface GraphqlGridColumnGroup {
  title: string;
  children: GraphqlGridColumn[];
  width?: string | number;
  resizable?: boolean;
  /** `false` opts the group's own header cell out of GraphqlGrid's column menu (sort/filter) -
   * independent of each child's own `columnMenu`, since a group header has nothing of its own to
   * filter or sort by. See Index.vue's `gridColumns`, which assigns the column-menu header cell
   * to every entry of `renderedColumns` (leaf or group) unless this is `false`. */
  columnMenu?: boolean;
  [key: string]: unknown;
}

export type GraphqlGridColumnOrGroup = GraphqlGridColumn | GraphqlGridColumnGroup;

export function isGraphqlGridColumnGroup(
  column: GraphqlGridColumnOrGroup,
): column is GraphqlGridColumnGroup {
  return Array.isArray((column as GraphqlGridColumnGroup).children);
}

// Flattens parent/group headers down to the leaf columns they cluster - the shape
// ColumnSelector (and anything computing visible fields) actually needs to show/hide one
// column at a time. Columns with no grouping at all pass through unchanged.
export function flattenGraphqlGridColumns(columns: GraphqlGridColumnOrGroup[]): GraphqlGridColumn[] {
  return columns.flatMap((column) => (isGraphqlGridColumnGroup(column) ? column.children : [column]));
}

// The columns kendo-vue-grid is handed: visible leaves only, inside the groups that still have
// one. kendo-vue-grid@9.1.0 gives each column a `parentIndex` over the FULL list (hidden columns
// included), then drops the hidden ones and walks `parentIndex` over the remainder to build the
// totals footer (footerColumns' ancestor walk in its utils/main.js). In a grouped grid with a
// hidden column those indices point at the wrong columns, and the walk can land on a leaf whose
// parentIndex is its own position - an infinite loop that hangs the tab (WI#18884, confirmed
// against kendo's own readColumns; 4.3.3 had no such walk, which is why AP's grouped Match grid
// kept its footer). Handing Kendo nothing hidden means nothing shifts, so grouped grids keep their
// totals footer too. Hidden columns are not lost: ColumnSelector still reads the full `columns`.
export function visibleGraphqlGridColumns(
  columns: GraphqlGridColumnOrGroup[],
): GraphqlGridColumnOrGroup[] {
  return columns.flatMap((column): GraphqlGridColumnOrGroup[] => {
    if (!isGraphqlGridColumnGroup(column)) {
      return column.hidden === true ? [] : [column];
    }
    const children = column.children.filter((child) => child.hidden !== true);
    return children.length > 0 ? [{ ...column, children }] : [];
  });
}

// Ported from apps/ap/src/utils/dataGridClear.ts's clearCache (flat grids) + clearCacheChilds
// (grouped grids) - apps/ap needs two near-identical functions because it has no shared column
// type; GraphqlGridColumnOrGroup already models both flat and grouped columns, so one function
// recursing on isGraphqlGridColumnGroup covers what both of those did.
//
// Walks `columns` (the grid's own freshly-built definitions, e.g.
// toSaleMatchColumns(saleMatchColumnsGrid)) as the base, and for every leaf whose field also
// exists in `cached` (a previously-persisted full column snapshot), copies over the
// user-controlled bits - `hidden`, `allowHide`, `width`. Everything else on the column (cell,
// filter, columnMenu) is never touched, so it can never go stale if globalColumns.ts changes it
// later. Because the walk starts from `columns` rather than `cached`, a column added to the
// grid's own definitions since the user last saved still comes through - with its own fresh
// defaults - instead of being lost for only being absent from what's cached.
//
// Does NOT restore a cached `id`/`orderIndex` (unlike clearCache/clearCacheChilds, which
// mirrored a reordering feature GraphqlGrid still doesn't have): those values index into the
// column array's shape at the time they were cached, and Kendo Grid's own internal
// parent/child column-tree walk trusts them as-is. Once a later deploy changes the grid's
// column definitions (added/removed/reordered), a stale index from a previous session's
// localStorage snapshot no longer lines up with the new array - Kendo's walk can end up
// cycling between two mismatched entries and hang the tab in an infinite loop. Restoring only
// the display-only fields below can never do that, since Kendo doesn't index by them.
export function mergeCachedGraphqlGridColumns(
  columns: GraphqlGridColumnOrGroup[],
  cached: GraphqlGridColumnOrGroup[],
): GraphqlGridColumnOrGroup[] {
  const mergeLeaf = (column: GraphqlGridColumn, cachedLeaves: GraphqlGridColumn[]): GraphqlGridColumn => {
    const match = cachedLeaves.find((leaf) => leaf.field === column.field);
    if (!match) {
      return column;
    }
    return {
      ...column,
      hidden: match.hidden ?? false,
      allowHide: match.allowHide,
      width: match.width,
    };
  };

  return columns.map((column) => {
    if (isGraphqlGridColumnGroup(column)) {
      const cachedGroup = cached.find(
        (candidate): candidate is GraphqlGridColumnGroup =>
          isGraphqlGridColumnGroup(candidate) && candidate.title === column.title,
      );
      const cachedChildren = cachedGroup?.children ?? [];
      return { ...column, children: column.children.map((child) => mergeLeaf(child, cachedChildren)) };
    }
    return mergeLeaf(column, cached.filter((candidate): candidate is GraphqlGridColumn => !isGraphqlGridColumnGroup(candidate)));
  });
}

// GraphqlGrid (see Index.vue) only registers footer-cell templates for these three totals
// behaviors - any other footerCell name (e.g. an app-specific one meant for a different grid
// component entirely) has no matching template there, so normalizeGraphqlGridColumns below drops
// it rather than pass it through as a dead string that would render nothing.
//
// NOTE: which columns actually reach Kendo's <Grid> is decided later, in Index.vue's
// renderedColumns (visibleGraphqlGridColumns above, which is also what keeps a grouped grid's
// footer from hanging, WI#18884). This function only normalizes what a column carries at
// authoring time.
export const GRAPHQL_GRID_FOOTER_TEMPLATES = new Set([
  "TotalsBycolumnsSum",
  "TotalsBycolumnsAvgWeightedCeil",
  "TotalsBycolumnsCountTrue",
  // AB#20489: added alongside Index.vue's own #TotalsBycolumnsAvgWeighted template (the plain,
  // non-ceil weighted average AB#20356's follow-up introduced for capturedCashDiscounts), but
  // never added here - this allow-list silently stripped that footerCell off every column using
  // it before it ever reached the summary request, so its total came back empty.
  "TotalsBycolumnsAvgWeighted",
  // AB#20489 review: Index.vue's #TotalsBycolumnsCount template (plain `count`, distinct from
  // TotalsBycolumnsCountTrue's `count.true`) was in Index.vue's own reserved-slot-names set but
  // missing here too - the same silent-strip bug this PR fixes, just not yet hit by a live column.
  "TotalsBycolumnsCount",
]);

function normalizeLeafColumn(column: GraphqlGridColumn): GraphqlGridColumn {
  const { footerCell, ...rest } = column;
  const withFooterCell =
    typeof footerCell === "string" && GRAPHQL_GRID_FOOTER_TEMPLATES.has(footerCell)
      ? { ...rest, footerCell }
      : rest;
  // GraphqlGrid's own column-menu popup only understands a column's native `filter` type
  // (text/numeric/boolean/date) - some shared column catalogs instead set `columnMenu` to an
  // app-specific template name meant for a different grid component, which would otherwise open
  // an empty popup. Normalizing them onto Kendo's own default popup is what `true` does here;
  // sorting still works via the header click, independent of this menu.
  //
  // An EXPLICIT `false` is respected, and that is not a nicety. A column whose value the backend
  // cannot filter by has no business offering a filter: the menu would build a `where` naming a
  // field the schema does not have, and the whole query fails with a validation error rather than
  // the one column misbehaving - the grid goes blank. Setting `filter: undefined` does NOT prevent
  // that, which is the trap this line exists to close: in Kendo `filter` chooses the editor TYPE
  // and defaults to text when absent, so stripping it leaves the filter offered and merely
  // untyped. Opting out of the menu is the only thing that removes it.
  return { ...withFooterCell, columnMenu: column.columnMenu === false ? false : true };
}

// Applies normalizeLeafColumn to every leaf column, recursing into a GraphqlGridColumnGroup's
// children - group parents are pure visual grouping and pass through untouched.
export function normalizeGraphqlGridColumns(
  source: GraphqlGridColumnOrGroup[],
): GraphqlGridColumnOrGroup[] {
  return source.map((column) =>
    isGraphqlGridColumnGroup(column)
      ? { ...column, children: column.children.map(normalizeLeafColumn) }
      : normalizeLeafColumn(column),
  );
}

// The fields a GraphQL selection set actually needs to request for this column set - hidden
// columns are skipped, since requesting a hidden column's field wastes bandwidth on data nobody
// sees (and, for a backend that cost-analyzes each query, spends budget on nothing rendered). A
// GraphQL selection set can't be empty, so `fallbackField` (typically the row's own identity
// field) is requested instead if every column is hidden.
export function visibleGraphqlGridFields(
  columns: GraphqlGridColumnOrGroup[],
  fallbackField: string,
): string[] {
  const fields = flattenGraphqlGridColumns(columns)
    .filter((column) => column.hidden !== true)
    .map((column) => column.field);
  return fields.length > 0 ? fields : [fallbackField];
}

export interface GraphqlGridSortDescriptor {
  field: string;
  dir?: "asc" | "desc";
}

// Bound straight to Kendo's own Grid "filter" prop, so it must structurally match
// CompositeFilterDescriptor (a hand-rolled shape rejects Kendo's leaf FilterDescriptor,
// which requires an "operator" field) - re-exported by name for the same docgen reason
// as GraphqlGridRow above.
export type GraphqlGridFilterDescriptor = CompositeFilterDescriptor;

/**
 * Controlled Kendo data state — parent maps this to GraphQL variables
 * (`skip`/`take` → offset/limit or page/itemsPerPage; `sort` → order).
 */
export interface GraphqlGridDataState {
  skip?: number;
  take?: number;
  sort?: GraphqlGridSortDescriptor[];
  filter?: GraphqlGridFilterDescriptor;
}

export interface GraphqlGridPageableSettings {
  buttonCount?: number;
  /**
   * Right-side pager block: items-per-page dropdown + `1 - 20 of N`.
   * Default false (hidden). `{ info: true }` shows the whole block.
   */
  info?: boolean;
  /** Kept for existing callers; the custom pager does not use an input mode. */
  type?: "numeric" | "input";
  /**
   * Page-size dropdown inside the right block.
   * `false` hides it; `true` or omit uses 10 / 20 / 50 / 100.
   */
  pageSizes?: boolean | number[];
  /** Kept for existing callers; Previous/Next always render as in Figma. */
  previousNext?: boolean;
  pageSizeValue?: number | string;
}

export type GraphqlGridPageable = boolean | GraphqlGridPageableSettings;

/** Kendo `select` map: dataItemKey value → selected. */
export type GraphqlGridSelectState = Record<string, boolean | number[]>;

export interface GraphqlGridSelectableSettings {
  enabled?: boolean;
  mode?: "single" | "multiple";
  cell?: boolean;
  drag?: boolean;
}

export type GraphqlGridSelectable = boolean | GraphqlGridSelectableSettings;

/** Kendo Grid `sortable` prop (boolean or sort settings object). */
export type GraphqlGridSortable =
  | boolean
  | {
      allowUnsort?: boolean;
      mode?: "single" | "multiple";
    };

export const GRAPHQL_GRID_DEFAULT_PAGE_SIZES = [10, 20, 50, 100] as const;

export const GRAPHQL_GRID_DEFAULT_PAGEABLE: GraphqlGridPageableSettings = {
  buttonCount: 5,
  info: false,
  type: "numeric",
  pageSizes: [...GRAPHQL_GRID_DEFAULT_PAGE_SIZES],
  previousNext: true,
};

export const GRAPHQL_GRID_DEFAULT_SORTABLE = {
  allowUnsort: true,
  mode: "single" as const,
};

export const GRAPHQL_GRID_DEFAULT_DATA_ITEM_KEY = "id";
export const GRAPHQL_GRID_DEFAULT_SELECTED_FIELD = "selected";

// Named alias, not inlined into Index.vue's props: same Storybook docgen issue as
// GraphqlGridRow above - a nested generic like `Record<string, string>` written directly
// inside PropType<{ ... }> corrupts the SFC by looking like an unclosed HTML tag.
export type GraphqlGridAnalyzeStore = { customDataPointTypes: Record<string, string> };
