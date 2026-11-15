/**
 * Row → parent filter event forwards for CalculumGridGraphql.
 */

export type GraphqlGridRowFilterEmit = (
  event:
    | "send-harmonization-filter"
    | "send-financing-filter"
    | "send-approach-filter"
    | "send-status-filter",
  ...args: unknown[]
) => void;

export interface UseGraphqlGridRowFilterEmitsOptions {
  emit: GraphqlGridRowFilterEmit;
}

export function useGraphqlGridRowFilterEmits(
  options: UseGraphqlGridRowFilterEmitsOptions,
) {
  function filterHarmonizationbyRow(
    group: unknown,
    level: unknown,
    idForFilter: unknown,
    entityType: unknown,
  ) {
    options.emit(
      "send-harmonization-filter",
      group,
      level,
      idForFilter,
      entityType,
    );
  }

  function filterFinancingbyRow(
    group: unknown,
    idForFilter: unknown,
    entityType: unknown,
  ) {
    options.emit("send-financing-filter", group, idForFilter, entityType);
  }

  function filterApproachbyRow(
    approach: unknown,
    idForFilter: unknown,
    entityType: unknown,
  ) {
    options.emit("send-approach-filter", approach, idForFilter, entityType);
  }

  function filterStatusbyRow(
    status: unknown,
    idForFilter: unknown,
    entityType: unknown,
  ) {
    options.emit("send-status-filter", status, idForFilter, entityType);
  }

  return {
    filterHarmonizationbyRow,
    filterFinancingbyRow,
    filterApproachbyRow,
    filterStatusbyRow,
  };
}
