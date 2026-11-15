from config import Settings


def test_cors_origins_strip_trailing_slashes():
    s = Settings(
        _env_file=None,
        cors_allowed_origins="https://a.example.com/, https://b.example.com ,",
    )
    assert s.cors_origins == ["https://a.example.com", "https://b.example.com"]


def test_default_cors_origins_have_no_trailing_slash():
    assert all(not o.endswith("/") for o in Settings(_env_file=None).cors_origins)
    assert Settings(_env_file=None).cors_origins == ["http://localhost:5173"]
