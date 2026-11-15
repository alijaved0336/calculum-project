/**
 * Pure row CSS-class builder for CalculumGridGraphql row-render.
 * Blur / pilot / section gating stay in the facade or application layer;
 * pass the resolved suffix in as `blurSuffix`.
 */

export type GraphqlGridRowClassDataItem = {
  disabled?: boolean;
  spendsAmount?: number;
  countOfProviders?: number;
  suppliersAmount?: number;
  [key: string]: unknown;
};

export type BuildGraphqlGridRowClassInput = {
  baseClass: string;
  dataItem: GraphqlGridRowClassDataItem;
  entityCard: boolean;
  isForParent: boolean;
  blurSuffix: string;
};

/**
 * Builds the `<tr>` class string matching historical `rowColorfunction` branches.
 */
export function buildGraphqlGridRowClass({
  baseClass,
  dataItem,
  entityCard,
  isForParent,
  blurSuffix,
}: BuildGraphqlGridRowClassInput): string {
  if ("disabled" in dataItem && !entityCard) {
    let finalClass = dataItem.disabled
      ? baseClass + " item-excluded"
      : baseClass;

    if (!isForParent) {
      if ("spendsAmount" in dataItem) {
        const partialClass =
          (dataItem.spendsAmount as number) >= 2
            ? blurSuffix
            : " hideExpanded" + blurSuffix;
        finalClass = finalClass + partialClass;
      }
    } else if ("countOfProviders" in dataItem) {
      const partialClass =
        (dataItem.countOfProviders as number) >= 1 ? "" : " hideExpanded";
      finalClass = finalClass + partialClass + blurSuffix;
    }

    return finalClass;
  }

  if ("disabled" in dataItem && entityCard) {
    return dataItem.disabled
      ? baseClass +
          " item-excluded disabled-checkbox " +
          blurSuffix
      : baseClass + " " + blurSuffix;
  }

  if (!isForParent) {
    const spendsAmount = dataItem.spendsAmount;
    return spendsAmount >= 2
      ? baseClass + blurSuffix
      : baseClass + " hideExpanded " + blurSuffix;
  }

  const suppliersAmount = dataItem.suppliersAmount;
  return suppliersAmount >= 1
    ? baseClass + blurSuffix
    : baseClass + " hideExpanded " + blurSuffix;
}
