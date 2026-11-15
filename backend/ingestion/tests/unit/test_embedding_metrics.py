"""Unit tests for Layer 2: embedding semantic coherence metrics."""
from __future__ import annotations

import math
import pytest

from domain.entities.ingestion import Chunk, ChunkType
from evaluation.embedding_metrics import compute_embedding_metrics

DIMS = 2560


def _make_chunk(id_: str, embedding=None) -> Chunk:
    return Chunk(
        id=id_,
        text="sample text for testing",
        page_numbers=[1],
        chunk_type=ChunkType.RECURSIVE,
        file_id="f",
        metadata={},
        embedding=embedding,
    )


class TestComputeEmbeddingMetrics:

    def test_all_embedded(self, sample_chunks):
        result = compute_embedding_metrics(sample_chunks, DIMS)
        assert result["embedded_count"] == 5
        assert result["missing_embeddings"] == 0

    def test_no_violations_on_valid_chunks(self, sample_chunks):
        result = compute_embedding_metrics(sample_chunks, DIMS)
        assert result["dim_violations"] == 0
        assert result["malformed_vectors"] == 0

    def test_semantic_continuity_present(self, sample_chunks):
        result = compute_embedding_metrics(sample_chunks, DIMS)
        assert "semantic_continuity" in result
        sc = result["semantic_continuity"]
        assert -1.0 <= sc["min"] <= sc["mean"] <= sc["max"] <= 1.0

    def test_missing_embedding_counted(self, sample_chunks):
        no_embed = _make_chunk("no-embed", embedding=None)
        result = compute_embedding_metrics(sample_chunks + [no_embed], DIMS)
        assert result["missing_embeddings"] == 1

    def test_dim_violation_counted(self, sample_chunks):
        bad = _make_chunk("bad-dims", embedding=[0.1, 0.2, 0.3])  # wrong dims
        result = compute_embedding_metrics(sample_chunks + [bad], DIMS)
        assert result["dim_violations"] == 1

    def test_nan_vector_detected(self, sample_chunks):
        nan_vec = [float("nan")] + [0.0] * (DIMS - 1)
        bad = _make_chunk("nan-vec", embedding=nan_vec)
        result = compute_embedding_metrics(sample_chunks + [bad], DIMS)
        assert result["malformed_vectors"] == 1

    def test_inf_vector_detected(self):
        inf_vec = [float("inf")] + [1.0] * (DIMS - 1)
        bad = _make_chunk("inf-vec", embedding=inf_vec)
        result = compute_embedding_metrics([bad], DIMS)
        assert result["malformed_vectors"] == 1

    def test_empty_input(self):
        result = compute_embedding_metrics([], DIMS)
        assert result["embedded_count"] == 0
        assert result["missing_embeddings"] == 0
        assert "semantic_continuity" not in result

    def test_single_chunk_no_continuity(self, sample_chunks):
        result = compute_embedding_metrics(sample_chunks[:1], DIMS)
        assert result["embedded_count"] == 1
        assert "semantic_continuity" not in result

    def test_cosine_similarity_of_identical_vectors(self):
        raw = [1.0] + [0.0] * (DIMS - 1)
        c1 = _make_chunk("c1", embedding=raw)
        c2 = _make_chunk("c2", embedding=raw)
        result = compute_embedding_metrics([c1, c2], DIMS)
        sc = result["semantic_continuity"]
        assert abs(sc["mean"] - 1.0) < 1e-9
