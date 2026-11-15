"""
LLM latency and throughput benchmark.

Runs a fixed set of prompts against the configured Ollama endpoint
and saves results as JSON + CSV.

Usage:
    python benchmarking/run_benchmark.py
"""

TEST_PROMPTS: list[dict] = [
    # TODO: add representative prompt scenarios
]


def run_single(client, model: str, prompt: str, system_prompt: str, n_runs: int = 3) -> dict:
    raise NotImplementedError


def run_benchmark(base_url: str, model: str, environment: str) -> list:
    raise NotImplementedError


def save_results(results: list, environment: str) -> None:
    raise NotImplementedError


if __name__ == "__main__":
    raise NotImplementedError
