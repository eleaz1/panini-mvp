"""SQLAlchemy ORM models — infrastructure layer only."""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from src.domain.entities.models import StickerStatus, SwapRequestStatus, TokenType, UserRole


class Base(DeclarativeBase):
    pass


class UserORM(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    full_name: Mapped[str] = mapped_column(String(150), default="")
    phone: Mapped[str] = mapped_column(String(30), default="")
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.USER)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    albums: Mapped[list["AlbumORM"]] = relationship(back_populates="owner")
    stickers: Mapped[list["StickerORM"]] = relationship(back_populates="user")
    tokens: Mapped[list["VerificationTokenORM"]] = relationship(back_populates="user")
    templates: Mapped[list["AlbumTemplateORM"]] = relationship(back_populates="creator")


class VerificationTokenORM(Base):
    __tablename__ = "verification_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    token_type: Mapped[TokenType] = mapped_column(Enum(TokenType))
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["UserORM"] = relationship(back_populates="tokens")


class AlbumTemplateORM(Base):
    __tablename__ = "album_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    total_stickers: Mapped[int] = mapped_column(Integer)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    creator: Mapped["UserORM"] = relationship(back_populates="templates")
    sections: Mapped[list["TemplateSectionORM"]] = relationship(
        back_populates="template", cascade="all, delete-orphan", order_by="TemplateSectionORM.order"
    )
    albums: Mapped[list["AlbumORM"]] = relationship(back_populates="template")


class TemplateSectionORM(Base):
    __tablename__ = "template_sections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("album_templates.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    code_prefix: Mapped[str] = mapped_column(String(10))
    order: Mapped[int] = mapped_column(Integer, default=0)
    group: Mapped[str] = mapped_column(String(10), default="", server_default="")

    template: Mapped["AlbumTemplateORM"] = relationship(back_populates="sections")
    stickers: Mapped[list["TemplateStickerORM"]] = relationship(
        back_populates="section", cascade="all, delete-orphan", order_by="TemplateStickerORM.position"
    )


class TemplateStickerORM(Base):
    __tablename__ = "template_stickers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    section_id: Mapped[int] = mapped_column(ForeignKey("template_sections.id"), index=True)
    code: Mapped[str] = mapped_column(String(20))
    label: Mapped[str] = mapped_column(String(100), default="")
    position: Mapped[int] = mapped_column(Integer)

    section: Mapped["TemplateSectionORM"] = relationship(back_populates="stickers")


class AlbumORM(Base):
    __tablename__ = "albums"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text, default="")
    total_stickers: Mapped[int] = mapped_column(Integer, default=670)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    template_id: Mapped[int | None] = mapped_column(
        ForeignKey("album_templates.id"), nullable=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    owner: Mapped["UserORM"] = relationship(back_populates="albums")
    template: Mapped["AlbumTemplateORM | None"] = relationship(back_populates="albums")
    stickers: Mapped[list["StickerORM"]] = relationship(back_populates="album", cascade="all, delete-orphan")


class StickerORM(Base):
    __tablename__ = "stickers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    album_id: Mapped[int] = mapped_column(ForeignKey("albums.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    number: Mapped[int] = mapped_column(Integer)
    code: Mapped[str | None] = mapped_column(String(20), nullable=True, default=None)
    status: Mapped[StickerStatus] = mapped_column(
        Enum(StickerStatus), default=StickerStatus.MISSING
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    album: Mapped["AlbumORM"] = relationship(back_populates="stickers")
    user: Mapped["UserORM"] = relationship(back_populates="stickers")


class SwapRequestORM(Base):
    __tablename__ = "swap_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    requester_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    receiver_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[SwapRequestStatus] = mapped_column(
        Enum(SwapRequestStatus), default=SwapRequestStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    requester: Mapped["UserORM"] = relationship(foreign_keys=[requester_id])
    receiver: Mapped["UserORM"] = relationship(foreign_keys=[receiver_id])
