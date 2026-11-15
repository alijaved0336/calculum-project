HOST ?= 0.0.0.0
PORT ?= 8001

.PHONY: run
run:
	uv run uvicorn main:app --host $(HOST) --port $(PORT)
