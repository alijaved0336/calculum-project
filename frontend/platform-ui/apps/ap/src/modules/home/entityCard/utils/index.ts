/**
 * Join payment-terms description strings for display (e.g. strategy cards).
 */
export function joinPaymentTermsDescriptions(
  paymentTermsDescriptions: Array<string> | null | undefined,
): string {
  return paymentTermsDescriptions && paymentTermsDescriptions.length > 0
    ? paymentTermsDescriptions.join(", ")
    : "";
}

/**
 * Get the entity's credit rating level given grade level text
 *
 * @param {string} gradeLevelText
 */
export function entityCRlevelByGradeLevelText(gradeLevelText: string) {
  switch (gradeLevelText) {
    case "Very Weak":
      return 1;
    case "Weak":
      return 2;
    case "Medium":
      return 3;
    case "Strong":
      return 4;
    case "Very Strong":
      return 5;
    default:
      return 0;
  }
}
