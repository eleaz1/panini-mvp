"""Application use cases — orchestrate domain + ports."""
import secrets
from datetime import datetime, timedelta

from src.domain.entities.models import (
    Album,
    AlbumTemplate,
    MissingStickerMatch,
    Sticker,
    StickerHolder,
    StickerStatus,
    SwapMatch,
    TemplateSection,
    TokenType,
    User,
)
from src.domain.ports.repositories import (
    AlbumRepositoryPort,
    AlbumTemplateRepositoryPort,
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
        return create_access_token(user.id, user.username, role=user.role.value)

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
    def __init__(
        self,
        album_repo: AlbumRepositoryPort,
        template_repo: AlbumTemplateRepositoryPort | None = None,
        sticker_repo: StickerRepositoryPort | None = None,
    ) -> None:
        self._albums = album_repo
        self._templates = template_repo
        self._stickers = sticker_repo

    async def create_album(
        self,
        owner_id: int,
        name: str,
        total_stickers: int,
        description: str = "",
        template_id: int | None = None,
    ) -> Album:
        if template_id is not None:
            if not self._templates:
                raise ValueError("Template repository not available")
            template = await self._templates.get_by_id(template_id)
            if not template:
                raise ValueError(f"Template {template_id} not found")
            if not template.is_active:
                raise ValueError("Template is not active")
            total_stickers = template.total_stickers
            description = description or template.description

        if total_stickers < 1 or total_stickers > 10000:
            raise ValueError("total_stickers must be between 1 and 10000")

        album = Album(
            id=0,
            name=name,
            total_stickers=total_stickers,
            owner_id=owner_id,
            description=description,
            template_id=template_id,
        )
        created = await self._albums.create(album)

        if template_id is not None and self._templates and self._stickers:
            template = await self._templates.get_by_id(template_id)
            if template:
                stickers = [
                    Sticker(
                        id=0,
                        album_id=created.id,
                        user_id=owner_id,
                        number=sticker.position,
                        code=sticker.code,
                        status=StickerStatus.MISSING,
                    )
                    for section in template.sections
                    for sticker in section.stickers
                ]
                await self._stickers.bulk_upsert(stickers)

        return created

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
        """Find swap opportunities between current user and all others.

        Compares sticker codes globally — each user owns their own album
        so we must NOT filter by album_id when querying other users.
        """
        my_dup_stickers = await self._stickers.list_by_album_user(
            album_id, current_user_id, StickerStatus.DUPLICATE
        )
        my_miss_stickers = await self._stickers.list_by_album_user(
            album_id, current_user_id, StickerStatus.MISSING
        )
        my_dup_codes = {s.code for s in my_dup_stickers if s.code}
        my_miss_codes = {s.code for s in my_miss_stickers if s.code}

        all_users = await self._users.list_all()
        matches = []
        for user in all_users:
            if user.id == current_user_id:
                continue
            their_dup = await self._stickers.list_by_user_status(user.id, StickerStatus.DUPLICATE)
            their_miss = await self._stickers.list_by_user_status(user.id, StickerStatus.MISSING)
            their_dup_codes = {s.code for s in their_dup if s.code}
            their_miss_codes = {s.code for s in their_miss if s.code}

            can_give = sorted(my_dup_codes & their_miss_codes)
            can_receive = sorted(their_dup_codes & my_miss_codes)
            if can_give or can_receive:
                matches.append(
                    SwapMatch(
                        friend_id=user.id,
                        friend_username=user.username,
                        friend_full_name=user.full_name,
                        friend_phone=user.phone,
                        can_give=can_give,
                        can_receive=can_receive,
                    )
                )
        return sorted(
            matches, key=lambda m: len(m.can_give) + len(m.can_receive), reverse=True
        )

    async def search_sticker_holders(
        self, _album_id: int, code: str, current_user_id: int
    ) -> list[StickerHolder]:
        """Return users who have the sticker with given code as duplicate (global search)."""
        duplicates = await self._stickers.list_holders_by_code(
            code, StickerStatus.DUPLICATE, current_user_id
        )
        holders = []
        seen: set[int] = set()
        for sticker in duplicates:
            if sticker.user_id in seen:
                continue
            user = await self._users.get_by_id(sticker.user_id)
            if user:
                holders.append(
                    StickerHolder(
                        user_id=user.id,
                        username=user.username,
                        full_name=user.full_name,
                        phone=user.phone,
                    )
                )
                seen.add(user.id)
        return holders

    async def find_holders_for_my_missing(
        self, album_id: int, current_user_id: int
    ) -> list[MissingStickerMatch]:
        """For each sticker the current user is missing (with a code), find who has it as duplicate.

        Uses global search (list_holders_by_code) so results are found across
        all users' albums, not just within the current album_id.
        """
        my_missing = await self._stickers.list_by_album_user(
            album_id, current_user_id, StickerStatus.MISSING
        )
        results = []
        for sticker in my_missing:
            if not sticker.code:
                continue
            dup_stickers = await self._stickers.list_holders_by_code(
                sticker.code, StickerStatus.DUPLICATE, current_user_id
            )
            holders = []
            seen: set[int] = set()
            for dup in dup_stickers:
                if dup.user_id in seen:
                    continue
                user = await self._users.get_by_id(dup.user_id)
                if user:
                    holders.append(
                        StickerHolder(
                            user_id=user.id,
                            username=user.username,
                            full_name=user.full_name,
                            phone=user.phone,
                        )
                    )
                    seen.add(user.id)
            if holders:
                results.append(
                    MissingStickerMatch(
                        sticker_code=sticker.code,
                        sticker_number=sticker.number,
                        holders=holders,
                    )
                )
        return sorted(results, key=lambda m: m.sticker_number)


class AlbumTemplateUseCases:
    def __init__(self, template_repo: AlbumTemplateRepositoryPort) -> None:
        self._templates = template_repo

    async def create_template(
        self,
        admin_id: int,
        name: str,
        description: str,
        sections: list[TemplateSection],
    ) -> AlbumTemplate:
        if await self._templates.exists_by_name(name):
            raise ValueError(f"Ya existe un template con el nombre '{name}'")
        total = sum(len(s.stickers) for s in sections)
        if total == 0:
            raise ValueError("El template debe tener al menos una lámina")
        template = AlbumTemplate(
            id=0,
            name=name,
            description=description,
            total_stickers=total,
            created_by=admin_id,
            is_active=True,
        )
        return await self._templates.create_with_sections(template, sections)

    async def list_templates(self) -> list[AlbumTemplate]:
        return await self._templates.list_active()

    async def list_all_templates(self) -> list[AlbumTemplate]:
        return await self._templates.list_all()

    async def get_template(self, template_id: int) -> AlbumTemplate:
        template = await self._templates.get_by_id(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")
        return template

    async def toggle_active(self, template_id: int) -> AlbumTemplate:
        template = await self._templates.get_by_id(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")
        template.is_active = not template.is_active
        return await self._templates.update(template)

    async def delete_template(self, template_id: int) -> None:
        template = await self._templates.get_by_id(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")
        await self._templates.delete(template_id)

    async def rebuild_template_sections(
        self, template_id: int, sections: list[TemplateSection]
    ) -> AlbumTemplate:
        template = await self._templates.get_by_id(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")
        total = sum(len(s.stickers) for s in sections)
        if total == 0:
            raise ValueError("El template debe tener al menos una lámina")
        return await self._templates.rebuild_sections(template_id, sections)

    async def update_template_meta(
        self, template_id: int, name: str, description: str, is_active: bool
    ) -> AlbumTemplate:
        template = await self._templates.get_by_id(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")
        template.name = name
        template.description = description
        template.is_active = is_active
        return await self._templates.update(template)


class AdminUseCases:
    def __init__(self, user_repo: UserRepositoryPort) -> None:
        self._users = user_repo

    async def list_users(self) -> list[User]:
        return await self._users.list_all()

    async def toggle_user_active(self, user_id: int) -> User:
        user = await self._users.get_by_id(user_id)
        if not user:
            raise ValueError(f"Usuario {user_id} no encontrado")
        user.is_active = not user.is_active
        return await self._users.update(user)

    async def manually_verify_user(self, user_id: int) -> User:
        user = await self._users.get_by_id(user_id)
        if not user:
            raise ValueError(f"Usuario {user_id} no encontrado")
        if user.is_active:
            raise ValueError("El usuario ya está activo")
        user.is_active = True
        return await self._users.update(user)
