"""Email service — sends verification and reset emails via SMTP.

If smtp_user is empty (dev mode), logs the email content to stdout instead.
"""
import logging
from email.message import EmailMessage

import aiosmtplib

from src.config import settings

logger = logging.getLogger(__name__)


def _build_verification_email(to_email: str, username: str, token: str) -> EmailMessage:
    link = f"{settings.frontend_url}/verify-email?token={token}"
    msg = EmailMessage()
    msg["Subject"] = "Panini MVP — Verifica tu correo"
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.set_content(
        f"Hola {username},\n\n"
        f"Haz clic en el siguiente enlace para activar tu cuenta:\n{link}\n\n"
        f"El enlace expira en 24 horas.\n\nPanini MVP"
    )
    msg.add_alternative(
        f"""<html><body>
        <h2>Hola {username} 👋</h2>
        <p>Haz clic en el botón para activar tu cuenta:</p>
        <a href="{link}" style="background:#1976d2;color:#fff;padding:12px 24px;
           text-decoration:none;border-radius:4px;display:inline-block">
          Verificar correo
        </a>
        <p style="color:#666;font-size:12px">El enlace expira en 24 horas.</p>
        </body></html>""",
        subtype="html",
    )
    return msg


def _build_reset_email(to_email: str, username: str, token: str) -> EmailMessage:
    link = f"{settings.frontend_url}/reset-password?token={token}"
    msg = EmailMessage()
    msg["Subject"] = "Panini MVP — Restablecer contraseña"
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.set_content(
        f"Hola {username},\n\n"
        f"Recibimos una solicitud para restablecer tu contraseña:\n{link}\n\n"
        f"El enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.\n\nPanini MVP"
    )
    msg.add_alternative(
        f"""<html><body>
        <h2>Restablecer contraseña</h2>
        <p>Hola {username}, haz clic para crear una nueva contraseña:</p>
        <a href="{link}" style="background:#1976d2;color:#fff;padding:12px 24px;
           text-decoration:none;border-radius:4px;display:inline-block">
          Restablecer contraseña
        </a>
        <p style="color:#666;font-size:12px">Expira en 1 hora. Si no solicitaste esto, ignora este correo.</p>
        </body></html>""",
        subtype="html",
    )
    return msg


async def _send(msg: EmailMessage) -> None:
    if not settings.smtp_user:
        logger.info(
            "[DEV EMAIL] To: %s | Subject: %s\n%s",
            msg["To"],
            msg["Subject"],
            msg.get_body(preferencelist=("plain",)).get_content(),  # type: ignore[union-attr]
        )
        return
    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_password,
        start_tls=True,
    )


async def send_verification_email(email: str, username: str, token: str) -> None:
    await _send(_build_verification_email(email, username, token))


async def send_password_reset_email(email: str, username: str, token: str) -> None:
    await _send(_build_reset_email(email, username, token))
