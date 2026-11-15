# Turning a Sentry Issue into an Azure DevOps Bug

**Applies to:** Sentry organization `calculum`, all environments
**Last updated:** 2026-08-20
**Verified on:** 2026-08-20 — token present in `apps/ap/e2e/.env.dev`

## 1. Credentials

`SENTRY_AUTH_TOKEN` lives in `apps/ap/e2e/.env.dev`, which is not tracked by git. It is a user
auth token with `org:read` and `event:read` scope on the `calculum` organization. The header is
`Authorization: Bearer <token>` — Bearer, not Basic. No other header is needed.

When reading or editing that file, do not end a line with a semicolon; dotenv keeps it as part of
the value. The full trap is recorded in
[apps/ap/e2e/context/running-tests-locally.md](../../apps/ap/e2e/context/running-tests-locally.md).

## 2. Reading a Sentry URL

A link such as
`https://calculum.sentry.io/issues/7488783483/?project=4503932770123776&environment=prod` gives:

| Element | Where it is |
|---|---|
| Organization slug | The subdomain — `calculum` |
| Issue id | The path segment after `/issues/` |
| Project id | The `project` query parameter. This is the numeric id, not the project slug; the slug only appears in the first API response. |
| Environment | The `environment` query parameter |

## 3. Two endpoints cover the triage

```bash
TOKEN=$(grep '^SENTRY_AUTH_TOKEN' apps/ap/e2e/.env.dev | sed -E 's/.*=\s*//' | tr -d ' ')
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://sentry.io/api/0/organizations/calculum/issues/<ISSUE_ID>/"
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://sentry.io/api/0/organizations/calculum/issues/<ISSUE_ID>/events/latest/"
```

The first returns title, culprit, level, status, priority, first and last seen, event count,
release, project, and a tag summary — the material for the bug title and the summary at the top of
the description.

The second returns the full latest event in `entries[]`. The useful entries are `type=exception`
for `data.values[].stacktrace.frames[]`, `type=request` for the method, URL, and the JSON body the
client actually sent, and `type=breadcrumbs` for the last steps before the failure. Top-level
`tags[]` carries environment, release, route, server name, runtime, and browser.

## 4. What to lift into the bug

| Bug field | Source |
|---|---|
| Title | `[Sentry][<env>] <level>: <short title> on <METHOD> <route>`. Keep the short Sentry id, such as `ADA-PLATFORM-API-5WV`, in the description rather than the title. |
| Description | The `permalink`, plus release, environment, server name, route, culprit, first and last seen, and event count. |
| Repro Steps | The `request` entry — method, URL, and the pretty-printed payload. This is the single most useful artifact for the developer who picks the bug up. |
| Tags | `Sentry; Production; <area from route>; <error type hint>` |
| Priority and Severity | Sentry `priority=high` with `level=fatal` maps to Priority 1 and Severity `2 - High`. `level=error` without high priority maps to Priority 2 and Severity `3 - Medium`. |

The mechanics of the create call are in [Azure DevOps work items](azure-devops-work-items.md).

## 5. Caveat

`event.user` is frequently `null` even when a real user triggered the request. Identify the
context from the `request` entry and the browser and client OS tags instead of trying to name the
user.

## 6. Related notes

- [Azure DevOps work items](azure-devops-work-items.md)
- [E2E knowledge map](e2e-knowledge-map.md)
