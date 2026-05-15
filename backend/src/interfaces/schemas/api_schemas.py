"""Pydantic v2 request/response schemas — interface layer contracts."""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator

from src.domain.entities.models import StickerStatus, UserRole


# --- Auth ---
class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    full_name: str = Field(min_length=2, max_length=150)
    phone: str = Field(default="", max_length=30)
    email: EmailStr
    confirm_email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    confirm_password: str = Field(min_length=6, max_length=100)
    recaptcha_token: str = ""

    @model_validator(mode="after")
    def emails_match(self) -> "RegisterRequest":
        if self.email != self.confirm_email:
            raise ValueError("Los correos no coinciden")
        if self.password != self.confirm_password:
            raise ValueError("Las contraseñas no coinciden")
        return self


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=100)
    confirm_password: str = Field(min_length=6, max_length=100)

    @model_validator(mode="after")
    def passwords_match(self) -> "ResetPasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("Las contraseñas no coinciden")
        return self


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


# --- User ---
class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    role: UserRole
    created_at: datetime


class AdminUserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    phone: str
    role: UserRole
    is_active: bool
    created_at: datetime


# --- Album Templates ---
class TemplateStickerResponse(BaseModel):
    code: str
    label: str
    position: int


class TemplateSectionResponse(BaseModel):
    id: int
    name: str
    code_prefix: str
    order: int
    group: str = ""
    stickers: list[TemplateStickerResponse]


class AlbumTemplateResponse(BaseModel):
    id: int
    name: str
    description: str
    total_stickers: int
    is_active: bool
    created_at: datetime
    sections: list[TemplateSectionResponse] = []


class AlbumTemplateListResponse(BaseModel):
    id: int
    name: str
    description: str
    total_stickers: int
    is_active: bool
    created_at: datetime


class TemplateStickerInput(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    label: str = Field(default="", max_length=100)
    position: int = Field(ge=1)


class TemplateSectionInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    code_prefix: str = Field(min_length=1, max_length=10)
    order: int = Field(default=0, ge=0)
    stickers: list[TemplateStickerInput] = Field(min_length=1)


class AlbumTemplateCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str = Field(default="", max_length=1000)
    sections: list[TemplateSectionInput] = Field(min_length=1)


class AlbumTemplateUpdateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str = Field(default="", max_length=1000)
    is_active: bool = True


# --- Album ---
class AlbumCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    total_stickers: int = Field(ge=1, le=10000, default=670)
    description: str = Field(default="", max_length=500)
    template_id: int | None = None


class AlbumUpdateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    total_stickers: int = Field(ge=1, le=10000)


class AlbumResponse(BaseModel):
    id: int
    name: str
    description: str
    total_stickers: int
    owner_id: int
    template_id: int | None
    created_at: datetime


class AlbumStatsResponse(BaseModel):
    total: int
    have: int
    missing: int
    duplicate: int
    completion_pct: float


# --- Stickers ---
class StickerUpdateRequest(BaseModel):
    status: StickerStatus


class StickerBulkItem(BaseModel):
    number: int = Field(ge=1)
    status: StickerStatus


class StickerBulkRequest(BaseModel):
    stickers: list[StickerBulkItem] = Field(min_length=1, max_length=10000)


class StickerResponse(BaseModel):
    id: int
    album_id: int
    user_id: int
    number: int
    code: str | None
    status: StickerStatus
    updated_at: datetime


# --- Swaps ---
class SwapMatchResponse(BaseModel):
    friend_id: int
    friend_username: str
    friend_full_name: str
    friend_phone: str
    can_give: list[str]
    can_receive: list[str]
    total_possible: int = 0

    @model_validator(mode="after")
    def compute_total(self) -> "SwapMatchResponse":
        self.total_possible = len(self.can_give) + len(self.can_receive)
        return self


class StickerHolderResponse(BaseModel):
    user_id: int
    username: str
    full_name: str
    phone: str


class MissingStickerMatchResponse(BaseModel):
    sticker_code: str
    sticker_number: int
    holders: list[StickerHolderResponse]


# --- Swap Requests ---
class SwapRequestCreateRequest(BaseModel):
    receiver_id: int
    message: str = Field(default="", max_length=500)


class SwapRequestActionRequest(BaseModel):
    action: str = Field(pattern="^(accept|decline)$")


class SwapRequestUserInfo(BaseModel):
    id: int
    username: str
    full_name: str


class SwapRequestResponse(BaseModel):
    id: int
    requester: SwapRequestUserInfo
    receiver: SwapRequestUserInfo
    message: str
    status: str
    created_at: datetime


class PendingCountResponse(BaseModel):
    count: int
