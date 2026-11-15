import { ArrayUtils, ColorsUtils, isNullOrUndefined } from "@/utils";
import { translate } from "@/utils/translation";
import { isUndefined } from "lodash";

export default class PaymentTermsStrategiesUtils {
  static readonly STRATEGY_COLOR_DEFAULT: string = ColorsUtils.gray[400]; // $color-gray-400 #98A2B3"

  static readonly STRATEGY_COLOR_LIMITING_EFFECT: string = "#FF2C4F";

  /**
   * Sets the color bar for the given payment strategy key.
   * Notes:
   * - strategies param is deprecated
   * - paymentTerms param is deprecated
   *
   * @param {string} strategyKey - The payment strategy key.
   */
  static getColorByStrategyKey(
    strategyKey: string,
    options?: Partial<{
      strategies?: any[];
      paymentTerms?: any[];
    }>
  ): string {
    const { strategies, paymentTerms } = options || {};

    switch (strategyKey) {
      case "contractualTerms":
        return ColorsUtils.graycool[600];

      case "currentTerms":
        return "#06aed4"; // $color-cyan-500

      case "proposedTerms":
      case "opportunityTerms":
        return ColorsUtils.teal[500];

      case "targetTerms":
        return ColorsUtils.teal[700];

      case "scfStandardStrategy":
        return "#FFB524";

      case "cashDiscountConversionStrategy":
      case "harmonization":
      case "industryRegionStandardStrategy":
      case "payOnTermsStrategy":
      case "parentSupplierMaxStrategy":
      case "vCard":
        return ColorsUtils.blue[500];

      case "financingStrategy":
      case "peerGroupAvgStrategy":
      case "supplierStandardStrategy":
        return ColorsUtils.blueDark[800];

      case "agreedNewTerms":
        return ColorsUtils.violet[600];

      case "regulatoryTermsStrategy": {
        // The backend flags isLimit=true when the regulatory strategy is the final applied
        // one (strategyFinal === "RT"), i.e. regulation is the binding constraint on the
        // proposed terms → paint the bar red. Otherwise it has no limiting effect → grey.
        const regulatoryStrategyObject = strategies?.find(
          item => item?.key === "regulatoryTermsStrategy"
        );

        return regulatoryStrategyObject?.isLimit
          ? ColorsUtils.primary[500]
          : this.STRATEGY_COLOR_DEFAULT;
      }
      case "buyerStandardStrategy": {
        // Validate
        if (
          isNullOrUndefined(strategies) ||
          isNullOrUndefined(paymentTerms) ||
          ArrayUtils.isEmpty(strategies) ||
          ArrayUtils.isEmpty(paymentTerms)
        ) {
          return this.STRATEGY_COLOR_DEFAULT;
        }

        let buyerStandardStrategyObject = strategies.find(
          item => item.key === "buyerStandardStrategy"
        );

        if (isUndefined(buyerStandardStrategyObject)) {
          return this.STRATEGY_COLOR_DEFAULT;
        }

        if (buyerStandardStrategyObject.isLimit) {
          return ColorsUtils.primary[500];
        }

        return ColorsUtils.blueDark[800];
      }
      default:
        return this.STRATEGY_COLOR_DEFAULT;
    }
  }

  /**
   * Gets the color bar for the given payment strategy key
   * in the details section (the one next to Adabot).
   */
  static getColorByStrategyKeyDetailsSection(strategyKey: string): string {
    if (
      strategyKey === "supplierStandardStrategy" ||
      strategyKey === "peerGroupAvgStrategy" ||
      strategyKey === "scfStandardStrategy"
    ) {
      return PaymentTermsStrategiesUtils.getColorByStrategyKey(strategyKey);
    }

    if (strategyKey === 'actualTerms' || strategyKey === 'currentTerms') {
      return ColorsUtils.cyan[400];
    }

    if (strategyKey === 'contractualTerms') {
      return ColorsUtils.graycool[600];
    }

    
    return ColorsUtils.blue[500];
  }

  /**
   * Finds and compares terms in the given data strategies.
   * Notes:
   * - strategies param is deprecated
   * - paymentTerms param is deprecated
   *
   * @param {string} valueBeingCompared
   * @param {Array} strategies
   * @return {boolean} Returns true if the value being compared's count is greater than or equal to the maximum terms count, otherwise returns false.
   */
  static findAndCompareTerms(
    valueBeingCompared: string,
    {
      strategies,
      paymentTerms
    }: Partial<{ strategies?: any[]; paymentTerms?: any[] }>
  ): boolean {
    // Validate
    if (
      strategies === undefined ||
      paymentTerms === undefined ||
      ArrayUtils.isEmpty(strategies) ||
      ArrayUtils.isEmpty(paymentTerms)
    ) {
      if (import.meta.env.DEV) {
        console.warn(
          "** Error in findAndCompareTerms: strategies or paymentTerms is empty"
        );
      }

      return false;
    }

    const foundItem = strategies.find(item => item?.key === valueBeingCompared);

    if (foundItem && valueBeingCompared === "regulatoryTermsStrategy") {
      return foundItem.terms > (paymentTerms[2].terms ?? 0);
    } else if (foundItem && valueBeingCompared === "buyerStandardStrategy") {
      //checks dataStrategies[i].terms
      //first get the larget term inside the array
      let maxTerms = 0;

      for (const element of strategies) {
        if (element.terms && element.terms > maxTerms) {
          maxTerms = element.terms;
        }
      }

      //check if every strategy.infoCards.key === groupBehavior and its value === 'high limit'
      let everyStrategyHasHighLimit = this.checkIfEveryStrategyHasHighLimit(
        strategies
      );

      /**
       * When the behavior for all spends is "High limit" (everyStrategyHasHighLimit)
       * and the Buyer Standard is lower than the largest strategy (buyerStandardStrategy.terms < maxTerms),
       * the bar should be in color red
       */
      return foundItem.terms < maxTerms && everyStrategyHasHighLimit;
    }

    return false;
  }

  /**
   * Supplier Standard 2.0 only. Parenthetical annotation for the strategy title/subtitle when the
   * value was influenced by the supplier's DSO - e.g. "(DSO Adjusted)". A Parent entity can have both
   * flags true at once (bool_or() rollup over mixed children), in which case both show, joined.
   */
  static getSupplierStandard2DsoAnnotation(
    details?: { dsoAdjustmentApplied?: boolean | null; dsoFallbackApplied?: boolean | null } | null
  ): string {
    if (!details) {
      return "";
    }

    const parts: string[] = [];
    if (details.dsoAdjustmentApplied) {
      parts.push(translate.t("home.entityCard.strategies.dsoAdjustedLabel"));
    }
    if (details.dsoFallbackApplied) {
      parts.push(translate.t("home.entityCard.strategies.dsoBasedLabel"));
    }

    return parts.length > 0 ? `(${parts.join(" / ")})` : "";
  }

  static checkIfEveryStrategyHasHighLimit(strategies: any[]): boolean {
    for (let strategy of strategies) {
      // Check if the strategy has infoCards and if infoCards.key === 'groupBehavior' and its value === 'high limit'
      if (
        !(
          strategy.infoCards &&
          strategy.infoCards.key === "groupBehavior" &&
          strategy.infoCards.value === "high limit"
        )
      ) {
        // If any strategy doesn't meet the condition, return false
        return false;
      }
    }

    // If all strategies meet the condition, return true
    return true;
  }
}
