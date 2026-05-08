"""SQLAlchemy adapters implementing domain ports."""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.entities.models import Album, Sticker, StickerStatus, TokenType, User, VerificationToken
from src.domain.ports.repositories import (
    AlbumRepositoryPort,
    StickerRepositoryPort,
    UserRepositoryPort,
    VerificationTokenRepositoryPort,
)
from src.infrastructure.db.orm_models import AlbumORM, StickerORM, UserORM, VerificationTokenORM


def _user_to_domain(orm: UserORM) -> User:
    return User(
        id=orm.id,
        username=orm.username,
        email=orm.email,
        hashed_password=orm.hashed_password,
        is_active=orm.is_active,
        full_name=orm.full_name,
        phone=orm.phone,
        created_at=orm.created_at,
    )


def _token_to_domain(orm: VerificationTokenORM) -> VerificationToken:
    return VerificationToken(
        id=orm.id,
        user_id=orm.user_id,
        token=orm.token,
        token_type=orm.token_type,
        expires_at=orm.expires_at,
        used=orm.used,
        created_at=orm.created_at,
    )


def _album_to_domain(orm: AlbumORM) -> Album:
    return Album(
        id=orm.id,
        name=orm.name,
        description=orm.description,
        total_stickers=orm.total_stickers,
        owner_id=orm.owner_id,
        created_at=orm.created_at,
    )


def _sticker_to_domain(orm: StickerORM) -> Sticker:
    return Sticker(
        id=orm.id,
        album_id=orm.album_id,
        user_id=orm.user_id,
        number=orm.number,
        status=orm.status,
        updated_at=orm.updated_at,
    )


class SQLUserRepository(UserRepositoryPort):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self._session.get(UserORM, user_id)
        return _user_to_domain(result) if result else None

    async def get_by_username(self, username: str) -> User | None:
        stmt = select(UserORM).where(UserORM.username == username)
        result = (await self._session.execute(stmt)).scalar_one_or_none()
        return _user_to_domain(result) if result else None

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(UserORM).where(UserORM.email == email)
        result = (await self._session.execute(stmt)).scalar_one_or_none()
        return _user_to_domain(result) if result else None

    async def create(self, user: User) -> User:
        orm = UserORM(
            username=user.username,
            email=user.email,
            hashed_password=user.hashed_password,
            is_active=user.is_active,
            full_name=user.full_name,
            phone=user.phone,
        )
        self._session.add(orm)
        await self._session.flush()
        return _user_to_domain(orm)

    async def update(self, user: User) -> User:
        orm = await self._session.get(UserORM, user.id)
        if not orm:
            raise ValueError(f"User {user.id} not found")
        orm.is_active = user.is_active
        orm.hashed_password = user.hashed_password
        orm.full_name = user.full_name
        orm.phone = user.phone
        await self._session.flush()
        return _user_to_domain(orm)

    async def list_all(self) -> list[User]:
        result = await self._session.execute(select(UserORM))
        return [_user_to_domain(u) for u in result.scalars().all()]


class SQLVerificationTokenRepository(VerificationTokenRepositoryPort):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self, user_id: int, token: str, token_type: TokenType, expires_at: datetime
    ) -> VerificationToken:
        orm = VerificationTokenORM(
            user_id=user_id,
            token=token,
            token_type=token_type,
            expires_at=expires_at,
        )
        self._session.add(orm)
        await self._session.flush()
        return _token_to_domain(orm)

    async def get_by_token(self, token: str) -> VerificationToken | None:
        stmt = select(VerificationTokenORM).where(VerificationTokenORM.token == token)
        result = (await self._session.execute(stmt)).scalar_one_or_none()
        return _token_to_domain(result) if result else None

    async def mark_used(self, token_id: int) -> None:
        orm = await self._session.get(VerificationTokenORM, token_id)
        if orm:
            orm.used = True
            await self._session.flush()

    async def delete_expired(self) -> None:
        from sqlalchemy import delete
        stmt = delete(VerificationTokenORM).where(
            VerificationTokenORM.expires_at < datetime.utcnow()
        )
        await self._session.execute(stmt)


class SQLAlbumRepository(AlbumRepositoryPort):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, album_id: int) -> Album | None:
        result = await self._session.get(AlbumORM, album_id)
        return _album_to_domain(result) if result else None

    async def list_by_owner(self, owner_id: int) -> list[Album]:
        stmt = select(AlbumORM).where(AlbumORM.owner_id == owner_id)
        result = await self._session.execute(stmt)
        return [_album_to_domain(a) for a in result.scalars().all()]

    async def create(self, album: Album) -> Album:
        orm = AlbumORM(
            name=album.name,
            description=album.description,
            total_stickers=album.total_stickers,
            owner_id=album.owner_id,
        )
        self._session.add(orm)
        await self._session.flush()
        return _album_to_domain(orm)

    async def update(self, album: Album) -> Album:
        orm = await self._session.get(AlbumORM, album.id)
        if not orm:
            raise ValueError(f"Album {album.id} not found")
        orm.name = album.name
        orm.description = album.description
        orm.total_stickers = album.total_stickers
        await self._session.flush()
        return _album_to_domain(orm)

    async def delete(self, album_id: int) -> None:
        orm = await self._session.get(AlbumORM, album_id)
        if orm:
            await self._session.delete(orm)


class SQLStickerRepository(StickerRepositoryPort):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_number(
        self, album_id: int, user_id: int, number: int
    ) -> Sticker | None:
        stmt = select(StickerORM).where(
            StickerORM.album_id == album_id,
            StickerORM.user_id == user_id,
            StickerORM.number == number,
        )
        result = (await self._session.execute(stmt)).scalar_one_or_none()
        return _sticker_to_domain(result) if result else None

    async def list_by_album_user(
        self, album_id: int, user_id: int, status: StickerStatus | None = None
    ) -> list[Sticker]:
        stmt = select(StickerORM).where(
            StickerORM.album_id == album_id,
            StickerORM.user_id == user_id,
        )
        if status:
            stmt = stmt.where(StickerORM.status == status)
        result = await self._session.execute(stmt)
        return [_sticker_to_domain(s) for s in result.scalars().all()]

    async def upsert(self, sticker: Sticker) -> Sticker:
        existing = await self.get_by_number(
            sticker.album_id, sticker.user_id, sticker.number
        )
        if existing:
            orm = await self._session.get(StickerORM, existing.id)
            if orm:
                orm.status = sticker.status
                await self._session.flush()
                return _sticker_to_domain(orm)
        orm = StickerORM(
            album_id=sticker.album_id,
            user_id=sticker.user_id,
            number=sticker.number,
            status=sticker.status,
        )
        self._session.add(orm)
        await self._session.flush()
        return _sticker_to_domain(orm)

    async def bulk_upsert(self, stickers: list[Sticker]) -> list[Sticker]:
        return [await self.upsert(s) for s in stickers]

    async def count_by_status(
        self, album_id: int, user_id: int
    ) -> dict[StickerStatus, int]:
        stickers = await self.list_by_album_user(album_id, user_id)
        counts: dict[StickerStatus, int] = {s: 0 for s in StickerStatus}
        for sticker in stickers:
            counts[sticker.status] += 1
        return counts
