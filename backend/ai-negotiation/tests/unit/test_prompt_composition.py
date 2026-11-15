"""What every intent's prompt must contain — the contract the brief renderer owes.

These tests exist because the prompt layer is being consolidated onto one
renderer. Each assertion below is a property that was true of the hand-written
blocks and must stay true afterwards; a block that silently stops reaching an
intent fails here rather than quietly degrading an answer in production.

Four groups:

  1. COVERAGE — every reasoning intent sees the arguments, the posture and how
     likely the ask is to be agreed. This is the thing the consolidation is FOR,
     and the matrix it replaces had six different answers.
  2. LOAD-BEARING STRINGS — the playbook system prompt instructs the model by
     quoting section headings and rank tags from the brief verbatim. If a
     heading is renamed on one side only, playbook generation breaks with no
     error anywhere. So the two sides are asserted against each other.
  3. DISCLOSURE — what must never reach a supplier-facing surface.
  4. NO DUPLICATION — an approved wording appears at most once per prompt.

See `prompt_fixtures` for the two suppliers everything is rendered from.
"""
from __future__ import annotations

from utils.prompts.brief.facts import format_money

import re

import pytest

from domain.entities.argument_catalog import ARGUMENT_CATALOG
from tests.unit.prompt_fixtures import (
    FULL_BUCKET_INTENTS,
    REASONING_INTENTS,
    VERDICT_ONLY_INTENTS,
    build_all_prompts,
    bundle,
    rich_facts,
    sparse_facts,
)


@pytest.fixture(scope="module")
def rich() -> dict[str, str]:
    return build_all_prompts(rich_facts())


@pytest.fixture(scope="module")
def sparse() -> dict[str, str]:
    return build_all_prompts(sparse_facts())


# ── 1. Coverage: every reasoning intent gets the whole picture ─────────────


@pytest.mark.parametrize("intent", sorted(REASONING_INTENTS))
def test_reasoning_intents_carry_the_posture_judgments(intent, rich):
    """No intent silently loses a judgment — the point of the shared block."""
    prompt = rich[intent]
    for expected in ("- Leverage:", "- Financial Sensitivity:",
                     "- Business Priority:"):
        assert expected in prompt, f"{intent} is missing {expected!r}"
    # ...and no intent carries a risk GRADE. It rolled six plain facts into one
    # level (client, 2026-08-20); the facts are rendered, the grade is not.
    assert "Risk profile" not in prompt, f"{intent} rebuilt the risk grade"


@pytest.mark.parametrize("intent", sorted(REASONING_INTENTS))
def test_reasoning_intents_carry_the_success_probability(intent, rich):
    """"How likely is this to land?" is answerable on every surface.

    It replaced a composite scored in the domain from five inputs (client,
    2026-08-20). Those five are still shown — a model given only a level answers
    the follow-up by inventing reasons for it — but as the plain facts they are,
    not as points: buyer leverage, credit rating and supplier size on the FACTS
    block, the spend among the internal figures, cost impact as an argument.
    """
    prompt = rich[intent]
    assert "- Success probability" in prompt, f"{intent} has no success probability"
    assert "Buyer leverage: high" in prompt, f"{intent} cannot say why"
    assert "credit rating: BBB" in prompt, f"{intent} cannot say why"
    # ...and never as a score. That is the thing that was removed.
    assert "NEGOTIATING STRENGTH" not in prompt, f"{intent} rebuilt the composite"


@pytest.mark.parametrize("intent", sorted(REASONING_INTENTS))
def test_reasoning_intents_carry_the_arguments(intent, rich):
    """Every reasoning intent sees which arguments back the ask, and which don't."""
    prompt = rich[intent]
    assert "NEGOTIATION ARGUMENTS" in prompt or "## ARGUMENTS" in prompt, (
        f"{intent} carries no argument block"
    )
    # The supplier's own spend file reaching past the ask is the strongest
    # in-house evidence there is; it went missing from four intents before.
    assert "Max Spend Opportunity" in prompt, f"{intent} never sees the spend line"


@pytest.mark.parametrize("intent", sorted(FULL_BUCKET_INTENTS))
def test_reasoning_intents_name_unavailable_sources(intent, sparse):
    """A source with NO data must be visible, or "should I use X?" gets an
    answer that silently omits X instead of saying it has no data.

    The playbook is exempt — it writes a document rather than answering a
    question, and naming the empty sources put them in it.
    """
    prompt = sparse[intent]
    assert "Supplier Standard" in prompt, (
        f"{intent} never mentions the sources that have no data"
    )


@pytest.mark.parametrize("intent", sorted(REASONING_INTENTS))
def test_reasoning_intents_flag_a_stretch_target(intent, sparse):
    """When nothing reaches the ask, every surface must say so — a drafter
    handed a full-looking list writes as if the market backed the number."""
    prompt = sparse[intent]
    assert re.search(r"STRETCH TARGET|\(none", prompt), (
        f"{intent} does not flag that nothing supports the ask"
    )


def test_every_bucket_reaches_the_reasoning_intents(rich):
    """Full support, reserve and non-support are all represented.

    The fixture is built so each bucket is non-empty; a renderer that drops one
    would still pass the heading assertions above.
    """
    for intent in sorted(FULL_BUCKET_INTENTS):
        prompt = rich[intent]
        assert "Parent / Supplier Max" in prompt, f"{intent}: full support missing"
        assert "Peer Group Standard" in prompt, f"{intent}: reserve bucket missing"
        assert "Industry Region Standard" in prompt, f"{intent}: non-support missing"


@pytest.mark.parametrize("intent", sorted(VERDICT_ONLY_INTENTS))
def test_narrow_surfaces_get_the_signal_without_a_facts_block(intent, rich):
    # reframe_with_scf is only rendered when the SCF programme is viable.
    """A scenario explains arithmetic and a financing pitch offers an
    alternative; both change with where the position stands, neither renders a
    FACTS block. So each takes the one signal on its own — a whole facts block
    they have no other use for would be instruction competing with the thing
    they were asked to do.
    """
    prompt = rich[intent]
    assert "## SUCCESS PROBABILITY" in prompt, f"{intent} has no success probability"
    assert "high" in prompt
    # Neither takes the brief's FACTS block (reframe writes its own, four lines
    # long): the signal travels alone rather than dragging a block along.
    assert "## INTERNAL FIGURES" not in prompt, (
        f"{intent} carries a facts block it has no use for"
    )


def test_the_profile_table_covers_every_brief_carrying_intent():
    """A new intent that reasons over a supplier must make a DECISION about what
    it sees, in the table, rather than inheriting whatever its prompt happens to
    compose."""
    from domain.entities.intent import Intent
    from utils.prompts.brief import INTENT_PROFILES

    # The three that are deliberately absent, and why (see `profiles`).
    exempt = {
        Intent.ANSWER_SPENDS_QUESTION,   # text-to-SQL over the spend table
        Intent.APPLY_OVERRIDE,           # writes a config value
        Intent.META_OPERATION,           # reshapes prior output
        Intent.GREETING, Intent.UNCLEAR, Intent.OUT_OF_SCOPE, Intent.UNKNOWN,
    }
    missing = set(Intent) - set(INTENT_PROFILES) - exempt
    assert not missing, f"intents with no brief profile: {sorted(i.value for i in missing)}"


# ── 2. Load-bearing strings: the playbook reads the brief by name ──────────
#
# The guide system prompt tells the model to copy the brief's own group
# headings and rank tags. Those strings are an interface between two files.


PLAYBOOK_GROUP_HEADINGS = ("Opening Line", "Argumentation", "Objections", "Concessions")

# The buckets the playbook must NEVER be handed. Section 4 is the case FOR the
# ask; every group the document was shown ended up printed in it as a "Not used
# — and why" list, down to the internal do-not-say notes for dso/payOnTerms.
WITHHELD_FROM_PLAYBOOK = (
    "HOLD IN RESERVE",
    "RULED OUT",
    "NOT ARGUMENTS",
    "NOT AVAILABLE",
)

RANK_TAGS = (
    "[STRONGEST]",
    "[2nd STRONGEST]",
    "[WEAKEST OF THE SUPPORTING SET]",
)


@pytest.mark.parametrize("heading", PLAYBOOK_GROUP_HEADINGS)
def test_playbook_group_headings_exist_on_both_sides(heading, rich):
    """The guide prompt routes benchmarks into playbook sections by these
    headings. Rename one on either side and the routing silently breaks."""
    from utils.prompts.negotiation_guide_prompt import negotiation_guide_system_prompt

    assert heading in negotiation_guide_system_prompt, (
        f"the guide system prompt no longer references {heading!r}"
    )
    assert heading in rich["negotiation_guide"], (
        f"the rendered brief no longer emits {heading!r}"
    )


@pytest.mark.parametrize("heading", WITHHELD_FROM_PLAYBOOK)
@pytest.mark.parametrize("fixture", ["rich", "sparse"])
def test_the_playbook_is_never_handed_a_non_supporting_bucket(
    heading, fixture, rich, sparse, request
):
    """The restriction is enforced by what the prompt CONTAINS, not by wording.

    A real playbook listed five sources under "Not used — and why" — three as
    "no data for this supplier" and two (dso, payOnTerms) with their internal
    do-not-say notes copied in as if they were analysis. The model cannot write
    a group it was never given.
    """
    prompt = request.getfixturevalue(fixture)["negotiation_guide"]
    assert heading not in prompt, (
        f"the {fixture} playbook prompt carries the {heading!r} bucket again"
    )


def test_the_playbook_carries_only_the_supporting_benchmarks(rich):
    """The rich fixture puts a benchmark in every bucket; only the supporting
    ones may reach the document."""
    prompt = rich["negotiation_guide"]
    assert "Parent / Supplier Max" in prompt, "the supporting set went missing"
    assert "peerGroupStandard" not in prompt, "the reserve bucket reached the playbook"
    assert "industryRegionStandard" not in prompt, "a below-floor source reached it"
    # supplierStandard has no value in this fixture — the unavailable bucket.
    assert "supplierStandard" not in prompt, "an empty source reached the playbook"


def test_the_playbook_says_the_withheld_buckets_were_withheld(rich):
    """A block with one group reads like an omission unless it says otherwise;
    that is how the "no data for this supplier" bullets were invented."""
    from utils.prompts.brief.rules import SUPPORTING_ONLY_NOTE

    assert SUPPORTING_ONLY_NOTE.strip() in rich["negotiation_guide"]


def test_the_guide_prompt_forbids_a_not_used_group():
    """The prompt side of the same rule — the shape it dictates must not ask for
    one, and must still say the rule out loud.

    It no longer ENUMERATES the forbidden headings ("Not used", "Unavailable",
    "Ruled out", "Weaker arguments", "Limitations", "Considerations"). Listing
    six spellings only ever covered six spellings; the rule now travels as one
    sentence here plus `P3_NAMES_MISSING_SOURCE` in the output verifier, which
    catches the wordings nobody enumerated.
    """
    from utils.prompts.negotiation_guide_prompt import negotiation_guide_system_prompt

    assert "Not used — and why" not in negotiation_guide_system_prompt
    assert "NO Opening Anchor" in negotiation_guide_system_prompt or "Rationale" in negotiation_guide_system_prompt


def test_the_withheld_bucket_rule_is_enforced_not_just_stated():
    """Where the enumeration went. Cutting prompt prose is only safe because the
    guarantee moved into code rather than disappearing."""
    from domain.entities.facts import StrategyBenchmark, SupplierFacts
    from domain.services.brief_builder import brief_from
    from domain.services.output_verifier import verify_output

    brief = brief_from(SupplierFacts(
        supplier_name="Acme", country="DE", industry="M", company_size="large",
        target_term_days=90, current_term_days=60, batna_term_days=None,
        benchmark_term_days=None, regulatory_max_term_days=None,
        strategy_benchmarks=[
            StrategyBenchmark(name="peerGroupStandard", label="peer", value=95),
        ],
    ))
    for phrasing in (
        "Not used — and why: the peer group.",
        "Supplier Standard: no data for this supplier.",
        "Other benchmarks were considered but fall short.",
    ):
        result = verify_output(phrasing, brief)
        assert "P3_NAMES_MISSING_SOURCE" in result.codes, phrasing

    # ...and the grading vocabulary the client asked about by name.
    assert "P3_ARGUMENT_GRADED" in verify_output(
        "Lead with the parent max, the weakest of the supporting set.", brief
    ).codes


def test_rank_tag_vocabulary_matches_the_rule_that_names_it():
    """The tags the strength RULE names must be the tags `rank_tag` emits.

    The rule tells the model to read "[WEAKEST OF THE SUPPORTING SET]" off the
    brief and translate it into prose. Two renderers once grew two vocabularies
    for the same tag, so the instruction pointed at a string never emitted — the
    model was told to look for a tag that does not exist and had to guess.
    """
    from tests.unit.prompt_fixtures import pitch_block
    from utils.prompts.brief.rules import RELATIVE_STRENGTH_RULE

    # Enough supporting arguments that the first/middle/last tags all appear.
    block = pitch_block(rich_facts())
    for tag in RANK_TAGS:
        assert tag in RELATIVE_STRENGTH_RULE, f"the rule no longer names {tag!r}"
        assert tag in block, (
            f"the rule reads {tag!r} off the brief, but the brief never emits it"
        )


def test_the_playbook_never_grades_its_arguments(rich):
    """A bullet introduced as "the weakest of the three" is an argument the
    negotiator has half-conceded before making it.

    Enforced by withholding, not wording: the playbook voice emits no rank tags
    at all, because a tag sitting on the line looks like content to convey
    however firmly the prompt says not to convey it.
    """
    from utils.prompts.brief.rules import RELATIVE_STRENGTH_RULE

    prompt = rich["negotiation_guide"]
    for tag in RANK_TAGS:
        assert tag not in prompt, f"the playbook brief still tags arguments {tag!r}"
    assert RELATIVE_STRENGTH_RULE not in prompt, (
        "the playbook still carries the rule telling it to state relative strength"
    )
    # ...and the other drafting surfaces still do rank, which is the point of
    # doing this per-voice rather than deleting the ranking outright.
    assert RELATIVE_STRENGTH_RULE in rich["pushback"]


def test_the_guide_prompt_forbids_grading_language():
    """The prompt side of the same rule."""
    from utils.prompts.negotiation_guide_prompt import negotiation_guide_system_prompt

    assert "Rationale" in negotiation_guide_system_prompt
    assert "sub-heading" in negotiation_guide_system_prompt.lower() or "subtitle" in negotiation_guide_system_prompt.lower()
    for phrase in ("the strongest argument here", "a step weaker — reinforcement",
                   "the weakest of the three, keep it for last"):
        assert phrase not in negotiation_guide_system_prompt, (
            f"the prompt still hands the model the phrasing {phrase!r} to copy"
        )


def test_every_supporting_argument_has_a_figure_to_print(rich):
    """"relationship — N/A" came from a bullet shape that assumes a day-count.

    Every supporting argument's brief line carries figures of some kind; the
    ones that are not day-counts carry what they do measure. Relationship is
    only in the supporting set when nothing stronger is available
    (client 2026-09-10), so it may be absent on a rich fixture.
    """
    brief = bundle(rich_facts())
    for argument in brief.supporting:
        detail = argument.get("detail") or ""
        assert any(c.isdigit() for c in detail), (
            f"{argument['key']} has no figure on its line: {detail!r}"
        )
    relationship = next(
        (a for a in brief.supporting if a["key"] == "relationship"), None
    )
    if relationship is not None:
        assert "12.40M" in relationship["detail"] or "12,400,000" in relationship["detail"]
        assert "12,400,000" not in (relationship["supplier_pitch"] or "")


def test_playbook_delegates_per_source_disclosure_to_the_brief(rich):
    """Brief still carries pitch / NOT SAYABLE / Note markers for the model."""
    prompt = rich["negotiation_guide"]
    assert "How to pitch it:" in prompt
    assert "Note:" in prompt

    with_internal = build_all_prompts(rich_facts(
        strategy_benchmarks=[*rich_facts().strategy_benchmarks, _supplier_standard()]
    ))["negotiation_guide"]
    entry = with_internal.split("- Supplier Standard")[1].split("\n  - ")[0]
    assert "NOT SAYABLE" in entry
    assert "How to pitch it:" not in entry


def _supplier_standard():
    from domain.entities.facts import StrategyBenchmark

    return StrategyBenchmark(
        name="supplierStandard", label="this supplier's own segment", value=88,
    )


def test_playbook_required_sections_are_unchanged():
    """The four section headings the PDF spec fixes, and the validator that
    enforces them, must keep agreeing."""
    from utils.prompts.negotiation_guide_prompt import (
        REQUIRED_PLAYBOOK_SECTIONS,
        missing_playbook_sections,
        negotiation_guide_system_prompt,
    )

    assert REQUIRED_PLAYBOOK_SECTIONS == (
        "Target and BATNA",
        "Opening Position and Argumentation",
        "Objections and Concessions",
        "Rationale",
    )
    for section in REQUIRED_PLAYBOOK_SECTIONS:
        assert section in negotiation_guide_system_prompt
    assert missing_playbook_sections("") == list(REQUIRED_PLAYBOOK_SECTIONS)


def test_proper_names_lead_every_argument_line(rich):
    """Arguments are named in words on every line, because whatever leads the
    line is what a drafted document copies. A payload key on a brief line is a
    payload key in the client's playbook."""
    for intent in sorted(FULL_BUCKET_INTENTS):
        prompt = rich[intent]
        for name in ("Parent / Supplier Max", "Peer Group Standard"):
            assert name in prompt, f"{intent} renames {name} out of existence"
    # The playbook sees only the supporting set, so only that name is asserted.
    assert "Parent / Supplier Max" in rich["negotiation_guide"]


@pytest.mark.parametrize("key", [
    "parentOrSupplierMax", "peerGroupStandard", "industryRegionStandard",
    "supplierStandard", "costImpact", "payOnTerms",
])
def test_no_payload_key_reaches_a_drafting_surface(key, rich):
    """The client reads the playbook. A camelCase field name in it is a bug —
    reported against a real one that printed `relationship` and
    `spendLineOpportunity` as argument names."""
    for intent in sorted(FULL_BUCKET_INTENTS):
        assert key not in rich[intent], f"{intent} leaks the raw key {key}"


# The two prompts whose brief IS a structured data dump the model reads field by
# field — the counter-offer extraction and the scenario calculation. Their field
# names are still identifiers; everything a negotiator reads out of them is
# prose the model writes around them.
_DATA_DUMP_INTENTS = frozenset({"evaluate_counter_offer", "scenario"})

# `camelCase`/`snake_case` appear in the naming rule itself, which is where they
# belong.
_IDENTIFIER_RE = re.compile(r"\b(?:[a-z]+[A-Z][A-Za-z]*|[a-z]+_[a-z_]+)\b")
_ALLOWED_IDENTIFIERS = {"camelCase", "snake_case"}


@pytest.mark.parametrize(
    "intent",
    sorted(
        (REASONING_INTENTS | VERDICT_ONLY_INTENTS | {"summarize"})
        - _DATA_DUMP_INTENTS
    ),
)
def test_no_identifier_of_any_kind_reaches_a_prompt(intent, rich):
    """Nothing a prompt puts in front of the model is a field name.

    Broader than the key check above and deliberately so: the leak reported by
    the client was `relationship`, but the same prompt also carried
    `buyer_favored`, `broadly_aligned`, `cost_impact` and `scfRate` — every one
    of them a string the model can copy into a document a client reads.
    """
    found = set(_IDENTIFIER_RE.findall(rich[intent])) - _ALLOWED_IDENTIFIERS
    assert not found, f"{intent} carries raw identifiers: {sorted(found)}"


# ── 3. Disclosure: what never reaches a supplier-facing surface ────────────


def test_the_internal_only_source_has_no_pitch_to_leak():
    """It is withheld at the catalogue, not merely gated at each reader.

    While the sentence existed, `sayable` came back False but the wording still
    travelled on the argument's state dict.
    """
    assert not ARGUMENT_CATALOG["supplierStandard"].supplier_pitch


def test_internal_only_arguments_are_marked_wherever_they_appear(rich, sparse):
    """An internal-only argument reaching a drafting surface must carry the
    instruction that stops it being said, not just the wording."""
    title = ARGUMENT_CATALOG["supplierStandard"].title
    for prompts in (rich, sparse):
        for intent, prompt in prompts.items():
            # The summary is negotiator-only and renders the argument as the
            # client's approved sentence; it carries no pitch to mark.
            if intent == "summarize":
                continue
            if title in prompt:
                assert "INTERNAL" in prompt, (
                    f"{intent} carries supplierStandard unmarked"
                )


# ── 4. No duplication ──────────────────────────────────────────────────────


# The assessments render in two places today: `render_posture` prints
# them with their approved wording, and the argument block prints the same
# wording again as a pitch. Consolidation removes the first copy.
_ASSESSMENT_PITCHES = {
    key: ARGUMENT_CATALOG[key].supplier_pitch
    for key in ("payOnTerms", "dso", "relationship", "costImpact")
}


@pytest.mark.parametrize("intent", sorted(REASONING_INTENTS))
def test_no_approved_wording_appears_twice_in_one_prompt(intent, rich):
    """The same sentence twice in one prompt is pure token cost, and it invites
    the model to treat one argument as two."""
    prompt = rich[intent]
    duplicated = []
    for definition in ARGUMENT_CATALOG.values():
        # An internal-only argument has no pitch at all, and `"".count()` would
        # report one per character.
        if not definition.supplier_pitch:
            continue
        if prompt.count(definition.supplier_pitch) > 1:
            duplicated.append(definition.key)
    # The computed wordings (cost impact quotes a percentage, the relationship
    # varies by posture) override the catalogue sentence, so they are checked
    # against the rendered text rather than the catalogue.
    for phrase in (
        "Extending payment terms by",
        "Our ongoing relationship provides",
    ):
        if prompt.count(phrase) > 1:
            duplicated.append(phrase)
    assert not duplicated, f"{intent} repeats: {duplicated}"


@pytest.mark.parametrize("intent", sorted(REASONING_INTENTS))
def test_argument_block_appears_once(intent, rich):
    """Two argument blocks in one prompt means two rankings of the same
    benchmarks — the model is told twice which argument is strongest, and told
    two different things."""
    prompt = rich[intent]
    headings = len(re.findall(r"^#+ .*NEGOTIATION ARGUMENTS", prompt, re.M))
    headings += len(re.findall(r"^#+ ARGUMENTS —", prompt, re.M))
    assert headings <= 1, f"{intent} carries {headings} argument blocks"


# ── Source-attribution sync ────────────────────────────────────────────────


def test_source_collectors_only_attribute_facts_the_prompt_could_quote():
    """`collect_*_sources` powers the UI panel that shows where each figure came
    from. Attributing a fact the prompt never rendered claims provenance for a
    number the model could not have used."""
    from utils.prompts.negotiation_guide_prompt import collect_guide_sources
    from utils.prompts.summarize_prompt import collect_summarize_sources

    facts = rich_facts()
    brief = bundle(facts)
    prompts = build_all_prompts(facts)

    for name, collect, intent in (
        ("summarize", collect_summarize_sources, "summarize"),
        ("negotiation_guide", collect_guide_sources, "negotiation_guide"),
    ):
        sources = collect(brief)
        assert sources, f"{name} attributes nothing at all"
        prompt = prompts[intent]
        for label, entry in sources.items():
            value = entry["value"]
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                continue
            # Rates render as percentages and money renders compact
            # ("$37.54M"), so the raw figure never appears literally — check
            # every rendered form too.
            candidates = {
                str(value),
                f"{value:,}",
                f"{value * 100:.2f}%",
                format_money(value),
            }
            assert any(c in prompt for c in candidates), (
                f"{name} attributes {label} = {value}, which the prompt never renders"
            )
