from __future__ import annotations

import enum

from sqlalchemy import Enum as SAEnum


class ToneEnum(str, enum.Enum):
    collaborative = "collaborative"
    assertive = "assertive"
    methodical = "methodical"


class MessageRoleEnum(str, enum.Enum):
    user = "user"
    ai = "ai"


class StrategyEnum(str, enum.Enum):
    term_extension = "term_extension"
    term_extension_scf = "term_extension_scf"


class UserRoleEnum(str, enum.Enum):
    global_platform_admin = "global_platform_admin"
    admin = "admin"
    user = "user"


# Shared SQLAlchemy type objects. A native PG enum must have a single owning
# type instance so it is created exactly once, even when reused across tables.
tone_enum = SAEnum(ToneEnum, name="tone_enum")
message_role_enum = SAEnum(MessageRoleEnum, name="message_role_enum")
strategy_enum = SAEnum(StrategyEnum, name="strategy_enum")
user_role_enum = SAEnum(UserRoleEnum, name="user_role_enum")
