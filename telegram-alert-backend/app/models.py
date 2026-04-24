from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class BookmakerOdd:
    bookmaker: str
    odd: float
    affiliate_url: str | None = None


class LegProfile:
    """
    Categoria gamba lato generazione.
    - model_value: probabilita modello + quote (convergenza)
    - book_discrepancy: value bet ufficiale API (fair odd vs book)
    """

    MODEL_VALUE = "model_value"
    BOOK_DISCREPANCY = "book_discrepancy"


@dataclass(frozen=True)
class FixtureMarket:
    fixture_id: str
    home: str
    away: str
    league: str
    kickoff: datetime | None
    market: str
    selection: str
    model_probability: float
    model_odd: float
    best_bookmaker: str
    best_odd: float
    value_percent: float
    edge: float
    league_media: dict[str, Any] | None = None
    home_media: dict[str, Any] | None = None
    away_media: dict[str, Any] | None = None
    comparator: tuple[BookmakerOdd, ...] = field(default_factory=tuple)
    source: str = "sportmonks_predictions_odds"
    leg_profile: str = LegProfile.MODEL_VALUE

    @property
    def title(self) -> str:
        return f"{self.home} - {self.away}"

    @property
    def alert_key(self) -> str:
        return (
            f"single:{self.fixture_id}:{self.market}:{self.selection}:"
            f"{self.best_bookmaker}:{self.best_odd}"
        )


class MultibetModus:
    """Deve allineare UI Next.js e `multibet.modus` in Mongo."""

    ALGORITHMIC = "algorithmic"
    SAFE = "safe"
    VALUE = "value"


@dataclass(frozen=True)
class MultiBet:
    events: tuple[FixtureMarket, ...]
    total_odd: float
    statistical_probability: float
    total_ev: float
    confidence_score: int
    modus: str = MultibetModus.ALGORITHMIC

    @property
    def data_edge_percent(self) -> float:
        return round((self.total_ev - 1) * 100, 1)

    @property
    def alert_key(self) -> str:
        return f"multi:{self.modus}:" + "|".join(
            f"{e.fixture_id}:{e.market}:{e.selection}" for e in self.events
        )
