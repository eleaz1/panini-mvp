"""Async database engine and session factory."""
from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import settings
from src.infrastructure.db.orm_models import Base

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
    connect_args={"statement_cache_size": 0} if "supabase" in settings.database_url else {},
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Create all tables. For production use Alembic instead."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with engine.begin() as conn:
        exists = await conn.execute(text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name='template_sections' AND column_name='group'"
        ))
        if not exists.scalar():
            await conn.execute(
                text('ALTER TABLE template_sections ADD COLUMN "group" TEXT NOT NULL DEFAULT \'\'')
            )


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a transactional session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
