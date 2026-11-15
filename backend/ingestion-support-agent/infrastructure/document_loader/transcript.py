from __future__ import annotations

import logging
from pathlib import Path

from application.ingest.transcript_validator import validate_transcript
from domain.entities.ingestion import Page
from domain.ports.document_loader import DocumentLoaderPort

logger = logging.getLogger(__name__)


class TranscriptLoaderAdapter(DocumentLoaderPort):
    """Load a timestamped transcript (VTT/SRT/JSON) as one ``Page`` per cue.

    Timing is carried in ``Page.metadata`` (``start_ms``/``end_ms``) so the chunk
    stage can propagate a chunk's start/end onto the vector payload. Validation is
    delegated to ``validate_transcript`` — the single source of truth — so the
    loader never accepts a transcript the route would reject.
    """

    def load(self, file_path: Path) -> list[Page]:
        cues = validate_transcript(Path(file_path), video_duration_ms=None)
        pages: list[Page] = []
        for i, cue in enumerate(cues, start=1):
            text = cue.text.strip()
            if not text:
                continue
            pages.append(
                Page(
                    page_number=i,
                    content=text,
                    has_table=False,
                    source_file=str(file_path),
                    metadata={"start_ms": cue.start_ms, "end_ms": cue.end_ms},
                )
            )
        logger.info("transcript loader: %d cue(s) from %s", len(pages), file_path)
        return pages

    def supported_extensions(self) -> set[str]:
        return {".vtt", ".srt", ".json"}
