"""FastAPI routers — thin controllers, zero business logic."""
from fastapi import APIRouter, Depends, HTTPException, status

from src.application.use_cases.album_use_cases import (
    AlbumUseCases,
    AuthUseCases,
    StickerUseCases,
)
from src.domain.entities.models import StickerStatus, User
from src.interfaces.api.dependencies.deps import (
    get_album_use_cases,
    get_auth_use_cases,
    get_current_user,
    get_sticker_use_cases,
)
from src.infrastructure.email_service import send_verification_email, send_password_reset_email
from src.infrastructure.recaptcha import verify_recaptcha
from src.interfaces.schemas.api_schemas import (
    AlbumCreateRequest,
    AlbumResponse,
    AlbumStatsResponse,
    AlbumUpdateRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    StickerBulkRequest,
    StickerResponse,
    StickerUpdateRequest,
    SwapMatchResponse,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
)

# ── Auth ──────────────────────────────────────────────────────────────────────
auth_router = APIRouter(prefix="/auth", tags=["auth"])


@auth_router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    body: RegisterRequest,
    use_cases: AuthUseCases = Depends(get_auth_use_cases),
) -> UserResponse:
    if not await verify_recaptcha(body.recaptcha_token):
        raise HTTPException(status_code=400, detail="Verificación de reCAPTCHA fallida")
    try:
        user, token = await use_cases.register(
            body.username, body.email, body.password,
            full_name=body.full_name, phone=body.phone,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    await send_verification_email(user.email, user.username, token)
    return UserResponse(
        id=user.id, username=user.username, full_name=user.full_name,
        email=user.email, created_at=user.created_at,
    )


@auth_router.post("/verify-email", status_code=200)
async def verify_email(
    body: VerifyEmailRequest,
    use_cases: AuthUseCases = Depends(get_auth_use_cases),
) -> dict:
    try:
        await use_cases.verify_email(body.token)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"detail": "Correo verificado. Ya puedes iniciar sesión."}


@auth_router.post("/resend-verification", status_code=200)
async def resend_verification(
    body: ResendVerificationRequest,
    use_cases: AuthUseCases = Depends(get_auth_use_cases),
) -> dict:
    try:
        user, token = await use_cases.resend_verification(body.email)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    await send_verification_email(user.email, user.username, token)
    return {"detail": "Correo de verificación reenviado."}


@auth_router.post("/forgot-password", status_code=200)
async def forgot_password(
    body: ForgotPasswordRequest,
    use_cases: AuthUseCases = Depends(get_auth_use_cases),
) -> dict:
    try:
        user, token = await use_cases.forgot_password(body.email)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    await send_password_reset_email(user.email, user.username, token)
    return {"detail": "Si el correo existe, recibirás un enlace para restablecer tu contraseña."}


@auth_router.post("/reset-password", status_code=200)
async def reset_password(
    body: ResetPasswordRequest,
    use_cases: AuthUseCases = Depends(get_auth_use_cases),
) -> dict:
    try:
        await use_cases.reset_password(body.token, body.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"detail": "Contraseña actualizada. Ya puedes iniciar sesión."}


@auth_router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    use_cases: AuthUseCases = Depends(get_auth_use_cases),
) -> TokenResponse:
    try:
        token = await use_cases.login(body.username, body.password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        )
    return TokenResponse(access_token=token)


@auth_router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(
        id=current_user.id, username=current_user.username,
        full_name=current_user.full_name, email=current_user.email,
        created_at=current_user.created_at,
    )


# ── Albums ────────────────────────────────────────────────────────────────────
album_router = APIRouter(prefix="/albums", tags=["albums"])


@album_router.post("", response_model=AlbumResponse, status_code=201)
async def create_album(
    body: AlbumCreateRequest,
    current_user: User = Depends(get_current_user),
    use_cases: AlbumUseCases = Depends(get_album_use_cases),
) -> AlbumResponse:
    try:
        album = await use_cases.create_album(
            current_user.id, body.name, body.total_stickers, body.description
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return AlbumResponse(**album.__dict__)


@album_router.get("", response_model=list[AlbumResponse])
async def list_albums(
    current_user: User = Depends(get_current_user),
    use_cases: AlbumUseCases = Depends(get_album_use_cases),
) -> list[AlbumResponse]:
    albums = await use_cases.list_my_albums(current_user.id)
    return [AlbumResponse(**a.__dict__) for a in albums]


@album_router.put("/{album_id}", response_model=AlbumResponse)
async def update_album(
    album_id: int,
    body: AlbumUpdateRequest,
    current_user: User = Depends(get_current_user),
    use_cases: AlbumUseCases = Depends(get_album_use_cases),
) -> AlbumResponse:
    try:
        album = await use_cases.update_album(
            album_id, current_user.id, body.name, body.total_stickers
        )
    except (ValueError, PermissionError) as exc:
        code = 403 if isinstance(exc, PermissionError) else 404
        raise HTTPException(status_code=code, detail=str(exc))
    return AlbumResponse(**album.__dict__)


@album_router.delete("/{album_id}", status_code=204)
async def delete_album(
    album_id: int,
    current_user: User = Depends(get_current_user),
    use_cases: AlbumUseCases = Depends(get_album_use_cases),
) -> None:
    try:
        await use_cases.delete_album(album_id, current_user.id)
    except (ValueError, PermissionError) as exc:
        code = 403 if isinstance(exc, PermissionError) else 404
        raise HTTPException(status_code=code, detail=str(exc))


# ── Stickers ──────────────────────────────────────────────────────────────────
sticker_router = APIRouter(prefix="/albums/{album_id}/stickers", tags=["stickers"])


@sticker_router.get("", response_model=list[StickerResponse])
async def list_stickers(
    album_id: int,
    status_filter: StickerStatus | None = None,
    current_user: User = Depends(get_current_user),
    use_cases: StickerUseCases = Depends(get_sticker_use_cases),
) -> list[StickerResponse]:
    from src.infrastructure.repositories.sql_repositories import SQLStickerRepository
    from src.interfaces.api.dependencies.deps import get_sticker_repo
    stickers = await use_cases._stickers.list_by_album_user(
        album_id, current_user.id, status_filter
    )
    return [StickerResponse(**s.__dict__) for s in stickers]


@sticker_router.patch("/{number}", response_model=StickerResponse)
async def update_sticker(
    album_id: int,
    number: int,
    body: StickerUpdateRequest,
    current_user: User = Depends(get_current_user),
    use_cases: StickerUseCases = Depends(get_sticker_use_cases),
) -> StickerResponse:
    try:
        sticker = await use_cases.update_sticker(
            album_id, current_user.id, number, body.status
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return StickerResponse(**sticker.__dict__)


@sticker_router.post("/bulk", response_model=list[StickerResponse])
async def bulk_update_stickers(
    album_id: int,
    body: StickerBulkRequest,
    current_user: User = Depends(get_current_user),
    use_cases: StickerUseCases = Depends(get_sticker_use_cases),
) -> list[StickerResponse]:
    try:
        stickers = await use_cases.bulk_update(
            album_id,
            current_user.id,
            [{"number": s.number, "status": s.status} for s in body.stickers],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return [StickerResponse(**s.__dict__) for s in stickers]


@sticker_router.get("/stats", response_model=AlbumStatsResponse)
async def album_stats(
    album_id: int,
    current_user: User = Depends(get_current_user),
    use_cases: StickerUseCases = Depends(get_sticker_use_cases),
) -> AlbumStatsResponse:
    try:
        stats = await use_cases.get_album_stats(album_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return AlbumStatsResponse(**stats)


@sticker_router.get("/swaps", response_model=list[SwapMatchResponse])
async def swap_matches(
    album_id: int,
    current_user: User = Depends(get_current_user),
    use_cases: StickerUseCases = Depends(get_sticker_use_cases),
) -> list[SwapMatchResponse]:
    matches = await use_cases.get_swap_matches(album_id, current_user.id)
    return [
        SwapMatchResponse(
            friend_id=m.friend_id,
            friend_username=m.friend_username,
            can_give=m.can_give,
            can_receive=m.can_receive,
        )
        for m in matches
    ]
