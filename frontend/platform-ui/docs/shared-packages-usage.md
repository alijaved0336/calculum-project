# Shared Packages Usage Guide (`@ada/auth`, `@ada/core`, `@ada/design-system`)

> Bilingual guide (English / Español). This document is informational only — it does not require any code changes.
> Documento bilingüe (Inglés / Español). Este documento es solo informativo — no requiere ningún cambio de código.

---

## 1. How resolution works / Cómo funciona la resolución

**EN** — This is a pnpm workspace monorepo. `apps/ap` and `apps/ar` consume `packages/auth`, `packages/core`, and `packages/design-system` as workspace packages (`"workspace:*"` in `package.json`). There is **no build step**: every package's `main`/`types` point directly at `src/index.ts`, so apps import the TypeScript source directly. pnpm creates real symlinks (`node_modules/@ada/<pkg> -> packages/<pkg>`), and Vite/TS resolve `@ada/*` through those symlinks plus the `paths` entries duplicated in each app's `tsconfig.json` (TS `paths` in an extending config fully overrides the base config's `paths`, so it must be repeated).

**ES** — Este es un monorepo con pnpm workspaces. `apps/ap` y `apps/ar` consumen `packages/auth`, `packages/core` y `packages/design-system` como paquetes de workspace (`"workspace:*"` en `package.json`). **No hay paso de build**: el `main`/`types` de cada paquete apunta directo a `src/index.ts`, por lo que las apps importan el código fuente TypeScript directamente. pnpm crea symlinks reales (`node_modules/@ada/<pkg> -> packages/<pkg>`), y Vite/TS resuelven `@ada/*` a través de esos symlinks más las entradas `paths` duplicadas en el `tsconfig.json` de cada app (los `paths` de TS en un config que hace `extends` sobrescriben completamente al base, por eso se repiten).

---

## 2. `@ada/auth` (`packages/auth`)

### What it exports / Qué exporta

| Category / Categoría | Exports |
|---|---|
| Login/backend config | `configureAuth(baseUrl)`, `getAuthBaseUrl()`, `authLogin(idps?)`, `authLogout(idps?)`, `authResetPassword()` |
| Router guard | `installAuthGuard(router, checkAuth, getIdps?)` |
| Route name constants | `AUTH_ROUTE_LOGIN`, `AUTH_ROUTE_ERRORS`, `AUTH_ROUTE_OUT_OF_SERVICE`, `AUTH_ROUTE_CONTACT_SUPPORT`, `AUTH_ROUTE_CONTACT_SUPPORT_SUCCESS` |
| Session roles | `SESSION_ROLES`, `ROLE_ADMIN`, `ROLE_COMPANY_ADMIN`, etc. + type `SessionRoleValue` |
| Role helpers | `hasSessionRole`, `hasSuperAdminRole`, `hasCompanyAdminRole`, `hasUserRole`, `hasViewOnlyRole`, `hasDataUserRole`, `hasSalesUserRole`, `hasPartnerUserRole`, `getUserSessionRoles`, `hasAnySessionRoles`, `hasAdminPrivileges`, `hasElevatedPrivileges` |
| Session composable | `useSession()` → `{ session, isAuthenticated, isLoading, fetchSession, clearSession }`; type `AuthSessionInfo` |

### Usage in `apps/ar` — full end-to-end usage / uso completo de punta a punta

`ar` uses `@ada/auth` as a regular `dependency` and wires the whole login/session flow through it:

```ts
// apps/ar/src/main.ts
import { configureAuth } from '@ada/auth'
configureAuth(import.meta.env.VITE_BASE_URL)
```

```ts
// apps/ar/src/router/index.ts
import { installAuthGuard, useSession } from '@ada/auth'
installAuthGuard(router, async () => {
  const { isAuthenticated, fetchSession } = useSession()
  if (isAuthenticated.value) return true
  return fetchSession()
})
```

```ts
// apps/ar/src/views/SignoutView.vue
import { authLogout, configureAuth, useSession } from '@ada/auth'
```

Routes that must be reachable without auth need `meta: { public: true }` (e.g. `/signout` in `ar`) so `installAuthGuard` lets them through.

### Usage in `apps/ap` — partial usage / uso parcial

`ap` declares `@ada/auth` as a `devDependency` and does **not** use `useSession`, `installAuthGuard`, `authLogin/authLogout/configureAuth`. It keeps its own cookie-based auth system (`apps/ap/src/utils/CookieSessionsFns.ts`). What it *does* reuse from `@ada/auth`, via local re-export wrappers:

- `apps/ap/src/modules/auth/AuthRouting.ts` re-exports the `AUTH_ROUTE_*` constants.
- `apps/ap/src/constants/sessionRoles.ts` re-exports `SESSION_ROLES` / role constants ("shared source of truth").
- `apps/ap/src/utils/sessionRoleUtils.ts` re-exports the role-check helpers (`hasAdminPrivileges`, `hasSuperAdminRole`, etc.), consumed e.g. in `apps/ap/src/services/user/composables/useUser.ts`.

**EN — Key takeaway**: `ar` uses `@ada/auth` end-to-end (login, logout, guard, reactive session). `ap` only reuses the *pure* pieces (role constants and role-check functions), indirectly, through local re-export modules — its login/session/guard logic is its own.

**ES — Punto clave**: `ar` usa `@ada/auth` de punta a punta (login, logout, guard, sesión reactiva). `ap` solo reutiliza las partes *puras* (constantes y funciones de roles), de forma indirecta, a través de módulos locales de re-export — su lógica de login/sesión/guard es propia.

### Setup required / Configuración necesaria

- Env var `VITE_BASE_URL` for `configureAuth()` (only relevant if you actually call it, as `ar` does).
- No Vue plugin to install — just import functions/composables where needed.
- Mark public routes with `meta: { public: true }` if using `installAuthGuard`.

---

## 3. `@ada/core` (`packages/core`)

### What it exports / Qué exporta

| Factory | Purpose |
|---|---|
| `createApolloClient({ baseUri, typePolicies?, onAuthError?, debug? })` | Apollo Client with `InMemoryCache`, an auth-header link (`idk` via `uuid-random`), and a 401-handling link. |
| `createAppRouter(routes, appTitle='ADA')` | Wrapper over `createRouter`/`createWebHistory` with scroll-to-top and automatic `document.title` from `meta.title`/`appTitle`. |
| `createAppPinia({ storageSecret, encryptionNamespace?, debug?, legacyPlainJsonKeys?, cleanup?, exposeOnGlobal? })` | Pinia instance with AES-encrypted persistence (`secure-ls` + `pinia-plugin-persistedstate`). Returns `{ pinia, secureStorage, debugStorage, clearStorage, testSecureStorage }`. |

### Usage in `apps/ar`

```ts
// apps/ar/src/main.ts
import { createAppPinia } from '@ada/core'
const { pinia } = createAppPinia({
  storageSecret: import.meta.env.VITE_APP_STORAGE_SECRET,
  encryptionNamespace: 'ar-pinia',
  debug: import.meta.env.VITE_DEBUG === 'true',
})
```

```ts
// apps/ar/src/router/index.ts
import { createAppRouter } from '@ada/core'
export const router = createAppRouter(routes, 'ADA AR')
```

`createApolloClient` is **not used** in `ar`, even though `@apollo/client`/`graphql` are declared as dependencies.

### Usage in `apps/ap`

```ts
// apps/ap/src/services/router/index.ts
import { createAppRouter } from "@ada/core"
const router = createAppRouter(defaultRoutes, 'ADA')
// ap then adds its own extra router.beforeEach for dynamic titles
```

```ts
// apps/ap/src/services/pinia/index.ts
import { createAppPinia } from "@ada/core"
const { pinia, secureStorage, debugStorage, clearStorage, testSecureStorage } = createAppPinia({
  storageSecret: import.meta.env.VITE_APP_STORAGE_SECRET || "your-secure-secret-key",
  encryptionNamespace: "calculum-pinia",
  debug: import.meta.env.DEV,
  legacyPlainJsonKeys: ["ada-home", "ada-user"],
  cleanup: true,
  exposeOnGlobal: import.meta.env.DEV ? "__PINIA__" : undefined,
})
```

`createApolloClient` is **also not used** in `ap` — `ap` has its own hand-written Apollo Client (`apps/ap/src/services/graphql/apolloClient.ts`) that duplicates almost the same logic (401-handling link, `idk` header) instead of using the shared factory.

**EN — Notable finding**: `createApolloClient` exists in `@ada/core` but neither app uses it today. This is a consolidation opportunity, not a bug — worth flagging to whoever owns `packages/core`.

**ES — Hallazgo notable**: `createApolloClient` existe en `@ada/core` pero ninguna de las dos apps lo usa actualmente. Es una oportunidad de consolidación, no un bug — vale la pena señalarlo a quien mantenga `packages/core`.

### Setup required / Configuración necesaria

- Env vars: `VITE_APP_STORAGE_SECRET` for Pinia encryption in every app (`ar`, `ap`, `apv2`), plus a debug flag var.
- `app.use(pinia)` and `app.use(router)` must be registered in each app's `createApp()` chain in `main.ts`.
- No special Vite alias needed — resolved via pnpm symlink + `main: src/index.ts`.

---

## 4. `@ada/design-system` (`packages/design-system`)

This is the only one of the three with an explicit `exports` map (`"." → src/index.ts`, `"./*" → src/*`), which is why deep imports like `@ada/design-system/locales/index` or `@ada/design-system/data/globalColumns` work without being re-exported from the barrel. **Both `ap` and `ar` now resolve `@ada/design-system` the exact same way** — through this `exports` map, straight to source — since `ap`'s old redundant Vite alias (`apps/ap/vite.config.ts` → `'@ada/design-system': path.resolve(..., 'packages/design-system/src')`) was removed. There is no longer any behavioral difference in *how* the two apps resolve the package, only in *which parts* they import.

> **`"./*": "./src/*"` is a plain string substitution, not a bare-import resolver.** It rewrites the subpath and hands the result to the bundler as-is — it does **not** fall back to a directory's `index.ts` the way a normal relative import would. `@ada/design-system/data/globalColumns` resolves because `globalColumns.ts` is a *file*. `@ada/design-system/components/graphql-grid` (a *folder*) will fail with "Failed to resolve import ... Does the file exist?" — you must import the file directly: `@ada/design-system/components/graphql-grid/Index.vue` (+ `/types` for the TS types).

### What it exports / Qué exporta

| Category | Exports |
|---|---|
| Components (barrel) | `CalculumLoading`, `CalculumLayout`, `HomeFooter` (used internally by `CalculumLayout`), `SearchableDropdown`, `StatusCard`, `ContentBox`/`ContentBoxBody`, `CustomTabs`, `NoDataAvailable`, chart components, primitives (`CustomButton`, `CustomSelect`, `CustomDialog`, `CustomBadge`, `CustomCheckbox`, `CustomRadio`, `TooltipButton`, typography), `SideBar`/`SideBarLink` |
| Components (subpath only — **not** in the barrel, see §4.1) | `GraphqlGrid` → `@ada/design-system/components/graphql-grid/Index.vue` |
| Column definitions | `@ada/design-system/data/globalColumns` — Kendo grid column configs shared by `ap`'s grids; `ap`'s own `globalColumns.ts` was moved here so both apps can reuse it |
| i18n | `messages` (`{ en, es }`), `defaultLocale` |
| Locale enum | `Locales.EN`, `Locales.ES`, `LOCALES` (array for selects) |
| Deep-import only assets | SCSS partials (fonts, colors, bootstrap utilities, `kendo-tooltip.scss`, `kendo-dropdown.scss`, `kendo-dialog.scss`, `kendo-grid.scss`), raw locale JSON files, SVG icon components |

### 4.1 Barrel vs. subpath — which one to export from / cuál usar al exportar

**EN** — The barrel (`packages/design-system/src/index.ts`) is a single JS module. **ESM evaluates every static import in a module when it loads, regardless of which named export the caller actually uses.** So the moment *anything* is imported from `@ada/design-system` (even just `CalculumLoading`), the whole barrel's import graph gets evaluated — including any component re-exported there, whether the caller wanted it or not.

This bit `ap` for real: `GraphqlGrid` was briefly re-exported from the barrel. `GraphqlGrid` imports `@progress/kendo-vue-grid@9.1.0`. `ap` never renders `GraphqlGrid` — but `ap` *does* import `CalculumLayout` from the same barrel for ~160 other files, so `ap`'s bundle started loading the whole Kendo v9.x stack *alongside* its own, unrelated, `@progress/kendo-vue-grid@4.3.3`. Result: a "your license doesn't cover Kendo UI for Vue v9.1.0" banner in `ap`, plus broken pager icons and a z-index bug in `ap`'s *own* v4.3.3 grid — none of it caused by a real dependency conflict (`ap`'s node_modules resolution was, and still is, perfectly isolated at v4.3.3), purely by the unused import being *present*.

**Rule of thumb**: components made only of Vue/CSS, or whose dependencies are already shared across the whole design system (Kendo `kendo-vue-buttons`/`kendo-vue-dropdowns`/etc. already used by `CustomSelect`, `CustomDialog`, ...), are fine in the barrel. A component that pulls in a *new*, *heavy*, or *version-sensitive* third-party dependency — especially one only one app needs — should be exported **only** via its subpath (`packages/design-system/src/components/<name>/index.ts`, imported as `@ada/design-system/components/<name>/...`), never re-added to `src/index.ts`. See the comment in `packages/design-system/src/components/graphql-grid/index.ts` for the concrete precedent.

**ES** — El barrel (`packages/design-system/src/index.ts`) es un solo módulo JS. **ESM evalúa todos los imports estáticos de un módulo al cargarlo, sin importar qué export nombrado use realmente quien lo importa.** Entonces, en el momento en que se importa *cualquier cosa* de `@ada/design-system` (aunque sea solo `CalculumLoading`), se evalúa todo el grafo de imports del barrel completo — incluyendo cualquier componente re-exportado ahí, lo haya pedido o no quien importó.

Esto le pasó de verdad a `ap`: `GraphqlGrid` estuvo brevemente re-exportado desde el barrel. `GraphqlGrid` importa `@progress/kendo-vue-grid@9.1.0`. `ap` nunca renderiza `GraphqlGrid` — pero `ap` sí importa `CalculumLayout` del mismo barrel en ~160 archivos, así que el bundle de `ap` empezó a cargar todo el stack de Kendo v9.x *junto* a su propio `@progress/kendo-vue-grid@4.3.3`, sin relación alguna. Resultado: un banner de "tu licencia no cubre Kendo UI for Vue v9.1.0" en `ap`, más íconos de paginación rotos y un bug de z-index en el grid v4.3.3 *propio* de `ap` — nada de esto por un conflicto real de dependencias (la resolución de node_modules de `ap` estaba, y sigue estando, perfectamente aislada en v4.3.3), solo por la presencia del import no usado.

**Regla práctica**: componentes hechos solo de Vue/CSS, o cuyas dependencias ya se comparten en todo el design system (los Kendo `kendo-vue-buttons`/`kendo-vue-dropdowns`/etc. que ya usan `CustomSelect`, `CustomDialog`, ...), están bien en el barrel. Un componente que trae una dependencia de terceros *nueva*, *pesada*, o *sensible a versión* — sobre todo si solo una app la necesita — debe exportarse **solo** por su subpath (`packages/design-system/src/components/<nombre>/index.ts`, importado como `@ada/design-system/components/<nombre>/...`), nunca agregarse de nuevo a `src/index.ts`. Ver el comentario en `packages/design-system/src/components/graphql-grid/index.ts` para el precedente concreto.

### Usage in `apps/ap` — extensive (~168 references)

```ts
// Barrel imports — dominant pattern in ap
import { CalculumLoading } from '@ada/design-system'                       // Login.vue
import { CalculumLayout, CalculumLoading } from '@ada/design-system'       // EntityCard.vue
import { CalculumLoading, SearchableDropdown } from '@ada/design-system'   // AdminDownloadData.vue
```

```ts
// Deep imports for i18n, repeated across many util files
import { messages, defaultLocale } from '@ada/design-system/locales/index'
import { Locales } from '@ada/design-system/locales/keys'
```

```scss
// SCSS deep imports
@import "@ada/design-system/styles/fonts/inter";
@import "@ada/design-system/styles/fonts/fontawesome";
```

`ap` used to also have an explicit, redundant Vite alias for it (`apps/ap/vite.config.ts` → `'@ada/design-system': path.resolve(...)`). **Removed** — it predated design-system having a proper `exports` map (added days later) and nobody had migrated off it since. `ap` now resolves the package exactly like `ar` does, through `exports`. Verified with a full `ap` typecheck showing zero new/`design-system`-related errors after removing it.

### Usage in `apps/ar` — growing (Match module's GraphQL grid, plus the original 2 files)

```ts
// apps/ar/src/views/HomeView.vue — deep default-export import, NOT the barrel
import CalculumLoading from '@ada/design-system/components/CalculumLoading.vue'
```

```ts
// apps/ar/src/main.ts
import { messages, defaultLocale } from '@ada/design-system/locales/index'
```

```ts
// apps/ar/src/modules/match/components/ListMatch.vue — subpath import, deliberately NOT the barrel (see §4.1)
import GraphqlGrid from "@ada/design-system/components/graphql-grid/Index.vue";
import type { GraphqlGridColumn, GraphqlGridDataState } from "@ada/design-system/components/graphql-grid/types";
import { supplierName, email, contactStatus } from "@ada/design-system/data/globalColumns";
```

`ar` does not use `CalculumLayout`, `HomeFooter`, `SearchableDropdown`, `Locales`/`LOCALES`.

**EN — Key differences**:
1. `ap` almost always imports components from the barrel (`from '@ada/design-system'`); `ar` mixes barrel imports with direct file imports (`from '@ada/design-system/components/CalculumLoading.vue'`, or the graphql-grid subpath above). Both work thanks to the wildcard `exports` — but see §4.1: the barrel is only safe for lightweight/shared-dependency components. For anything pulling a new heavy dependency, the *subpath* import is the required pattern, not just a style choice.
2. `ap` uses much more of the package's surface (layout, dropdown, SCSS, i18n in many utils); `ar` uses the loading spinner, basic i18n, and (in the Match module) the GraphQL grid + shared column definitions.

**ES — Diferencias clave**:
1. `ap` casi siempre importa componentes desde el barrel (`from '@ada/design-system'`); `ar` mezcla imports por barrel con imports directos de archivo (`from '@ada/design-system/components/CalculumLoading.vue'`, o el subpath de graphql-grid de arriba). Ambos funcionan gracias al `exports` con wildcard — pero ver §4.1: el barrel solo es seguro para componentes livianos o con dependencias ya compartidas. Para cualquier cosa que traiga una dependencia nueva y pesada, el import por *subpath* es obligatorio, no solo una preferencia de estilo.
2. `ap` usa mucha más superficie del paquete (layout, dropdown, SCSS, i18n en varios utils); `ar` usa el spinner de carga, i18n básico, y (en el módulo Match) el grid de GraphQL + las definiciones de columnas compartidas.

### 4.2 Kendo license activation / Activación de licencia de Kendo

**EN** — `packages/design-system` and `ap` both depend on `@progress/kendo-licensing`, but there is only **one physical copy** of it in the pnpm store — `activate` patches that single installed file directly (it's not a per-project config). Because of that:
- There is exactly **one** `postinstall` for the whole monorepo, at the **root** `package.json`: `kendo-ui-license activate --ignore-no-license`. Do **not** add another one to `ap`'s or `design-system`'s own `package.json` — two `activate` calls racing in the same `pnpm install` can corrupt/overwrite each other.
- Two license files live at the repo root (gitignored): `kendo-ui-license.txt` (older, covers `ap`'s Kendo v4.3.3 stack only) and `telerik-license.txt` (current, covers everything through 2027). The activation CLI searches `telerik-license.txt` before `kendo-ui-license.txt` in every directory it checks, so as long as both files are present, `telerik-license.txt` always wins.
- Vite does not watch `node_modules` for changes, so after any license re-activation, a dev server needs a **full restart** (browser refresh is not enough) to reflect it.

**ES** — `packages/design-system` y `ap` dependen ambos de `@progress/kendo-licensing`, pero solo existe **una copia física** en el store de pnpm — `activate` parcha ese único archivo instalado directamente (no es una config por proyecto). Por eso:
- Hay exactamente **un** `postinstall` para todo el monorepo, en el `package.json` de la **raíz**: `kendo-ui-license activate --ignore-no-license`. **No** agregar otro al `package.json` de `ap` o de `design-system` — dos llamadas a `activate` compitiendo en el mismo `pnpm install` pueden corromperse/sobrescribirse entre sí.
- Hay dos archivos de licencia en la raíz del repo (gitignored): `kendo-ui-license.txt` (vieja, cubre solo el stack Kendo v4.3.3 de `ap`) y `telerik-license.txt` (actual, cubre todo hasta 2027). La CLI de activación busca `telerik-license.txt` antes que `kendo-ui-license.txt` en cada directorio que revisa, así que mientras existan ambos archivos, siempre gana `telerik-license.txt`.
- Vite no vigila cambios dentro de `node_modules`, así que después de re-activar la licencia, el dev server necesita un **reinicio completo** (refrescar el navegador no alcanza) para reflejarlo.

### Setup required / Configuración necesaria

- `vue-i18n`'s `createI18n({ messages, locale: defaultLocale, ... })` must be set up in `main.ts` and installed with `app.use(i18n)` (both apps do this).
- Vite `scss.loadPaths` must include `packages/design-system/src/styles` so `@import` partials resolve (both apps configure this in `vite.config.ts`).
- A `~inter-ui` alias should point to `packages/design-system/node_modules/inter-ui` (the font ships as a dependency of the design-system package).
- No Vue plugin install needed for components — import and use/register locally per component (`<script setup>` or `components: { ... }`).

### Font Awesome 7.3.0 — icon classes / clases de iconos

**EN** — `@fortawesome/fontawesome-free` (`^7.3.0`) now lives as a dependency of `@ada/design-system` (`packages/design-system/package.json`), not of the apps. The partial `packages/design-system/src/styles/fonts/_fontawesome.scss` imports Font Awesome's `all.css` plus its **v4 compatibility layer** (`v4-font-face.css` + `v4-shims.css`), so existing `fa fa-*` (v4-style) class names in app code keep resolving to real v7 glyphs without any renaming.

`ap` pulls this in via a deep SCSS import:
```scss
// apps/ap/src/resources/assets/styles/_libs.scss
// Font Awesome 7.3
@import "@ada/design-system/styles/fonts/fontawesome";
```
`ap` uses `fa-*` icon classes extensively across its views/components (20+ files, e.g. `HomeNavbar.vue`, `UploadSpendFile.vue`, `OverviewCharts.vue`). `ar` does **not** import this partial and has no `fa-*` usage today — if `ar` needs icons, it should add the same `@import "@ada/design-system/styles/fonts/fontawesome";` line to its own SCSS entrypoint rather than adding `@fortawesome/fontawesome-free` as a direct dependency.

**ES** — `@fortawesome/fontawesome-free` (`^7.3.0`) ahora es una dependencia de `@ada/design-system` (`packages/design-system/package.json`), no de las apps. El parcial `packages/design-system/src/styles/fonts/_fontawesome.scss` importa el `all.css` de Font Awesome más su **capa de compatibilidad v4** (`v4-font-face.css` + `v4-shims.css`), de modo que los nombres de clase `fa fa-*` (estilo v4) que ya existen en el código de las apps sigan resolviendo a los glifos reales de v7 sin necesidad de renombrar nada.

`ap` lo incorpora vía un import SCSS profundo:
```scss
// apps/ap/src/resources/assets/styles/_libs.scss
// Font Awesome 7.3
@import "@ada/design-system/styles/fonts/fontawesome";
```
`ap` usa clases de iconos `fa-*` extensamente en sus vistas/componentes (20+ archivos, ej. `HomeNavbar.vue`, `UploadSpendFile.vue`, `OverviewCharts.vue`). `ar` **no** importa este parcial y no tiene uso de `fa-*` actualmente — si `ar` necesita iconos, debería agregar la misma línea `@import "@ada/design-system/styles/fonts/fontawesome";` a su propio entrypoint SCSS en lugar de agregar `@fortawesome/fontawesome-free` como dependencia directa.

---

## 5. Quick reference — recommended pattern for new apps / Referencia rápida — patrón recomendado para nuevas apps

**EN**
- Prefer the `ar` pattern for `@ada/auth` and `@ada/core` (full usage via `configureAuth` + `installAuthGuard` + `useSession`, and `createAppRouter`/`createAppPinia`) — it is the simplest, most direct integration.
- For `@ada/design-system`: import lightweight/shared-dependency components from the barrel (`import { X } from '@ada/design-system'`); import anything with a new heavy or version-sensitive dependency by its subpath instead (`@ada/design-system/components/<name>/Index.vue`) and never add it to `src/index.ts` — see §4.1 for why. Reuse `messages`/`defaultLocale` for i18n setup rather than duplicating translations. If adding a new Kendo-based component, read §4.2 before touching license/postinstall config.
- Before adding a new Apollo Client from scratch, check `createApolloClient` from `@ada/core` first — it already implements the same auth-header/401-handling logic that `ap`'s hand-rolled client duplicates.

**ES**
- Prefiere el patrón de `ar` para `@ada/auth` y `@ada/core` (uso completo vía `configureAuth` + `installAuthGuard` + `useSession`, y `createAppRouter`/`createAppPinia`) — es la integración más simple y directa.
- Para `@ada/design-system`: importa por barrel (`import { X } from '@ada/design-system'`) los componentes livianos o con dependencias ya compartidas; importa por subpath (`@ada/design-system/components/<nombre>/Index.vue`) cualquier cosa con una dependencia nueva pesada o sensible a versión, y nunca la agregues a `src/index.ts` — ver §4.1 para el por qué. Reutiliza `messages`/`defaultLocale` para el setup de i18n en vez de duplicar traducciones. Si agregas un componente nuevo basado en Kendo, lee §4.2 antes de tocar la config de licencia/postinstall.
- Antes de crear un Apollo Client nuevo desde cero, revisa primero `createApolloClient` de `@ada/core` — ya implementa la misma lógica de header de auth/manejo de 401 que el cliente hecho a mano de `ap` duplica.

---

## 6. IDE tooling implication — Vetur project detection / Implicación en el tooling del IDE — detección de proyectos en Vetur

**EN** — Because `packages/auth`, `packages/core`, and `packages/design-system` have **no `tsconfig.json` of their own** (see §1 — they're consumed through each app's own `paths`), and because the repo has **no root-level `tsconfig.json`** either (only the non-project `tsconfig.base.json`), the Vetur VSCode extension could not auto-detect any TypeScript project. Vetur only looks for a single `tsconfig.json`/`jsconfig.json` at the workspace root; finding none, it reported:

```text
Vetur can't find tsconfig.json or jsconfig.json in d:\Calculum\projects\ADA\code\Front-End.
```

and flagged every `@/*`-aliased import in `.vue` files as unresolvable (e.g. `Cannot find module '@/utils/FormatData'`), even though Volar and `vue-tsc` resolved the same imports correctly.

**Fix**: added a `vetur.config.js` at the repo root using Vetur's multi-root/monorepo support, registering each app (the ones that do have their own `tsconfig.json`) as a separate Vetur project:

```js
// vetur.config.js (repo root)
module.exports = {
  projects: [
    { root: './apps/ap', package: './package.json', tsconfig: './tsconfig.json' },
    { root: './apps/ar', package: './package.json', tsconfig: './tsconfig.json' }
  ]
}
```

`packages/*` are **not** listed as their own Vetur projects, since they have no `tsconfig.json` to point at. If Vetur false-positives resurface while editing a `.vue` file *inside* `packages/*` (e.g. `packages/design-system/src/components/HomeFooter.vue`), the same fix pattern applies: give that package a minimal `tsconfig.json` and add a corresponding entry to `vetur.config.js`.

Companion settings in `.vscode/settings.json` — `"vetur.validation.template": false` and `"vetur.validation.script": false` — suppress Vetur's own (now-redundant, less accurate) diagnostics, since Volar + `vue-tsc` are the source of truth for `.vue` TypeScript checking. `.vscode/extensions.json` recommends `Vue.volar` and marks `octref.vetur` as an `unwantedRecommendation` for new setups, but that alone doesn't fix Vetur for anyone who keeps it installed — hence `vetur.config.js`.

**ES** — Debido a que `packages/auth`, `packages/core` y `packages/design-system` **no tienen su propio `tsconfig.json`** (ver §1 — se consumen a través de los `paths` de cada app), y a que el repo tampoco tiene un `tsconfig.json` a nivel raíz (solo el `tsconfig.base.json`, que no es un archivo de proyecto real), la extensión Vetur de VSCode no podía detectar automáticamente ningún proyecto TypeScript. Vetur solo busca un único `tsconfig.json`/`jsconfig.json` en la raíz del workspace; al no encontrar ninguno, reportaba:

```text
Vetur can't find tsconfig.json or jsconfig.json in d:\Calculum\projects\ADA\code\Front-End.
```

y marcaba como no resolubles todos los imports con alias `@/*` en archivos `.vue` (ej. `Cannot find module '@/utils/FormatData'`), aunque Volar y `vue-tsc` resolvían esos mismos imports correctamente.

**Solución**: se agregó un `vetur.config.js` en la raíz del repo usando el soporte multi-root/monorepo de Vetur, registrando cada app (las que sí tienen su propio `tsconfig.json`) como un proyecto Vetur independiente (ver bloque de código arriba). `packages/*` no se listan como proyectos propios de Vetur porque no tienen un `tsconfig.json` al cual apuntar. Si reaparecen falsos positivos de Vetur al editar un archivo `.vue` *dentro* de `packages/*` (ej. `packages/design-system/src/components/HomeFooter.vue`), aplica el mismo patrón de solución: darle a ese paquete un `tsconfig.json` mínimo y agregar la entrada correspondiente en `vetur.config.js`.

Los ajustes complementarios en `.vscode/settings.json` — `"vetur.validation.template": false` y `"vetur.validation.script": false` — silencian los diagnósticos propios de Vetur (ahora redundantes y menos precisos), ya que Volar + `vue-tsc` son la fuente de verdad para el chequeo de TypeScript en archivos `.vue`. `.vscode/extensions.json` recomienda `Vue.volar` y marca `octref.vetur` como `unwantedRecommendation` para configuraciones nuevas, pero eso solo no arregla Vetur para quien ya lo tenga instalado — de ahí la necesidad de `vetur.config.js`.
