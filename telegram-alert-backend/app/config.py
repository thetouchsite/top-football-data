from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    sportmonks_api_token: str = Field(default="", alias="SPORTMONKS_API_TOKEN")
    sportmonks_api_key: str = Field(default="", alias="SPORTMONKS_API_KEY")
    sportmonks_base_url: str = Field(
        default="https://api.sportmonks.com/v3/football",
        alias="SPORTMONKS_BASE_URL",
    )
    sportmonks_schedule_days: int = Field(default=4, alias="SPORTMONKS_SCHEDULE_DAYS")
    sportmonks_timezone: str = Field(default="Europe/Rome", alias="SPORTMONKS_TIMEZONE")
    sportmonks_league_ids: str = Field(default="", alias="SPORTMONKS_SCHEDULE_LEAGUE_IDS")
    sportmonks_fetch_direct_value_bets: bool = Field(default=True, alias="SPORTMONKS_FETCH_DIRECT_VALUE_BETS")
    sportmonks_fetch_direct_odds: bool = Field(default=True, alias="SPORTMONKS_FETCH_DIRECT_ODDS")
    sportmonks_direct_fixture_limit: int = Field(default=80, alias="SPORTMONKS_DIRECT_FIXTURE_LIMIT")

    mongodb_uri: str = Field(default="", alias="MONGODB_URI")
    mongodb_db: str = Field(default="top-football-pulse", alias="MONGODB_DB")

    app_base_url: str = Field(default="", alias="APP_BASE_URL")

    telegram_bot_token: str = Field(default="", alias="TELEGRAM_BOT_TOKEN")
    telegram_chat_id: str = Field(default="", alias="TELEGRAM_CHAT_ID")

    poll_interval_seconds: int = Field(default=300, alias="POLL_INTERVAL_SECONDS")
    candidate_edge_threshold: float = Field(default=1.05, alias="CANDIDATE_EDGE_THRESHOLD")
    notification_ev_threshold: float = Field(default=1.25, alias="NOTIFICATION_EV_THRESHOLD")
    multibet_min_events: int = Field(default=3, alias="MULTIBET_MIN_EVENTS")
    multibet_max_events: int = Field(default=4, alias="MULTIBET_MAX_EVENTS")
    max_alerts_per_run: int = Field(default=8, alias="MAX_ALERTS_PER_RUN")
    demo_min_probability: float = Field(default=0.8, alias="DEMO_MIN_PROBABILITY")
    demo_max_picks: int = Field(default=5, alias="DEMO_MAX_PICKS")
    demo_schedule_days: int = Field(default=14, alias="DEMO_SCHEDULE_DAYS")

    storage_path: str = Field(default=".data/telegram-alerts.json", alias="STORAGE_PATH")
    bookmaker_affiliate_links_json: str = Field(default="{}", alias="BOOKMAKER_AFFILIATE_LINKS_JSON")
    cta_label: str = Field(default="Vedi quota", alias="CTA_LABEL")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("sportmonks_base_url")
    @classmethod
    def normalize_sportmonks_base_url(cls, value: str) -> str:
        cleaned = value.strip().rstrip("/")
        if cleaned.endswith("/football"):
            return cleaned
        return f"{cleaned}/football"

    @field_validator("sportmonks_schedule_days")
    @classmethod
    def clamp_schedule_days(cls, value: int) -> int:
        return max(1, min(value, 14))

    @field_validator("sportmonks_direct_fixture_limit")
    @classmethod
    def clamp_direct_fixture_limit(cls, value: int) -> int:
        return max(1, min(value, 200))

    @field_validator("poll_interval_seconds")
    @classmethod
    def clamp_poll_interval(cls, value: int) -> int:
        return max(60, value)

    @field_validator("multibet_min_events", "multibet_max_events")
    @classmethod
    def clamp_multibet_events(cls, value: int) -> int:
        return max(2, min(value, 4))

    @field_validator("app_base_url")
    @classmethod
    def normalize_app_base_url(cls, value: str) -> str:
        return value.strip().rstrip("/")

    @field_validator("demo_min_probability")
    @classmethod
    def normalize_demo_min_probability(cls, value: float) -> float:
        if value > 1:
            value = value / 100
        return max(0.5, min(value, 0.99))

    @field_validator("demo_max_picks")
    @classmethod
    def clamp_demo_max_picks(cls, value: int) -> int:
        return max(1, min(value, 20))

    @field_validator("demo_schedule_days")
    @classmethod
    def clamp_demo_schedule_days(cls, value: int) -> int:
        return max(1, min(value, 14))

    @property
    def resolved_sportmonks_token(self) -> str:
        return self.sportmonks_api_token or self.sportmonks_api_key


@lru_cache
def get_settings() -> Settings:
    return Settings()
