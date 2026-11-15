import { isNullOrUndefined } from "./";

export default class StringUtils {
  /**
   * Checks if the given value is null, undefined or empty.
   *
   * @param {string | undefined | null} value - The value to check for emptiness.
   * @return {boolean} Returns true if the value is empty, false otherwise.
   */
  static isNullUndefinedOrEmpty(
    value: string | undefined | null,
  ): value is null | undefined | "" {
    return value === "" || isNullOrUndefined(value);
  }

  /**
   * Checks if the given value is empty.
   *
   * @param {string | undefined | null} value - The value to check for emptiness.
   * @return {boolean} Returns true if the value is empty, false otherwise.
   */
  static isEmpty(value: string): boolean {
    return value === "";
  }

  /**
   * Capitalizes the first character of a string.
   *
   * @param {string} value - The string to capitalize.
   * @return {string} The string with the first character capitalized.
   */
  static capitalizeFirstCharacter(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  /**
   * Transforms a given value from camelCase to readable format
   * e.g.: "companySize" -> "Company Size", "EntityIndustryName" -> "Industry Name"
   *
   * @param {string} value - The value to transform.
   */
  static transformFromCamelCaseToReadable(value: string): string {
    // Validate
    if (this.isEmpty(value)) return "";

    // Split field name if there are characters in uppercase
    const splittedValue = value.split(/(?=[A-Z])/); // eg: "entityIndustryName" -> ["entity", "Industry", "Name"]

    // Capitalize first letter and join
    const valueFormatted = splittedValue
      .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");

    return valueFormatted;
  }

  /**
   * Formats a big number into a string representation with a suffix.
   * example: 1000000 -> 1m, 1500 -> 1.5k
   *
   * @param {number} value - The number to format.
   * @param {number} [maximumFractionDigits=1] - The maximum number of decimal places to include in the formatted string. Default is 1.
   * @param {string} [lang="en-US"] - The language code to use for formatting. Default is "en-US".
   * @param {boolean} [isCurrency=true] - Indicates whether the number to format is a currency amount. If true, it will be converted to the appropriate format. Default is true.
   * @return {string} - The formatted number as a string with a suffix.
   */
  static formatBigNumbers(
    value: number,
    options?: Partial<{
      maximumFractionDigits: number;
      minimumFractionDigits: number;
      lang: string;
    }>,
  ): string {
    // Init
    const { maximumFractionDigits = 1, minimumFractionDigits = 1, lang = "en-US" } = options || {};

    // Add suffix (s, i, q, t, b, m, k)

    if (Math.abs(value) >= 1.0e21) {
      return (
        (value / 1.0e21).toLocaleString(lang, { maximumFractionDigits, minimumFractionDigits }) + "s"
      );
    }

    if (Math.abs(value) >= 1.0e18) {
      return (
        (value / 1.0e18).toLocaleString(lang, { maximumFractionDigits, minimumFractionDigits }) + "i"
      );
    }

    if (Math.abs(value) >= 1.0e15) {
      return (
        (value / 1.0e15).toLocaleString(lang, { maximumFractionDigits, minimumFractionDigits }) + "q"
      );
    }

    if (Math.abs(value) >= 1.0e12) {
      return (
        (value / 1.0e12).toLocaleString(lang, { maximumFractionDigits, minimumFractionDigits }) + "t"
      );
    }

    if (Math.abs(value) >= 1.0e9) {
      return (
        (value / 1.0e9).toLocaleString(lang, { maximumFractionDigits, minimumFractionDigits }) + "b"
      );
    }

    if (Math.abs(value) >= 1.0e6) {
      return (
        (value / 1.0e6).toLocaleString(lang, { maximumFractionDigits, minimumFractionDigits }) + "m"
      );
    }

    if (Math.abs(value) >= 1.0e3) {
      return (
        (value / 1.0e3).toLocaleString(lang, { maximumFractionDigits, minimumFractionDigits }) + "k"
      );
    }

    if (Math.abs(value) < 1.0e3) {
      return value.toLocaleString(lang, { maximumFractionDigits, minimumFractionDigits });
    }

    return value.toLocaleString(lang, { maximumFractionDigits, minimumFractionDigits });
  }

  /**
   * Remove IRI
   * "/api/users/9a56c19d-cccc-4f4f-4f4f-123473f60342" -> "9a56c19d-cccc-4f4f-4f4f-123473f60342"
   *
   * @param iri string
   * @returns
   */
  static removeIRI(iri: string | null | undefined): string {
    if (this.isNullUndefinedOrEmpty(iri)) {
      return "";
    }

    const indexOfLastSlash = iri.lastIndexOf("/");

    // Did not found any slash
    if (indexOfLastSlash < 0) {
      return iri;
    }

    if (indexOfLastSlash >= iri.length + 1) {
      return "";
    }

    return iri.substring(indexOfLastSlash + 1);
  }
}


/**
 * Returns a string representation of a number with a specified number of decimal places.
 *
 * @param {string | number} number - The number to be formatted. If a number is provided, it will be converted to a string.
 * @param {number} [maximumFractionDigits=2] - The maximum number of decimal places to include in the formatted string. Default is 2.
 * @return {string} - The formatted number as a string.
 */
export const getNumberWithDecimals = (
  number: string | number,
  maximumFractionDigits = 2
): string => {
  // If number is of type string number, convert it to a string
  if (typeof number === "number") {
    number = number.toString();
  }

  const options = {
    maximumFractionDigits: maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits
  };

  // Get user currency formatting preference
  let finalFormatting = "en-US"

  return new Intl.NumberFormat(finalFormatting, options).format(
    parseFloat(number)
  );
};

