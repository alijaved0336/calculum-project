import { messages, defaultLocale } from "@ada/design-system/locales/index";
import { createI18n } from "vue-i18n";
const i18n = createI18n({
  messages,
  locale: defaultLocale,
  fallbackLocale: defaultLocale,
  legacy: false,
  globalInjection: true
});
export const translate = i18n.global;


export const limitCharacters = (text: string, width: number) => {
  if (width === 300){
    if (text.length > 33 ){
      return true
    } else {
      return false
    }
  }
  if (width === 150 ) {
    if (text.length > 22 ){
      return true
    } else {
      return false
    }
  }
  
}

/**
* checks if the dataItem prop value is null and is not equal to '-'.
* if value is '-' , do not show the tooltip
* @param value 
*/

export const checkPropValue = (value: any) => {
  if (value && value !== '-') {
    return true
  } else {
    return false
  }
 }     


/**
 * For getting the value for Enforced/Promoted Column
 * @param modality 
 * @returns 
 */
export const getStrategyModalityValue = (modality: any) => {
  if (modality) {
    if (modality.toLowerCase() === 'p') {
      return translate.t('global.enforcedPromotedTerms.p')
    } 
    if (modality.toLowerCase() === 'e') {
      return translate.t('global.enforcedPromotedTerms.e')
    }
    else {
      return translate.t('global.enforcedPromotedTerms.promotedAndEnforced')
    }
  } else {
    return '-'
  }
} 