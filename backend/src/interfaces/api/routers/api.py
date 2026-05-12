"""FastAPI routers — thin controllers, zero business logic."""
from fastapi import APIRouter, Depends, HTTPException, status

from src.application.use_cases.album_use_cases import (
    AdminUseCases,
    AlbumTemplateUseCases,
    AlbumUseCases,
    AuthUseCases,
    StickerUseCases,
)
from src.application.use_cases.swap_request_use_cases import SwapRequestUseCases
from src.domain.entities.models import StickerStatus, TemplateSection, TemplateSticker, User
from src.interfaces.api.dependencies.deps import (
    get_admin_use_cases,
    get_album_use_cases,
    get_auth_use_cases,
    get_current_user,
    get_sticker_use_cases,
    get_swap_request_use_cases,
    get_template_use_cases,
    require_admin,
)
from src.infrastructure.email_service import send_verification_email, send_password_reset_email
from src.infrastructure.recaptcha import verify_recaptcha
from src.interfaces.schemas.api_schemas import (
    AdminUserResponse,
    AlbumCreateRequest,
    AlbumResponse,
    AlbumStatsResponse,
    AlbumTemplateCreateRequest,
    AlbumTemplateListResponse,
    AlbumTemplateResponse,
    AlbumTemplateUpdateRequest,
    AlbumUpdateRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    MissingStickerMatchResponse,
    PendingCountResponse,
    StickerBulkRequest,
    StickerHolderResponse,
    StickerResponse,
    StickerUpdateRequest,
    SwapMatchResponse,
    SwapRequestActionRequest,
    SwapRequestCreateRequest,
    SwapRequestResponse,
    SwapRequestUserInfo,
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
        email=user.email, role=user.role, created_at=user.created_at,
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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    return TokenResponse(access_token=token)


@auth_router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(
        id=current_user.id, username=current_user.username,
        full_name=current_user.full_name, email=current_user.email,
        role=current_user.role, created_at=current_user.created_at,
    )


# ── Admin — Album Templates ───────────────────────────────────────────────────
admin_router = APIRouter(prefix="/admin", tags=["admin"])


@admin_router.get("/templates", response_model=list[AlbumTemplateListResponse])
async def admin_list_templates(
    _admin: User = Depends(require_admin),
    use_cases: AlbumTemplateUseCases = Depends(get_template_use_cases),
) -> list[AlbumTemplateListResponse]:
    templates = await use_cases.list_all_templates()
    return [
        AlbumTemplateListResponse(
            id=t.id, name=t.name, description=t.description,
            total_stickers=t.total_stickers, is_active=t.is_active, created_at=t.created_at,
        )
        for t in templates
    ]


@admin_router.get("/templates/{template_id}", response_model=AlbumTemplateResponse)
async def admin_get_template(
    template_id: int,
    _admin: User = Depends(require_admin),
    use_cases: AlbumTemplateUseCases = Depends(get_template_use_cases),
) -> AlbumTemplateResponse:
    try:
        t = await use_cases.get_template(template_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return AlbumTemplateResponse(
        id=t.id, name=t.name, description=t.description,
        total_stickers=t.total_stickers, is_active=t.is_active, created_at=t.created_at,
        sections=[
            {
                "id": s.id,
                "name": s.name,
                "code_prefix": s.code_prefix,
                "order": s.order,
                "stickers": [
                    {"code": st.code, "label": st.label, "position": st.position}
                    for st in s.stickers
                ],
            }
            for s in t.sections
        ],
    )


@admin_router.post("/templates", response_model=AlbumTemplateListResponse, status_code=201)
async def admin_create_template(
    body: AlbumTemplateCreateRequest,
    admin: User = Depends(require_admin),
    use_cases: AlbumTemplateUseCases = Depends(get_template_use_cases),
) -> AlbumTemplateListResponse:
    sections = [
        TemplateSection(
            id=0,
            template_id=0,
            name=sec.name,
            code_prefix=sec.code_prefix,
            order=sec.order,
            stickers=[
                TemplateSticker(
                    code=st.code,
                    label=st.label,
                    position=st.position,
                )
                for st in sec.stickers
            ],
        )
        for sec in body.sections
    ]
    try:
        t = await use_cases.create_template(admin.id, body.name, body.description, sections)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return AlbumTemplateListResponse(
        id=t.id, name=t.name, description=t.description,
        total_stickers=t.total_stickers, is_active=t.is_active, created_at=t.created_at,
    )


@admin_router.patch("/templates/{template_id}/toggle", response_model=AlbumTemplateListResponse)
async def admin_toggle_template(
    template_id: int,
    _admin: User = Depends(require_admin),
    use_cases: AlbumTemplateUseCases = Depends(get_template_use_cases),
) -> AlbumTemplateListResponse:
    try:
        t = await use_cases.toggle_active(template_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return AlbumTemplateListResponse(
        id=t.id, name=t.name, description=t.description,
        total_stickers=t.total_stickers, is_active=t.is_active, created_at=t.created_at,
    )


@admin_router.patch("/templates/{template_id}", response_model=AlbumTemplateListResponse)
async def admin_update_template(
    template_id: int,
    body: AlbumTemplateUpdateRequest,
    _admin: User = Depends(require_admin),
    use_cases: AlbumTemplateUseCases = Depends(get_template_use_cases),
) -> AlbumTemplateListResponse:
    try:
        t = await use_cases.update_template_meta(
            template_id, body.name, body.description, body.is_active
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return AlbumTemplateListResponse(
        id=t.id, name=t.name, description=t.description,
        total_stickers=t.total_stickers, is_active=t.is_active, created_at=t.created_at,
    )


@admin_router.post("/templates/{template_id}/rebuild-wc2026", response_model=AlbumTemplateListResponse)
async def admin_rebuild_wc2026(
    template_id: int,
    _admin: User = Depends(require_admin),
    use_cases: AlbumTemplateUseCases = Depends(get_template_use_cases),
) -> AlbumTemplateListResponse:
    from src.infrastructure.seeders.world_cup_2026 import build_wc2026_sections
    sections = build_wc2026_sections()
    try:
        t = await use_cases.rebuild_template_sections(template_id, sections)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return AlbumTemplateListResponse(
        id=t.id, name=t.name, description=t.description,
        total_stickers=t.total_stickers, is_active=t.is_active, created_at=t.created_at,
    )


@admin_router.delete("/templates/{template_id}", status_code=204)
async def admin_delete_template(
    template_id: int,
    _admin: User = Depends(require_admin),
    use_cases: AlbumTemplateUseCases = Depends(get_template_use_cases),
) -> None:
    try:
        await use_cases.delete_template(template_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ── Admin — Users ─────────────────────────────────────────────────────────────

@admin_router.get("/users", response_model=list[AdminUserResponse])
async def admin_list_users(
    _admin: User = Depends(require_admin),
    use_cases: AdminUseCases = Depends(get_admin_use_cases),
) -> list[AdminUserResponse]:
    users = await use_cases.list_users()
    return [
        AdminUserResponse(
            id=u.id, username=u.username, full_name=u.full_name,
            email=u.email, phone=u.phone, role=u.role,
            is_active=u.is_active, created_at=u.created_at,
        )
        for u in users
    ]


@admin_router.patch("/users/{user_id}/toggle-active", response_model=AdminUserResponse)
async def admin_toggle_user_active(
    user_id: int,
    _admin: User = Depends(require_admin),
    use_cases: AdminUseCases = Depends(get_admin_use_cases),
) -> AdminUserResponse:
    try:
        u = await use_cases.toggle_user_active(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return AdminUserResponse(
        id=u.id, username=u.username, full_name=u.full_name,
        email=u.email, phone=u.phone, role=u.role,
        is_active=u.is_active, created_at=u.created_at,
    )


@admin_router.post("/users/{user_id}/verify-email", response_model=AdminUserResponse)
async def admin_verify_user_email(
    user_id: int,
    _admin: User = Depends(require_admin),
    use_cases: AdminUseCases = Depends(get_admin_use_cases),
) -> AdminUserResponse:
    try:
        u = await use_cases.manually_verify_user(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return AdminUserResponse(
        id=u.id, username=u.username, full_name=u.full_name,
        email=u.email, phone=u.phone, role=u.role,
        is_active=u.is_active, created_at=u.created_at,
    )


# ── Templates (usuarios) ──────────────────────────────────────────────────────
template_router = APIRouter(prefix="/templates", tags=["templates"])


@template_router.get("", response_model=list[AlbumTemplateListResponse])
async def list_templates(
    _user: User = Depends(get_current_user),
    use_cases: AlbumTemplateUseCases = Depends(get_template_use_cases),
) -> list[AlbumTemplateListResponse]:
    templates = await use_cases.list_templates()
    return [
        AlbumTemplateListResponse(
            id=t.id, name=t.name, description=t.description,
            total_stickers=t.total_stickers, is_active=t.is_active, created_at=t.created_at,
        )
        for t in templates
    ]


@template_router.get("/{template_id}", response_model=AlbumTemplateResponse)
async def get_template(
    template_id: int,
    _user: User = Depends(get_current_user),
    use_cases: AlbumTemplateUseCases = Depends(get_template_use_cases),
) -> AlbumTemplateResponse:
    try:
        t = await use_cases.get_template(template_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return AlbumTemplateResponse(
        id=t.id, name=t.name, description=t.description,
        total_stickers=t.total_stickers, is_active=t.is_active, created_at=t.created_at,
        sections=[
            {
                "id": s.id,
                "name": s.name,
                "code_prefix": s.code_prefix,
                "order": s.order,
                "stickers": [
                    {"code": st.code, "label": st.label, "position": st.position}
                    for st in s.stickers
                ],
            }
            for s in t.sections
        ],
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
            current_user.id, body.name, body.total_stickers,
            body.description, template_id=body.template_id,
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
            friend_full_name=m.friend_full_name,
            friend_phone=m.friend_phone,
            can_give=m.can_give,
            can_receive=m.can_receive,
        )
        for m in matches
    ]


@sticker_router.get("/search", response_model=list[StickerHolderResponse])
async def search_sticker_holders(
    album_id: int,
    code: str,
    current_user: User = Depends(get_current_user),
    use_cases: StickerUseCases = Depends(get_sticker_use_cases),
) -> list[StickerHolderResponse]:
    holders = await use_cases.search_sticker_holders(album_id, code.upper(), current_user.id)
    return [
        StickerHolderResponse(
            user_id=h.user_id,
            username=h.username,
            full_name=h.full_name,
            phone=h.phone,
        )
        for h in holders
    ]


@sticker_router.get("/missing-holders", response_model=list[MissingStickerMatchResponse])
async def missing_holders(
    album_id: int,
    current_user: User = Depends(get_current_user),
    use_cases: StickerUseCases = Depends(get_sticker_use_cases),
) -> list[MissingStickerMatchResponse]:
    matches = await use_cases.find_holders_for_my_missing(album_id, current_user.id)
    return [
        MissingStickerMatchResponse(
            sticker_code=m.sticker_code,
            sticker_number=m.sticker_number,
            holders=[
                StickerHolderResponse(
                    user_id=h.user_id,
                    username=h.username,
                    full_name=h.full_name,
                    phone=h.phone,
                )
                for h in m.holders
            ],
        )
        for m in matches
    ]


# ── Swap Requests ─────────────────────────────────────────────────────────────
swap_request_router = APIRouter(prefix="/swap-requests", tags=["swap-requests"])


def _build_request_response(
    req_tuple: tuple,
) -> SwapRequestResponse:
    req, other_user = req_tuple
    # determine who is requester and who is receiver based on the tuple structure
    return req, other_user


@swap_request_router.post("", response_model=SwapRequestResponse, status_code=201)
async def send_swap_request(
    body: SwapRequestCreateRequest,
    current_user=Depends(get_current_user),
    use_cases: SwapRequestUseCases = Depends(get_swap_request_use_cases),
) -> SwapRequestResponse:
    try:
        req = await use_cases.send_request(current_user.id, body.receiver_id, body.message)
    except (ValueError, PermissionError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return SwapRequestResponse(
        id=req.id,
        requester=SwapRequestUserInfo(
            id=current_user.id,
            username=current_user.username,
            full_name=current_user.full_name,
        ),
        receiver=SwapRequestUserInfo(id=body.receiver_id, username="", full_name=""),
        message=req.message,
        status=req.status.value,
        created_at=req.created_at,
    )


@swap_request_router.get("/received", response_model=list[SwapRequestResponse])
async def list_received(
    current_user=Depends(get_current_user),
    use_cases: SwapRequestUseCases = Depends(get_swap_request_use_cases),
) -> list[SwapRequestResponse]:
    items = await use_cases.list_received(current_user.id)
    return [
        SwapRequestResponse(
            id=req.id,
            requester=SwapRequestUserInfo(
                id=user.id, username=user.username, full_name=user.full_name
            ),
            receiver=SwapRequestUserInfo(
                id=current_user.id,
                username=current_user.username,
                full_name=current_user.full_name,
            ),
            message=req.message,
            status=req.status.value,
            created_at=req.created_at,
        )
        for req, user in items
    ]


@swap_request_router.get("/sent", response_model=list[SwapRequestResponse])
async def list_sent(
    current_user=Depends(get_current_user),
    use_cases: SwapRequestUseCases = Depends(get_swap_request_use_cases),
) -> list[SwapRequestResponse]:
    items = await use_cases.list_sent(current_user.id)
    return [
        SwapRequestResponse(
            id=req.id,
            requester=SwapRequestUserInfo(
                id=current_user.id,
                username=current_user.username,
                full_name=current_user.full_name,
            ),
            receiver=SwapRequestUserInfo(
                id=user.id, username=user.username, full_name=user.full_name
            ),
            message=req.message,
            status=req.status.value,
            created_at=req.created_at,
        )
        for req, user in items
    ]


@swap_request_router.get("/pending-count", response_model=PendingCountResponse)
async def pending_count(
    current_user=Depends(get_current_user),
    use_cases: SwapRequestUseCases = Depends(get_swap_request_use_cases),
) -> PendingCountResponse:
    count = await use_cases.pending_count(current_user.id)
    return PendingCountResponse(count=count)


@swap_request_router.get("/with/{user_id}", response_model=SwapRequestResponse | None)
async def request_with_user(
    user_id: int,
    current_user=Depends(get_current_user),
    use_cases: SwapRequestUseCases = Depends(get_swap_request_use_cases),
) -> SwapRequestResponse | None:
    req = await use_cases.get_between_users(current_user.id, user_id)
    if not req:
        return None
    is_requester = req.requester_id == current_user.id
    return SwapRequestResponse(
        id=req.id,
        requester=SwapRequestUserInfo(
            id=req.requester_id,
            username=current_user.username if is_requester else "",
            full_name=current_user.full_name if is_requester else "",
        ),
        receiver=SwapRequestUserInfo(
            id=req.receiver_id,
            username="" if is_requester else current_user.username,
            full_name="" if is_requester else current_user.full_name,
        ),
        message=req.message,
        status=req.status.value,
        created_at=req.created_at,
    )


@swap_request_router.put("/{request_id}/respond", response_model=SwapRequestResponse)
async def respond_request(
    request_id: int,
    body: SwapRequestActionRequest,
    current_user=Depends(get_current_user),
    use_cases: SwapRequestUseCases = Depends(get_swap_request_use_cases),
) -> SwapRequestResponse:
    try:
        req = await use_cases.respond(request_id, current_user.id, body.action == "accept")
    except (ValueError, PermissionError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return SwapRequestResponse(
        id=req.id,
        requester=SwapRequestUserInfo(id=req.requester_id, username="", full_name=""),
        receiver=SwapRequestUserInfo(
            id=current_user.id,
            username=current_user.username,
            full_name=current_user.full_name,
        ),
        message=req.message,
        status=req.status.value,
        created_at=req.created_at,
    )
