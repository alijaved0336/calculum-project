from fastapi.testclient import TestClient

from api.main import app
from config import settings

# Use an origin the app is actually configured to allow, so the tests don't depend on the
# environment (CI exports the real CORS_ALLOWED_ORIGINS; locally it defaults to the Vite dev
# origin). When the env allows all origins ("*"), Starlette answers with a literal "*"
# instead of echoing the origin.
_ORIGIN = next((o for o in settings.cors_origins if o != "*"), "http://localhost:5173")
_ALLOWED = (_ORIGIN, "*")


def test_preflight_allows_configured_origin():
    client = TestClient(app)
    r = client.options(
        "/support/query",
        headers={"Origin": _ORIGIN, "Access-Control-Request-Method": "POST"},
    )
    assert r.status_code in (200, 204)
    assert r.headers.get("access-control-allow-origin") in _ALLOWED


def test_simple_request_gets_allow_origin_header():
    client = TestClient(app)
    r = client.get("/health", headers={"Origin": _ORIGIN})
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") in _ALLOWED
