# Creating Azure DevOps Work Items from the Command Line

**Applies to:** Bug and work item creation in the `calculum` Azure DevOps organization
**Last updated:** 2026-08-20
**Verified on:** 2026-08-20 — bug id 16768 was created with this exact field set

## 1. Prerequisites

The Azure CLI (`az`) is **not** installed on this machine. `az boards work-item create` will not
work. Use the REST API directly with `curl` or `urllib`.

Credentials live in `ada-workitems/.env`, which is not tracked by git:

```
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/calculum
AZURE_DEVOPS_PROJECT=ADA
AZURE_DEVOPS_TOKEN=<personal access token>
```

Authorization is HTTP Basic with an empty username:

```bash
Authorization: Basic $(echo -n ":$AZURE_DEVOPS_TOKEN" | base64)
```

Never copy the token itself into a file, a commit, a work item, or a chat message.

## 2. Choosing the project

The same organization, token, and mechanics apply to every project. Only the `{PROJECT}` segment
of the URL and the `System.AreaPath` and `System.IterationPath` prefixes change.

| What was named | Project | Path prefix |
|---|---|---|
| Nothing | `ADA` — the default | `ADA` |
| "ADA" | `ADA` | `ADA` |
| "Data Ingestion" | `Data Ingestion`, id `9023d30d-a170-4ab9-b6a8-f4a5a2c664e2`. URL-encode the space as `Data%20Ingestion`. | `Data Ingestion` |

Other projects exist in the organization — `Voxia`, `Ada 2.0`, `Support`, `WebCalculator`, `AI` —
but they are not part of this rule. Confirm any of them with
`GET {ORG}/_apis/projects?api-version=7.0`.

## 3. The iteration path quirk

The value of `System.IterationPath` uses a **single** backslash: `ADA\Sprint 109`. In a JSON
string literal that is written `"ADA\\Sprint 109"`. A value that still contains a double
backslash after JSON decoding is rejected by the API.

Always list the iterations first and copy the stored name exactly:

```
GET {ORG}/{PROJECT}/_apis/wit/classificationnodes/iterations?$depth=3&api-version=7.0
```

In the Data Ingestion project, sprint 66 is stored as `Spritn 66`. The typo is in Azure DevOps,
not in this note — the API matches the stored string, so do not correct it.

## 4. Creating a bug

`POST {ORG}/{PROJECT}/_apis/wit/workitems/$Bug?api-version=7.0` with
`Content-Type: application/json-patch+json`. The minimum field set that produces a clean bug:

| Field | Value |
|---|---|
| `System.Title` | Short, in English. See [Branch and work item conventions](branch-and-work-item-conventions.md). |
| `System.AreaPath` | `ADA` — no team sub-area is used for bugs. |
| `System.IterationPath` | For example `ADA\Sprint 109`, single backslash. |
| `System.Description` | HTML. Use `<div>`, `<pre>`, `<code>`, `<strong>`, `<a>`; no full `<html>` wrapper. |
| `Microsoft.VSTS.TCM.ReproSteps` | HTML. This is the field the Bug form shows as "Repro Steps" — put the request method, URL, and payload here rather than in the description. |
| `Microsoft.VSTS.Common.Priority` | Integer, 1 to 4. |
| `Microsoft.VSTS.Common.Severity` | One of `1 - Critical`, `2 - High`, `3 - Medium`, `4 - Low`. |
| `System.Tags` | Semicolon-separated string, for example `Sentry; Production; Performance`. |

The response returns the created item with its `id`. The edit URL is
`{ORG}/{PROJECT}/_workitems/edit/{id}`; the project-GUID URL returned in `_links.html.href` also
works.

## 5. What not to do automatically

- Do not set `System.AssignedTo` unless the owner was named. Leave it empty.
- Do not set `System.State`. Let it default to `New`.
- Do not link the bug to a parent story without being asked. Triage usually comes first.

## 6. Why it matters

Three details in this procedure fail in ways that are hard to read from the error response: the
missing `az` CLI, the double-backslash iteration path, and repro steps written into the
description field where the developer picking up the bug will not look for them.

## 7. Related notes

- [Sentry issue triage](sentry-issue-triage.md) — how to gather the payload before creating the bug
- [Branch and work item conventions](branch-and-work-item-conventions.md)
