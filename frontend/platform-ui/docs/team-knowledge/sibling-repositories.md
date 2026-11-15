# Sibling Repositories in the Calculum Workspace

**Applies to:** Cross-repository work started from Front-End
**Last updated:** 2026-08-20
**Verified on:** 2026-08-20

## 1. The fact

Front-End is one checkout inside `/Users/sergiolazaro/Documents/Github-Calculum/`. The
repositories most often needed alongside it are the following.

| Repository | What it is |
|---|---|
| `Back-End` | The GraphQL backend this app talks to. PHP 8.1 or later, Symfony 6.4, API Platform 3.4 with `webonyx/graphql-php`. The `/api/graphql` endpoint is generated from `#[ApiResource]` and `#[GraphQlOperations]` attributes on entities in `src/Entity/GraphQL/`. Postgres through Doctrine ORM, MongoDB through ODM, and Elasticsearch. Business logic sits in `src/Services/`. Default branch `master`. |
| `ada-workitems` | Where Azure DevOps work items are authored as Markdown before being pushed. One directory per feature under `sprint-<N>/`, holding `uc-*.md` (use case), `us-*.md` (user story), `impl-*.md` (implementation plan), and `test-cases-*-gherkin-summary.md`. Also holds the Azure DevOps credentials used by the scripts in `scripts/`. |
| `Calculum.DataIngestion` | .NET 8 solution covering ingestion from FactSet, ImportYeti, and public company sources. Azure Functions API, an admin portal, CQRS with MassTransit, Elsa 3 workflows, and database migrators. |
| `AwsFunctionEnrichmentToken` | Small Node.js AWS Lambda using `firebase-admin` and `@aws-sdk/client-kms`. Decrypts KMS-encrypted environment variables and enriches Firebase tokens in the QA environment. |
| `compliance-docs` | Compliance and model risk management documentation for the ADA platform. Where security questionnaire answers are prepared. |
| `compliance-dashboard` | Front end for the compliance material above. |

Others present on disk: `ImportYeti`, `company-matching-llm`, `BD-Backups`.

## 2. The trap in the workspace file

`calculum.code-workspace` lists more folders than exist as directories. The seven
`Calculum.DataIngestion.*` entries are stale references — those projects are `.csproj` files
inside the `Calculum.DataIngestion` solution, not standalone checkouts.

## 3. Why it matters

A question about the GraphQL schema, an API error shape, or a work item cannot be answered from
Front-End alone, and searching for `Calculum.DataIngestion.API` as a directory returns nothing
because it is not one.

## 4. How to apply

- Backend, API, GraphQL schema, or a PHP service — search `Back-End/src/`.
- A ticket, user story, or acceptance criteria — search `ada-workitems/sprint-*/` by feature
  slug, and see [Branch and work item conventions](branch-and-work-item-conventions.md).
- Ingestion, FactSet, ImportYeti, or workflow engines — `Calculum.DataIngestion`.
- A security or compliance questionnaire — `compliance-docs`, which has its own team knowledge
  base under `docs/team-knowledge/`.

## 5. Related notes

- [Branch and work item conventions](branch-and-work-item-conventions.md)
- [Azure DevOps work items](azure-devops-work-items.md)
