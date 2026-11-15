/**
 * UC-UI-05 A1: "A buyer has no logo. A neutral placeholder carrying the buyer's initials."
 *
 * Ported from `apps/ap/src/modules/components/utils/organizeValues.ts`'s `getInitialLetters`
 * (the algorithm behind AP's `InitialLettersText.vue` and the logo-fallback circle in
 * `CardsByStatus.vue`) rather than reimplemented: AR's roster has no logo source at all yet
 * (`ParsedCompanyDto` carries no media/domain field - see `BuyerLogo.vue`), so this alt flow is
 * not an edge case here, it is the ONLY case, and it should read the way AP's `initials.circle`
 * badge already reads everywhere else in the platform.
 *
 * and `apps/ar` cannot import its source across the app boundary regardless. The one behavioural
 * change from the original is dropping its leading-`#` strip (`#Global Retail` -> `Global
 * Retail`), which existed for AP's spend-alias values and has no equivalent in a company name.
 */
export function initialsOf(name: string | null | undefined, maxWords = 2): string {
  if (!name) {
    return ''
  }

  const words = name.trim().replaceAll(/\s+/g, ' ').split(' ')
  let initials = ''
  for (let i = 0; i < Math.min(words.length, maxWords); i++) {
    if (words[i].length > 0) {
      initials += words[i].charAt(0)
    }
  }

  return initials.toUpperCase()
}
