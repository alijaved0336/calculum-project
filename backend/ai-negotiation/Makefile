HOST ?= 0.0.0.0
PORT ?= 8000

.PHONY: run
run:
	uv run uvicorn api.main:app --host $(HOST) --port $(PORT)

.PHONY: run-dev
run-dev:
	uv run uvicorn api.main:app --host $(HOST) --port $(PORT) --reload


.PHONY: run-dev
run-dev:
	uv run uvicorn api.main:app --host $(HOST) --port $(PORT) --reload

.PHONY: migrate-rollback
migrate-rollback:
	uv run alembic downgrade -1

.PHONY: migrate-generate
migrate-generate:
	uv run alembic revision --autogenerate -m "$(m)"

.PHONY: migrate-up
migrate-up:
	uv run alembic upgrade head

.PHONY: backfill-settings
backfill-settings:
	PYTHONPATH=$(shell pwd) uv run python seeds/backfill_settings.py

.PHONY: seed
seed:
	PYTHONPATH=$(shell pwd) uv run python seeds/seed_users.py
	PYTHONPATH=$(shell pwd) uv run python seeds/seed_settings.py
