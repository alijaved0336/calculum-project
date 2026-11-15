export default class IsSMEUtils {

    /**
     * Maps source string to the corresponding SME source key to use in the LANG file.
     * 
     * @param {string} source - The source string.
     * @returns {string|null} The SME source key if the source is valid, otherwise null.
     */

static generateSMESourceKey(source: string) {
  if (source !== null) {
      return source
    }
    return null
  }
}