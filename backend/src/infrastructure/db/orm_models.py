"""SQLAlchemy ORM models — infrastructure layer only."""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from src.domain.entities.models import StickerStatus, TokenType


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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    albums: Mapped[list["AlbumORM"]] = relationship(back_populates="owner")
    stickers: Mapped[list["StickerORM"]] = relationship(back_populates="user")
    tokens: Mapped[list["VerificationTokenORM"]] = relationship(back_populates="user")


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


class AlbumORM(Base):
    __tablename__ = "albums"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text, default="")
    total_stickers: Mapped[int] = mapped_column(Integer, default=670)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    owner: Mapped["UserORM"] = relationship(back_populates="albums")
    stickers: Mapped[list["StickerORM"]] = relationship(back_populates="album")


class StickerORM(Base):
    __tablename__ = "stickers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    album_id: Mapped[int] = mapped_column(ForeignKey("albums.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    number: Mapped[int] = mapped_column(Integer)
    status: Mapped[StickerStatus] = mapped_column(
        Enum(StickerStatus), default=StickerStatus.MISSING
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    album: Mapped["AlbumORM"] = relationship(back_populates="stickers")
    user: Mapped["UserORM"] = relationship(back_populates="stickers")
