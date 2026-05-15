"""SQLAlchemy adapters implementing domain ports."""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import or_

from src.domain.entities.models import (
    Album,
    AlbumTemplate,
    Sticker,
    StickerStatus,
    SwapRequest,
    SwapRequestStatus,
    TemplateSection,
    TemplateSticker,
    TokenType,
    User,
    VerificationToken,
)
from src.domain.ports.repositories import (
    AlbumRepositoryPort,
    AlbumTemplateRepositoryPort,
    StickerRepositoryPort,
    SwapRequestRepositoryPort,
    UserRepositoryPort,
    VerificationTokenRepositoryPort,
)
from src.infrastructure.db.orm_models import (
    AlbumORM,
    AlbumTemplateORM,
    StickerORM,
    SwapRequestORM,
    TemplateSectionORM,
    TemplateStickerORM,
    UserORM,
    VerificationTokenORM,
)


def _user_to_domain(orm: UserORM) -> User:
    return User(
        id=orm.id,
        username=orm.username,
        email=orm.email,
        hashed_password=orm.hashed_password,
        is_active=orm.is_active,
        full_name=orm.full_name,
        phone=orm.phone,
        role=orm.role,
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
        template_id=orm.template_id,
        created_at=orm.created_at,
    )


def _sticker_to_domain(orm: StickerORM) -> Sticker:
    return Sticker(
        id=orm.id,
        album_id=orm.album_id,
        user_id=orm.user_id,
        number=orm.number,
        code=orm.code,
        status=orm.status,
        updated_at=orm.updated_at,
    )


def _template_section_to_domain(orm: TemplateSectionORM) -> TemplateSection:
    return TemplateSection(
        id=orm.id,
        template_id=orm.template_id,
        name=orm.name,
        code_prefix=orm.code_prefix,
        order=orm.order,
        group=orm.group,
        stickers=[
            TemplateSticker(
                code=s.code,
                label=s.label,
                position=s.position,
                section_id=s.section_id,
            )
            for s in orm.stickers
        ],
    )


def _template_to_domain(orm: AlbumTemplateORM) -> AlbumTemplate:
    return AlbumTemplate(
        id=orm.id,
        name=orm.name,
        description=orm.description,
        total_stickers=orm.total_stickers,
        created_by=orm.created_by,
        is_active=orm.is_active,
        created_at=orm.created_at,
        sections=[_template_section_to_domain(s) for s in orm.sections],
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
            role=user.role,
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
        orm.role = user.role
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
            template_id=album.template_id,
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
            code=sticker.code,
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

    async def list_by_code_status(
        self, album_id: int, code: str, status: StickerStatus
    ) -> list[Sticker]:
        stmt = select(StickerORM).where(
            StickerORM.album_id == album_id,
            StickerORM.code == code,
            StickerORM.status == status,
        )
        result = await self._session.execute(stmt)
        return [_sticker_to_domain(s) for s in result.scalars().all()]

    async def list_holders_by_code(
        self, code: str, status: StickerStatus, exclude_user_id: int
    ) -> list[Sticker]:
        stmt = select(StickerORM).where(
            StickerORM.code == code,
            StickerORM.status == status,
            StickerORM.user_id != exclude_user_id,
        )
        result = await self._session.execute(stmt)
        return [_sticker_to_domain(s) for s in result.scalars().all()]

    async def list_by_user_status(
        self, user_id: int, status: StickerStatus
    ) -> list[Sticker]:
        stmt = select(StickerORM).where(
            StickerORM.user_id == user_id,
            StickerORM.status == status,
        )
        result = await self._session.execute(stmt)
        return [_sticker_to_domain(s) for s in result.scalars().all()]


class SQLAlbumTemplateRepository(AlbumTemplateRepositoryPort):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, template_id: int) -> AlbumTemplate | None:
        stmt = (
            select(AlbumTemplateORM)
            .where(AlbumTemplateORM.id == template_id)
            .options(
                selectinload(AlbumTemplateORM.sections).selectinload(
                    TemplateSectionORM.stickers
                )
            )
        )
        result = (await self._session.execute(stmt)).scalar_one_or_none()
        return _template_to_domain(result) if result else None

    async def list_active(self) -> list[AlbumTemplate]:
        stmt = (
            select(AlbumTemplateORM)
            .where(AlbumTemplateORM.is_active == True)  # noqa: E712
            .options(
                selectinload(AlbumTemplateORM.sections).selectinload(
                    TemplateSectionORM.stickers
                )
            )
        )
        result = await self._session.execute(stmt)
        return [_template_to_domain(t) for t in result.scalars().all()]

    async def list_all(self) -> list[AlbumTemplate]:
        stmt = (
            select(AlbumTemplateORM)
            .options(
                selectinload(AlbumTemplateORM.sections).selectinload(
                    TemplateSectionORM.stickers
                )
            )
        )
        result = await self._session.execute(stmt)
        return [_template_to_domain(t) for t in result.scalars().all()]

    async def create_with_sections(
        self, template: AlbumTemplate, sections: list[TemplateSection]
    ) -> AlbumTemplate:
        orm = AlbumTemplateORM(
            name=template.name,
            description=template.description,
            total_stickers=template.total_stickers,
            created_by=template.created_by,
            is_active=template.is_active,
        )
        self._session.add(orm)
        await self._session.flush()

        for section in sections:
            sec_orm = TemplateSectionORM(
                template_id=orm.id,
                name=section.name,
                code_prefix=section.code_prefix,
                order=section.order,
                group=section.group,
            )
            self._session.add(sec_orm)
            await self._session.flush()

            for sticker in section.stickers:
                stk_orm = TemplateStickerORM(
                    section_id=sec_orm.id,
                    code=sticker.code,
                    label=sticker.label,
                    position=sticker.position,
                )
                self._session.add(stk_orm)

        await self._session.flush()
        return await self.get_by_id(orm.id)  # type: ignore[return-value]

    async def update(self, template: AlbumTemplate) -> AlbumTemplate:
        orm = await self._session.get(AlbumTemplateORM, template.id)
        if not orm:
            raise ValueError(f"Template {template.id} not found")
        orm.name = template.name
        orm.description = template.description
        orm.is_active = template.is_active
        await self._session.flush()
        return await self.get_by_id(orm.id)  # type: ignore[return-value]

    async def delete(self, template_id: int) -> None:
        orm = await self._session.get(AlbumTemplateORM, template_id)
        if orm:
            await self._session.delete(orm)

    async def exists_by_name(self, name: str) -> bool:
        stmt = select(AlbumTemplateORM.id).where(AlbumTemplateORM.name == name)
        result = (await self._session.execute(stmt)).scalar_one_or_none()
        return result is not None

    async def rebuild_sections(
        self, template_id: int, sections: list[TemplateSection]
    ) -> AlbumTemplate:
        """Delete all existing sections and recreate them from the given list."""
        # Load existing sections with their stickers so ORM cascade works
        existing_stmt = (
            select(TemplateSectionORM)
            .where(TemplateSectionORM.template_id == template_id)
            .options(selectinload(TemplateSectionORM.stickers))
        )
        existing = (await self._session.execute(existing_stmt)).scalars().all()
        for sec in existing:
            await self._session.delete(sec)
        await self._session.flush()
        # Expire cached template so get_by_id returns fresh data
        self._session.expire_all()

        total = 0
        for section in sections:
            sec_orm = TemplateSectionORM(
                template_id=template_id,
                name=section.name,
                code_prefix=section.code_prefix,
                order=section.order,
                group=section.group,
            )
            self._session.add(sec_orm)
            await self._session.flush()
            for sticker in section.stickers:
                self._session.add(TemplateStickerORM(
                    section_id=sec_orm.id,
                    code=sticker.code,
                    label=sticker.label,
                    position=sticker.position,
                ))
            total += len(section.stickers)

        # update total_stickers count
        orm = await self._session.get(AlbumTemplateORM, template_id)
        if orm:
            orm.total_stickers = total
        await self._session.flush()
        return await self.get_by_id(template_id)  # type: ignore[return-value]


class SQLSwapRequestRepository(SwapRequestRepositoryPort):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _to_domain(self, orm: SwapRequestORM) -> SwapRequest:
        return SwapRequest(
            id=orm.id,
            requester_id=orm.requester_id,
            receiver_id=orm.receiver_id,
            message=orm.message,
            status=orm.status,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    async def create(self, request: SwapRequest) -> SwapRequest:
        orm = SwapRequestORM(
            requester_id=request.requester_id,
            receiver_id=request.receiver_id,
            message=request.message,
            status=SwapRequestStatus.PENDING,
        )
        self._session.add(orm)
        await self._session.flush()
        return self._to_domain(orm)

    async def get_by_id(self, request_id: int) -> SwapRequest | None:
        result = await self._session.get(SwapRequestORM, request_id)
        return self._to_domain(result) if result else None

    async def get_between_users(
        self, user1_id: int, user2_id: int
    ) -> SwapRequest | None:
        stmt = (
            select(SwapRequestORM)
            .where(
                or_(
                    (SwapRequestORM.requester_id == user1_id) & (SwapRequestORM.receiver_id == user2_id),
                    (SwapRequestORM.requester_id == user2_id) & (SwapRequestORM.receiver_id == user1_id),
                )
            )
            .order_by(SwapRequestORM.updated_at.desc())
            .limit(1)
        )
        result = (await self._session.execute(stmt)).scalar_one_or_none()
        return self._to_domain(result) if result else None

    async def list_received(self, user_id: int) -> list[SwapRequest]:
        stmt = (
            select(SwapRequestORM)
            .where(SwapRequestORM.receiver_id == user_id)
            .order_by(SwapRequestORM.updated_at.desc())
        )
        result = await self._session.execute(stmt)
        return [self._to_domain(r) for r in result.scalars().all()]

    async def list_sent(self, user_id: int) -> list[SwapRequest]:
        stmt = (
            select(SwapRequestORM)
            .where(SwapRequestORM.requester_id == user_id)
            .order_by(SwapRequestORM.updated_at.desc())
        )
        result = await self._session.execute(stmt)
        return [self._to_domain(r) for r in result.scalars().all()]

    async def update_status(
        self, request_id: int, status: SwapRequestStatus
    ) -> SwapRequest:
        orm = await self._session.get(SwapRequestORM, request_id)
        if not orm:
            raise ValueError(f"SwapRequest {request_id} not found")
        orm.status = status
        await self._session.flush()
        return self._to_domain(orm)
