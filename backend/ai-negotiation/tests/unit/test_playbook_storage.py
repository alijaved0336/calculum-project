from infrastructure.storage.gcs_playbook_storage import (
    is_playbook_storage_enabled,
)


def test_playbook_storage_disabled_when_flag_off(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.storage.gcs_playbook_storage.settings.gcp_storage_bucket",
        "calculum-negotiation-playbook",
    )
    monkeypatch.setattr(
        "infrastructure.storage.gcs_playbook_storage.settings.gcp_playbook_storage_enabled",
        False,
    )
    assert is_playbook_storage_enabled() is False


def test_playbook_storage_disabled_without_bucket(monkeypatch):
    monkeypatch.setattr(
        "infrastructure.storage.gcs_playbook_storage.settings.gcp_storage_bucket",
        "",
    )
    monkeypatch.setattr(
        "infrastructure.storage.gcs_playbook_storage.settings.gcp_playbook_storage_enabled",
        True,
    )
    assert is_playbook_storage_enabled() is False
