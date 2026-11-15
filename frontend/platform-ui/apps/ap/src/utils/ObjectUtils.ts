import { transform, isEqual, isObject } from "lodash";
import { isNullOrUndefined } from ".";

class ObjectUtils {
  /**
   * Deep clones an object
   *
   * @param obj
   * @returns
   */
  static cloneDeep(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }

  static customFiledPatterns() {
    return /^CUSTOM_FIELD_\d+$/;
  }

  /**
   * Checks if the given value is empty.
   *
   * @param {string | undefined | null} value - The value to check for emptiness.
   * @return {boolean} Returns true if the value is empty, false otherwise.
   */
  static isEmpty(value: any): boolean {
    if (isNullOrUndefined(value)) {
      if (import.meta.env.DEV) {
        console.warn(
          "Parameter value is null or undefined, not an object. Value:",
          value,
        );
      }

      return true;
    }

    return Object.keys(value).length === 0;
  }
  /**
   * Deep diff between two object
   *
   * @param  {Object} object Object compared
   * @param  {Object} base   Object to compare with
   * @return {Object}        Return a new object who represent the diff
   */
  static difference(object: any, base: any) {
    function changes(object: any, base: any) {
      return transform(object, function (result: any, value, key) {
        if (!isEqual(value, base[key])) {
          result[key] =
            isObject(value) && isObject(base[key])
              ? changes(value, base[key])
              : value;
        }
      });
    }

    return changes(object, base);
  }

  /**
   * Removes unwanted keys from the provided object based on specific conditions.
   * @param filters - The object containing the filters.
   * @param conditions - Array of conditions functions that each return a boolean.
   */
  static removeKey(filters: Record<string, any>, keyToRemove: string) {
    if (filters.hasOwnProperty(keyToRemove)) {
      delete filters[keyToRemove];
    }
  }

  static  validateFileType(file: File, allowedMimeTypes: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        const fileSignature = uint8Array.slice(0, 4); 

        const signatures: { [key: string]: number[][] } = {
          "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
          "application/vnd.ms-excel": [[0xD0, 0xCF, 0x11, 0xE0]], // XLS (OLE)
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [[0x50, 0x4B, 0x03, 0x04]], 
          "text/csv": [[0xEF, 0xBB, 0xBF], [0xFF, 0xFE], [0xFE, 0xFF]], 
          "image/png": [[0x89, 0x50, 0x4E, 0x47]], // PNG (‰PNG)
          "image/jpeg": [[0xFF, 0xD8, 0xFF, 0xE0], [0xFF, 0xD8, 0xFF, 0xE1], [0xFF, 0xD8, 0xFF, 0xDB]]
        };

        let detectedMimeType = "";
        for (const [mimeType, sigs] of Object.entries(signatures)) {
          if (sigs.some(sig => sig.every((byte, i) => byte === fileSignature[i]))) {
            detectedMimeType = mimeType;
            break;
          }
        }

        if (!detectedMimeType) {
          detectedMimeType = file.type; 
        }

        resolve(allowedMimeTypes.includes(detectedMimeType));
      };

      reader.readAsArrayBuffer(file.slice(0, 4)); 
    });
  }





}

export default ObjectUtils;
