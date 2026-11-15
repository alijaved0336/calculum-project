ARG BASE_IMAGE
FROM ${BASE_IMAGE}

WORKDIR /app

# Copy source code on top of the pre-built dependency layer from the base image
COPY . .

# /app is on PYTHONPATH so api/, application/, domain/, etc. are importable without
# installing them as packages (all external deps are already in .venv from the base).
ENV PYTHONPATH=/app

EXPOSE 8001

CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8001}
