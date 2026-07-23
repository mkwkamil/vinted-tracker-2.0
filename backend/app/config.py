from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://vinted:vinted@db:5432/vinted_tracker"
    api_key: str = "change-me"
    enable_vinted: bool = False
    telegram_bot_token: str = ""
    telegram_chat_ids: str = ""
    offer_retention_days: int = 10
    poll_min_seconds: float = 7.0
    poll_max_seconds: float = 15.0
    session_refresh_minutes: int = 20
    vinted_base_url: str = "https://www.vinted.pl"
    cors_origins: str = "*"

    @property
    def chat_id_list(self) -> list[str]:
        return [c.strip() for c in self.telegram_chat_ids.split(",") if c.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
