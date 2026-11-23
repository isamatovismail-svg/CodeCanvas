"""
Core dependencies module.
Re-exports dependencies from app.api.deps for backwards compatibility and architecture consistency.
"""
from app.api.deps import (
    security_scheme,
    DEFAULT_USER_EMAIL,
    DEFAULT_USER_ID,
    get_or_create_default_user,
    get_current_user,
    get_current_user_optional,
)

__all__ = [
    "security_scheme",
    "DEFAULT_USER_EMAIL",
    "DEFAULT_USER_ID",
    "get_or_create_default_user",
    "get_current_user",
    "get_current_user_optional",
]
