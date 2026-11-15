import { Locales } from './keys'
import en from './languages/en.json'
import es from './languages/es.json'

export const messages = {
  [Locales.EN]: en,
  [Locales.ES]: es
}

export const defaultLocale = Locales.EN
