# RAG / `answer_data_question` fixes — 2026-09-09

Session debugging the symptom: a factual question like *"what is the definition
of supplier standards?"* would answer "I don't have that data" even though the
knowledge base and/or the supplier's structured data actually had the answer.
Root cause turned out to be four separate, stacking issues — one prompt-design
bug, one data-labeling bug, and two retrieval-robustness bugs. All four are
fixed below, plus one temporary debug aid that was added and then reverted.

Commit: `e76ed2b` ("Fix : RAG Fixes").

---

## 1. System prompt never told the model a KB section could exist

**File:** [`utils/prompts/data_question_prompt.py`](../utils/prompts/data_question_prompt.py)

`build_data_question_prompt` always appended the RAG-retrieved
`KNOWLEDGE BASE REFERENCE` block to the prompt when chunks were found
([rag_service.py](../application/services/rag_service.py) builds that block),
but the system prompt (`data_question_system_prompt`) described the model's
input as a closed set of exactly **two** sections — DATA and INTERNAL FIGURES —
and instructed it to "answer using only the DATA provided below." The model
took that literally and ignored the third, unannounced block, even when it
contained the exact answer.

**Fix:** rewrote the system prompt to describe **three** possible sections,
explicitly including KNOWLEDGE BASE REFERENCE, with guidance that a passage
answering the same concept under a different heading still counts.

## 2. DATA block used internal labels instead of the terms users actually type

**File:** [`utils/prompts/brief/facts.py`](../utils/prompts/brief/facts.py)

Two benchmark figures are real, populated fields in `SupplierFacts`
(`supplier_segment_term_days`, `peer_group_term_days`), sourced from
`negotiationStrategy.supplierStandard` / `.peerGroupStandard` respectively.
But the FACTS block rendered them under paraphrased internal labels —
`"Supplier-segment peers"` and `"Comparable peer group"` — instead of the
canonical names the UI shows and users type: **"Supplier Standard"** and
**"Peer Group Standard"** (see [`domain/entities/argument_catalog.py`](../domain/entities/argument_catalog.py),
which already used the correct names for a different surface — the
arguments/pitching block, which `answer_data_question` deliberately doesn't
receive).

Because the exact term a user asked about never appeared anywhere in the
prompt, the model couldn't connect "what is supplier standard" to the DATA
line, reported no data, and fell back to whatever it *did* recognize in the
KB (a different concept, "Buyer Standard").

**Fix:** renamed the two labels in `facts.py` to the canonical catalog names,
so the DATA block now literally contains the term regardless of question
phrasing. This is the shared FACTS renderer, so the fix benefits every
surface that uses it (summarize, explain-recommendation, negotiation guide,
etc.), not just `answer_data_question`. Updated the one test
(`tests/unit/test_brief_facts.py`) that pinned the old label text.

**Known duplication risk left as a follow-up:** the canonical name
`"Supplier Standard"` now lives as a literal string in both
`argument_catalog.py` and `facts.py`. If it's renamed in one place and not
the other, this exact bug recurs. Not fixed here — would need `facts.py` to
import the label from `ARGUMENT_CATALOG` instead of duplicating the string,
which needs a check for import-cycle safety between `domain/entities` and
`utils/prompts/brief`.

## 3. Overcorrection: DATA matches short-circuited real definitions

**File:** `utils/prompts/data_question_prompt.py` (same file as #1)

After fix #2, the model started recognizing the term immediately in DATA and
skipped the KB definition entirely — answering "definition" questions with
just the number plus an invented rationale ("...serves as a narrower, more
specific benchmark... for evaluating fairness") that wasn't grounded in
either DATA or any retrieved passage.

**Fix:** added explicit guidance distinguishing two question shapes:
- **Definition questions** ("what is X", "define X") → must be answered from
  the actual KB passage, in the model's own words but not inventing beyond
  what the passage/DATA states; the supplier's number is a trailing sentence,
  not the headline.
- **Value questions** ("what is X's value", "give me X") → lead with the
  number.

Also added a blanket rule: never state a rationale/comparison as fact unless
it's grounded in KB text or DATA — inventing plausible-sounding "why it
matters" framing counts as a violation even when the number is correct.

## 4. Silent absence of KB results invited the model to improvise

**File:** `utils/prompts/data_question_prompt.py` (same file as #1)

When RAG retrieval returned 0 chunks, the KNOWLEDGE BASE REFERENCE section
was simply omitted from the prompt — indistinguishable, to the model, from
"not checked." On a definition question with a DATA-block anchor (the term
name + number from fix #2), the model would sometimes fill the gap with a
plausible-sounding definition from its own general knowledge instead of
admitting no source existed.

**Fix:** when `rag_context.chunk_count == 0`, the prompt now includes an
explicit `KNOWLEDGE BASE REFERENCE` section stating no passages were
retrieved, and instructing the model to say so plainly for definition
questions rather than composing one from general knowledge. An explicit
negative is a much stronger deterrent than silence.

---

## 5. Retrieval instability: identical queries, different results

Two compounding causes, both in the vector-store layer:

### 5a. Hard score-threshold cliff

**Config:** `.env` — `RAG_SCORE_THRESHOLD`

[`infrastructure/vector_store/qdrant_adapter.py`](../infrastructure/vector_store/qdrant_adapter.py)
passes `score_threshold` straight into Qdrant's `query_points()`, which
enforces it **server-side** as a hard cutoff — chunks scoring below it are
never returned at all, not even as low-confidence candidates. The deployed
`.env` had this set to `0.50`, overriding the code's own default of `0.30`
(`config.py`). Bi-encoder cosine similarity is sensitive to exact phrasing,
so a paraphrase of the same question could land on either side of that
cliff — one phrasing scored 0.58 and worked, another scored below 0.50 and
returned zero chunks.

**Fix:** lowered `RAG_SCORE_THRESHOLD` back to `0.30` in `.env`, matching the
code default. The dense-retrieval threshold's job should be "filter out
obvious garbage," not "be the precision gate" — that's what the downstream
cross-encoder reranker (`rag_service.py`, `top_n_rerank`) is for, and it's a
much more accurate relevance signal than raw embedding similarity.

**Note:** `.env` is git-ignored (local/deployment config), so this change
isn't in the `e76ed2b` commit — it needs to be applied to every environment
separately, and the running service needs a restart to pick it up
(`pydantic-settings` reads env vars once at process start).

### 5b. Approximate search non-determinism

**File:** `infrastructure/vector_store/qdrant_adapter.py`

Qdrant's default vector search is HNSW — an *approximate* nearest-neighbor
algorithm that walks a bounded region of a graph, not a guaranteed exact
top-k. Combined with the knowledge base's known heavy duplication (documented
in `rag_service.py`'s `_deduplicate`: "58% of points are duplicate text, up
to 6 copies of one passage"), this meant the *same query text* could return
different results between calls — which duplicate copy the graph walk
happened to visit varied, and whether it crossed the score threshold varied
with it.

**Fix:** two-tier retrieval. Normal approximate search runs first (fast, as
before). Only if it returns **zero points**, retry once with
`search_params=SearchParams(exact=True)` — a full brute-force scan
guaranteed to find the true top-k. Both attempts are logged
(`qdrant_adapter: approximate search returned 0 points, retrying...` /
`...exact search recovered N point(s)...`) so the fallback's actual firing
rate is visible in production logs going forward. Exact-search cost is only
paid on the rare empty-result path, not on every query.

**Not fixed (out of scope for this app):** the root cause of the duplication
itself is upstream, in the separate ingestion pipeline that writes the KB
collection. Deduping at ingestion would remove the unstable neighborhoods
this fix works around.

---

## Reverted: temporary intent-gate bypass

While testing, a debug-only override was added to
[`agents/nodes/intent_classifier.py`](../agents/nodes/intent_classifier.py)
that force-routed any `OUT_OF_SCOPE` classification to `ANSWER_DATA_QUESTION`,
so RAG could be exercised directly regardless of what the intent classifier
decided. It was marked `TEMP — REMOVE` and has since been reverted — current
`intent_classifier.py` uses the classifier's real result unmodified. Noted
here only so it doesn't get rediscovered and mistaken for an intentional
change.

---

## Files touched

| File | What changed |
|---|---|
| `utils/prompts/data_question_prompt.py` | System prompt: announce KB section, definition-vs-value guidance, explicit "no KB match" signal |
| `utils/prompts/brief/facts.py` | Renamed 2 benchmark labels to canonical catalog names |
| `tests/unit/test_brief_facts.py` | Updated assertions for the renamed labels |
| `infrastructure/vector_store/qdrant_adapter.py` | Two-tier approximate→exact retry on empty results |
| `.env` (not committed, git-ignored) | `RAG_SCORE_THRESHOLD` 0.50 → 0.30 |

