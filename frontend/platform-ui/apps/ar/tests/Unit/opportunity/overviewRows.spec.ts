import { describe, expect, it, vi } from 'vitest'
import type { GraphqlGridColumnOrGroup } from '@ada/design-system/components/graphql-grid/types'

vi.mock('@/utils/graphqlGridQuery', () => ({ fetchGraphqlGridPage: vi.fn() }))

import { fetchGraphqlGridPage } from '@/utils/graphqlGridQuery'
import {
  fetchOverviewRows,
  toDisplayOverviewRow,
  visibleOverviewRowFields,
  OVERVIEW_ROW_KEYS,
} from '@/modules/opportunity/data/overviewRows'

const columns: GraphqlGridColumnOrGroup[] = [
  {
    title: 'Values',
    children: [
      { field: 'volume', title: 'Sales Volume' },
      { field: 'paymentTermsAgreed', title: 'Payment Terms - Agreed' },
      { field: 'cashFlowAgreed', title: 'Cash Flow - Agreed' },
      { field: 'recommendedTerm', title: 'Proposed', hidden: true },
    ],
  },
]

describe('visibleOverviewRowFields', () => {
  it('keeps the Agreed columns out of the GraphQL selection', () => {
    // AB#18931's Agreed pair exists only on screen: an unknown field in the selection is a
    // validation error that blanks the whole grid, not an empty column.
    const fields = visibleOverviewRowFields('saleLines', columns)

    expect(fields).not.toContain('paymentTermsAgreed')
    expect(fields).not.toContain('cashFlowAgreed')
    expect(fields).toContain('volume')
    expect(fields).not.toContain('recommendedTerm')
  })

  it.each([
    ['saleLines', 'saleLineId'],
    ['buyers', 'partyId'],
    ['parents', 'partyId'],
  ] as const)('always carries the %s row key %s', (level, key) => {
    expect(OVERVIEW_ROW_KEYS[level]).toBe(key)
    expect(visibleOverviewRowFields(level, columns)).toContain(key)
  })

  it('swaps visible custom columns for the one list selection that carries their values', () => {
    // Neither projection has a per-ordinal field: a schema whose shape moved with what each tenant
    // declared could not be cost-analysed, so the values arrive as data in one list. Asking for
    // `customDataPoint3` would be asking for a field that does not exist and blanking the grid.
    const withCustom: GraphqlGridColumnOrGroup[] = [
      ...columns,
      {
        title: 'Custom Attributes',
        children: [
          { field: 'customDataPoint3', title: 'Segment' },
          { field: 'customDataPoint7', title: 'Region (client)' },
          { field: 'customDataPoint9', title: 'Never filled', hidden: true },
        ],
      },
    ]

    const fields = visibleOverviewRowFields('buyers', withCustom)

    expect(fields).not.toContain('customDataPoint3')
    expect(fields).not.toContain('customDataPoint7')

    // Once, however many of the twenty are on screen.
    expect(fields.filter((field) => field.startsWith('customAttributes'))).toEqual([
      'customAttributes { ordinal value supplied }',
    ])
  })

  it('asks for nothing extra when no custom column is visible', () => {
    // A grid whose custom columns are all hidden sends the selection it always sent — the list is
    // 58 slots wide on the server and there is no reason to materialise it unasked.
    expect(visibleOverviewRowFields('saleLines', columns).join(' '))
      .not.toContain('customAttributes')
  })

  describe('image field dependencies (AB#20356)', () => {
    // Each dependency rides along only when its trigger column is visible — asking for it
    // unconditionally would cost every request a field most requests never render.
    it.each([
      ['buyerName', 'buyerLogoUrl: logoUrl'],
      ['parentName', 'parentLogoUrl'],
      ['supplierName', 'supplierLogoUrl'],
      ['supplierCountryName', 'supplierCountryFlagUrl'],
    ])('asks for %s\'s companion image only when %s is visible', (trigger, selection) => {
      const withTrigger: GraphqlGridColumnOrGroup[] = [
        ...columns,
        { title: 'Identity', children: [{ field: trigger, title: trigger }] },
      ]

      expect(visibleOverviewRowFields('saleLines', withTrigger)).toContain(selection)
      expect(visibleOverviewRowFields('saleLines', columns)).not.toContain(selection)
    })

    it.each(['saleLines', 'buyers', 'parents'] as const)(
      'always asks for logoUrl and countryFlagUrl on the %s grain, columns or not',
      (level) => {
        // The Customer Card modal an entity cell opens shows the row's own logo and flag, so the
        // row carries them even when neither the name nor the country column is on screen.
        const fields = visibleOverviewRowFields(level, columns)
        expect(fields).toContain('logoUrl')
        expect(fields).toContain('countryFlagUrl')
      },
    )

    it('asks for the line grain\'s buyerId under the partyId alias, but keeps saleLineId as its key', () => {
      // SaleLineOverviewRowFact has no partyId field - buyerId is that same party id.
      const fields = visibleOverviewRowFields('saleLines', columns)
      expect(fields).toContain('partyId: buyerId')
      expect(fields).not.toContain('partyId')
      expect(OVERVIEW_ROW_KEYS.saleLines).toBe('saleLineId')
      expect(visibleOverviewRowFields('buyers', columns)).not.toContain('partyId: buyerId')
      expect(visibleOverviewRowFields('parents', columns)).not.toContain('partyId: buyerId')
    })

    it.each(['originalName', 'role'])('always asks for %s on the party levels only, once', (field) => {
      expect(visibleOverviewRowFields('buyers', columns)).toContain(field)
      expect(visibleOverviewRowFields('parents', columns)).toContain(field)
      expect(visibleOverviewRowFields('saleLines', columns)).not.toContain(field)

      const withColumn: GraphqlGridColumnOrGroup[] = [
        ...columns,
        { title: 'Identity', children: [{ field, title: field }] },
      ]
      expect(visibleOverviewRowFields('buyers', withColumn).filter((f) => f === field)).toHaveLength(1)
      expect(visibleOverviewRowFields('parents', withColumn).filter((f) => f === field)).toHaveLength(1)
    })

    it('never asks for an entity image when its trigger column is hidden', () => {
      const hiddenTrigger: GraphqlGridColumnOrGroup[] = [
        ...columns,
        { title: 'Identity', children: [{ field: 'buyerName', title: 'Buying Entity', hidden: true }] },
      ]

      expect(visibleOverviewRowFields('saleLines', hiddenTrigger)).not.toContain('buyerLogoUrl: logoUrl')
    })

    it.each(['saleLines', 'buyers', 'parents'] as const)(
      'asks for the bare supplierCountryFlagUrl on the %s grain (AB#20480)',
      (level) => {
        // AB#20480 landed SupplierCountryFlagUrl on PartyOverviewRowFact too (null when the
        // party's lines span more than one selling country - a DISTINCT list there has no single
        // flag) - no more alias needed at the party grain, same field name as the line grain.
        const withTrigger: GraphqlGridColumnOrGroup[] = [
          ...columns,
          { title: 'Identity', children: [{ field: 'supplierCountryName', title: 'Supplier Country' }] },
        ]

        const fields = visibleOverviewRowFields(level, withTrigger)
        expect(fields).toContain('supplierCountryFlagUrl')
      },
    )
  })
})

describe('toDisplayOverviewRow', () => {
  it('scales the raw cashDiscounts fraction to the percentage PercentColumn renders', () => {
    expect(toDisplayOverviewRow({ cashDiscounts: 0.05 })).toEqual({ cashDiscounts: 5 });
  });

  it('leaves a row with no numeric cashDiscounts untouched (e.g. a party-level row)', () => {
    const row = { name: 'Acme', volume: 100 };
    expect(toDisplayOverviewRow(row)).toEqual(row);
  });

  it('leaves a null cashDiscounts as-is', () => {
    expect(toDisplayOverviewRow({ cashDiscounts: null })).toEqual({ cashDiscounts: null });
  });

  it('scales the raw newTermsCashDiscount fraction the same way (shared percentColumn cell)', () => {
    expect(toDisplayOverviewRow({ newTermsCashDiscount: 0.02 })).toEqual({ newTermsCashDiscount: 2 });
  });

  it('scales both cashDiscounts and newTermsCashDiscount on the same row independently', () => {
    expect(toDisplayOverviewRow({ cashDiscounts: 0.05, newTermsCashDiscount: 0.02 }))
      .toEqual({ cashDiscounts: 5, newTermsCashDiscount: 2 });
  });

  it('leaves a null newTermsCashDiscount as-is (e.g. G-485, always null until Manage exists)', () => {
    expect(toDisplayOverviewRow({ newTermsCashDiscount: null })).toEqual({ newTermsCashDiscount: null });
  });

  it('projects supplied custom attributes onto the fields the columns bind to', () => {
    const row = {
      name: 'Acme',
      customAttributes: [
        { ordinal: 3, value: 'EMEA, APAC', supplied: true },
        { ordinal: 7, value: 12500, supplied: true },
        // Declared and left blank by the tenant: absent rather than shown as a placeholder, so the
        // cell renders like any other empty one.
        { ordinal: 9, value: null, supplied: false },
      ],
    };

    const displayed = toDisplayOverviewRow(row);

    // A party-level text attribute reads as its lines' distinct values comma-joined — the roll-up
    // the calculation wrote, not something this mapper does.
    expect(displayed.customDataPoint3).toBe('EMEA, APAC');
    expect(displayed.customDataPoint7).toBe(12500);
    expect('customDataPoint9' in displayed).toBe(false);

    // And the original is untouched: Apollo freezes its results, and the grid writes expansion state
    // onto the row it is handed.
    expect(displayed).not.toBe(row);
  });
});

describe('fetchOverviewRows', () => {
  it.each([
    ['saleLines', 'saleLineOverviewRows', 'SaleLineOverviewRowFactFilterInput'],
    ['buyers', 'buyerOverviewRows', 'PartyOverviewRowFactFilterInput'],
    ['parents', 'parentOverviewRows', 'PartyOverviewRowFactFilterInput'],
  ] as const)('%s queries %s', async (level, queryField, filterInputType) => {
    vi.mocked(fetchGraphqlGridPage).mockResolvedValue({ items: [], total: 0 })

    await fetchOverviewRows({} as never, level, 'version-uuid', ['volume'])

    const [, config, options] = vi.mocked(fetchGraphqlGridPage).mock.lastCall! as unknown as [
      unknown,
      { queryField: string; filterInputType: string; scopeVariables: Record<string, string> },
      { scope: Record<string, string> },
    ]
    expect(config.queryField).toBe(queryField)
    expect(config.filterInputType).toBe(filterInputType)
    expect(config.scopeVariables).toEqual({ versionUuid: 'UUID!', currencyRate: 'Decimal' })
    expect(options.scope).toEqual({ versionUuid: 'version-uuid', currencyRate: 1 })
  })
})
