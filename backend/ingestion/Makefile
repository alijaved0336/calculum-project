HOST ?= 0.0.0.0
PORT ?= 8002

.PHONY: run
run:
	uv run uvicorn api.main:app --host $(HOST) --port $(PORT) --reload
