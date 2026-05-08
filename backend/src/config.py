from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # App
    app_name: str = "Panini MVP"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # Database
    database_url: str = "sqlite+aiosqlite:///./panini.db"

    # JWT
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # CORS — Angular dev server
    cors_origins: list[str] = ["http://localhost:4200", "http://localhost:80"]

    # Frontend URL (for email links)
    frontend_url: str = "http://localhost:4200"

    # SMTP — leave smtp_user empty to log emails to console in dev
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@panini.local"

    # Google reCAPTCHA v2 — set recaptcha_enabled=false to skip in dev
    recaptcha_secret_key: str = "6LeIxAcTAAAAAGG-vFI1TnRWxMHkFl5cPVqNPLz5"
    recaptcha_enabled: bool = False


settings = Settings()
