from __future__ import annotations
import logging
from pathlib import Path
from domain.entities.ingestion import Page
from domain.ports.document_loader import DocumentLoaderPort

logger = logging.getLogger(__name__)


class LangChainPDFLoaderAdapter(DocumentLoaderPort):
    """Extract text and detect tables per page with pdfplumber.

    pdfplumber reconstructs word spacing from glyph positions (pdfminer dropped
    spaces on some PDFs) and detects tables from ruling lines / alignment, so
    table-awareness is real layout detection rather than a text heuristic.
    ``extract_text`` already includes table cell text in reading order, so the
    page content is complete; ``find_tables`` is used only for the flag.

    ``x_tolerance=2`` (below the default 3) restores spaces on tightly-packed
    PDFs whose glyphs sit close together, without over-splitting normal ones.
    """

    _X_TOLERANCE = 2

    def load(self, file_path: Path) -> list[Page]:
        import pdfplumber

        pages: list[Page] = []
        with pdfplumber.open(str(file_path)) as pdf:
            total_pages = len(pdf.pages)
            for i, page in enumerate(pdf.pages, start=1):
                content = (page.extract_text(x_tolerance=self._X_TOLERANCE) or "").strip()
                has_table = bool(page.find_tables())
                if not content:
                    continue
                pages.append(Page(
                    page_number=i,
                    content=content,
                    has_table=has_table,
                    source_file=str(file_path),
                    metadata={"page_number": i, "total_pages": total_pages},
                ))
        if total_pages and not pages:
            logger.warning("pdf.no_text_extracted file=%s pages=%d — likely scanned/image-only (no OCR)",
                           file_path.name, total_pages)
        return pages

    def supported_extensions(self) -> set[str]:
        return {".pdf"}
