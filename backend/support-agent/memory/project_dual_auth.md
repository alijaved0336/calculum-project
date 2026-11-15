---
name: project-dual-auth
description: Azure B2C RS256 + HS256 three-priority auth chain added to backend-support-agent (Aug 2026)
metadata:
  type: project
---

Added dual-auth (RS256 Azure B2C + HS256 calculum-tokenize) to backend-support-agent — same pattern as the other Calculum repo.

**Why:** App is embedded in Ada Bot (an external org's iframe). Ada shell sets an HttpOnly cookie (`__Secure-auth_session-token`, RS256 Azure B2C JWT) that can't be read by JS. Ada forwards the full raw cookie string via postMessage; the FE attaches it as `X-Ada-Session` on every request.

**How to apply:** When debugging auth failures, check the three-priority chain order:
1. Cookie `__Secure-auth_session-token` → RS256 (`_decode_azure`)
2. Header `X-Ada-Session` → parse cookie string → RS256 (`_decode_azure`)
3. Header `Authorization: Bearer` → HS256 (`_decode`)

For WebSocket: same priorities but query param `?token=<hs256>` replaces the Bearer header (browsers can't set WS headers). `get_ws_user(ws, token)` in `api/deps/auth.py`.

**Key files changed:**
- `infrastructure/auth/jwt_handler.py` — `verify_azure_token()` via PyJWKClient (RS256)
- `api/deps/auth.py` — three-priority chain + WS helper; `current_user` now takes `Request`
- `config.py` — added `azure_jwks_url`, `azure_b2c_issuer`, `azure_b2c_audience`, `azure_auth_cookie_name`
- `pyproject.toml` — added `cryptography>=42.0` for RS256 support
- `azure-pipelines.yml` — added `AZURE_JWKS_URL`, `AZURE_B2C_ISSUER`, `AZURE_B2C_AUDIENCE` to deploy

**Azure env values (staging):**
- `AZURE_JWKS_URL`: `https://login-dev.calculum.ai/login-dev.calculum.ai/b2c_1a_signin_dev/discovery/v2.0/keys`
- `AZURE_B2C_ISSUER`: `https://login-dev.calculum.ai/b80f40d3-4605-4d31-bef6-e0261cc49989/v2.0/`
- `AZURE_B2C_AUDIENCE`: `fd6b721e-77a6-41eb-9c61-319d639bdb5c`

Add these to the `Backend-support-staging` Azure DevOps variable group. Mark as secret.

**Role mapping from Azure token (updated 2026-09-03):** `extension_IsSuperAdmin` truthy → `global_platform_admin` (checked first); else `"admin"` if `ROLE_COMPANY_ADMIN` in `extension_Roles`; else `"user"`. Also maps `email`/`emails[0]` → `User.email` and `scp` → `User.scope` (new field). `tid` is still ignored (Azure tenant GUID, not app tenant).

Evaluated against a reference doc describing a similar dual-auth pattern in another Calculum app; decided NOT to port: self-issued `/auth/login` (this app is verify-only — `calculum-tokenize` is the sole HS256 issuer, sharing `JWT_SECRET`), the `hello-ada.com` CORS regex + mandatory `allow_credentials=True` (this app's FE uses Bearer, not cookies, so credentialed CORS isn't needed), and the in-memory `/session/start` WS fallback (no existing consumer, would be new infra).

**Tests:** `tests/test_auth.py` updated to pass `Request` objects instead of `HTTPAuthorizationCredentials`. All 264 unit tests pass.

**Leeway grace window (2026-09-07):** Ada's own login session lasts ~24h behind a silent refresh; this service instead decodes `exp` directly with no leeway, so the same cookie starts reading as expired after ~10 min once Ada's refresh isn't running (e.g. this app embedded standalone under a `*.hello-ada.com` subdomain). Added `azure_jwt_leeway_hours: int = 0` to `config.py` and `leeway=timedelta(hours=settings.azure_jwt_leeway_hours)` to `verify_azure_token()` in `infrastructure/auth/jwt_handler.py` — 0 keeps today's strict behavior until an environment opts in. `AZURE_JWT_LEEWAY_HOURS` added to `azure-pipelines.yml` deploy step; **still needs adding to the `Backend-support-staging` Azure DevOps variable group** (unset resolves to `""` → pydantic-settings int parse failure at boot). This is a stopgap — it doesn't ask Ada whether the session was actually revoked, so a stolen/logged-out cookie stays valid for the leeway window; don't default a new environment above 0. Tests: `tests/test_azure_token_leeway.py` (real self-signed RS256 token + fake JWKS client).
