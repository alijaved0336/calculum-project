from fastapi.testclient import TestClient

from api.main import app
from config import settings


def test_cors_origins_parses_comma_list(monkeypatch):
    monkeypatch.setattr(settings, "cors_allowed_origins", "http://a.com, http://b.com ,")
    assert settings.cors_origins == ["http://a.com", "http://b.com"]


def test_default_cors_includes_local_frontend():
    assert "http://localhost:5173" in settings.cors_origins


def test_default_cors_includes_staging_frontend():
    assert "https://calculum-ui-staging-790888106252.us-central1.run.app" in settings.cors_origins
    assert "https://calculum-ui-staging-yu3o33nplq-uc.a.run.app" in settings.cors_origins


def test_preflight_returns_cors_headers():
    # An allowed origin gets echoed back with the methods/headers it asked for.
    origin = settings.cors_origins[0]
    with TestClient(app) as client:
        r = client.options(
            "/videos",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization",
            },
        )
    assert r.status_code in (200, 204)
    assert r.headers.get("access-control-allow-origin") == origin
    assert "authorization" in r.headers.get("access-control-allow-headers", "").lower()


def test_simple_request_gets_allow_origin_header():
    origin = settings.cors_origins[0]
    with TestClient(app) as client:
        r = client.get("/health", headers={"Origin": origin})
    assert r.headers.get("access-control-allow-origin") == origin


def test_hello_ada_subdomain_allowed_via_regex():
    # Not in the static cors_allowed_origins list — must match allow_origin_regex instead.
    origin = "https://staging.hello-ada.com"
    with TestClient(app) as client:
        r = client.get("/health", headers={"Origin": origin})
    assert r.headers.get("access-control-allow-origin") == origin


def test_non_ada_domain_not_allowed_by_regex():
    origin = "https://hello-ada.com.attacker.net"
    with TestClient(app) as client:
        r = client.get("/health", headers={"Origin": origin})
    assert "access-control-allow-origin" not in r.headers
