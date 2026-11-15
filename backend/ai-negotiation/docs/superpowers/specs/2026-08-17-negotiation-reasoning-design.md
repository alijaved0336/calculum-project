# Teaching the Negotiation Agent to Reason — Implementation Design

Date: 2026-08-17
Source plan: `plan_updated.md` (Phases 0–2 + "Negotiation Logic Updates & Required Changes" §1–7)
Repo: `AI%20Negotiation/` (backend only)

## Scope

In scope: Phase 0 (sampling), Phase 1 (prompt hygiene / contradictions), Phase 2
(types, provenance, verifier), and all seven Section 2 logic rules.

Out of scope: Phase 3 (handing argument selection to the model), Phase 4 (client's
pending definitions), all frontend work, and enabling `llm_enable_thinking`.

## Baseline
V
`JWT_SECRET=testsecret uv run pytest` → **785 passed, 3 failed, 21 skipped**.

The 3 failures are pre-existing and environmental
(`test_streaming.py::test_stream_sse_returns_event_stream`,
`test_streaming.py::test_handle_message_returns_full_response`,
`test_websocket.py::test_ws_valid_message_event_order`). They are unrelated to this
work and must remain the *only* failures at every checkpoint. Without `JWT_SECRET`
set, 11 fail — always set it.

## Decisions taken

These were confirmed before implementation and are not to be re-litigated mid-task.

| # | Decision | Consequence |
|---|----------|-------------|
| D1 | Fallback is **25% of the target**, not 25% below the ask | Reimplemented on `main`; the unmerged `origin/feat/batna-25pct-below-opportunity` branch is **not** used |
| D2 | Fallback **clamps to the current term** and the output **says so** | Never emits a walkaway below the status quo; the clamp is visible, not silent |
| D3 | ~~Benchmarks are **two-tiered**: justifies-the-ask vs supports-movement-only~~ — **SUPERSEDED, see below** | §2.4 widens the pool without re-creating the "48-day benchmark justifies 90" error (P4) |
| D4 | Baseline term = **spend-line weighted average of `contractual_without_cash_discounts`** | New aggregate; replaces `actualPaymentTerms`-first as the head of the chain |
| D5 | The **current term is harmonised everywhere** | §2.1 read literally, overriding P2's "facts are never rounded". See the risk note below |
| D6 | **Pin `temperature` only**; leave `llm_enable_thinking = False` | §0's context-window claim is unverifiable from this repo |

### D2 as implemented

`resolve_effective_fallback` clamps as specified: where the 25%-off-target
computation lands at or below the current term, the floor is raised to the
current term and the note carries BOTH figures, so the clamp is visible rather
than silent. A floor equal to the current term is a real, reportable position —
it says there is no concession room, hold the ask.

Two refinements the original spec did not cover:

- **A floor at or above the ASK returns `(None, explanation)`.** On a short
  target the harmonised quarter rounds back up to the ask itself (a 30-day ask
  concedes to 22.5 → 30), and a floor equal to the ask is a second name for the
  ask, not a reserve position. This is the only no-floor case.
- **The clamped floor is exempt from P2's 15-day ladder check.** The current
  term is deliberately NOT harmonised (it must match the platform's supplier
  card), so clamping to a 77-day term yields an off-ladder floor. Harmonising it
  down to 75 would put the floor back under what we already pay — exactly what
  the clamp prevents — so `_check_p2` skips a walkaway equal to the current
  term, the same exemption it already grants benchmarks. Without it, every
  playbook for such a supplier failed verification and was regenerated for
  nothing.

Still **not confirmed by the client**: the whole `target − 25%` rule is open with
Carlos ("let me think about that one, and I'll come back with some comments",
Aug 13), and it conflicts with his Aug 11 *"if they're actually 75 and the target
is 90, then the BATNA is actually 75. There's no middle ground."*

D3 in the table above IS superseded: the middle "supports-movement-only" tier was
removed on 2026-08-18 (Joel: *"we don't base our proposal on that... try to keep
it simple"*). Benchmarks are bucketed against the CURRENT TERM in two buckets;
falling short of the ask is a wording rule, not a bucket.

### Open item — fallback derives from the ask, not the target

The "Open item" below states the fallback will be computed from
`facts.target_term_days` per D1. It is still computed from
`negotiation_ask_term(facts)` (opportunity term first, else target). Unchanged
and unresolved.

### Risk accepted under D5

Harmonising the current term means a 77-day contractual term is stated and compared
as 75 throughout. This diverges from the platform supplier card, which is what Carlos
checks figures against, and it is the same class of mismatch that D4 exists to fix.
This was raised and the literal §2.1 reading was reaffirmed. **Flag every harmonised
current term during the four-supplier acceptance replay** so the client sees the
divergence explicitly rather than discovering it.

### Open item — not blocking

`resolve_effective_fallback` currently derives from `negotiation_ask_term(facts)`
(opportunity term first, else target). D1 specifies the *target*. These differ when
`opportunityPaymentTerms` is set and the negotiator has also set their own target:
`target_term_days` is the user's target, while `negotiation_ask_term` returns the
opportunity. Fallback will be computed from `facts.target_term_days` per D1. If that
produces a fallback above the ask on real data, surface it to the client rather than
inventing a reconciliation rule.

---

## WP0 — Phase 0: pin sampling

`temperature` is pinned in exactly five places, all JSON-extraction or SQL steps:
`apply_override.py:109`, `evaluate_counter_offer.py:139`, `scenario.py:178`,
`spends.py:185`, `follow_up_generator.py:46`. Every **drafting** call passes no
temperature and inherits the server default (typically 0.7–1.0). This confirms
plan §1.5, and it is the cheapest available fix for invented figures.

**Change:** pass an explicit low `temperature` on every drafting call —
`negotiation_guide`, `opening_strategy`, `pushback`, `reframe_with_scf`,
`draft_opening_email`, `explain_recommendation`, `answer_data_question`,
`summarize`, `meta_operation`.

`infrastructure/llm/llm_client.py:190` already forwards `temperature` only when not
`None`, so no client change is needed.

Leave `llm_enable_thinking = False` (D6). Do not add per-node thinking control —
that is speculative until §0 is answered.

---

## WP1 — Section 2 numeric core

Numbers first: every prompt and verifier downstream quotes these, so they must be
correct before any prose is touched.

### WP1.1 — `Position` and `Evidence` types

New module `domain/entities/terms.py`.

```
Position(days, kind)   kind ∈ {TARGET, ASK, WALKAWAY, CONCESSION, CURRENT}
    __post_init__ harmonises to the 15-day ladder; an unharmonised Position
    cannot exist. Rejects days outside 0–180.
Evidence(days, source, label)
    frozen; never rounded; `source` is required and non-empty.
```

`CURRENT` is a `Position` kind rather than `Evidence` — that is what D5 means in the
type system, and it is the mechanism that enforces D5 rather than relying on call
sites to remember.

`harmonise_term_days` already exists and is correct
(`domain/entities/facts.py:209`). The types call it; they do not reimplement it. The
bug it fixes is that it is *called* at three sites and forgotten at others — which is
exactly how the unharmonised walkaway ships.

### WP1.2 — Fallback = 25% of target (§2.5, D1, D2)

Rewrite `resolve_effective_fallback` in `domain/entities/facts.py`.

```
if walkaway_override_days is not None:      # unchanged — session override wins
    return it

base = facts.target_term_days
if base is None: return None, None

raw       = base * 0.75                     # 90 → 67.5
rounded   = round_half_up(raw)              # 68
fallback  = harmonise_term_days(rounded)    # 75

if current is not None and fallback < current:
    fallback = current                      # D2 clamp
    note     = "computed fallback was <computed> days, below the current term
                of <current>; raised to the current term — the buyer does not
                concede below the status quo."
```

Worked example from the plan: target 90 → 67.5 → 68 → **75**. Matches §5's expected
output.

**Delete:** `_fallback_band_values` and `_FALLBACK_EXCLUDED_BENCHMARK_NAMES`. The
benchmark-average floor is gone entirely. Keep the `harmonization` name recorded in a
comment — it must never return as a benchmark (see the existing note at
`facts.py:167-177`).

### WP1.3 — Harmonise current term and the walkaway override (§2.1, D5)

1. `current_term` in `extract_supplier_facts` is harmonised at the payload boundary,
   under the same enforced-regulatory cap as the target
   (`supplier_facts.py:169-171`).
2. `apply_override.py:243` stores the raw walkaway. Route it through
   `harmonise_term_days` so the stored override obeys the invariant documented in
   `facts.py:180-206`. This is a provable violation today.
3. `actual_payment_terms_days` stays **verbatim and unharmonised** — it is the
   actual-payment side of the payment-reliability variance, and
   `assess_payment_reliability` requires the exact figure
   (`facts.py:124-136`). Harmonising it would fabricate a variance.

Say so when harmonisation moves a number. `apply_override` already does this for the
target and the reasoning is recorded there — follow that precedent for the current
term and walkaway.

### WP1.4 — No-improvement-opportunity gate (§2.2)

Condition: `target_term_days <= current_term_days` (both harmonised per D5).

Must be **deterministic and pre-LLM** — P5 requires it never reaches a model.
`_SCF_BLOCKED` in `agents/graph.py` is the precedent: a simple node reached by
conditional edge that refuses outright.

- New node `agents/nodes/no_opportunity.py`, registered as `_NO_OPPORTUNITY`.
- `_route_after_intent` and `_route_after_rag` divert every strategy-generating
  intent to it when the condition holds: `GENERATE_PLAYBOOK`,
  `RECOMMEND_OPENING_STRATEGY`, `DRAFT_OPENING_EMAIL`, `HANDLE_SUPPLIER_PUSHBACK`,
  `REFRAME_WITH_SCF`.
- Factual intents are **not** diverted — `ANSWER_DATA_QUESTION`,
  `ANSWER_SPENDS_QUESTION`, `SUMMARIZE`, `EXPLAIN_RECOMMENDATION`, `META_OPERATION`,
  `APPLY_OVERRIDE`, `GREETING`. A negotiator may still ask what the terms are when
  there is no opportunity to improve them.
- The message states the current term, the target, and that no improvement
  opportunity exists because the target is at or below the current term. Plain
  language per §2.7. No arguments, no strategy, no benchmarks.

Second clause of §2.2 — *"a higher target can only be suggested if a supporting
benchmark exists above the current term"*: when a benchmark above the current term
exists, name the highest such benchmark and the harmonised target it would support.
Otherwise suggest nothing. This reuses WP1.5's widened pool.

### WP1.5 — Two-tier benchmark selection (§2.4, D3)

The single highest-risk change in WP1. §2.4 read alone would make a 48-day benchmark
citable against a 90-day ask — precisely P4's *"A 48 day benchmark does not justify a
90 extension."* The pool widens; the **presentation splits**.

In `domain/services/negotiation_arguments.py`:

- `_leverage_pool` gains the widened bound: eligible benchmarks are `value > current`
  (was `value >= ask`).
- `is_benchmark_citable` keeps its current meaning — **justifies the ask**,
  `value >= ask`. Do not redefine it; too much depends on that meaning and it is
  documented as the shared bar at `negotiation_arguments.py:450-467`.
- New `movement_support_benchmarks(facts)` → `current < value < ask`. These support
  *movement*, never the full ask.
- `key_argument_benchmarks` unchanged: `value >= ask`.
- `walkaway_support_benchmarks` is **replaced** by `movement_support_benchmarks`. Its
  old band (`floor < value < ask`) was keyed to the benchmark-average floor that
  WP1.2 deletes, so its definition no longer has a basis.

Rendering: two headings, never merged.

```
USE TO JUSTIFY THE ASK        — value >= ask
SUPPORTS MOVEMENT ONLY        — current < value < ask
    Each line states the shortfall: "80 days — 10 short of the 90-day ask.
    Argues for movement above the current term, NOT for the full ask."
```

The shortfall figure is deterministic and rendered by code, not by the model.

### WP1.6 — Remove Max Spend Opportunity (§2.6)

Delete, do not deprecate. §2.6 is explicit: *"we should remove the functionality of
checking the max spend line, we don't need it."*

- `ARGUMENT_CATALOG["spendLineOpportunity"]` (`argument_catalog.py:239-258`)
- `spend_line_opportunity_argument_term`, `_classify_spend`, `_spend_rationale`,
  `_make_spend_argument`, `_SPEND_SOURCE`, `_SPEND_LABEL`
  (`negotiation_arguments.py:121-122, 157-176, 244-306, 398-421`)
- `spend_line_opportunity_reference` (`facts.py:282-293`)
- `SupplierFacts.max_spend_line_opportunity_term_days` and
  `max_spend_line_opportunity_alias` (`facts.py:138-151`)
- the `max_opportunity` / `max_alias` halves of `_spend_aggregates` and
  `_max_opportunity_alias` (`pg_supplier_data_adapter.py:112-175`)
- the spend-line argument step in `build_argument_sequence`
- the entry in `collect_supporting_arguments`
- all prompt renderings: `brief/facts.py`, `brief/posture.py`,
  `opening_strategy_prompt.py`, `negotiation_guide_prompt.py`, `utils/constants.py`
- `tests/unit/test_spend_line_opportunity.py` and its assertions in
  `test_argument_builder.py`, `test_supplier_disclosure.py`,
  `test_negotiation_brief.py`, `test_negotiation_arguments.py`, `test_opening_anchor.py`

Leave `Spend.target_opportunity_payment_terms` in the DB model — dormant columns are
the established pattern here (`entitySupplierLeverageLevel` is left the same way,
`facts.py:94-98`).

### WP1.7 — Confirm supplier leverage removal (§2.3)

Already done at the domain layer, 2026-08-03 (`facts.py:94-98`), with a test at
`test_negotiation_arguments.py:1060`. **No domain work required.**

Remaining traces are dormant and stay dormant: the DB columns on `supplier.py:63` and
`supplier_ultimate_parent.py:55`, and the adapter passthrough at
`pg_supplier_data_adapter.py:76`. One item does need attention:
`api/schemas/negotiation.py:50` still exposes `entity_supplier_leverage_level` on the
API response — remove that field, since §3 requires it absent from user-facing
responses.

---

## WP2 — Phase 1: prompt hygiene

Only after WP1 is green. These changes alter what the model is *told*, so they must
not be interleaved with changes to what it is told *about*.

### WP2.1 — Delete dead code

Verified against the tree:

- `utils/prompts/benchmark_guardrail.py` — sole importer is
  `tests/unit/test_benchmark_policy.py:31`. Delete module and that import.
- `VOICE_EMAIL` + `_render_email` (`brief/arguments.py:116, 450`;
  `brief/profiles.py:28`; `brief/__init__.py:18,71`) — confirm no profile selects
  `VOICE_EMAIL` before deleting. `brief/profiles.py:123` already describes it in the
  past tense.
- `DATA_HEADING` (`brief/facts.py:40`, exported `brief/__init__.py:25,65`)
- `_RELATIONSHIP_LOW_PITCH` (`negotiation_arguments.py:1096`) — reachable only from
  `:1048`; confirm that branch is dead before deleting, as the plan claims.
- `ARGUMENT_CATALOG["supplierStandard"].supplier_pitch` — unreachable because the
  entry is `internal_only=True` (`argument_catalog.py:173`). Tests at
  `test_prompt_composition.py:439,478` assert its absence; keep those assertions
  working.

Delete only what is provably unreachable. Where the plan's claim does not survive
checking, leave the code and record why.

### WP2.2 — Resolve quote-vs-never-state in code (§3.2)

The most damaging contradiction and the likeliest mechanical source of the
contradictory output the client reports. `brief/rules.py:125-132` says *"Quote those,
exactly as the line gives them. Never write 'N/A'"* while the rendered lines beneath
carry `Never state their DSO figure` / `Never state the Pay-on-Terms figure` /
`Never quote the spend volume`.

Fix in code, not prose. In `collect_supporting_arguments`
(`negotiation_arguments.py:1454-1570`), split `PresentedArgument.detail` into:

- `detail_internal` — carries the figures; rendered for negotiator-facing voices
- `detail_sayable` — carries only what may be said; rendered for the pitch voice

Each voice renders exactly one. Then:

- `FIGURE_CITATION_RULE` (`brief/rules.py:117-140`) loses the half that exists to
  arbitrate the conflict.
- The three contradicting `disclosure_note` clauses disappear from the pitch voice —
  they become unnecessary there, because the sayable detail cannot contain the
  forbidden figure.

The relationship `detail` deliberately leads with spend volume
(`negotiation_arguments.py:1543-1560`) and its note forbids quoting spend to the
supplier. That is exactly the split: spend goes to `detail_internal`, never to
`detail_sayable`.

### WP2.3 — Separate objection-answers from evidence (§3.3)

The plan's highest-value single change. The code already models this correctly and
then discards it: `build_argument_sequence` labels the four assessments
`HOLD for the payment-risk objection` / `HOLD for the cash-flow objection`
(`negotiation_arguments.py:1380-1440`) — objection-answers, not evidence.
`collect_supporting_arguments` then flattens them into the same
`USE TO JUSTIFY THE ASK` list as real benchmarks, and the pitch voice says
*"Cite every one of these."* The same argument appears twice in one prompt with two
different meanings.

Give `dso`, `payOnTerms`, `costImpact`, `relationship` their own `OBJECTION ANSWERS`
heading. Effects, all claimed by the plan and each to be verified by test:

- supporting list drops from seven entries to three
- the duplicate-with-two-meanings disappears
- most of `RELATIVE_STRENGTH_RULE` (`brief/rules.py:143+`) becomes unnecessary
- Carlos's *"This is not an argument"* is answered at source

`costImpact` is the exception worth care: its percentage genuinely *is* the argument
(`argument_catalog.py:325-328`), so its figure remains sayable under WP2.2.

### WP2.4 — Trim prompt text

- `PUSHBACK_CLASSIFIER_SYSTEM` — 5,909 chars of every category and tag, for a call
  whose entire output is `{"matched": [...]}`.
- Playbook formatting prose — ~1,500 chars of `RESERVED SYNTAX` / bullet-indentation
  rules already enforced deterministically by `normalize_playbook_structure`.
  Keeping both pays twice.
- `answer_data_question` gets `arguments=None` (−7,460 chars, −66% of its user turn).
  Its own prompt says *"no negotiation strategy… answer directly"* while being handed
  pitch machinery.
- `explain_recommendation` loses the paragraph instructing the model to classify
  arguments as `FULL SUPPORT` / `PARTIAL SUPPORT` / `NON-SUPPORTING` — strings that
  appear **zero times** in its own assembled prompt because the buckets were renamed.
- Apply the `pushback.py:105-109` format-instruction fix to the six other nodes whose
  system prompts mandate exact headings while `response_mode`'s `_QUICK` block says
  *"no section headers"*.

### WP2.5 — Plain language (§2.7)

Replace internal calculation names and jargon in user-facing text with business
language. §2.7's own example: not *"medium leverage posture with limited financial
sensitivity"* but *"appears financially capable of accepting the proposed change"*.

Targets: `normalise_level` outputs, `negotiation_tone`, `strength`,
`FinancialSensitivity`, `RiskProfile`, `BusinessPriority` — internal enums that
currently reach rendered text. Enforced by WP4's P6 vocabulary allowlist, which is
what stops this regrowing.

---

## WP3 — Phase 2: verification

### WP3.1 — Contractual baseline (§3.7, D4)

`Spend.contractual_without_cash_discounts` (`spend.py:55`) is declared, documented at
`spends_prompt.py:38`, and **read by nothing** — exactly as the plan says. The
current chain reads the *supplier-level* `agreement.agreedTermsWithoutCashDiscounts`
(`pg_supplier_data_adapter.py:88`), not a spend-line average.

Add a second weighted average to `_spend_aggregates`, computed the same way
`actualPaymentTerms` already is (`pg_supplier_data_adapter.py:112-160`):

```
contractualPaymentTerms = Σ(contractual_without_cash_discounts_i × spend_volume_i)
                        ÷ Σ(spend_volume_i)
```

over **only the lines where the column is non-null** — filtered from both numerator
and denominator, since the column is nullable while `actual_payment_terms` is `NOT
NULL`. `None` when no line carries the figure or the filtered volume is zero.

New baseline chain in `extract_supplier_facts` (`supplier_facts.py:153-162`):

```
contractual weighted avg  →  actualPaymentTerms  →  agreedTermsWithoutCashDiscounts
                          →  strategy.payOnTerms
```

Update `_SOURCE_PATHS["current_term_days"]` (`supplier_facts.py:56`) to match — a
figure whose recorded provenance is wrong fails P1 by construction.

Land this as an **isolated commit**, last in WP3, so the four-supplier replay can
attribute figure movements to it rather than to WP1's argument and fallback changes.

### WP3.2 — Provenance as a required field

Extend `_SOURCE_PATHS` into a required field on every fact and argument, so a figure
with no traceable source cannot render. This is what makes P1 checkable rather than
aspirational.

### WP3.3 — One output verifier

Replace the two bespoke validators with a single principle-shaped verifier on every
node. Currently 2 of 19 nodes have any deterministic content check, and one only
verifies six headings exist.

| Principle | Check |
|-----------|-------|
| P1 | every figure in the output appears in the brief |
| P2 | every position is a 15-multiple; every benchmark matches the payload byte-for-byte |
| P3 | no `audience=INTERNAL` argument in a sayable span |
| P6 | every named benchmark/play is in the closed registry |

`ARGUMENT_CATALOG` and `PLAYBOOK_PLAYS` are already closed sets, so P6 is exact
matching. The verify→feedback→retry machinery already exists and works in
`domain/services/opening_email.py` — generalise that rather than writing a new one.

Note the current asymmetry: **no node except the email checks that a figure in the
output exists in the brief**, and there only `\d{1,3}\s*days` — no currency,
percentage, rate or spend figure is verified anywhere. Benchmark values are written
into the prompt and never read back, so nothing catches "peer group standard of 78
days" when the payload says 68.

Also restore coverage lost earlier: the asymmetry guard runs on 1 of 19 nodes,
removed from opening strategy, pushback and reframe-with-SCF with nothing
deterministic in its place — and those three emit text read aloud while holding WACC,
spend and the walkaway floor.

Per the plan's §6.3 cost decision: **verify everywhere, re-generate only for the
document outputs.** The deterministic checks are free; only re-generation costs
latency, and Carlos already noted speed.

On failure: one bounded revision, then ship **labelled**, as the email path already
does.

### WP3.4 — Stop shipping failed playbooks silently

`negotiation_guide.py:162-163` sets `errors`, but the route only reads it when
`response is None`, so a failed retry ships as though it succeeded. Fix the route to
read `errors` regardless. This is the bug to copy away from, not toward.

---

## WP4 — Property tests

Current tests assert output strings — the same enumeration problem one layer down.
Test the principles as properties so they hold for inputs nobody wrote a fixture for.

- **P1** — over the whole corpus, no rendered figure lacks a source chain
- **P2** — every `Position` satisfies `% 15 == 0` and `0 <= days <= 180`; every
  `Evidence` value appears exactly as the platform sent it
- **P3** — no `audience=INTERNAL` argument in supplier-facing text (covers leverage,
  cash-flow unlock, spend volume, and anything added later)
- **P4** — a benchmark below the ask is never described as justifying the ask
- **P5** — `target <= current` always routes to the no-opportunity answer and never
  reaches an LLM
- **P6** — vocabulary allowlist from the platform's own fields and the closed
  registries; fail on any invented composite

Plus a **prompt-size regression test**: assert each assembled prompt stays under a
ceiling. `tests/unit/prompt_fixtures.py::build_all_prompts` already produces the
numbers. Record the measured before/after per intent against the plan's §1.1 table
(playbook 46,286 chars / ~11,570 tokens is the headline figure to move).

---

## Sequencing and verification

WP0 → WP1 → WP2 → WP3 → WP4. Numbers before prose before verification, because a
verifier written against wrong numbers encodes the wrong numbers.

At every checkpoint: `JWT_SECRET=testsecret uv run pytest` shows the 3 known
failures and no others. TDD throughout — a failing test that states the rule, then
the implementation.

Final acceptance, which is the one the client actually runs: replay the four
suppliers in the deck (US Foodservice, Cognizant, Coty, Philip Morris) and check
every figure against the supplier-card screenshots. Include the D5 harmonised-current
divergences in that report.

## What this design does not do

Phase 3 is deliberately excluded. The agent remains template-driven: correct,
verifiable, and far less contradictory, but code still selects and scripts the
arguments. Phase 3 is what makes the arguments *good* rather than merely accurate,
and it is only safe once WP3 can catch what goes wrong — which is why the plan puts
it last and why this design stops short of it.
