"""Ports — abstract interfaces. Infrastructure implements these."""
from abc import ABC, abstractmethod
from datetime import datetime

from src.domain.entities.models import (
    Album,
    AlbumTemplate,
    Sticker,
    StickerStatus,
    SwapRequest,
    SwapRequestStatus,
    TemplateSection,
    TokenType,
    User,
    VerificationToken,
)


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

    @abstractmethod
    async def list_by_code_status(
        self, album_id: int, code: str, status: StickerStatus
    ) -> list[Sticker]: ...

    @abstractmethod
    async def list_holders_by_code(
        self, code: str, status: StickerStatus, exclude_user_id: int
    ) -> list[Sticker]: ...

    @abstractmethod
    async def list_by_user_status(
        self, user_id: int, status: StickerStatus
    ) -> list[Sticker]: ...


class SwapRequestRepositoryPort(ABC):
    @abstractmethod
    async def create(self, request: SwapRequest) -> SwapRequest: ...

    @abstractmethod
    async def get_by_id(self, request_id: int) -> SwapRequest | None: ...

    @abstractmethod
    async def get_between_users(
        self, user1_id: int, user2_id: int
    ) -> SwapRequest | None: ...

    @abstractmethod
    async def list_received(self, user_id: int) -> list[SwapRequest]: ...

    @abstractmethod
    async def list_sent(self, user_id: int) -> list[SwapRequest]: ...

    @abstractmethod
    async def update_status(
        self, request_id: int, status: SwapRequestStatus
    ) -> SwapRequest: ...


class AlbumTemplateRepositoryPort(ABC):
    @abstractmethod
    async def get_by_id(self, template_id: int) -> AlbumTemplate | None: ...

    @abstractmethod
    async def list_active(self) -> list[AlbumTemplate]: ...

    @abstractmethod
    async def list_all(self) -> list[AlbumTemplate]: ...

    @abstractmethod
    async def create_with_sections(
        self, template: AlbumTemplate, sections: list[TemplateSection]
    ) -> AlbumTemplate: ...

    @abstractmethod
    async def update(self, template: AlbumTemplate) -> AlbumTemplate: ...

    @abstractmethod
    async def delete(self, template_id: int) -> None: ...

    @abstractmethod
    async def exists_by_name(self, name: str) -> bool: ...

    @abstractmethod
    async def rebuild_sections(
        self, template_id: int, sections: list[TemplateSection]
    ) -> AlbumTemplate: ...
