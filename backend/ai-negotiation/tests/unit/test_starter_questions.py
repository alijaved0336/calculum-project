"""Starter chips are fixed, not randomised (client feedback: consistent entry point)."""
from __future__ import annotations

import pytest

from application.services.starter_questions import generate_starter_questions


@pytest.mark.asyncio
async def test_starter_questions_are_deterministic():
    first = await generate_starter_questions()
    second = await generate_starter_questions()
    assert first == second


@pytest.mark.asyncio
async def test_starter_questions_returns_exactly_four():
    questions = await generate_starter_questions()
    assert len(questions) == 4
    assert all(isinstance(q, str) and q.strip() for q in questions)
