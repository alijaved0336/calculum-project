from __future__ import annotations
from dataclasses import dataclass

@dataclass
class Session:
    session_id: str
    user_id: str
    supplier_id: str