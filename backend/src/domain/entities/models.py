"""Domain entities — pure Python, zero external dependencies."""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class StickerStatus(str, Enum):
    MISSING = "missing"
    HAVE = "have"
    DUPLICATE = "duplicate"


@dataclass
class User:
    id: int
    username: str
    email: str
    hashed_password: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    is_active: bool = True
    full_name: str = ""
    phone: str = ""


class TokenType(str, Enum):
    EMAIL_VERIFY = "email_verify"
    PASSWORD_RESET = "password_reset"


@dataclass
class VerificationToken:
    id: int
    user_id: int
    token: str
    token_type: TokenType
    expires_at: datetime
    used: bool = False
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Album:
    id: int
    name: str
    total_stickers: int
    owner_id: int
    created_at: datetime = field(default_factory=datetime.utcnow)
    description: str = ""

    def completion_percentage(self, have_count: int) -> float:
        """Calculate completion percentage based on owned stickers."""
        if self.total_stickers == 0:
            return 0.0
        return round((have_count / self.total_stickers) * 100, 1)


@dataclass
class Sticker:
    id: int
    album_id: int
    user_id: int
    number: int
    status: StickerStatus = StickerStatus.MISSING
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def cycle_status(self) -> None:
        """missing → have → duplicate → missing."""
        transitions = {
            StickerStatus.MISSING: StickerStatus.HAVE,
            StickerStatus.HAVE: StickerStatus.DUPLICATE,
            StickerStatus.DUPLICATE: StickerStatus.MISSING,
        }
        self.status = transitions[self.status]
        self.updated_at = datetime.utcnow()


@dataclass
class SwapMatch:
    """Value object: possible swap between two users."""
    friend_id: int
    friend_username: str
    can_give: list[int]       # my duplicates they need
    can_receive: list[int]    # their duplicates I need
