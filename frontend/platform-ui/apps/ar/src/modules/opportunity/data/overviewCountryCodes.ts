import type { GeoChartRow } from '@ada/design-system'
import type { OverviewChartPoint } from '@/api'
import { formatBigNumbers } from '@/utils/chartFormatting'

/**
 * ISO 3166-1 alpha-3 -> alpha-2, scoped to exactly the country set `COUNTRY_CENTROIDS`
 * (`@ada/design-system`) already covers — the same countries the "country" dimension's bare codes
 * can resolve to a name at all, so there is nothing gained by mapping a wider set.
 *
 * `GeoChart` (design-system) needs alpha-2 in its data table's first column to draw a country —
 * confirmed against Google's own GeoChart docs, alpha-3 is not one of the accepted forms — but the
 * chart-catalog endpoint answers the "country" dimension as bare alpha-3
 * (`{ name: "CHE", value }`, see api/index.ts's OverviewChartPoint and this file's own
 * toGeoChartRows below). AP's own production data path resolves the same way, just from the other
 * direction (name -> alpha-2, MetricsComponents.vue's dataSeriesCountry) - this table is AR's
 * equivalent starting point (alpha-3, not a name).
 */
export const ALPHA3_TO_ALPHA2: Record<string, string> = {
  AFG: 'AF', ALB: 'AL', DZA: 'DZ', AND: 'AD',
  AGO: 'AO', ARG: 'AR', ARM: 'AM', AUS: 'AU',
  AUT: 'AT', AZE: 'AZ', BHS: 'BS', BHR: 'BH',
  BGD: 'BD', BRB: 'BB', BLR: 'BY', BEL: 'BE',
  BLZ: 'BZ', BEN: 'BJ', BTN: 'BT', BOL: 'BO',
  BIH: 'BA', BWA: 'BW', BRA: 'BR', BRN: 'BN',
  BGR: 'BG', BFA: 'BF', BDI: 'BI', KHM: 'KH',
  CMR: 'CM', CAN: 'CA', CPV: 'CV', CAF: 'CF',
  TCD: 'TD', CHL: 'CL', CHN: 'CN', COL: 'CO',
  COM: 'KM', COG: 'CG', COD: 'CD', CRI: 'CR',
  HRV: 'HR', CUB: 'CU', CYP: 'CY', CZE: 'CZ',
  DNK: 'DK', DJI: 'DJ', DMA: 'DM', DOM: 'DO',
  ECU: 'EC', EGY: 'EG', SLV: 'SV', GNQ: 'GQ',
  ERI: 'ER', EST: 'EE', SWZ: 'SZ', ETH: 'ET',
  FJI: 'FJ', FIN: 'FI', FRA: 'FR', GAB: 'GA',
  GMB: 'GM', GEO: 'GE', DEU: 'DE', GHA: 'GH',
  GRC: 'GR', GRD: 'GD', GTM: 'GT', GIN: 'GN',
  GNB: 'GW', GUY: 'GY', HTI: 'HT', HND: 'HN',
  HUN: 'HU', ISL: 'IS', IND: 'IN', IDN: 'ID',
  IRN: 'IR', IRQ: 'IQ', IRL: 'IE', ISR: 'IL',
  ITA: 'IT', JAM: 'JM', JPN: 'JP', JOR: 'JO',
  KAZ: 'KZ', KEN: 'KE', KIR: 'KI', KWT: 'KW',
  KGZ: 'KG', LAO: 'LA', LVA: 'LV', LBN: 'LB',
  LSO: 'LS', LBR: 'LR', LBY: 'LY', LIE: 'LI',
  LTU: 'LT', LUX: 'LU', MDG: 'MG', MWI: 'MW',
  MYS: 'MY', MDV: 'MV', MLI: 'ML', MLT: 'MT',
  MHL: 'MH', MRT: 'MR', MUS: 'MU', MEX: 'MX',
  FSM: 'FM', MDA: 'MD', MCO: 'MC', MNG: 'MN',
  MNE: 'ME', MAR: 'MA', MOZ: 'MZ', MMR: 'MM',
  NAM: 'NA', NRU: 'NR', NPL: 'NP', NLD: 'NL',
  NZL: 'NZ', NIC: 'NI', NER: 'NE', NGA: 'NG',
  PRK: 'KP', MKD: 'MK', NOR: 'NO', OMN: 'OM',
  PAK: 'PK', PLW: 'PW', PAN: 'PA', PNG: 'PG',
  PRY: 'PY', PER: 'PE', PHL: 'PH', POL: 'PL',
  PRT: 'PT', QAT: 'QA', ROU: 'RO', RUS: 'RU',
  RWA: 'RW', KNA: 'KN', LCA: 'LC', VCT: 'VC',
  WSM: 'WS', SMR: 'SM', STP: 'ST', SAU: 'SA',
  SEN: 'SN', SRB: 'RS', SYC: 'SC', SLE: 'SL',
  SGP: 'SG', SVK: 'SK', SVN: 'SI', SLB: 'SB',
  SOM: 'SO', ZAF: 'ZA', KOR: 'KR', SSD: 'SS',
  ESP: 'ES', LKA: 'LK', SDN: 'SD', SUR: 'SR',
  SWE: 'SE', CHE: 'CH', SYR: 'SY', TWN: 'TW',
  TJK: 'TJ', TZA: 'TZ', THA: 'TH', TLS: 'TL',
  TGO: 'TG', TON: 'TO', TTO: 'TT', TUN: 'TN',
  TUR: 'TR', TKM: 'TM', TUV: 'TV', UGA: 'UG',
  UKR: 'UA', ARE: 'AE', GBR: 'GB', USA: 'US',
  URY: 'UY', UZB: 'UZ', VUT: 'VU', VAT: 'VA',
  VEN: 'VE', VNM: 'VN', YEM: 'YE', ZMB: 'ZM',
  ZWE: 'ZW', HKG: 'HK', MAC: 'MO', PRI: 'PR',
  // Kosovo: no ISO-3166-1 code (disputed status); XK is the widely-used user-assigned code
  // COUNTRY_CENTROIDS already keys it by. Google's GeoChart may or may not recognize it — if not,
  // that one row silently draws nothing, an honest gap rather than a guessed location.
  XKX: 'XK',
}

/**
 * Turns the chart endpoint's `{ name: "CHE", value: 90 }` groups (the "country" dimension's own
 * shape) into GeoChart's `data` prop.
 *
 * A point whose alpha-3 code has no known alpha-2 mapping, or a null value, is dropped rather than
 * sent through with a guessed code — honest, not guessed.
 */
export function toGeoChartRows(points: OverviewChartPoint[]): GeoChartRow[] {
  return points.flatMap((point) => {
    const alpha3 = point.name?.toUpperCase() ?? ''
    const code = ALPHA3_TO_ALPHA2[alpha3]
    if (!code || point.value === null) return []

    return [{
      code,
      value: point.value,
      key: alpha3,
      tooltip: formatBigNumbers(point.value),
    }]
  })
}
