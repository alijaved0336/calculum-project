import enum
from sqlalchemy import Enum as SAEnum


class UserRoleEnum(str, enum.Enum):
    global_platform_admin = "global_platform_admin"
    admin = "admin"
    user = "user"


# create_constraint=False — the type already exists in the DB
user_role_enum = SAEnum(UserRoleEnum, name="user_role_enum", create_constraint=False)
