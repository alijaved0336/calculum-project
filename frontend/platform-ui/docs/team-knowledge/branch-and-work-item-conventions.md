# Branch and Work Item Conventions

**Applies to:** Front-End branches, commit subjects, and pull requests
**Last updated:** 2026-08-20
**Verified on:** 2026-08-20 against the active remote branches and the last 15 merge commits

## 1. The fact

More than one branch naming pattern is in active use. All of them appear on the remote today,
so none of them can be treated as the single convention.

| Pattern | Example | Notes |
|---|---|---|
| `S<story>/<Type>/<slug>` | `S115/Bug/19504-audit-logs-tab` | The most explicit form. `S115` is the Azure DevOps **Story** work item; `Type` is `Front`, `Bug`, or `Test`. |
| `<type>/<id>-<slug>` | `feature/18884-ar-match-module`, `fix/19504-audit-log-drop-int-pk` | The number is the work item id. |
| `<id>-<slug>` | `17714-fixing-test-sprint-114` | Work item id first, no type segment. |
| `<type>/<slug>` | `feat/design-system-storybook` | No work item reference in the branch at all. |
| `<owner>/<slug>` | `joel/mergeback-staging-master` | Personal branches, usually merge-backs. |

Long-lived branches are `master` (the default), `staging`, and `production`.

Commit subjects reference work items in three forms, all currently present in history: `WI#19199`,
`AB#19505`, and `G-349`. `AB#<id>` is the form Azure DevOps auto-links.

## 2. Where the authored content lives

The use case, user story, implementation plan, and Gherkin test cases behind a story are authored
in the `ada-workitems` repository, under `sprint-<N>/<feature-slug>/`. The feature slug is kebab
case and does **not** contain the story number, so search by feature name rather than by id.

That repository holds `sprint-95` through `sprint-109` as of 2026-08-20, while Front-End work is
on sprint 114 and later. Recent sprints are therefore not necessarily mirrored there — check
Azure DevOps directly for anything newer than sprint 109.

## 3. Why it matters

Reading a branch name is the fastest way to find the requirements behind a change, but only if
the pattern is recognised. Assuming a single convention leads to searching `ada-workitems` for a
story id that was never in the branch name, or concluding a branch has no ticket when the id is
simply in a different position.

## 4. How to apply

- Extract the numeric work item id from wherever it appears in the branch name, then pull the
  live item from Azure DevOps. The MCP server configured in `ada-workitems/.mcp.json` is the
  quickest route; the REST recipe is in [Azure DevOps work items](azure-devops-work-items.md).
- Search `ada-workitems/sprint-*/` by the feature slug from the branch, not by id.
- Pull request titles and descriptions are written in English, without exception
  ([.cursor/rules/pull-request.md](../../.cursor/rules/pull-request.md)). If a pull request is
  requested without a work item id, ask for the id rather than guessing it.
- When naming a new branch, follow the pattern already used by the branch being worked from
  rather than introducing a sixth variant.

## 5. Related notes

- [Azure DevOps work items](azure-devops-work-items.md)
- [Sibling repositories](sibling-repositories.md)
