from __future__ import annotations
from abc import ABC, abstractmethod
from pathlib import Path

from domain.entities.ingestion import Page


class DocumentLoaderPort(ABC):
    @abstractmethod
    def load(self, file_path: Path) -> list[Page]: ...

    @abstractmethod
    def supported_extensions(self) -> set[str]: ...
