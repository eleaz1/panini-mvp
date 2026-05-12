"""FastAPI application entrypoint."""
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.infrastructure.db.session import init_db, async_session_factory
from src.infrastructure.seeders.seeder import run_seeders
from src.interfaces.api.routers.api import (
    admin_router,
    album_router,
    auth_router,
    sticker_router,
    swap_request_router,
    template_router,
)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    await init_db()
    async with async_session_factory() as session:
        await run_seeders(session)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(album_router, prefix=settings.api_prefix)
app.include_router(sticker_router, prefix=settings.api_prefix)
app.include_router(template_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)
app.include_router(swap_request_router, prefix=settings.api_prefix)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "app": settings.app_name}
