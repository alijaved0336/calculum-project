import { toValue, type MaybeRefOrGetter } from "vue";

export type ClientGridFinancingEntity = {
  name: string;
  selected?: boolean;
  [key: string]: unknown;
};

export type ClientGridFinancingEntityEmit = (
  event: "select-company-entity-financing-data-view",
  ...args: unknown[]
) => void;

export interface SelectClientGridFinancingEntityInput {
  gridData: ClientGridFinancingEntity[];
  entity: ClientGridFinancingEntity;
}

/**
 * Marks the matching row selected and clears selection on the rest.
 * Mutates `gridData` in place (same as the historical SFC).
 * Client grid matches on `name` (Graphql uses `entityName`).
 */
export function selectClientGridFinancingEntity({
  gridData,
  entity,
}: SelectClientGridFinancingEntityInput): void {
  const obj = gridData.find((x) => x.name === entity.name);
  gridData.forEach((row) => {
    row.selected = row.name === obj!.name;
  });
}

export interface UseClientGridFinancingEntitySelectOptions {
  gridData: MaybeRefOrGetter<ClientGridFinancingEntity[]>;
  emit: ClientGridFinancingEntityEmit;
}

/**
 * Financing data-view entity radio selection for CalculumGrid.
 */
export function useClientGridFinancingEntitySelect(
  options: UseClientGridFinancingEntitySelectOptions,
) {
  function selectCompanyEntity(entity: ClientGridFinancingEntity) {
    selectClientGridFinancingEntity({
      gridData: toValue(options.gridData) as ClientGridFinancingEntity[],
      entity,
    });
    options.emit("select-company-entity-financing-data-view", entity);
  }

  return {
    selectCompanyEntity,
  };
}
