from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class BookmakerOdd:
    bookmaker: str
    odd: float
    affiliate_url: str | None = None


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
    comparator: tuple[BookmakerOdd, ...] = field(default_factory=tuple)
    source: str = "sportmonks_predictions_odds"

    @property
    def title(self) -> str:
        return f"{self.home} - {self.away}"

    @property
    def alert_key(self) -> str:
        return (
            f"single:{self.fixture_id}:{self.market}:{self.selection}:"
            f"{self.best_bookmaker}:{self.best_odd}"
        )


@dataclass(frozen=True)
class MultiBet:
    events: tuple[FixtureMarket, ...]
    total_odd: float
    statistical_probability: float
    total_ev: float
    confidence_score: int

    @property
    def data_edge_percent(self) -> float:
        return round((self.total_ev - 1) * 100, 1)

    @property
    def alert_key(self) -> str:
        return "multi:" + "|".join(event.alert_key for event in self.events)
