"""FastAPI dependencies — wires ports to implementations."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.use_cases.album_use_cases import (
    AlbumUseCases,
    AuthUseCases,
    StickerUseCases,
)
from src.domain.entities.models import User
from src.infrastructure.auth import decode_token
from src.infrastructure.db.session import get_session
from src.infrastructure.repositories.sql_repositories import (
    SQLAlbumRepository,
    SQLStickerRepository,
    SQLUserRepository,
    SQLVerificationTokenRepository,
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_user_repo(session: AsyncSession = Depends(get_session)) -> SQLUserRepository:
    return SQLUserRepository(session)


def get_album_repo(
    session: AsyncSession = Depends(get_session),
) -> SQLAlbumRepository:
    return SQLAlbumRepository(session)


def get_sticker_repo(
    session: AsyncSession = Depends(get_session),
) -> SQLStickerRepository:
    return SQLStickerRepository(session)


def get_token_repo(
    session: AsyncSession = Depends(get_session),
) -> SQLVerificationTokenRepository:
    return SQLVerificationTokenRepository(session)


def get_auth_use_cases(
    user_repo: SQLUserRepository = Depends(get_user_repo),
    token_repo: SQLVerificationTokenRepository = Depends(get_token_repo),
) -> AuthUseCases:
    return AuthUseCases(user_repo, token_repo)


def get_album_use_cases(
    album_repo: SQLAlbumRepository = Depends(get_album_repo),
) -> AlbumUseCases:
    return AlbumUseCases(album_repo)


def get_sticker_use_cases(
    sticker_repo: SQLStickerRepository = Depends(get_sticker_repo),
    album_repo: SQLAlbumRepository = Depends(get_album_repo),
    user_repo: SQLUserRepository = Depends(get_user_repo),
) -> StickerUseCases:
    return StickerUseCases(sticker_repo, album_repo, user_repo)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: SQLUserRepository = Depends(get_user_repo),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
    except (ValueError, KeyError):
        raise credentials_exception
    user = await user_repo.get_by_id(user_id)
    if not user or not user.is_active:
        raise credentials_exception
    return user
