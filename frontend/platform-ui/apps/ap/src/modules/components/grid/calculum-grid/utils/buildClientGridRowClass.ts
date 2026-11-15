/**
 * Pure row CSS-class builder for CalculumGrid row-render.
 * Client variant: expand/hide only — no pilot blur suffix.
 */

export type ClientGridRowClassDataItem = {
  disabled?: boolean;
  spendsAmount?: number;
  countOfProviders?: number;
  suppliersAmount?: number;
  phases?: number;
  [key: string]: unknown;
};

export type BuildClientGridRowClassInput = {
  baseClass: string;
  dataItem: ClientGridRowClassDataItem;
  entityCard: boolean;
  isForParent: boolean;
  isSummaryListPlan: boolean;
};

/**
 * Builds the `<tr>` class string matching historical `rowColorfunction` branches.
 */
export function buildClientGridRowClass({
  baseClass,
  dataItem,
  entityCard,
  isForParent,
  isSummaryListPlan,
}: BuildClientGridRowClassInput): string {
  if ("disabled" in dataItem && !entityCard) {
    let finalClass = dataItem.disabled
      ? baseClass + " item-excluded"
      : baseClass;

    if (!isForParent) {
      if ("spendsAmount" in dataItem) {
        const partialClass =
          (dataItem.spendsAmount as number) >= 2 ? "" : " hideExpanded";
        finalClass = finalClass + partialClass;
      }
    } else if ("countOfProviders" in dataItem) {
      const partialClass =
        (dataItem.countOfProviders as number) >= 1 ? "" : " hideExpanded";
      finalClass = finalClass + partialClass;
    }

    return finalClass;
  }

  if ("disabled" in dataItem && entityCard) {
    return dataItem.disabled
      ? baseClass + " item-excluded disabled-checkbox"
      : baseClass;
  }

  if (!isForParent) {
    const spendsAmount = dataItem.spendsAmount;
    return spendsAmount >= 2 ? baseClass : baseClass + " hideExpanded";
  }

  if (isSummaryListPlan) {
    const phases = dataItem.phases;
    return (phases as number) > 0 ? baseClass : baseClass + " hideExpanded";
  }

  const suppliersAmount = dataItem.suppliersAmount;
  return suppliersAmount >= 1 ? baseClass : baseClass + " hideExpanded";
}
