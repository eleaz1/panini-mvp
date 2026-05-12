"""Swap request use cases — orchestrate contact permission flow."""
from src.domain.entities.models import SwapRequest, SwapRequestStatus, User
from src.domain.ports.repositories import SwapRequestRepositoryPort, UserRepositoryPort


class SwapRequestUseCases:
    def __init__(
        self,
        request_repo: SwapRequestRepositoryPort,
        user_repo: UserRepositoryPort,
    ) -> None:
        self._requests = request_repo
        self._users = user_repo

    async def send_request(
        self, requester_id: int, receiver_id: int, message: str
    ) -> SwapRequest:
        if requester_id == receiver_id:
            raise ValueError("No puedes enviarte una solicitud a ti mismo")
        receiver = await self._users.get_by_id(receiver_id)
        if not receiver:
            raise ValueError("Usuario no encontrado")
        existing = await self._requests.get_between_users(requester_id, receiver_id)
        if existing and existing.status == SwapRequestStatus.PENDING:
            raise ValueError("Ya tienes una solicitud pendiente con este usuario")
        req = SwapRequest(
            id=0,
            requester_id=requester_id,
            receiver_id=receiver_id,
            message=message,
            status=SwapRequestStatus.PENDING,
        )
        return await self._requests.create(req)

    async def respond(
        self, request_id: int, user_id: int, accept: bool
    ) -> SwapRequest:
        req = await self._requests.get_by_id(request_id)
        if not req:
            raise ValueError("Solicitud no encontrada")
        if req.receiver_id != user_id:
            raise PermissionError("No puedes responder esta solicitud")
        if req.status != SwapRequestStatus.PENDING:
            raise ValueError("Esta solicitud ya fue respondida")
        new_status = SwapRequestStatus.ACCEPTED if accept else SwapRequestStatus.DECLINED
        return await self._requests.update_status(request_id, new_status)

    async def list_received(self, user_id: int) -> list[tuple[SwapRequest, User]]:
        requests = await self._requests.list_received(user_id)
        result = []
        for req in requests:
            requester = await self._users.get_by_id(req.requester_id)
            if requester:
                result.append((req, requester))
        return result

    async def list_sent(self, user_id: int) -> list[tuple[SwapRequest, User]]:
        requests = await self._requests.list_sent(user_id)
        result = []
        for req in requests:
            receiver = await self._users.get_by_id(req.receiver_id)
            if receiver:
                result.append((req, receiver))
        return result

    async def get_between_users(
        self, user1_id: int, user2_id: int
    ) -> SwapRequest | None:
        return await self._requests.get_between_users(user1_id, user2_id)

    async def pending_count(self, user_id: int) -> int:
        received = await self._requests.list_received(user_id)
        return sum(1 for r in received if r.status == SwapRequestStatus.PENDING)
