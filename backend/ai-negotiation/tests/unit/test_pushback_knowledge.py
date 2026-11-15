"""Pushback counters come from the knowledge base, scoped to the pushback playbook."""
from __future__ import annotations

import asyncio
import dataclasses
from types import SimpleNamespace

from application.services.pushback_knowledge import PushbackKnowledgeService, as_rag_source
from agents.nodes.pushback import make_pushback_node
from domain.services.brief_builder import brief_from
from tests.unit.prompt_fixtures import rich_facts
from tests.unit.pushback_kb_fixture import FILENAME, fixture_chunks, fixture_kb
from utils.prompts.pushback_objection_prompt import parse_objection_response
from utils.prompts.pushback_prompt import ASKED_OBJECTIONS_HEADING, COUNTER_REFERENCE_HEADING


class FakeVectorStore:
    def __init__(self, chunks=None, hits=(), fail=False):
        self.chunks = fixture_chunks() if chunks is None else chunks
        self.hits = list(hits)
        self.fail = fail
        self.loads = 0
        self.retrieve_calls: list[dict] = []

    async def fetch_by_filenames(self, filenames):
        self.loads += 1
        if self.fail:
            raise RuntimeError("qdrant down")
        return list(self.chunks)

    async def retrieve(self, query, *, top_k, score_threshold, filenames=None, **_):
        self.retrieve_calls.append({"query": query, "top_k": top_k, "filenames": filenames})
        by_id = {c.id: c for c in self.chunks}
        return [dataclasses.replace(by_id[i], score=0.5) for i in self.hits]


class FakeReranker:
    """Scores by category key; with ``by_query``, per (query, key)."""

    def __init__(self, scores=None, by_query=None):
        self.scores = scores  # key -> logit; None (and no by_query) = passthrough
        self.by_query = by_query or {}
        self.seen: list[tuple[str, str]] = []
        self.queries: list[str] = []

    async def rerank(self, query, candidates, top_n):
        self.queries.append(query)
        self.seen += [(c.id, c.text) for c in candidates]
        if self.scores is None and not self.by_query:
            return candidates[:top_n]
        table = self.by_query.get(query, self.scores or {})
        scored = [dataclasses.replace(c, rerank_score=table.get(c.id, -10.0)) for c in candidates]
        return sorted(scored, key=lambda c: c.rerank_score, reverse=True)[:top_n]


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def _service(store=None, reranker=None, clock=None, **kw):
    options = dict(
        filenames=[FILENAME], top_k_retrieve=8, max_categories=2,
        rerank_score_threshold=-4.0, unstated_objection_threshold=0.5,
        runner_up_margin=3.0, full_rerank_max_categories=150, cache_ttl_seconds=900,
    )
    options.update(kw)
    return PushbackKnowledgeService(
        store or FakeVectorStore(), reranker or FakeReranker(), clock=clock or Clock(), **options
    )


# ── the catalogue ──────────────────────────────────────────────────────────


def test_categories_are_parsed_from_the_pushback_document_and_cached():
    store, clock = FakeVectorStore(), Clock()
    service = _service(store, clock=clock)
    first = asyncio.run(service.categories())
    assert list(first) == ["inventory", "raw_material_volatility", "dso", "cost_of_factoring"]
    asyncio.run(service.categories())
    assert store.loads == 1
    clock.now += 901  # an edited upload reaches the product after the TTL
    asyncio.run(service.categories())
    assert store.loads == 2


def test_a_failed_load_serves_the_last_good_copy_and_never_raises():
    store, clock = FakeVectorStore(), Clock()
    service = _service(store, clock=clock)
    good = asyncio.run(service.categories())
    store.fail = True
    clock.now += 901
    assert asyncio.run(service.categories()) == good
    assert asyncio.run(_service(FakeVectorStore(fail=True)).categories()) == {}


def test_a_duplicate_upload_is_deduped_but_its_chunks_still_match():
    copy = [
        dataclasses.replace(
            c, id=f"dup-{c.id}", file_id="other-upload",
            prev_id=c.prev_id and f"dup-{c.prev_id}", next_id=c.next_id and f"dup-{c.next_id}",
        )
        for c in fixture_chunks()
    ]
    store = FakeVectorStore(chunks=fixture_chunks() + copy, hits=["dup-chunk-2"])
    service = _service(
        store, FakeReranker({"cost_of_factoring": 5.0}), full_rerank_max_categories=0
    )
    assert len(asyncio.run(service.categories())) == 4
    [match] = asyncio.run(service.match("Our factoring fees go up with longer terms."))
    assert match.key == "cost_of_factoring"


# ── matching: aggressive by default ────────────────────────────────────────


def test_every_category_is_scored_without_a_vector_search():
    store = FakeVectorStore(hits=[])
    reranker = FakeReranker({"cost_of_factoring": 4.0})
    [match] = asyncio.run(_service(store, reranker).match("Our factoring costs rise."))
    assert match.key == "cost_of_factoring"
    assert store.retrieve_calls == []
    assert {key for key, _ in reranker.seen} == {
        "inventory", "raw_material_volatility", "dso", "cost_of_factoring",
    }


def test_both_the_objection_and_the_message_are_searched_best_score_wins():
    reranker = FakeReranker(by_query={
        "Our DSO targets would be missed.": {"dso": -6.0},
        "they say the DSO KPI blows up": {"dso": 3.0},
    })
    matched = asyncio.run(_service(reranker=reranker).match(
        "Our DSO targets would be missed.", message="they say the DSO KPI blows up",
    ))
    assert [c.key for c in matched] == ["dso"]
    assert reranker.queries == ["Our DSO targets would be missed.", "they say the DSO KPI blows up"]


def test_without_an_extracted_objection_only_a_confident_message_match_counts():
    # A bare refusal matches weakly: nothing.
    weak = FakeReranker({"dso": -0.5})
    assert asyncio.run(_service(reranker=weak).match(None, message="they said no")) == []
    # A concern the extractor missed matches strongly: found.
    strong = FakeReranker({"cost_of_factoring": 2.1})
    matched = asyncio.run(
        _service(reranker=strong).match(None, message="what if their factor charges more?")
    )
    assert [c.key for c in matched] == ["cost_of_factoring"]
    # The same -0.5 passes the normal gate once an objection was extracted.
    assert asyncio.run(_service(reranker=weak).match("Our DSO would suffer.")) != []


def test_past_the_full_rerank_cap_the_vector_search_shortlists_scoped_to_the_playbook():
    store = FakeVectorStore(hits=["chunk-1"])
    reranker = FakeReranker({"dso": 6.0, "raw_material_volatility": -7.0})
    matched = asyncio.run(
        _service(store, reranker, full_rerank_max_categories=0).match("Our KPIs are tied to our DSO.")
    )
    assert store.retrieve_calls[0]["filenames"] == [FILENAME]
    assert [c.key for c in matched] == ["dso"]
    # chunk-1 spans the end of Raw Material Volatility and the start of DSO.
    assert {key for key, _ in reranker.seen} == {"raw_material_volatility", "dso"}


def test_the_whole_category_is_returned_and_scored_on_the_supplier_side_only():
    reranker = FakeReranker({"dso": 6.0})
    [dso] = asyncio.run(_service(reranker=reranker).match("Our KPIs are tied to our DSO."))
    # Including the SCF counter that lives in a different chunk.
    assert [a.name for a in dso.counter_args] == ["Early Payments", "Non-Recourse Receivables Purchase"]
    scored = dict(reranker.seen)
    assert "Our KPIs and financial targets" in scored["dso"]
    assert "Early Payments" not in scored["dso"]


def test_a_second_category_must_score_close_to_the_first():
    far = FakeReranker({"dso": 8.0, "raw_material_volatility": -2.0})
    near = FakeReranker({"dso": 4.0, "raw_material_volatility": 2.0})
    assert [c.key for c in asyncio.run(_service(reranker=far).match("our DSO"))] == ["dso"]
    assert [c.key for c in asyncio.run(_service(reranker=near).match("our DSO"))] == [
        "dso", "raw_material_volatility",
    ]


def test_an_off_topic_message_matches_nothing():
    reranker = FakeReranker({"dso": -11.2, "raw_material_volatility": -11.1})
    assert asyncio.run(_service(reranker=reranker).match(None, message="what's the weather?")) == []


def test_an_unjudged_rerank_fails_open_on_the_vector_search_order():
    store = FakeVectorStore(hits=["chunk-2"])
    matched = asyncio.run(_service(store, FakeReranker(None)).match("they say it costs them"))
    assert [c.key for c in matched] == ["dso", "cost_of_factoring"]


def test_nothing_is_searched_for_no_text_or_an_unreachable_store():
    store = FakeVectorStore(hits=["chunk-1"])
    reranker = FakeReranker({"dso": 5.0})
    assert asyncio.run(_service(store, reranker).match(None, message="   ")) == []
    assert asyncio.run(_service(store, reranker).match("  ")) == []
    assert reranker.queries == []
    assert asyncio.run(_service(FakeVectorStore(fail=True)).match("our DSO")) == []


def test_a_matched_category_is_cited_as_a_rag_source():
    source = as_rag_source(fixture_kb()["dso"])
    assert source["filename"] == FILENAME
    assert source["page_numbers"] == [9, 10, 11]
    assert source["text"].startswith("15 DSO")
    assert "15.S.1" in source["text"]


# ── extracting the objection ───────────────────────────────────────────────


def test_the_objection_is_parsed_or_none():
    assert parse_objection_response('{"objection": "Our DSO targets would be missed."}') == (
        "Our DSO targets would be missed."
    )
    assert parse_objection_response('```json\n{"objection": null}\n```') is None
    assert parse_objection_response("null") is None
    assert parse_objection_response("no json here") is None
    assert parse_objection_response('{"objection": ""}') is None
    assert parse_objection_response('{"objection": "' + "x" * 401 + '"}') is None


# ── the node ───────────────────────────────────────────────────────────────


class ScriptedLLM:
    def __init__(self, extraction: str):
        self.extraction = extraction
        self.calls: list[str] = []

    async def complete(self, prompt, system=None, **_):
        self.calls.append(prompt)
        return self.extraction if len(self.calls) == 1 else "**Read**: x\n\n**Say**: y\n\n**If they hold**: z"


class FakeKnowledge:
    """``matches`` is what every search returns; ``catalogue`` the whole playbook."""

    def __init__(self, matches, catalogue=None):
        self.matches = matches
        self.catalogue = catalogue if catalogue is not None else {c.key: c for c in matches}
        self.calls: list[tuple[str | None, str | None]] = []

    async def match(self, objection, *, message=None):
        self.calls.append((objection, message))
        return self.matches

    async def categories(self):
        return self.catalogue


def _run(node, message, **state):
    facts = state.pop("facts", None) or rich_facts()
    return asyncio.run(node({
        "message": message,
        "context": SimpleNamespace(facts=facts),
        "brief": brief_from(facts),
        **state,
    }))


def test_a_relayed_objection_is_answered_from_the_matched_playbook_category():
    llm = ScriptedLLM('{"objection": "Our KPIs are tied to our DSO."}')
    knowledge = FakeKnowledge([fixture_kb()["dso"]])
    out = _run(make_pushback_node(llm, knowledge), "they say their DSO KPI would be hit")
    # Searched with the extraction AND the negotiator's own words.
    assert knowledge.calls == [("Our KPIs are tied to our DSO.", "they say their DSO KPI would be hit")]
    draft_prompt = llm.calls[1]
    assert COUNTER_REFERENCE_HEADING in draft_prompt
    assert "Early Payments" in draft_prompt
    assert [s["id"] for s in out["rag_sources"]] == ["dso"]


def test_a_message_with_no_extracted_objection_is_still_searched():
    """The extractor read "could cause them to breach a bank covenant" as nothing
    said 4 times in 6; the message itself still goes to the knowledge base, under
    the stricter gate the service applies when no objection was extracted."""
    llm = ScriptedLLM('{"objection": null}')
    knowledge = FakeKnowledge([fixture_kb()["cost_of_factoring"]])
    out = _run(make_pushback_node(llm, knowledge), "what if their factor charges more for 75 days?")
    assert knowledge.calls == [(None, "what if their factor charges more for 75 days?")]
    assert "Rate Arbitrage" in llm.calls[1] or "Volume-Based Margin Recovery" in llm.calls[1]
    assert [s["id"] for s in out["rag_sources"]] == ["cost_of_factoring"]


def test_a_bare_refusal_that_matches_nothing_gets_no_counters():
    llm = ScriptedLLM('{"objection": null}')
    out = _run(make_pushback_node(llm, FakeKnowledge([])), "they won't accept 90 days")
    assert COUNTER_REFERENCE_HEADING not in llm.calls[1]
    assert out["rag_sources"] == []


def test_the_classifier_rewrite_is_what_gets_extracted_and_searched():
    llm = ScriptedLLM('{"objection": null}')
    knowledge = FakeKnowledge([])
    _run(
        make_pushback_node(llm, knowledge), "cash flow",
        resolved_question="The supplier says longer terms hurt their cash flow.",
    )
    assert "The supplier says longer terms hurt their cash flow." in llm.calls[0]
    assert knowledge.calls == [(None, "The supplier says longer terms hurt their cash flow.")]


def test_a_named_concern_flagged_anticipatory_is_answered_as_that_objection():
    """1 classification in 6 put the bank-covenant question in anticipate mode,
    whose prepared list never carried the playbook's answer to it."""
    llm = ScriptedLLM('{"objection": "Longer terms could breach our bank covenant."}')
    knowledge = FakeKnowledge([fixture_kb()["dso"]])
    _run(
        make_pushback_node(llm, knowledge),
        "What options do we have if longer terms could cause the supplier to breach a bank covenant?",
        pushback_anticipate=True,
    )
    draft_prompt = llm.calls[1]
    assert COUNTER_REFERENCE_HEADING in draft_prompt
    assert "## APPROVED OBJECTIONS" not in draft_prompt


def test_a_general_prep_request_stays_anticipatory_and_leads_with_what_it_matched():
    llm = ScriptedLLM('{"objection": null}')
    facts = dataclasses.replace(rich_facts(), industry="Food Distribution")
    kb = fixture_kb()
    knowledge = FakeKnowledge([kb["cost_of_factoring"]], catalogue=kb)
    _run(
        make_pushback_node(llm, knowledge), "prepare potential pushbacks about their factoring",
        pushback_anticipate=True, facts=facts,
    )
    prompt = llm.calls[1]
    assert "## APPROVED OBJECTIONS" in prompt
    assert ASKED_OBJECTIONS_HEADING in prompt
    assert prompt.index(ASKED_OBJECTIONS_HEADING) < prompt.index("## APPROVED OBJECTIONS")
    assert "Cost of Factoring" in prompt
    # The data scan still runs, without repeating what the request matched.
    assert "Raw Material Volatility" in prompt
    assert prompt.count("### Cost of Factoring") == 1
