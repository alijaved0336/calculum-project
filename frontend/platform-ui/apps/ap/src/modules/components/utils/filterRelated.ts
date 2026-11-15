import { StringUtils } from '@/utils'

/**
* Calculates if values greater or equal to 1k, will be converted to big number
* else regular value will be returned
* @param value Value which will be covnerrted to 
*/
export function convertBigNumberFormat(value: any) {
 if (value >= 1000) {
   let convertedData = StringUtils.formatBigNumbers(value)
   return convertedData
 } else {
   return value
 }

}

/**
 * Returns a year value for the year range slider
 * @param value year item from the year range array
 */
export function getYearValue(value: any){
  return value
}

