"""Pydantic v2 request/response schemas — interface layer contracts."""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator

from src.domain.entities.models import StickerStatus


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
    created_at: datetime


# --- Album ---
class AlbumCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    total_stickers: int = Field(ge=1, le=5000, default=670)
    description: str = Field(default="", max_length=500)


class AlbumUpdateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    total_stickers: int = Field(ge=1, le=5000)


class AlbumResponse(BaseModel):
    id: int
    name: str
    description: str
    total_stickers: int
    owner_id: int
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
    stickers: list[StickerBulkItem] = Field(min_length=1, max_length=5000)


class StickerResponse(BaseModel):
    id: int
    album_id: int
    user_id: int
    number: int
    status: StickerStatus
    updated_at: datetime


# --- Swaps ---
class SwapMatchResponse(BaseModel):
    friend_id: int
    friend_username: str
    can_give: list[int]
    can_receive: list[int]
    total_possible: int = 0

    @model_validator(mode="after")
    def compute_total(self) -> "SwapMatchResponse":
        self.total_possible = len(self.can_give) + len(self.can_receive)
        return self
