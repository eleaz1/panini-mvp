"""Seeder: populate initial data (templates, admin user) on first run."""
import logging
import os

from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select, update

from src.domain.entities.models import AlbumTemplate, UserRole
from src.infrastructure.auth import hash_password
from src.infrastructure.db.orm_models import TemplateSectionORM, UserORM
from src.infrastructure.repositories.sql_repositories import (
    SQLAlbumTemplateRepository,
    SQLUserRepository,
)
from src.infrastructure.seeders.world_cup_2026 import (
    WORLD_CUP_2026_TEMPLATE,
    _GROUP_MAP,
    _ORDER_MAP,
    build_wc2026_sections,
)

logger = logging.getLogger(__name__)


async def seed_admin_user(session: AsyncSession) -> None:
    """Create default admin user from env vars if it doesn't exist."""
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_email = os.getenv("ADMIN_EMAIL", "admin@panini.local")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")

    repo = SQLUserRepository(session)
    existing = await repo.get_by_username(admin_username)
    if existing:
        return

    from src.domain.entities.models import User
    admin = User(
        id=0,
        username=admin_username,
        email=admin_email,
        hashed_password=hash_password(admin_password),
        is_active=True,
        full_name="Administrador",
        role=UserRole.ADMIN,
    )
    created = await repo.create(admin)
    await session.commit()
    logger.info("Admin user created: %s (id=%s)", admin_username, created.id)


async def _backfill_wc2026_groups(session: AsyncSession) -> None:
    """Assign group + fix FIFA order for existing WC2026 sections missing the group field."""
    result = await session.execute(
        select(TemplateSectionORM).where(TemplateSectionORM.group == "")
    )
    sections = result.scalars().all()
    updated = 0
    for sec in sections:
        grp = _GROUP_MAP.get(sec.code_prefix)
        new_order = _ORDER_MAP.get(sec.code_prefix)
        if grp:
            values: dict = {"group": grp}
            if new_order is not None:
                values["order"] = new_order
            await session.execute(
                update(TemplateSectionORM)
                .where(TemplateSectionORM.id == sec.id)
                .values(**values)
            )
            updated += 1
    if updated:
        await session.commit()
        logger.info("Backfilled group + order for %s WC2026 sections", updated)


async def seed_wc2026_template(session: AsyncSession) -> None:
    """Create the FIFA World Cup 2026 template if it doesn't exist."""
    repo = SQLAlbumTemplateRepository(session)
    if await repo.exists_by_name(WORLD_CUP_2026_TEMPLATE["name"]):
        await _backfill_wc2026_groups(session)
        return

    user_repo = SQLUserRepository(session)
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin = await user_repo.get_by_username(admin_username)
    if not admin:
        logger.warning("Admin user not found — skipping WC2026 template seed")
        return

    sections = build_wc2026_sections()
    total = sum(len(s.stickers) for s in sections)
    template = AlbumTemplate(
        id=0,
        name=WORLD_CUP_2026_TEMPLATE["name"],
        description=WORLD_CUP_2026_TEMPLATE["description"],
        total_stickers=total,
        created_by=admin.id,
        is_active=True,
    )
    created = await repo.create_with_sections(template, sections)
    await session.commit()
    logger.info(
        "WC2026 template seeded: %s stickers across %s sections",
        created.total_stickers,
        len(created.sections),
    )


async def seed_test_user(session: AsyncSession) -> None:
    """Create a default regular user for testing if it doesn't exist."""
    test_username = os.getenv("TEST_USERNAME", "usuario")
    test_email = os.getenv("TEST_EMAIL", "usuario@panini.local")
    test_password = os.getenv("TEST_PASSWORD", "usuario123")

    repo = SQLUserRepository(session)
    if await repo.get_by_username(test_username):
        return

    from src.domain.entities.models import User
    user = User(
        id=0,
        username=test_username,
        email=test_email,
        hashed_password=hash_password(test_password),
        is_active=True,
        full_name="Usuario de Prueba",
        role=UserRole.USER,
    )
    created = await repo.create(user)
    await session.commit()
    logger.info("Test user created: %s (id=%s)", test_username, created.id)


async def run_seeders(session: AsyncSession) -> None:
    await seed_admin_user(session)
    await seed_test_user(session)
    await seed_wc2026_template(session)
