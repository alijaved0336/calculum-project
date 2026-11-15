# ADA Front-End — Development Guide

Frontend platform for Calculum ADA, built as a **pnpm + Turborepo monorepo** with Vue 3, TypeScript, and Kendo UI.

## Monorepo structure

```
apps/ap/                ← Accounts Payable app (Vite 6)
apps/ar/                ← Accounts Receivable app (Vite 6)
apps/apv2/              ← AP v2 app (Vite 6)
packages/auth/          ← Shared auth helpers (@ada/auth)
packages/core/          ← Shared infra: Apollo, Router, Pinia (@ada/core)
packages/design-system/ ← Shared UI components (@ada/design-system)
```

---

## Prerequisites

- **Node.js** — version declared in `.nvmrc`
- **pnpm 9** — do not upgrade to pnpm 10/11 (breaking changes in peer dependency resolution affect Kendo UI and other packages)

```bash
npm install -g pnpm@9
```

---

## Setup

Install all workspace dependencies from the repo root:

```bash
pnpm install
```

---

## Development servers

| Command | App | URL |
|---|---|---|
| `pnpm run dev:ap` | AP only | http://localhost:8081 |
| `pnpm run dev:ar` | AR only | http://localhost:8082 |
| `pnpm run dev:apv2` | APV2 only | http://localhost:8081 |
| `pnpm run dev` | All apps in parallel | — |

### APv2 auth / port note

Until a dedicated APv2 backend is deployed, the shared API always returns
`base_uri=http://localhost:8081` after B2C login. APv2 therefore runs on **8081**
so the post-login redirect lands on the correct app.

**Do not run AP and APv2 at the same time** — both bind to port 8081. Stop one
before starting the other (`Ctrl+C`).

---

## Building

```bash
# Build all apps
pnpm run build

# Build a single app
pnpm run build:ap
pnpm run build:ar
pnpm run build:apv2
```

---

## App-specific environment files

Each app reads its secrets from a local `.env.local` file that is **never committed** (gitignored). Create it in the app directory before starting the dev server or building.

### `apps/ap/.env.local` — Accounts Payable

Contains MSAL/Azure B2C keys, Firebase credentials, API keys, etc. Contact the AP team or check 1Password for the current values.

### `apps/ar/.env.local` — Accounts Receivable

```env
VITE_BASE_URL=https://localhost:8080
VITE_APP_STORAGE_SECRET=ar-secure-storage-secret-dev
VITE_CHANGE_TO_PLATFORM=http://localhost:8081/
VITE_DEBUG=true
```

### `apps/apv2/.env.local` — AP v2

```env
VITE_BASE_URL=https://localhost:8080
VITE_APP_STORAGE_SECRET=apv2-secure-storage-secret-dev
VITE_CHANGE_TO_PLATFORM=http://localhost:8081/
VITE_DEBUG=true
```

---

## Testing

All test commands run from the app directory (e.g. `cd apps/ap`).

### Unit tests

```bash
pnpm test                   # Watch mode
pnpm run test:unit          # Unit tests only
pnpm run test:watch         # Explicit watch mode
pnpm run test:ui            # Vitest browser UI
pnpm run test:ci            # All tests with coverage (CI, no watch)
```

Run a single file:
```bash
npx vitest run tests/Unit/Path/To/SomeTest.spec.ts
```

Filter by test name:
```bash
npx vitest run --reporter=verbose -t "test name"
```

### Component and integration tests

```bash
pnpm run test:component     # Component + composable tests
pnpm run test:integration   # Integration tests
```

### End-to-end tests (Playwright)

E2E tests require the app to be built and served first (`pnpm run e2e:serve`).

```bash
pnpm run e2e:run            # Run all E2E tests
pnpm run e2e:run:headed     # With browser visible
pnpm run e2e:run:debug      # Debug mode
pnpm run e2e:report         # Show last Playwright report
```

### Environment-specific E2E tests

```bash
pnpm run env:test           # Against test environment
pnpm run env:test-pr        # PR validation tests (@prq tagged)
pnpm run env:test-partial   # Skip heavy tests (@heavy excluded)
pnpm run env:dev            # Against dev environment
pnpm run env:prod           # Against production
pnpm run env:local          # Against local environment
```

---

## Linting

```bash
pnpm run lint
```

---

## Documentation

Generate TypeDoc output (output: `docs/typedoc/`):

```bash
pnpm run docs
```

---

## Project structure

```
apps/ap/src/
├── modules/        ← Feature modules (auth, home, adminBackend, uploadFiles, …)
├── composables/    ← Shared Vue composables
├── stores/         ← Pinia stores
├── services/       ← Router, Apollo client, API config
├── utils/          ← Pure utility functions
└── resources/      ← Styles, assets, i18n locale files

tests/
├── Unit/           ← Pure logic tests
├── Component/      ← @vue/test-utils mount tests
├── Composables/    ← Composable tests
└── Integration/    ← Cross-concern integration tests

e2e/                ← Playwright end-to-end tests
```

---

## Technology stack

| Layer | Library |
|---|---|
| Framework | Vue 3 + TypeScript |
| Build | Vite 6 + Turborepo |
| State | Pinia |
| Routing | Vue Router |
| UI components | Kendo UI |
| API — REST | axios |
| API — GraphQL | Apollo Client |
| Auth | Azure B2C / MSAL |
| Realtime | Firebase Firestore |
| Unit tests | Vitest |
| E2E tests | Playwright |
| Error tracking | Sentry |
| Analytics | PostHog |
| i18n | vue-i18n |

---

## Known dependency constraints

**`@progress/kendo-drawing` pinned to `1.21.2`** — versions ≥1.22 export native ES6 classes, which are incompatible with `@progress/kendo-charts` 2.3.0's ES5 prototype-based inheritance. This causes a runtime error: `"Class constructor cannot be invoked without 'new'"`. Safe to unpin once `kendo-charts` is upgraded to a version that uses ES6 class syntax.

**pnpm pinned to v9** — pnpm 10/11 changed `public-hoist-pattern` defaults and tightened peer dependency enforcement. Several packages in this repo (Kendo wrappers, Bootstrap 4, ESLint 8) rely on lenient hoisting. Upgrade pnpm only after those packages are updated first.
