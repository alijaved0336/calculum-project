function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export default class StringUtils {
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
}
