"""Domain entities — pure Python, zero external dependencies."""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class StickerStatus(str, Enum):
    MISSING = "missing"
    HAVE = "have"
    DUPLICATE = "duplicate"


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


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
    role: UserRole = UserRole.USER


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
class TemplateSticker:
    """A sticker definition within a template section."""
    code: str        # e.g. "ARG-1", "FWC-5"
    label: str       # e.g. "Escudo", "Jugador 1"
    position: int    # sequential position in the album (1-based)
    section_id: int = 0


@dataclass
class TemplateSection:
    """A grouping of stickers within a template (e.g. a country)."""
    id: int
    template_id: int
    name: str            # e.g. "Argentina"
    code_prefix: str     # e.g. "ARG"
    order: int = 0
    group: str = ""      # FIFA group letter e.g. "A", "B", ... "L"
    stickers: list[TemplateSticker] = field(default_factory=list)


@dataclass
class AlbumTemplate:
    """Admin-defined album configuration reusable by any user."""
    id: int
    name: str
    description: str
    total_stickers: int
    created_by: int      # admin user id
    created_at: datetime = field(default_factory=datetime.utcnow)
    is_active: bool = True
    sections: list[TemplateSection] = field(default_factory=list)


@dataclass
class Album:
    id: int
    name: str
    total_stickers: int
    owner_id: int
    created_at: datetime = field(default_factory=datetime.utcnow)
    description: str = ""
    template_id: int | None = None

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
    code: str | None = None   # display code from template e.g. "ARG-1"
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
    friend_full_name: str
    friend_phone: str
    can_give: list[str]       # codes of my duplicates they need
    can_receive: list[str]    # codes of their duplicates I need


@dataclass
class StickerHolder:
    """Value object: user who holds a specific sticker as duplicate."""
    user_id: int
    username: str
    full_name: str
    phone: str


class SwapRequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"


@dataclass
class SwapRequest:
    """An in-app request to exchange stickers between two users."""
    id: int
    requester_id: int
    receiver_id: int
    message: str
    status: SwapRequestStatus
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class MissingStickerMatch:
    """Value object: a sticker the user is missing + who has it as duplicate."""
    sticker_code: str
    sticker_number: int
    holders: list[StickerHolder]
