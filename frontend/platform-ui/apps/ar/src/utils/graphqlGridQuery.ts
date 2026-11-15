import { gql, type ApolloClient, type NormalizedCacheObject } from "@apollo/client/core";

// Describes one GraphQL collection field shaped like Ada's own paginated grids: `skip`/`take`/
// `where`/`order` args, returning `{ totalCount, items }`. Shared across every AR grid built on
// GraphqlGrid, so a new grid only needs to declare its own config rather than hand-write a query
// builder + fetcher again (see apps/ar/src/modules/match/data/saleMatchRows.ts for an example).
export interface GraphqlGridQueryConfig {
  /** GraphQL field name of the paginated collection, e.g. "saleMatchRows". */
  queryField: string;
  /** Operation name used when no `where` clause is sent. */
  operationName: string;
  /** Operation name used when a `where` clause is sent. */
  filteredOperationName: string;
  /** Backend input type for `$where`, e.g. "SaleMatchRowFactFilterInput". */
  filterInputType: string;
  /** Backend input type for `$order`, e.g. "SaleMatchRowFactSortInput". */
  sortInputType: string;
  /**
   * Extra top-level identity variables the query needs beyond skip/take/where/order, e.g.
   * `{ versionUuid: "UUID!" }` to scope saleMatchRows to one spend file version. Most Ada.*.Api
   * grid fields need at least one - keyed by variable name, valued by its GraphQL type.
   */
  scopeVariables: Record<string, string>;
}

// graphql-tag caches parsed documents by their literal source text, so building this per-call
// rather than once at module scope doesn't cost a re-parse for a repeated field set (e.g. paging
// through the same visible columns) - and it has to be built per-call anyway, since the field
// selection depends on which columns are currently visible.
function buildGraphqlGridPageQuery(
  config: GraphqlGridQueryConfig,
  fields: string[],
  withWhere: boolean,
  extraArgs: GraphqlGridFieldArgument[],
) {
  const selection = fields.join("\n        ");
  const scopeNames = Object.keys(config.scopeVariables);
  const scopeVariableDecls = scopeNames.map((name) => `$${name}: ${config.scopeVariables[name]}`).join("\n          ");
  const scopeArgs = scopeNames.map((name) => `${name}: $${name}`).join(", ");

  // Declared and passed as VARIABLES, never interpolated as values: the argument's name and GraphQL
  // type are the caller's own literals and its value travels in the variables map, so nothing a user
  // typed ever reaches the document text.
  const extraDecls = extraArgs.map((arg) => `$${arg.name}: ${arg.type}`).join("\n          ");
  const extraFieldArgs = extraArgs.map((arg) => `, ${arg.name}: $${arg.name}`).join("");

  return withWhere
    ? gql`
        query ${config.filteredOperationName}(
          ${scopeVariableDecls}
          $skip: Int
          $take: Int
          $where: ${config.filterInputType}
          $order: [${config.sortInputType}!]
          ${extraDecls}
        ) {
          ${config.queryField}(${scopeArgs}, skip: $skip, take: $take, where: $where, order: $order${extraFieldArgs}) {
            totalCount
            items {
              ${selection}
            }
          }
        }
      `
    : gql`
        query ${config.operationName}(
          ${scopeVariableDecls}
          $skip: Int
          $take: Int
          $order: [${config.sortInputType}!]
          ${extraDecls}
        ) {
          ${config.queryField}(${scopeArgs}, skip: $skip, take: $take, order: $order${extraFieldArgs}) {
            totalCount
            items {
              ${selection}
            }
          }
        }
      `;
}

/**
 * One argument of the collection FIELD itself, beyond skip/take/where/order.
 *
 * Ada's grids need this for the per-ordinal custom-attribute arguments: a tenant's attributes are
 * deliberately NOT fields of the `where` input — that would make the GraphQL schema's shape depend
 * on what each tenant declared — so they travel as `customFilters`/`customSorts` arguments of the
 * list field instead, and a shared page fetcher that only knew about `where` could not send them.
 */
export interface GraphqlGridFieldArgument {
  /** The argument's name on the field, e.g. `customFilters`. */
  name: string;
  /** Its GraphQL type, e.g. `[CustomAttributeFilterInput!]`. */
  type: string;
  value: unknown;
}

export interface GraphqlGridPage<TRow> {
  items: TRow[];
  total: number;
  /**
   * The GraphQL variables this page was fetched with (scope, `where`, `order` and the field's extra
   * arguments, without `skip`/`take`). The export reads these so a file is built from exactly the
   * filter and sort the grid last sent, never from a second derivation of them.
   */
  variables?: Record<string, unknown>;
}

export interface GraphqlGridPageParams {
  /** Values for config.scopeVariables, e.g. `{ versionUuid }`. */
  scope: Record<string, unknown>;
  fields: string[];
  skip?: number;
  take?: number;
  order?: Record<string, "ASC" | "DESC">[];
  where?: Record<string, unknown> | null;
  /** Extra arguments of the collection field itself — see GraphqlGridFieldArgument. Omitted from the
   * document entirely when empty, so a grid that needs none sends the query it always sent. */
  fieldArguments?: GraphqlGridFieldArgument[];
}

export async function fetchGraphqlGridPage<TRow>(
  apolloClient: ApolloClient<NormalizedCacheObject>,
  config: GraphqlGridQueryConfig,
  {
    scope, fields, skip = 0, take = 50, order = [], where = null, fieldArguments = [],
  }: GraphqlGridPageParams,
): Promise<GraphqlGridPage<TRow>> {
  const extraVariables = Object.fromEntries(
    fieldArguments.map((argument) => [argument.name, argument.value]));

  const variables = where
    ? { ...scope, skip, take, where, order, ...extraVariables }
    : { ...scope, skip, take, order, ...extraVariables };

  const { data } = await apolloClient.query({
    query: buildGraphqlGridPageQuery(config, fields, where !== null, fieldArguments),
    variables,
    // The default 'cache-first' policy hides the server's current truth whenever a page/filter/sort
    // combination was already fetched once - most commonly page 1 unfiltered with the default sort,
    // which is exactly what "Clear all filters" returns to. That reads as "Clear did nothing": Apollo
    // serves the old cached snapshot instead of asking the server again. A live operational grid needs
    // this call to always hit the network for the CURRENT view state; it still writes into the cache
    // so other readers stay in sync, network-only just refuses to read a stale hit for itself.
    fetchPolicy: "network-only",
  });
  return {
    items: data[config.queryField].items,
    total: data[config.queryField].totalCount,
    variables: { ...scope, where, order, ...extraVariables },
  };
}
