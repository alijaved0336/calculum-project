# Team Knowledge Base

**Applies to:** Front-End repository (`calculum/ADA/Front-End`)
**Audience:** Front-End engineers, QA, and any AI assistant working in this repository
**Last updated:** 2026-08-20

## 1. Purpose

This directory holds working knowledge about this repository that is not derivable from the
code itself: where things moved, which documents are stale, which external systems the team
drives from here, and the conventions that are only visible in history. It exists so that any
team member — or any AI assistant opening this repo — starts from the same verified baseline
instead of rediscovering it or repeating a known mistake.

Notes here are cross-cutting. Knowledge that belongs to a single subsystem lives with that
subsystem — see [E2E knowledge map](e2e-knowledge-map.md) for the largest example.

## 2. Index

| Note | Type | Summary |
|---|---|---|
| [Sibling repositories](sibling-repositories.md) | Reference | What is checked out alongside Front-End, what each one is, and which one to search for a given question. |
| [Branch and work item conventions](branch-and-work-item-conventions.md) | Reference | How branch names and commit subjects map to Azure DevOps work items, and where authored story content lives. |
| [Azure DevOps work items](azure-devops-work-items.md) | Procedure | Creating work items through the REST API — project selection, auth, the iteration-path quirk, and the required field set. |
| [Sentry issue triage](sentry-issue-triage.md) | Procedure | Turning a Sentry issue URL into an Azure DevOps bug: two endpoints, and what to lift from each. |
| [Local unit test environment](local-unit-test-environment.md) | Fact and procedure | Why `pnpm test` fails locally on Node 25 (AR `storage.getItem`) and without Firebase env vars (AP), and the one command that runs the whole suite green. |
| [E2E knowledge map](e2e-knowledge-map.md) | Routing | Where Playwright knowledge lives in this repo, and what to read before diagnosing a failing test. |

## 3. How to use these notes

Read the relevant note before starting work on the same topic. Where a note contradicts an
older document in this repository, the note is the current position and the document is stale;
the note says which document it supersedes.

A note is a starting point, not an authority over the code. Every note states when it was last
verified. If a note names a file, a script, or a pipeline behaviour, confirm it still exists
before relying on it, and update the note when it does not.

## 4. How to add a note

One note per fact or rule, in its own file, named in kebab case after the subject. Each note
carries the same header — Applies to, Last updated, Verified on — followed by the fact, a
**Why it matters** section, and a **How to apply** section. Add a row to the index table in
Section 2 in the same change.

State the verification date and the primary source for every factual claim. A note whose facts
expire — a directory layout, a sprint number, an external API contract — says so explicitly and
names where to re-verify it. Notes are written in English, like everything else in this
repository.

Do not record here what the repo already records. A rule that belongs in `.cursor/rules/`, an E2E
root cause that belongs in `apps/ap/e2e/context/lessons-learned.md`, or a change writeup that
belongs in `docs/context/` goes to its own home, and this directory points at it if it is worth
finding from here.

## 5. Related material

- [.cursor/rules/](../../.cursor/rules/) — enforced working rules (pre-commit tests, git safety, pull requests, English-only code)
- [apps/ap/e2e/context/](../../apps/ap/e2e/context/) — Playwright root-cause library and local-run notes
- [docs/context/](../context/) — per-change analysis and implementation writeups
