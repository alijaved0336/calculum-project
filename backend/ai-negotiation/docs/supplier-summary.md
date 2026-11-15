# Supplier summaries

`summarize_supplier_position` returns `summary_scope` (`summary` or `narrow`)
and `summary_tier` (`small` or `large`). The classifier resolves the subject of
the ask, including conversation references. Generic `response_mode` does not
select the tier. Anything other than `small` — absent, invalid, or the retired
`medium` — is `large`. JSON recovery preserves both fields.

| Ask | Scope / tier |
| --- | --- |
| Key facts, supplier insights, who they are, general information unrelated to terms | summary / small |
| Every other summary ask: supplier position, summarize supplier data, payment terms opportunity, most important things, highlights, where do we stand, brief me, full picture, detailed summary, plain "summary" / "overview" | summary / large |
| Leverage, outlook drivers, BATNA derivation, one specific topic even in detail | narrow; tier ignored |
| Shorten prior output, recap our conversation | meta_operation |

The medium tier was removed (2026-09-16): its rows were almost the same as
small's. Asks that used to be medium are deal questions, so they render large.

Small and large render directly from the resolved brief; the model does not
rewrite their facts. Narrow answers retain generation, conversation context
and the shared verifier.

## Field coverage

Every row comes from the original supplier payload (`supplier`, `target`,
`agreement`, `spend`, `negotiationStrategy`) or the brief's resolved terms
(current, target, BATNA). A field the payload lacks is **omitted** — no
"Not provided" placeholder, no "BATNA None", no empty label, no invented
description. A section with nothing to show (no supporting benchmark, no
BATNA) is left out entirely.

Both tiers open with the supplier's description (`supplier.description`) when
the payload has one — first two sentences, at most 60 words, Markdown
stripped. With no description the summary starts at its first row; nothing
replaces it.

| Data | Payload field | Small | Large |
| --- | --- | --- | --- |
| Description | `supplier.description` | Lead paragraph | Lead paragraph, above Overview |
| Supplier name | `supplier.name` | Row | Overview |
| Country | `supplier.country` | Row | Flag when resolvable |
| Industry | `supplier.mainIndustryName` | Row | Overview |
| Credit rating | `supplier.creditRating` | Row | Overview |
| Company size | `supplier.companySize` | Row | Size line and card |
| Current / target / BATNA days | resolved brief terms | Current terms, Target terms, BATNA rows (BATNA only when available) | Overview, card, BATNA section |
| Buyer leverage | `supplier.entityBuyerLeverageLevel` | Row | Probability block and card |
| Spend volume | `supplier.spendVolume` | Row | Overview, relationship and card |
| SME / ownership designations | `supplier.isSme`, `womanOwnedBusiness`, … | Row only when true | — |
| Cash-flow opportunity | `target.targetCashFlow` | — | Overview and card |
| Probability of success | `supplier.successProbability` | — | Probability block and card |
| Financing rate | `supplier.supplierFinancingRate` | — | Size line and card |
| Applied regulatory cap | `negotiationStrategy.regulatoryTerm` | — | Overview and card |
| Supporting benchmarks | `negotiationStrategy.*` | — | Names, days, meaning, statistics |

Address, website, stock ticker, entity type and ownership are in the payload but
deliberately not shown in key facts (user decision, 2026-09-16). Not rendered
because the payload does not carry them: parent company, commodity / category,
currencies. No supplier-leverage field is extracted or shown. Contact phone,
internal IDs, country risk rating, timestamps, DSO, WACC, payment behaviour,
cash discounts and programme status remain available to their existing
data/reasoning paths; they are not added to a summary just because they exist.

## Amounts

The payload carries no currency, so amounts use compact notation with no
symbol or code (`908K`, `56.3M`, `941.73`). Zero amounts are retained. Session
target/walkaway overrides and SCF filtering are applied before rendering.

## API contract

REST chat responses and WebSocket `done.data` include `summary_scope`,
`summary_tier`, and `summary_card`. Both small and large summary responses
include a card (terms progress bar + tier-appropriate fields). Narrow
answers have no card. The large card adds benchmarks, cash-flow, financing,
success probability, and regulatory; small keeps identity, terms, BATNA,
leverage, spend, size, and credit. The WebSocket `intent.data` includes
scope/tier before the rendered summary's token events. Other intents have
null summary metadata.

Cards are embedded in the stored message as an HTML comment
(`<!--summary-card:...-->`) so reopen can rebuild the facts UI. The chat
renderer strips the marker before display; conversation history for the
model also strips it. Live WebSocket `done.data` still carries
`summary_card` separately.

## Debugging

Every turn prints an `[intent]` block (intent, confidence, mode, reasoning,
resolved question, summary scope / tier / SUMMARY TYPE, follow-ups) from
`agents/nodes/intent_classifier.py`, and the summarize node prints
`[summary] rendering tier=…`.

Run `scripts/eval_summarize.py --runs 1 --no-judge` against a configured model
to measure classification across both tiers and narrow/boundary queries.
