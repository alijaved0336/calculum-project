-- Calculum relational store — all 7 API feeds.
-- Cross-feed FK constraints are DEFERRABLE INITIALLY DEFERRED to tolerate
-- out-of-order ingestion within a transaction (e.g. suppliers before their
-- ultimate parents on first load).

-- ── tenants ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
    uuid        TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    country     TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL
);

-- ── spend_file_versions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS spend_file_versions (
    uuid            TEXT PRIMARY KEY,
    tenant_uuid     TEXT NOT NULL
                        REFERENCES tenants(uuid)
                        DEFERRABLE INITIALLY DEFERRED,
    tenant_id       TEXT NOT NULL,
    name            TEXT NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    spend_volume    NUMERIC(20,4) NOT NULL,
    supplier_count  INT NOT NULL,
    spend_count     INT NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sfv_tenant_uuid ON spend_file_versions(tenant_uuid);
CREATE INDEX IF NOT EXISTS idx_sfv_tenant_id   ON spend_file_versions(tenant_id);

-- ── supplier_ultimate_parents ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplier_ultimate_parents (
    uuid                            TEXT PRIMARY KEY,
    tenant_id                       TEXT NOT NULL,
    spend_file_version_uuid         TEXT,
    name                            TEXT NOT NULL,
    received_name                   TEXT NOT NULL,
    description                     TEXT,
    address                         TEXT,
    phone_number                    TEXT,
    ownership                       TEXT NOT NULL,
    stock_ticker                    TEXT,
    entity_type                     TEXT NOT NULL,
    country                         TEXT NOT NULL,
    country_rating                  TEXT NOT NULL,
    credit_rating                   TEXT,
    credit_rating_source            TEXT,
    main_industry_code              TEXT NOT NULL,
    main_industry_name              TEXT NOT NULL,
    url                             TEXT,
    company_size                    TEXT NOT NULL,
    external_id                     TEXT NOT NULL,
    provided_internal_id            TEXT NOT NULL,
    cost_of_debt_spread             NUMERIC(10,6) NOT NULL,
    wacc_pre_tax                    NUMERIC(10,6) NOT NULL,
    wacc_after_tax                  NUMERIC(10,6) NOT NULL,
    supplier_financing_rate         NUMERIC(10,6) NOT NULL,
    scf_rate                        NUMERIC(10,6),
    ethnic_minority_owned_business  BOOLEAN NOT NULL,
    woman_owned_business            BOOLEAN NOT NULL,
    veteran_owned_business          BOOLEAN NOT NULL,
    spend_volume                    NUMERIC(20,4) NOT NULL,
    negotiation_status              TEXT NOT NULL,
    program_applied                 TEXT,
    success_probability             TEXT NOT NULL,
    nine_box_term_extension         INT NOT NULL,
    entity_buyer_leverage_level     TEXT NOT NULL,
    entity_supplier_leverage_level  TEXT NOT NULL,
    is_sme                          BOOLEAN NOT NULL,
    sme_source                      TEXT,
    dso                             INT NOT NULL,
    -- flattened target block
    target_opportunity_payment_terms  INT,
    target_payment_terms              INT,
    target_cash_flow                  NUMERIC(20,4),
    -- flattened agreement block
    agreed_terms_without_cash_discounts  INT,
    agreed_terms_with_cash_discounts     INT,
    agreed_cash_discount_percentage      NUMERIC(10,6),
    -- nested negotiation strategy (variable depth — stored as JSONB)
    negotiation_strategy            JSONB,
    updated_at                      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sup_up_tenant_id          ON supplier_ultimate_parents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sup_up_negotiation_status ON supplier_ultimate_parents(negotiation_status);
CREATE INDEX IF NOT EXISTS idx_sup_up_updated_at         ON supplier_ultimate_parents(updated_at);

-- ── suppliers ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
    uuid                            TEXT PRIMARY KEY,
    ultimate_parent_uuid            TEXT
                                        REFERENCES supplier_ultimate_parents(uuid)
                                        DEFERRABLE INITIALLY DEFERRED,
    tenant_id                       TEXT NOT NULL,
    spend_file_version_uuid         TEXT,
    name                            TEXT NOT NULL,
    received_name                   TEXT NOT NULL,
    description                     TEXT,
    address                         TEXT,
    phone_number                    TEXT,
    ownership                       TEXT NOT NULL,
    stock_ticker                    TEXT,
    entity_type                     TEXT NOT NULL,
    country                         TEXT NOT NULL,
    country_rating                  TEXT NOT NULL,
    credit_rating                   TEXT,
    credit_rating_source            TEXT,
    main_industry_code              TEXT NOT NULL,
    main_industry_name              TEXT NOT NULL,
    url                             TEXT,
    company_size                    TEXT NOT NULL,
    external_id                     TEXT NOT NULL,
    provided_internal_id            TEXT NOT NULL,
    cost_of_debt_spread             NUMERIC(10,6) NOT NULL,
    wacc_pre_tax                    NUMERIC(10,6) NOT NULL,
    wacc_after_tax                  NUMERIC(10,6) NOT NULL,
    supplier_financing_rate         NUMERIC(10,6) NOT NULL,
    scf_rate                        NUMERIC(10,6),
    ethnic_minority_owned_business  BOOLEAN NOT NULL,
    woman_owned_business            BOOLEAN NOT NULL,
    veteran_owned_business          BOOLEAN NOT NULL,
    spend_volume                    NUMERIC(20,4) NOT NULL,
    negotiation_status              TEXT NOT NULL,
    program_applied                 TEXT,
    success_probability             TEXT NOT NULL,
    nine_box_term_extension         INT NOT NULL,
    entity_buyer_leverage_level     TEXT NOT NULL,
    entity_supplier_leverage_level  TEXT NOT NULL,
    is_sme                          BOOLEAN NOT NULL,
    sme_source                      TEXT,
    dso                             INT NOT NULL,
    -- flattened target block
    target_opportunity_payment_terms  INT,
    target_payment_terms              INT,
    target_cash_flow                  NUMERIC(20,4),
    -- flattened agreement block
    agreed_terms_without_cash_discounts  INT,
    agreed_terms_with_cash_discounts     INT,
    agreed_cash_discount_percentage      NUMERIC(10,6),
    -- nested negotiation strategy
    negotiation_strategy            JSONB,
    updated_at                      TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sup_ultimate_parent_uuid ON suppliers(ultimate_parent_uuid);
CREATE INDEX IF NOT EXISTS idx_sup_tenant_id            ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sup_negotiation_status   ON suppliers(negotiation_status);
CREATE INDEX IF NOT EXISTS idx_sup_updated_at           ON suppliers(updated_at);

-- ── buying_entity_ultimate_parents ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buying_entity_ultimate_parents (
    uuid                    TEXT PRIMARY KEY,
    tenant_id               TEXT NOT NULL,
    spend_file_version_uuid TEXT,
    name                    TEXT NOT NULL,
    description             TEXT,
    address                 TEXT NOT NULL,
    country                 TEXT NOT NULL,
    main_industry_code      TEXT NOT NULL,
    main_industry_name      TEXT NOT NULL,
    url                     TEXT,
    company_size            TEXT NOT NULL,
    external_id             TEXT NOT NULL,
    updated_at              TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_beup_tenant_id   ON buying_entity_ultimate_parents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_beup_updated_at  ON buying_entity_ultimate_parents(updated_at);

-- ── buying_entities ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buying_entities (
    uuid                    TEXT PRIMARY KEY,
    ultimate_parent_uuid    TEXT
                                REFERENCES buying_entity_ultimate_parents(uuid)
                                DEFERRABLE INITIALLY DEFERRED,
    tenant_id               TEXT NOT NULL,
    spend_file_version_uuid TEXT,
    name                    TEXT NOT NULL,
    country                 TEXT NOT NULL,
    updated_at              TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_be_ultimate_parent_uuid ON buying_entities(ultimate_parent_uuid);
CREATE INDEX IF NOT EXISTS idx_be_tenant_id            ON buying_entities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_be_updated_at           ON buying_entities(updated_at);

-- ── spends ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS spends (
    spend_uuid                          TEXT PRIMARY KEY,
    spend_file_version_uuid             TEXT NOT NULL
                                            REFERENCES spend_file_versions(uuid)
                                            DEFERRABLE INITIALLY DEFERRED,
    supplier_uuid                       TEXT NOT NULL
                                            REFERENCES suppliers(uuid)
                                            DEFERRABLE INITIALLY DEFERRED,
    buying_entity_uuid                  TEXT NOT NULL
                                            REFERENCES buying_entities(uuid)
                                            DEFERRABLE INITIALLY DEFERRED,
    tenant_id                           TEXT NOT NULL,
    alias                               TEXT NOT NULL,
    spend_volume                        NUMERIC(20,4) NOT NULL,
    transaction_currency                TEXT NOT NULL,
    procurement_team                    TEXT NOT NULL,
    commodity                           TEXT NOT NULL,
    hs_code                             TEXT,
    hs_description                      TEXT,
    currently_on_scf                    BOOLEAN NOT NULL,
    currently_on_vcard                  BOOLEAN NOT NULL,
    program_applied                     TEXT,
    base_rate                           NUMERIC(10,6) NOT NULL,
    scf_rate                            NUMERIC(10,6),
    actual_payment_terms                INT NOT NULL,
    term_description                    TEXT NOT NULL,
    contractual_without_cash_discounts  INT NOT NULL,
    contractual_with_cash_discounts     INT NOT NULL,
    cash_discount_percentage            NUMERIC(10,6) NOT NULL,
    last_term_negotiation               DATE,
    aggregated_lines_count              INT NOT NULL,
    negotiation_status                  TEXT NOT NULL,
    custom_data_points                  JSONB NOT NULL DEFAULT '[]',
    -- flattened target block
    target_opportunity_payment_terms    INT,
    target_payment_terms                INT,
    target_cash_flow                    NUMERIC(20,4),
    -- flattened agreement block
    agreed_terms_without_cash_discounts  INT,
    agreed_terms_with_cash_discounts     INT,
    agreed_cash_discount_percentage      NUMERIC(10,6),
    scf_accepted                         BOOLEAN,
    vcard_accepted                       BOOLEAN,
    -- nested negotiation strategy
    negotiation_strategy                JSONB,
    updated_at                          TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spends_sfv               ON spends(spend_file_version_uuid);
CREATE INDEX IF NOT EXISTS idx_spends_supplier          ON spends(supplier_uuid);
CREATE INDEX IF NOT EXISTS idx_spends_buying_entity     ON spends(buying_entity_uuid);
CREATE INDEX IF NOT EXISTS idx_spends_tenant_id         ON spends(tenant_id);
CREATE INDEX IF NOT EXISTS idx_spends_negotiation_status ON spends(negotiation_status);
CREATE INDEX IF NOT EXISTS idx_spends_updated_at        ON spends(updated_at);
