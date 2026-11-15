ARG BASE_IMAGE=python:3.12-slim
FROM --platform=linux/amd64 ${BASE_IMAGE}

WORKDIR /app

COPY . .

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

ENV PORT=8080
ENV PATH="/app/.venv/bin:${PATH}"
EXPOSE 8080

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
