"""Ports — abstract interfaces. Infrastructure implements these."""
from abc import ABC, abstractmethod
from datetime import datetime

from src.domain.entities.models import Album, Sticker, StickerStatus, TokenType, User, VerificationToken


class UserRepositoryPort(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: int) -> User | None: ...

    @abstractmethod
    async def get_by_username(self, username: str) -> User | None: ...

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def create(self, user: User) -> User: ...

    @abstractmethod
    async def update(self, user: User) -> User: ...

    @abstractmethod
    async def list_all(self) -> list[User]: ...


class VerificationTokenRepositoryPort(ABC):
    @abstractmethod
    async def create(
        self, user_id: int, token: str, token_type: TokenType, expires_at: datetime
    ) -> VerificationToken: ...

    @abstractmethod
    async def get_by_token(self, token: str) -> VerificationToken | None: ...

    @abstractmethod
    async def mark_used(self, token_id: int) -> None: ...

    @abstractmethod
    async def delete_expired(self) -> None: ...


class AlbumRepositoryPort(ABC):
    @abstractmethod
    async def get_by_id(self, album_id: int) -> Album | None: ...

    @abstractmethod
    async def list_by_owner(self, owner_id: int) -> list[Album]: ...

    @abstractmethod
    async def create(self, album: Album) -> Album: ...

    @abstractmethod
    async def update(self, album: Album) -> Album: ...

    @abstractmethod
    async def delete(self, album_id: int) -> None: ...


class StickerRepositoryPort(ABC):
    @abstractmethod
    async def get_by_number(
        self, album_id: int, user_id: int, number: int
    ) -> Sticker | None: ...

    @abstractmethod
    async def list_by_album_user(
        self, album_id: int, user_id: int, status: StickerStatus | None = None
    ) -> list[Sticker]: ...

    @abstractmethod
    async def upsert(self, sticker: Sticker) -> Sticker: ...

    @abstractmethod
    async def bulk_upsert(self, stickers: list[Sticker]) -> list[Sticker]: ...

    @abstractmethod
    async def count_by_status(
        self, album_id: int, user_id: int
    ) -> dict[StickerStatus, int]: ...
