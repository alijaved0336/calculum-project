import { describe, expect, it } from 'vitest'
import {
  fieldErrorsFromWire,
  fieldErrorsToWire,
  strategyFromWire,
  strategyToWire,
  type WireStrategy,
} from '@/modules/setup/api/setupStrategies.wire'
import { STRATEGY_KEYS } from '@/modules/setup/api/setupStrategies.types'

/**
 * AB#20702: the screen's model against Ada.Ar.Api's SetupController wire (#20701, Rolando's
 * hand-off): backend keys, a nested `settings` object, enums by name and `errors[]` refusals.
 */
describe('Setup strategies wire mapping (#20701 contract)', () => {
  const WIRE_KEYS = [
    'PaymentOnTerms', 'CounterPartyStandard2', 'PeerGroupStandard2', 'BuyerOrParentMin',
    'IndustryRegionGroup', 'BuyerPolicy', 'BuyersRegulatory', 'CreditLimitMax', 'ClientStandard',
  ]

  it('maps the nine keys both ways, in the Payables order', () => {
    const wire = STRATEGY_KEYS.map((key) => strategyToWire({ key, allowed: true, companyAllowed: true }).key)
    expect(wire).toEqual(WIRE_KEYS)
    expect(WIRE_KEYS.map((key) => strategyFromWire({ key, allowed: true, companyAllowed: true } as WireStrategy)?.key))
      .toEqual([...STRATEGY_KEYS])
  })

  it('reads Buyer Standard and Regulatory settings, enums by name, empty reduction days as unset', () => {
    expect(strategyFromWire({
      key: 'CounterPartyStandard2', allowed: true, companyAllowed: true,
      settings: { metric: 'Q3', minOccurrences: 5, minReductionDays: null, maxReductionDays: null },
    })).toEqual({ key: 'buyerStandard', allowed: true, companyAllowed: true, metric: 'Q3', minOccurrences: 5, minReductionDays: undefined, maxReductionDays: undefined })

    expect(strategyFromWire({
      key: 'BuyersRegulatory', allowed: false, companyAllowed: true,
      settings: { regulatoryCountrySource: 'Supplier', regulatoryMethod: 'None' },
    })).toMatchObject({ key: 'regulatoryTerms', regulatoryCountrySource: 'supplier', regulatoryMethod: 'NO_LIMITATION' })
  })

  it("keeps Peer Group Standard's read-only metric for its subtitle", () => {
    expect(strategyFromWire({ key: 'PeerGroupStandard2', allowed: true, companyAllowed: true, settings: { metric: 'Avg' } }))
      .toMatchObject({ key: 'peerGroupStandard', metric: 'AVG' })
  })

  it('drops an unknown key rather than showing it unnamed', () => {
    expect(strategyFromWire({ key: 'SomethingNew' as never, allowed: true })).toBeNull()
  })

  it('sends no settings for Client Standard (they would 400)', () => {
    expect(strategyToWire({ key: 'buyerStandard', allowed: true, companyAllowed: true, metric: 'AVG', minOccurrences: 7, minReductionDays: Number.NaN }))
      .toEqual({ key: 'CounterPartyStandard2', allowed: true, settings: { metric: 'Avg', minOccurrences: 7, minReductionDays: null, maxReductionDays: null } })
    expect(strategyToWire({ key: 'regulatoryTerms', allowed: true, companyAllowed: true, regulatoryCountrySource: 'both', regulatoryMethod: 'ALL_REGULATIONS' }))
      .toEqual({ key: 'BuyersRegulatory', allowed: true, settings: { regulatoryCountrySource: 'Both', regulatoryMethod: 'All' } })
    expect(strategyToWire({ key: 'clientStandard', allowed: true, companyAllowed: true, metric: 'AVG', volumePercentage: 0.1 })).not.toHaveProperty('settings')
  })

  /** #20824: Peer Group Standard on Rolando's contract (task 20838). */
  describe('Peer Group Standard (#20824)', () => {
    const wireGroup = (priorityOrder: number, buyerLeverage: boolean) => ({
      priorityOrder,
      buyer: { country: true, region: false, industry: false, creditRating: false },
      transaction: { commodity: false, buyerLeverage },
      supplier: { country: false, region: true, industry: false, creditRating: false },
    })

    it('reads Min/Max, the occurrences and the groups in priority order', () => {
      const setting = strategyFromWire({
        key: 'PeerGroupStandard2', allowed: true, companyAllowed: true,
        settings: {
          metric: 'Max', minOccurrences: 50, combinationGroupsSource: 'version',
          combinationGroups: [wireGroup(2, false), wireGroup(1, true)],
          defaultCombinationGroups: [wireGroup(1, true)],
        },
      })
      expect(setting).toMatchObject({ key: 'peerGroupStandard', metric: 'MAX', minOccurrences: 50, combinationGroupsSource: 'version' })
      expect(setting?.combinationGroups?.map((group) => group.transaction.buyerLeverage)).toEqual([true, false])
      expect(setting?.defaultCombinationGroups).toHaveLength(1)
      expect(strategyFromWire({ key: 'PeerGroupStandard2', allowed: true, settings: { metric: 'Min' } })?.metric).toBe('MIN')
    })

    it('fills an attribute the wire leaves out as off', () => {
      const setting = strategyFromWire({
        key: 'PeerGroupStandard2', allowed: true,
        settings: { combinationGroups: [{ priorityOrder: 1, buyer: { industry: true }, transaction: null }] },
      })
      expect(setting?.combinationGroups?.[0]).toEqual({
        buyer: { country: false, region: false, industry: true, creditRating: false },
        transaction: { commodity: false, buyerLeverage: false },
        supplier: { country: false, region: false, industry: false, creditRating: false },
      })
    })

    it('sends the value, the occurrences and the whole list, the priority being the position', () => {
      const [group] = strategyFromWire({ key: 'PeerGroupStandard2', allowed: true, settings: { combinationGroups: [wireGroup(1, true)] } })!.combinationGroups!
      expect(strategyToWire({
        key: 'peerGroupStandard', allowed: false, companyAllowed: true, metric: 'Q3', minOccurrences: 50,
        combinationGroups: [group], combinationGroupsSource: 'default', defaultCombinationGroups: [group],
      })).toEqual({
        key: 'PeerGroupStandard2',
        allowed: false,
        settings: {
          metric: 'Q3',
          minOccurrences: 50,
          combinationGroups: [{ buyer: wireGroup(1, true).buyer, transaction: wireGroup(1, true).transaction, supplier: wireGroup(1, true).supplier }],
        },
      })
    })
  })

  it('maps Parent Min both ways, the screen holding the volume as a 0-1 fraction and the wire as 0-100', () => {
    expect(strategyFromWire({
      key: 'BuyerOrParentMin', allowed: true, companyAllowed: true,
      settings: { sameBuyerRegion: true, sameBuyerIndustry: false, volumePercentage: 12.5 },
    })).toEqual({ key: 'parentBuyerMin', allowed: true, companyAllowed: true, sameBuyerRegion: true, sameBuyerIndustry: false, volumePercentage: 0.125 })

    expect(strategyToWire({ key: 'parentBuyerMin', allowed: true, companyAllowed: true, sameBuyerRegion: true, sameBuyerIndustry: true, volumePercentage: 0.07 }))
      .toEqual({ key: 'BuyerOrParentMin', allowed: true, settings: { sameBuyerRegion: true, sameBuyerIndustry: true, volumePercentage: 7 } })

    // An emptied input travels as null, which the API refuses beside the field.
    expect(strategyToWire({ key: 'parentBuyerMin', allowed: true, companyAllowed: true, volumePercentage: Number.NaN }).settings)
      .toEqual({ sameBuyerRegion: false, sameBuyerIndustry: false, volumePercentage: null })
  })

  it("turns a refusal's errors[] into the screen's field errors, and back", () => {
    const body = { errors: [{ strategy: 'CounterPartyStandard2', field: 'minOccurrences', message: 'Enter a whole number from 5 to 9,999.' }] }
    expect(fieldErrorsFromWire(body)).toEqual({ 'buyerStandard.minOccurrences': 'Enter a whole number from 5 to 9,999.' })
    expect(fieldErrorsToWire({ 'buyerStandard.minOccurrences': 'Enter a whole number from 5 to 9,999.' })).toEqual(body)
    expect(fieldErrorsFromWire(null)).toEqual({})
  })
})
