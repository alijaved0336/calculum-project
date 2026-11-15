"""Vendored embedding tokenizers — offline, single source of truth.

Carries the constant tokenizer files for Calculum's embedding model so every
service loads the *same* tokenizer with no network and no HF cache dependency.
``tokenizer_dir(model)`` returns the on-disk path to feed
``AutoTokenizer.from_pretrained``.
"""
from __future__ import annotations
from pathlib import Path

__version__ = "0.1.0"

DEFAULT_MODEL = "Qwen3-Embedding-4B"


def tokenizer_dir(model: str = DEFAULT_MODEL) -> Path:
    """Absolute path to a vendored tokenizer dir. Raises if the model is absent."""
    path = Path(__file__).parent / "data" / model
    if not path.is_dir():
        raise FileNotFoundError(
            f"no vendored tokenizer for model={model!r}; add data/{model}/ to calculum-tokenizer"
        )
    return path
