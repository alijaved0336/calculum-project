import { describe, it, expect } from 'vitest'
import { createI18n } from 'vue-i18n'
import en from '@ada/design-system/locales/languages/en.json'
import es from '@ada/design-system/locales/languages/es.json'
import { getQueueDisplayName } from '@/modules/adminBackend/utils/QueueNames'

/**
 * Against the REAL dictionaries and a REAL vue-i18n instance, because both halves of the bug this
 * covers lived in that interaction rather than in the function's own branches: `t()` returns the
 * full key path on a miss (not the queue name, which is what the old fallback compared against),
 * and vue-i18n splits key paths on dots, so AR's `ar.<kebab>` queues only resolve while their
 * entries stay nested under `queueNames.ar`. A hand-rolled `t` stub would pass either way.
 */
const translateWith = (locale: 'en' | 'es') => {
  const i18n = createI18n({
    messages: { en, es },
    locale,
    fallbackLocale: 'en',
    legacy: false,
    warnHtmlMessage: false
  })

  return (queueName: string) => getQueueDisplayName(queueName, i18n.global.t)
}

const t = translateWith('en')

/** One queue per registered consumer in Ada.Ar.Worker's Program.cs. */
const AR_QUEUES = [
  'ar.sale-file-uploaded',
  'ar.parse-general-data',
  'ar.parse-supplier-data',
  'ar.parse-parent-data',
  'ar.parse-buyer-data',
  'ar.parse-sales-data',
  'ar.finalize-sale-file-parse',
  'ar.build-sale-line-version-match-facts',
  'ar.strategy-adjustments-uploaded',
  'ar.sale-file-version-calculate',
  'ar.sale-file-version-opportunity',
  'ar.summary-sale-file-version'
]

describe('getQueueDisplayName', () => {
  it('translates an AP queue', () => {
    expect(t('spend_file_version_calculate')).toBe('Spend File Version Calculation')
  })

  it.each(AR_QUEUES)('translates the dotted AR queue %s', queueName => {
    const displayName = t(queueName)

    expect(displayName).not.toContain('adminBackend')
    expect(displayName).toMatch(/^AR - /)
  })

  it('labels a MassTransit error queue from its base queue', () => {
    expect(t('ar.sale-file-version-calculate_error')).toBe('AR - Sale File Version Calculation (Errors)')
  })

  it('labels a MassTransit skipped queue from its base queue', () => {
    expect(t('ar.summary-sale-file-version_skipped')).toBe('AR - Sale File Version Summary (Skipped)')
  })

  it('never leaks a key path for an unknown queue', () => {
    // The bug this replaces: `t()` echoes the full key on a miss, so the old fallback (which
    // compared the result against the bare queue name) never fired and the card header rendered
    // `adminBackend.statistics.queueStatistics.queueNames.messages`.
    expect(t('some_brand_new_queue')).toBe('Some Brand New Queue')
  })

  it('prettifies a queue whose name is not underscore-separated', () => {
    // MassTransit's temporary bus endpoint, which cannot be in the dictionary at all.
    expect(t('ada-ar-worker_bus_9xyz')).toBe('Ada Ar Worker Bus 9xyz')
  })

  it('falls back to the base name for an unknown queue with an error suffix', () => {
    expect(t('ar.unknown-future-consumer_error')).toBe('Ar Unknown Future Consumer (Errors)')
  })

  it('translates in Spanish too, entry for entry', () => {
    const translate = translateWith('es')

    expect(translate('spend_file_version_calculate')).toBe('Cálculo de la Versión del Archivo de Gastos')
    expect(translate('ar.sale-file-version-calculate_error'))
      .toBe('AR - Cálculo de la Versión del Archivo de Ventas (Errores)')
    for (const queueName of AR_QUEUES) {
      expect(translate(queueName)).not.toContain('adminBackend')
    }
  })
})
