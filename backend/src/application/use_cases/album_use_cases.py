"""Application use cases — orchestrate domain + ports."""
import secrets
from datetime import datetime, timedelta

from src.domain.entities.models import (
    Album,
    Sticker,
    StickerStatus,
    SwapMatch,
    TokenType,
    User,
)
from src.domain.ports.repositories import (
    AlbumRepositoryPort,
    StickerRepositoryPort,
    UserRepositoryPort,
    VerificationTokenRepositoryPort,
)
from src.infrastructure.auth import hash_password, verify_password, create_access_token


class AuthUseCases:
    def __init__(
        self,
        user_repo: UserRepositoryPort,
        token_repo: VerificationTokenRepositoryPort,
    ) -> None:
        self._users = user_repo
        self._tokens = token_repo

    async def register(
        self,
        username: str,
        email: str,
        password: str,
        full_name: str = "",
        phone: str = "",
    ) -> User:
        if await self._users.get_by_username(username):
            raise ValueError(f"El usuario '{username}' ya está en uso")
        if await self._users.get_by_email(email):
            raise ValueError(f"El correo '{email}' ya está registrado")
        user = User(
            id=0,
            username=username,
            email=email,
            hashed_password=hash_password(password),
            is_active=False,
            full_name=full_name,
            phone=phone,
        )
        created = await self._users.create(user)
        token = secrets.token_urlsafe(32)
        await self._tokens.create(
            user_id=created.id,
            token=token,
            token_type=TokenType.EMAIL_VERIFY,
            expires_at=datetime.utcnow() + timedelta(hours=24),
        )
        return created, token  # type: ignore[return-value]

    async def verify_email(self, token: str) -> User:
        record = await self._tokens.get_by_token(token)
        if not record:
            raise ValueError("Enlace inválido")
        if record.used:
            raise ValueError("Este enlace ya fue utilizado")
        if record.token_type != TokenType.EMAIL_VERIFY:
            raise ValueError("Enlace inválido")
        if record.expires_at < datetime.utcnow():
            raise ValueError("El enlace expiró — solicita uno nuevo")
        user = await self._users.get_by_id(record.user_id)
        if not user:
            raise ValueError("Usuario no encontrado")
        user.is_active = True
        updated = await self._users.update(user)
        await self._tokens.mark_used(record.id)
        return updated

    async def resend_verification(self, email: str) -> tuple[User, str]:
        user = await self._users.get_by_email(email)
        if not user:
            raise ValueError("No existe una cuenta con ese correo")
        if user.is_active:
            raise ValueError("La cuenta ya está verificada")
        token = secrets.token_urlsafe(32)
        await self._tokens.create(
            user_id=user.id,
            token=token,
            token_type=TokenType.EMAIL_VERIFY,
            expires_at=datetime.utcnow() + timedelta(hours=24),
        )
        return user, token

    async def login(self, username: str, password: str) -> str:
        user = await self._users.get_by_username(username)
        if not user or not verify_password(password, user.hashed_password):
            raise ValueError("Credenciales incorrectas")
        if not user.is_active:
            raise ValueError("Cuenta no verificada — revisa tu correo")
        return create_access_token(user.id, user.username)

    async def forgot_password(self, email: str) -> tuple[User, str]:
        user = await self._users.get_by_email(email)
        if not user:
            raise ValueError("No existe una cuenta con ese correo")
        token = secrets.token_urlsafe(32)
        await self._tokens.create(
            user_id=user.id,
            token=token,
            token_type=TokenType.PASSWORD_RESET,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        return user, token

    async def reset_password(self, token: str, new_password: str) -> None:
        record = await self._tokens.get_by_token(token)
        if not record:
            raise ValueError("Enlace inválido")
        if record.used:
            raise ValueError("Este enlace ya fue utilizado")
        if record.token_type != TokenType.PASSWORD_RESET:
            raise ValueError("Enlace inválido")
        if record.expires_at < datetime.utcnow():
            raise ValueError("El enlace expiró — solicita uno nuevo")
        user = await self._users.get_by_id(record.user_id)
        if not user:
            raise ValueError("Usuario no encontrado")
        user.hashed_password = hash_password(new_password)
        await self._users.update(user)
        await self._tokens.mark_used(record.id)


class AlbumUseCases:
    def __init__(self, album_repo: AlbumRepositoryPort) -> None:
        self._albums = album_repo

    async def create_album(
        self,
        owner_id: int,
        name: str,
        total_stickers: int,
        description: str = "",
    ) -> Album:
        if total_stickers < 1 or total_stickers > 5000:
            raise ValueError("total_stickers must be between 1 and 5000")
        album = Album(
            id=0,
            name=name,
            total_stickers=total_stickers,
            owner_id=owner_id,
            description=description,
        )
        return await self._albums.create(album)

    async def list_my_albums(self, owner_id: int) -> list[Album]:
        return await self._albums.list_by_owner(owner_id)

    async def update_album(
        self, album_id: int, owner_id: int, name: str, total_stickers: int
    ) -> Album:
        album = await self._albums.get_by_id(album_id)
        if not album:
            raise ValueError(f"Album {album_id} not found")
        if album.owner_id != owner_id:
            raise PermissionError("You don't own this album")
        album.name = name
        album.total_stickers = total_stickers
        return await self._albums.update(album)

    async def delete_album(self, album_id: int, owner_id: int) -> None:
        album = await self._albums.get_by_id(album_id)
        if not album:
            raise ValueError(f"Album {album_id} not found")
        if album.owner_id != owner_id:
            raise PermissionError("You don't own this album")
        await self._albums.delete(album_id)


class StickerUseCases:
    def __init__(
        self,
        sticker_repo: StickerRepositoryPort,
        album_repo: AlbumRepositoryPort,
        user_repo: UserRepositoryPort,
    ) -> None:
        self._stickers = sticker_repo
        self._albums = album_repo
        self._users = user_repo

    async def update_sticker(
        self,
        album_id: int,
        user_id: int,
        number: int,
        status: StickerStatus,
    ) -> Sticker:
        album = await self._albums.get_by_id(album_id)
        if not album:
            raise ValueError(f"Album {album_id} not found")
        if number < 1 or number > album.total_stickers:
            raise ValueError(
                f"Sticker number must be between 1 and {album.total_stickers}"
            )
        sticker = Sticker(
            id=0,
            album_id=album_id,
            user_id=user_id,
            number=number,
            status=status,
        )
        return await self._stickers.upsert(sticker)

    async def bulk_update(
        self,
        album_id: int,
        user_id: int,
        updates: list[dict],  # [{"number": int, "status": StickerStatus}]
    ) -> list[Sticker]:
        album = await self._albums.get_by_id(album_id)
        if not album:
            raise ValueError(f"Album {album_id} not found")
        stickers = [
            Sticker(
                id=0,
                album_id=album_id,
                user_id=user_id,
                number=u["number"],
                status=u["status"],
            )
            for u in updates
            if 1 <= u["number"] <= album.total_stickers
        ]
        return await self._stickers.bulk_upsert(stickers)

    async def get_album_stats(
        self, album_id: int, user_id: int
    ) -> dict:
        album = await self._albums.get_by_id(album_id)
        if not album:
            raise ValueError(f"Album {album_id} not found")
        counts = await self._stickers.count_by_status(album_id, user_id)
        have = counts[StickerStatus.HAVE]
        return {
            "total": album.total_stickers,
            "have": have,
            "missing": album.total_stickers - have - counts[StickerStatus.DUPLICATE],
            "duplicate": counts[StickerStatus.DUPLICATE],
            "completion_pct": album.completion_percentage(have),
        }

    async def get_swap_matches(
        self, album_id: int, current_user_id: int
    ) -> list[SwapMatch]:
        """Find swap opportunities between current user and all others."""
        all_users = await self._users.list_all()
        my_duplicates = {
            s.number
            for s in await self._stickers.list_by_album_user(
                album_id, current_user_id, StickerStatus.DUPLICATE
            )
        }
        my_missing = {
            s.number
            for s in await self._stickers.list_by_album_user(
                album_id, current_user_id, StickerStatus.MISSING
            )
        }
        matches = []
        for user in all_users:
            if user.id == current_user_id:
                continue
            their_duplicates = {
                s.number
                for s in await self._stickers.list_by_album_user(
                    album_id, user.id, StickerStatus.DUPLICATE
                )
            }
            their_missing = {
                s.number
                for s in await self._stickers.list_by_album_user(
                    album_id, user.id, StickerStatus.MISSING
                )
            }
            can_give = sorted(my_duplicates & their_missing)
            can_receive = sorted(their_duplicates & my_missing)
            if can_give or can_receive:
                matches.append(
                    SwapMatch(
                        friend_id=user.id,
                        friend_username=user.username,
                        can_give=can_give,
                        can_receive=can_receive,
                    )
                )
        return sorted(
            matches, key=lambda m: len(m.can_give) + len(m.can_receive), reverse=True
        )
