"""Unit tests for Layer 1: chunk structural metrics."""
from __future__ import annotations

import pytest

from domain.entities.ingestion import Chunk, ChunkType
from evaluation.chunk_metrics import compute_chunk_metrics


class TestComputeChunkMetrics:

    def test_empty_input_returns_empty_dict(self, count_tokens_fn):
        assert compute_chunk_metrics([], count_tokens_fn) == {}

    def test_chunk_count(self, sample_chunks, count_tokens_fn):
        result = compute_chunk_metrics(sample_chunks, count_tokens_fn)
        assert result["chunk_count"] == 5

    def test_token_stats_structure(self, sample_chunks, count_tokens_fn):
        result = compute_chunk_metrics(sample_chunks, count_tokens_fn)
        ts = result["token_stats"]
        for key in ("mean", "stdev", "min", "max", "p5", "p25", "p75", "p95"):
            assert key in ts

    def test_token_stats_ordering(self, sample_chunks, count_tokens_fn):
        ts = compute_chunk_metrics(sample_chunks, count_tokens_fn)["token_stats"]
        assert ts["min"] <= ts["p25"] <= ts["mean"] <= ts["p75"] <= ts["max"]

    def test_no_empty_chunks_in_sample(self, sample_chunks, count_tokens_fn):
        result = compute_chunk_metrics(sample_chunks, count_tokens_fn)
        assert result["empty_chunks"] == 0

    def test_detects_empty_chunk(self, sample_chunks, count_tokens_fn):
        short = Chunk(
            id="tiny",
            text="ok",
            page_numbers=[1],
            chunk_type=ChunkType.RECURSIVE,
            file_id="f",
            metadata={},
        )
        result = compute_chunk_metrics(sample_chunks + [short], count_tokens_fn)
        assert result["empty_chunks"] == 1

    def test_overlap_is_in_valid_range(self, sample_chunks, count_tokens_fn):
        ov = compute_chunk_metrics(sample_chunks, count_tokens_fn)["overlap"]
        assert 0.0 <= ov["mean"] <= 1.0
        assert 0.0 <= ov["max"] <= 1.0

    def test_type_distribution_totals_chunk_count(self, sample_chunks, count_tokens_fn):
        result = compute_chunk_metrics(sample_chunks, count_tokens_fn)
        assert sum(result["type_distribution"].values()) == result["chunk_count"]

    def test_type_distribution_all_recursive(self, sample_chunks, count_tokens_fn):
        td = compute_chunk_metrics(sample_chunks, count_tokens_fn)["type_distribution"]
        assert td["recursive"] == 5

    def test_single_chunk_no_overlap(self, sample_chunks, count_tokens_fn):
        result = compute_chunk_metrics(sample_chunks[:1], count_tokens_fn)
        assert result["overlap"]["mean"] == 0.0

    def test_table_chunk_counted_correctly(self, count_tokens_fn):
        chunks = [
            Chunk(id="t", text="col1 col2 col3 value1 value2 value3", page_numbers=[1],
                  chunk_type=ChunkType.TABLE, file_id="f", metadata={}),
        ]
        result = compute_chunk_metrics(chunks, count_tokens_fn)
        assert result["type_distribution"]["table"] == 1
        assert result["type_distribution"]["recursive"] == 0
