"""FastAPI dependencies — wires ports to implementations."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.use_cases.album_use_cases import (
    AdminUseCases,
    AlbumTemplateUseCases,
    AlbumUseCases,
    AuthUseCases,
    StickerUseCases,
)
from src.application.use_cases.swap_request_use_cases import SwapRequestUseCases
from src.domain.entities.models import User, UserRole
from src.infrastructure.auth import decode_token
from src.infrastructure.db.session import get_session
from src.infrastructure.repositories.sql_repositories import (
    SQLAlbumRepository,
    SQLAlbumTemplateRepository,
    SQLStickerRepository,
    SQLSwapRequestRepository,
    SQLUserRepository,
    SQLVerificationTokenRepository,
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_user_repo(session: AsyncSession = Depends(get_session)) -> SQLUserRepository:
    return SQLUserRepository(session)


def get_album_repo(session: AsyncSession = Depends(get_session)) -> SQLAlbumRepository:
    return SQLAlbumRepository(session)


def get_sticker_repo(session: AsyncSession = Depends(get_session)) -> SQLStickerRepository:
    return SQLStickerRepository(session)


def get_token_repo(session: AsyncSession = Depends(get_session)) -> SQLVerificationTokenRepository:
    return SQLVerificationTokenRepository(session)


def get_template_repo(session: AsyncSession = Depends(get_session)) -> SQLAlbumTemplateRepository:
    return SQLAlbumTemplateRepository(session)


def get_auth_use_cases(
    user_repo: SQLUserRepository = Depends(get_user_repo),
    token_repo: SQLVerificationTokenRepository = Depends(get_token_repo),
) -> AuthUseCases:
    return AuthUseCases(user_repo, token_repo)


def get_album_use_cases(
    album_repo: SQLAlbumRepository = Depends(get_album_repo),
    template_repo: SQLAlbumTemplateRepository = Depends(get_template_repo),
    sticker_repo: SQLStickerRepository = Depends(get_sticker_repo),
) -> AlbumUseCases:
    return AlbumUseCases(album_repo, template_repo, sticker_repo)


def get_sticker_use_cases(
    sticker_repo: SQLStickerRepository = Depends(get_sticker_repo),
    album_repo: SQLAlbumRepository = Depends(get_album_repo),
    user_repo: SQLUserRepository = Depends(get_user_repo),
) -> StickerUseCases:
    return StickerUseCases(sticker_repo, album_repo, user_repo)


def get_template_use_cases(
    template_repo: SQLAlbumTemplateRepository = Depends(get_template_repo),
) -> AlbumTemplateUseCases:
    return AlbumTemplateUseCases(template_repo)


def get_swap_request_repo(
    session: AsyncSession = Depends(get_session),
) -> SQLSwapRequestRepository:
    return SQLSwapRequestRepository(session)


def get_swap_request_use_cases(
    request_repo: SQLSwapRequestRepository = Depends(get_swap_request_repo),
    user_repo: SQLUserRepository = Depends(get_user_repo),
) -> SwapRequestUseCases:
    return SwapRequestUseCases(request_repo, user_repo)


def get_admin_use_cases(
    user_repo: SQLUserRepository = Depends(get_user_repo),
) -> AdminUseCases:
    return AdminUseCases(user_repo)


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


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador",
        )
    return current_user
