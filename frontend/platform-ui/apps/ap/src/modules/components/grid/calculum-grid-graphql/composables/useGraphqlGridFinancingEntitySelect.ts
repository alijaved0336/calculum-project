import { toValue, type MaybeRefOrGetter } from "vue";

export type GraphqlGridFinancingEntity = {
  entityName: string;
  selected?: boolean;
  [key: string]: unknown;
};

export type GraphqlGridFinancingEntityEmit = (
  event: "select-company-entity-financing-data-view",
  ...args: unknown[]
) => void;

export interface SelectGraphqlGridFinancingEntityInput {
  gridData: GraphqlGridFinancingEntity[];
  entity: GraphqlGridFinancingEntity;
}

/**
 * Marks the matching row selected and clears selection on the rest.
 * Mutates `gridData` in place (same as the historical SFC).
 */
export function selectGraphqlGridFinancingEntity({
  gridData,
  entity,
}: SelectGraphqlGridFinancingEntityInput): void {
  const obj = gridData.find((x) => x.entityName === entity.entityName);
  gridData.forEach((row) => {
    row.selected = row.entityName === obj!.entityName;
  });
}

export interface UseGraphqlGridFinancingEntitySelectOptions {
  gridData: MaybeRefOrGetter<GraphqlGridFinancingEntity[]>;
  emit: GraphqlGridFinancingEntityEmit;
}

/**
 * Financing data-view entity radio selection for CalculumGridGraphql.
 */
export function useGraphqlGridFinancingEntitySelect(
  options: UseGraphqlGridFinancingEntitySelectOptions,
) {
  function selectCompanyEntity(entity: GraphqlGridFinancingEntity) {
    selectGraphqlGridFinancingEntity({
      gridData: toValue(options.gridData) as GraphqlGridFinancingEntity[],
      entity,
    });
    options.emit("select-company-entity-financing-data-view", entity);
  }

  return {
    selectCompanyEntity,
  };
}
