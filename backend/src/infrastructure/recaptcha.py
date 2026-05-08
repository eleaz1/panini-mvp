"""reCAPTCHA v2 verification — skipped when recaptcha_enabled=False."""
import httpx

from src.config import settings

VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


async def verify_recaptcha(token: str) -> bool:
    if not settings.recaptcha_enabled:
        return True
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            VERIFY_URL,
            data={"secret": settings.recaptcha_secret_key, "response": token},
        )
    return resp.json().get("success", False)
