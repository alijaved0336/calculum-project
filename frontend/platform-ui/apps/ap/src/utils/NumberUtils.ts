import { toInteger as _toInteger, round as _round } from "lodash";

export default class NumberUtils {
  /**
   *
   */
  static round(
    value: number,
    options?: {
      precision: number;
    }
  ): number {
    const { precision = 0 } = options || {};

    return _round(value, precision);
  }

  /**
   * Generates and returns a random integer between 0 and 10000 if no parameter is provided.
   *
   * @param options - An optional object to customize the range of the random number.
   * @param options.min - The minimum value of the random number. Default is 0.
   * @param options.max - The maximum value of the random number. Default is 10000.
   * @returns A random integer within the specified range.
   */
  static getRandomInt(
    options?: Partial<{
      min: number;
      max: number;
    }>
  ): number {
    const { min = 0, max = 10000 } = options || {};

    return Math.floor(Math.random() * (max - min) + min);
  }

  /**
   * Convert the given value to an integer number.
   *
   * @param value {number}
   * @return {number}
   */
  static toInteger(value: number): number {
    return _toInteger(value);
  }
  static addThousandsSeparator(number: any, separator = ',') {
    // Convert the number to a string
    let numberString = number.toString();

    // Split the string into integer and decimal parts
    let [integerPart, decimalPart] = numberString.split('.');

    // Add thousands separators to the integer part
    let formattedIntegerPart = '';
    for (let i = 0; i < integerPart.length; i++) {
      formattedIntegerPart += integerPart[i];
      if ((integerPart.length - i - 1) % 3 === 0 && i !== integerPart.length - 1) {
        formattedIntegerPart += separator;
      }
    }

    // Combine the formatted integer part and the decimal part (if any)
    let result = decimalPart ? formattedIntegerPart + '.' + decimalPart : formattedIntegerPart;

    return result;
    // return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  }

  static removeThousandsSeparator(numberWithSeparator: string, separator = ',') {
    // Initialize a variable to hold the result
    let result = '';

    // Iterate through each character in the input string
    for (let i = 0; i < numberWithSeparator.length; i++) {
        const currentChar = numberWithSeparator[i];
        // Only append characters that are not the separator
        if (currentChar !== separator) {
            result += currentChar;
        }
    }

    return result;


  }

  static differenceBetweenTwoNumbers(a: number, b: number): number {
    return a - b;
  }
}
