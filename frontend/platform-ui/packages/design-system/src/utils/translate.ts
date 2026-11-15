import { createI18n } from "vue-i18n";
import { messages, defaultLocale } from "../locales";

const i18n = createI18n({
  messages,
  locale: defaultLocale,
  fallbackLocale: defaultLocale,
  legacy: false,
  globalInjection: true,
  warnHtmlMessage: false
});

export const translate = i18n.global;
