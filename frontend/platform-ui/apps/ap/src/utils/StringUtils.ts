import { isNullOrUndefined } from ".";
import { changeToCurrency } from "./FormatData";

export default class StringUtils {
  /**
   * Checks if the given value is empty.
   *
   * @param {string} value - The value to check for emptiness.
   * @return {boolean} Returns true if the value is empty, false otherwise.
   */
  static isEmpty(value: string): boolean {
    return value === "";
  }

  /**
   * Checks if the given value is null, undefined or empty.
   *
   * @param {string | undefined | null} value - The value to check for emptiness.
   * @return {boolean} Returns true if the value is empty, false otherwise.
   */
  static isNullUndefinedOrEmpty(
    value: string | undefined | null | boolean | number,
  ): value is null | undefined | "" {
    return value === "" || isNullOrUndefined(value);
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
   * Transforms a given string in the format of "phrase1|phrase2|phrase3"
   * into an array of phrases.
   * e.g.: "entity|industry|name" -> ["entity", "industry", "name"]
   *
   * @param {string} value
   */
  static transformFromPipeSeparatedToArray(value: string): string[] {
    return value.split("|");
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
      lang: string;
      minimumFractionDigits: number;
    }>,
  ): string {
    // Init
    const { maximumFractionDigits = 1, minimumFractionDigits = 1, lang = "en-US" } = options || {};

    if (value == null || Number.isNaN(value)) return "-";

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

    if (Math.abs(value) > 0 && Math.abs(value) < 1.0e3) {
      return value.toLocaleString(lang, { maximumFractionDigits, minimumFractionDigits });
    }

    if (Math.abs(value) === 0) {
      return "0";
    }

    return value.toLocaleString(lang, { maximumFractionDigits, minimumFractionDigits });
  }

  /**
   * Formats a monetary number into a string with a suffix (k, m, b, t, q, i, s),
   * applying the user's selected currency rate first.
   *
   * Use when the input value is in native currency (e.g. USD) and the UI
   * needs to display it in the user's selected currency. If the value is
   * already in the user's currency (e.g. it came from a backend endpoint
   * that applied the rate server-side), use {@link formatBigNumbers}
   * instead.
   *
   * @param value The number to format, expressed in native currency.
   * @param options Forwarded to {@link formatBigNumbers}.
   */
  static formatBigCurrency(
    value: number | null | undefined,
    options?: Partial<{
      maximumFractionDigits: number;
      lang: string;
      minimumFractionDigits: number;
    }>,
  ): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return StringUtils.formatBigNumbers(0, options);
    }
    return StringUtils.formatBigNumbers(changeToCurrency(value), options);
  }

  /**
   * Format number as percentage
   * example: 0.1 -> 10%
   *
   * @param {number | null | string} value
   * @return {string}
   */
  static formatPercentage(
    value?: number | null | string,
    options?: Partial<{
      minimumFractionDigits: number;
      lang: string;
    }>,
  ): string {
    // Set default values
    const { minimumFractionDigits = 2, lang = "en-US" } = options || {};

    
    if (typeof value === 'string') {
      value = parseFloat(value);
      if (isNaN(value as number)) {
        return "N/A";
      }
    }
    // Validate value is defined but could be 0
    if (!value && value !== 0) {
      return "N/A";
    }

    return (value as number).toLocaleString(lang, {
      style: "percent",
      minimumFractionDigits,
    });
  }

  /**
   * Remove IRI
   * "/api/users/{iri_example}" -> "{iri_example}"
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

  /**
   * Given a string comma separated list of items, returns "+" prefix and items count minus 1
   *
   * @param {string} value
   * @return {string}
   *
   * codes.value.split(',').length > 1 ? `+${codes.value.split(',').length - 1}` : ""
   */
  static getPlusPrefixItemsCountMinusOne(value: string): string {
    return value.split(",").length > 1 ? `+${value.split(",").length - 1}` : "";
  }

  static addPercentSignToString(value: number): string {
    return `${value}%`;
  }

  static validateFieldInArray(field: string): boolean {
    const fieldsLarges = ["entityName", "entityIndustryName"];
    return fieldsLarges.includes(field);
  }


  static getDomains(domainsString: string): any {
    if (domainsString === null) return []
    const domainsList = domainsString
      .split(',')
      .map(domain => domain.trim())
      .filter(domain => domain !== '');
    return domainsList  
  }

  static getEmails(emailsString: string | null | undefined): string[] {
    if (!emailsString) return []
    const seen = new Set<string>()
    const result: string[] = []
    for (const part of emailsString.split(',')) {
      const trimmed = part.trim()
      if (trimmed === '') continue
      const normalizedEmail = trimmed.toLowerCase()
      if (seen.has(normalizedEmail)) continue
      seen.add(normalizedEmail)
      result.push(trimmed)
    }
    return result
  }

  /**
   * Formats a number with 1 decimal place and thousands separators
   * Used for tooltips to show precise values
   * @param value - The number to format
   * @returns Formatted string with 1 decimal or '-' if invalid
   */
  static formatNumberWithOneDecimal(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-'
    }
    return Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })
  }

  /**
   * Extracts specific patterns from text strings:
   * - "Box X" or "box X" → returns only the number X
   * - "Non-SME (X)" or "SME (X)" → returns only "Non-SME" or "SME"
   * - If no pattern matches, returns the original value
   *
   * @param {string} value - The text to extract the pattern from
   * @returns {string} - The extracted value or the original text if no match
   *
   * @example
   * extractPatternFromText("Box 4")        // returns "4"
   * extractPatternFromText("box 45")       // returns "45"
   * extractPatternFromText("Non-SME (81)") // returns "Non-SME"
   * extractPatternFromText("SME (1)")      // returns "SME"
   * extractPatternFromText("Other text")   // returns "Other text"
   */
  static extractPatternFromText(value: string): string {
    if (this.isNullUndefinedOrEmpty(value)) {
      return value ?? "";
    }

    // Pattern 1: Match "Box X" or "box X" (case insensitive) and extract the number
    // const boxPattern = /^box\s+(\d+)$/i;
    // const boxMatch = value.match(boxPattern);
    // if (boxMatch) {
    //   return boxMatch[1];
    // }

    // Pattern 2: Match "Non-SME (X)" or "SME (X)" and extract "Non-SME" or "SME"
    const smePattern = /^(Non-SME|SME)\s*\(\d+\)$/i;
    const smeMatch = value.match(smePattern);
    if (smeMatch) {
      // Normalize to proper case
      const matched = smeMatch[1].toLowerCase();
      return matched === "non-sme" ? "Non-SME" : "SME";
    }

    // No pattern matched, return original value
    return value;
  }
  /**
   * Capitalizes the first letter of a string
   * @param str - The string to capitalize
   * @returns The capitalized string
   */
  static capitalizeFirstLetter(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  /**
   * Converts a string to title case
   * @param str - The string to convert
   * @returns The title case string
   */
  static toTitleCase(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Escapes HTML special characters so the string is safe to use in HTML content.
   * Used for mention display names inside highlight spans.
   */
  static escapeHtml(s: string): string {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(s).replaceAll(/[&<>"']/g, (ch) => map[ch] ?? ch);
  }

  /**
   * Builds a display name from user fields: "firstName lastName", fallback to email.
   * Used for mentions in ActivityPanel and ActivityNoteBubble.
   */
  static getDisplayNameFromUser(user: { firstName?: string | null; lastName?: string | null; email?: string }): string {
    const first = (user.firstName ?? '').trim();
    const last = (user.lastName ?? '').trim();
    return [first, last].filter(Boolean).join(' ') || (user.email ?? '');
  }
}

// Remove repeated elements from a string
export function removeDuplicateLines(input: string, jumpLine:boolean=false): string {
  const lines = input.split(/\s+/);
  const uniqueLines = new Set<string>(); 
  const result: string[] = [];

  for (const line of lines) {
      if (line.trim() && !uniqueLines.has(line)) {
          uniqueLines.add(line);
          result.push(line);
      }
  }
  if (jumpLine) {
    return result.join('\n');
  }
  return result.join(' ');
}