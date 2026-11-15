from __future__ import annotations

from domain.entities.settings import (
    SettingsBundle,
    SettingsRecord,
    SettingsValidationError,
    StrategyToggle,
    TenantGlobalStrategyGrid,
    TenantGlobalStrategyGridRow,
)

ALL_STRATEGIES = ("term_extension", "term_extension_scf")
LOCK_REASON_MANAGED = "managed_by_calculum"


def _strategy_set(values: list[str] | None) -> set[str]:
    return set(values or [])


def _tone_set(values: list[str] | None) -> set[str]:
    return set(values or [])


def stored_effective_tones(
    global_row: SettingsRecord,
    tenant_row: SettingsRecord | None,
) -> list[str]:
    if tenant_row is None:
        return sorted(_tone_set(global_row.tones))
    return sorted(_tone_set(global_row.tones) & _tone_set(tenant_row.tones))


def available_strategies(global_row: SettingsRecord, tenant_row: SettingsRecord) -> set[str]:
    return _strategy_set(global_row.strategies) & _strategy_set(tenant_row.global_strategy)


def effective_strategies(global_row: SettingsRecord, tenant_row: SettingsRecord) -> set[str]:
    avail = available_strategies(global_row, tenant_row)

    # None → never explicitly configured; all available are effective by default.
    if tenant_row.strategies is None:
        return avail

    tenant_enabled = _strategy_set(tenant_row.strategies)

    # Empty list → tenant admin explicitly disabled every strategy.
    if not tenant_enabled:
        return set()

    # Opt-out model: all currently available strategies are effective whenever
    # the tenant admin's saved list is non-empty.
    #
    # The alternative (strict intersection) breaks whenever a strategy is made
    # available AFTER the tenant admin last saved: the new strategy is absent from
    # their saved list not because they excluded it, but because it didn't exist
    # yet. There is no schema field that tracks "intentionally blocked vs never
    # seen", so we can't distinguish the two cases.
    #
    # Consequence: individual strategy blocking by the tenant admin requires a
    # future `blocked_strategies` field. For now, the only way to disable all
    # strategies is to save an empty list.
    return avail


def build_strategy_toggles(
    global_row: SettingsRecord,
    tenant_row: SettingsRecord,
) -> list[StrategyToggle]:
    available = available_strategies(global_row, tenant_row)
    effective = effective_strategies(global_row, tenant_row)
    tone_map = tenant_row.strategy_tone_map or global_row.strategy_tone_map or {}

    toggles: list[StrategyToggle] = []
    for strategy in ALL_STRATEGIES:
        is_available = strategy in available
        is_effective = strategy in effective
        locked = not is_available
        toggles.append(
            StrategyToggle(
                strategy=strategy,
                enabled=is_effective,
                locked=locked,
                available=is_available,
                tone=tone_map.get(strategy),
                lock_reason=LOCK_REASON_MANAGED if locked else None,
            )
        )
    return toggles


def build_settings_bundle(
    global_row: SettingsRecord,
    tenant_row: SettingsRecord | None,
    *,
    tenant_uuid=None,
    tenant_name: str | None = None,
    kb_documents=None,
) -> SettingsBundle:
    if tenant_row is None:
        return SettingsBundle(
            global_record=global_row,
            tenant_record=None,
            tenant_uuid=tenant_uuid,
            tenant_name=tenant_name,
            effective_strategies=list(global_row.strategies or []),
            available_strategies=list(global_row.strategies or []),
            effective_tones=stored_effective_tones(global_row, None),
            strategy_toggles=[
                StrategyToggle(
                    strategy=s,
                    enabled=s in _strategy_set(global_row.strategies),
                    locked=False,
                    available=True,
                    tone=(global_row.strategy_tone_map or {}).get(s),
                )
                for s in ALL_STRATEGIES
            ],
            kb_documents=kb_documents or [],
        )

    effective = effective_strategies(global_row, tenant_row)
    available = available_strategies(global_row, tenant_row)
    return SettingsBundle(
        global_record=global_row,
        tenant_record=tenant_row,
        tenant_uuid=tenant_uuid or tenant_row.tenant_uuid,
        tenant_name=tenant_name,
        effective_strategies=sorted(effective),
        available_strategies=sorted(available),
        effective_tones=stored_effective_tones(global_row, tenant_row),
        strategy_toggles=build_strategy_toggles(global_row, tenant_row),
        kb_documents=kb_documents or [],
    )


def build_tenant_global_strategy_grid(
    global_row: SettingsRecord,
    tenants: list[tuple[SettingsRecord, str]],
) -> TenantGlobalStrategyGrid:
    rows: list[TenantGlobalStrategyGridRow] = []
    for tenant_row, tenant_name in tenants:
        rows.append(
            TenantGlobalStrategyGridRow(
                tenant_uuid=tenant_row.tenant_uuid,  # type: ignore[arg-type]
                tenant_name=tenant_name,
                global_strategy=tenant_row.global_strategy,
                view_data_inputs=tenant_row.view_data_inputs,
            )
        )
    return TenantGlobalStrategyGrid(
        global_strategies=global_row.strategies,
        tenants=rows,
    )


def validate_tenant_admin_strategies(
    global_row: SettingsRecord,
    tenant_row: SettingsRecord,
    requested: list[str],
) -> None:
    cap = available_strategies(global_row, tenant_row)
    invalid = set(requested) - cap
    if invalid:
        raise SettingsValidationError(
            f"Cannot enable strategies not allowed for this tenant: {sorted(invalid)}"
        )
