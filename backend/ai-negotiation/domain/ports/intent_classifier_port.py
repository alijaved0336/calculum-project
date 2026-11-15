from __future__ import annotations

from abc import ABC, abstractmethod

from domain.entities.context import SupplierContext
from domain.entities.intent import IntentClassification


class IntentClassifierPort(ABC):
    """Contract for classifying a user message into a negotiation intent.

    Implementations are swappable (LLM-based, rules-based, etc.) so the graph
    node only depends on this abstraction.
    """

    @abstractmethod
    async def classify(
        self,
        message: str,
        context: SupplierContext | None = None,
        history: list[dict[str, str]] | None = None,
    ) -> IntentClassification:
        """Classify ``message`` into an :class:`Intent` with a confidence score.

        ``context`` may be supplied to help disambiguate; ``history`` is the
        last few turns of this thread (oldest first), for resolving
        follow-ups like "what about that instead?". Implementations are free
        to ignore either.
        """
        ...
