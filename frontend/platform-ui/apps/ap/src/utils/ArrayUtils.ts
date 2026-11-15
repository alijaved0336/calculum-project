import _sortBy from "lodash/sortBy";
import { GLOBAL_FILTER_EMPTY_VALUE } from "@/utils/globalFilterEmptyValue";


interface Column {
  field: string;
  title: string;
  filter?: string;
}

export default class ArrayUtils {
  /**
   * Checks if the given value is empty.
   *
   * @param {any} value - The value to check for emptiness.
   * @return {boolean} Returns true if the value is empty, false otherwise.
   */
  static isEmpty(value: any): boolean {
    return !Array.isArray(value) || value.length === 0;
  }

  
  

  static hasOneValueAndIsEmpty(items: any[]): boolean {
    return items?.length === 1 && items[0].value === GLOBAL_FILTER_EMPTY_VALUE;
  }
  
  
  static hasEmptyValues(items: any[]): boolean {
    if (items.length === 1) {
      return items[0].value === GLOBAL_FILTER_EMPTY_VALUE;
    } else {
      return false;
    }
  }

  static hasOnlyOneItem(items: any[]): boolean {
    if (this.isEmpty(items)) {
      return false;
    }

    return items.length === 1;
  }

  //filters nodes only if isPilot is true
  static filterNodesByIsPilot(nodes: Array<any>): Array<any> {
    return nodes.filter((node: any) => node.isPilot);
  }

  /**
   * Sorts an array of nodes by isPilot (false first, true last) and then alphabetically by entityName.
   * @param nodes - The array of nodes to be sorted.
   * @returns The sorted array of nodes.
   */
  static sortNodesByIsPilotAndName(nodes: Array<any>): Array<any> {
    return nodes.sort((a: any, b: any) => {
      // First compare isPilot (false comes before true)
      if (a.isPilot !== b.isPilot) {
        return a.isPilot ? 1 : -1;
      }
      // If isPilot is the same, compare by entityName alphabetically
      return a.entityName.localeCompare(b.entityName);
    });
  }

  /**
   * Given a list of numbers given the minimum and maximum values, returns
   * a list of numbers from the minimum to the maximum values.
   *
   * @param {number} min - The minimum value
   * @param {number} max - The maximum value
   * @return {number[]} - A list of numbers
   */
  static range(
    min: number,
    max: number,
    options?: Partial<{
      step: number;
      excludeNull: boolean;
      itemsCount: number;
    }>,
  ): number[] {
    // Init
    let { step = 1, excludeNull = false, itemsCount = 0 } = options || {};

    // Validate
    if (max < itemsCount) {
      return [];
    }

    if (min < 0 || max < 0) {
      return [];
    }

    const start = min;
    const end = max;

    // Validate
    itemsCount = itemsCount > 1 ? itemsCount : end - start + 1;

    step = (end - start) / (itemsCount - 1);

    const values = [];

    for (let i = 0; i < itemsCount; i++) {
      let value = start + step * i;

      // Round the value to one decimal
      value = Math.round(value * 10) / 10;

      values.push(value);
    }

    return values;
  }

  /**
   * Sort the array provided by ascending order and returns a new array with the sorted values.
   * Note: Add optional parameter options if needed.
   *
   * @param value
   * @returns
   */
  static sortAscBy(value: any[], iteratees: string[]) {
    // Validate
    if (ArrayUtils.isEmpty(value)) {
      return [];
    }

    return _sortBy(value, iteratees);
  }

  /**
   * Creates an array of key-value pairs from an array of objects.
   *
   * @param {Array<Object>} myArray - The array of objects to process.
   * @param {string} keyProperty - The property name to use as the key.
   * @param {string} valueProperty - The property name to use as the value.
   * @returns {Array<Object>} An array of objects, each containing `key` and `value` properties.
   *
   * @example
   *
   * const myArray = [
   *   { id: 1, name: 'John', age: 30 },
   *   { id: 2, name: 'Jane', age: 25 },
   * ];
   *
   * const result = createKeyPairs(myArray, 'id', 'name');
   * // result: [ { key: 1, value: 'John' }, { key: 2, value: 'Jane' } ]
   */
  static createKeyPairs(
    myArray: any[],
    keyProperty: string,
    valueProperty: string,
  ) {
    return myArray.map((item) => {
      return {
        key: item[keyProperty],
        value: item[valueProperty],
      };
    });
  }


  

  /**
   * Slot number of a custom data point column, or null for any other column.
   * `customDataPoint7` -> 7. Anchored so `customDataPointFoo` does not match.
   */
  static customDataPointSlot(field: string): number | null {
    const match = /^customDataPoint(\d+)$/.exec(field ?? "");
    return match ? Number(match[1]) : null;
  }

  /**
   * Apply the spend-file titles to the custom data point columns and drop the ones that must not
   * be offered at all.
   *
   * Bug#18966 — the backend sends, per slot 1..26, the resolved title (the one configured in the
   * spend file, or the "Custom Column N" placeholder when none was given) plus whether the slot
   * carries any spend data. Those two signals give the four cases:
   *
   *   titled + data     -> shown with its title
   *   untitled + data   -> shown as "Custom Column N"
   *   titled + no data  -> shown with its title (no values in the cells)
   *   untitled + no data-> dropped
   *
   * It used to be decided by looking for the word "custom" inside the title, which could not tell
   * "untitled but filled" from "untitled and empty" (so columns 4-20 with data disappeared), and
   * dropped any non-custom column whose title happened to contain "custom".
   *
   * @param customHeaders  resolved titles, index 0 => slot 1 (`nameCustomDataPoints`)
   * @param customHasData  data presence, index 0 => slot 1 (`customDataPointsHasData`)
   */
  static cleanCustomColumns(
    columns: Column[],
    customHeaders: string[],
    customHasData: boolean[] = [],
  ): Column[] {
    columns.forEach((column) => {
      const slot = ArrayUtils.customDataPointSlot(column.field);
      if (slot !== null && customHeaders[slot - 1] !== undefined) {
        column.title = customHeaders[slot - 1];
      }
    });

    return columns.filter((column: Column) => {
      const slot = ArrayUtils.customDataPointSlot(column.field);
      if (slot === null) {
        return true;
      }
      if (customHasData[slot - 1] === true) {
        return true;
      }
      // Nothing resolved for this slot yet (titles not loaded): keep it hidden rather than
      // flashing a placeholder column.
      const title = customHeaders[slot - 1];
      if (title === undefined) {
        return false;
      }
      return title !== `Custom Column ${slot}`;
    });
  }
}
