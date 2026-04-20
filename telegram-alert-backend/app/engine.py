from __future__ import annotations

import itertools
import json
import math
import re
from datetime import datetime
from typing import Any

from app.models import BookmakerOdd, FixtureMarket, MultiBet


OUTCOME_ALIASES = {
    "1": ("1", "home", "home_win", "local", "casa"),
    "X": ("x", "draw", "tie", "pareggio"),
    "2": ("2", "away", "away_win", "ospite", "trasferta"),
    "Over 2.5": ("over_2_5", "over25", "over 2.5", "over 2,5"),
    "Under 2.5": ("under_2_5", "under25", "under 2.5", "under 2,5"),
    "GG": ("btts_yes", "both_teams_to_score_yes", "goal", "yes", "gg"),
    "NG": ("btts_no", "both_teams_to_score_no", "no_goal", "no", "ng"),
}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _safe_float(value: Any, default: float = math.nan) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.replace(",", ".").replace("%", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return default
    return default


def _norm(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(value or "").lower()).strip("_")


def _parse_kickoff(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _participant_names(fixture: dict[str, Any]) -> tuple[str, str]:
    participants = _as_list(fixture.get("participants"))
    home = None
    away = None

    for participant in participants:
        location = _norm(
            participant.get("location")
            or participant.get("meta", {}).get("location")
            or participant.get("meta", {}).get("position")
        )
        if location == "home":
            home = participant
        elif location == "away":
            away = participant

    home = home or (participants[0] if participants else {})
    away = away or (participants[1] if len(participants) > 1 else {})
    return str(home.get("name") or "Home"), str(away.get("name") or "Away")


def _probability_from_value(value: Any) -> float:
    parsed = _safe_float(value)
    if not math.isfinite(parsed) or parsed <= 0:
        return math.nan
    return parsed / 100 if parsed > 1 else parsed


def _extract_nested_probability(entry: dict[str, Any], aliases: tuple[str, ...]) -> float:
    candidate_keys = [
        "probability",
        "percentage",
        "value",
        "prediction",
        "yes",
        "no",
        "home",
        "draw",
        "away",
    ]

    for key in candidate_keys:
        if _norm(key) in aliases and key in entry:
            prob = _probability_from_value(entry.get(key))
            if math.isfinite(prob):
                return prob

    values = entry.get("values")
    if isinstance(values, dict):
        for key, value in values.items():
            if _norm(key) in aliases:
                prob = _probability_from_value(value)
                if math.isfinite(prob):
                    return prob
            if isinstance(value, dict):
                prob = _extract_nested_probability(value, aliases)
                if math.isfinite(prob):
                    return prob

    if isinstance(values, list):
        for item in values:
            if isinstance(item, dict):
                label = _norm(item.get("name") or item.get("label") or item.get("type") or item.get("outcome"))
                if label in aliases:
                    prob = _probability_from_value(
                        item.get("probability") or item.get("percentage") or item.get("value")
                    )
                    if math.isfinite(prob):
                        return prob

    return math.nan


def _extract_probabilities(fixture: dict[str, Any]) -> dict[str, float]:
    probabilities: dict[str, float] = {}

    for entry in _as_list(fixture.get("predictions")):
        if not isinstance(entry, dict):
            continue
        label = _norm(
            entry.get("type", {}).get("name") if isinstance(entry.get("type"), dict) else entry.get("type")
        )
        label = "_".join(
            part
            for part in [
                label,
                _norm(entry.get("name")),
                _norm(entry.get("market")),
                _norm(entry.get("prediction")),
            ]
            if part
        )

        for selection, aliases in OUTCOME_ALIASES.items():
            if selection in probabilities:
                continue
            if any(alias in label for alias in aliases):
                prob = _probability_from_value(
                    entry.get("probability") or entry.get("percentage") or entry.get("value")
                )
                if math.isfinite(prob):
                    probabilities[selection] = prob
                    continue

            prob = _extract_nested_probability(entry, aliases)
            if math.isfinite(prob):
                probabilities[selection] = prob

    return probabilities


def _market_matches(selection: str, odd_entry: dict[str, Any]) -> bool:
    aliases = OUTCOME_ALIASES[selection]
    text = " ".join(
        _norm(part)
        for part in [
            odd_entry.get("market"),
            odd_entry.get("market_name"),
            odd_entry.get("market_description"),
            odd_entry.get("label"),
            odd_entry.get("name"),
            odd_entry.get("total"),
            odd_entry.get("handicap"),
        ]
    )

    if selection in {"1", "X", "2"}:
        return ("fulltime_result" in text or "1x2" in text or "match_winner" in text) and any(
            alias == text or alias in text.split("_") for alias in aliases
        )
    if selection in {"Over 2.5", "Under 2.5"}:
        direction = "over" if selection.startswith("Over") else "under"
        return direction in text and ("2_5" in text or "25" in text)
    if selection in {"GG", "NG"}:
        expected = "yes" if selection == "GG" else "no"
        return (
            "both_teams_to_score" in text
            or "btts" in text
            or "goal_no_goal" in text
        ) and (expected in text or selection.lower() in text)
    return False


def _bookmaker_name(odd_entry: dict[str, Any]) -> str:
    bookmaker = odd_entry.get("bookmaker")
    if isinstance(bookmaker, dict):
        return str(bookmaker.get("name") or bookmaker.get("title") or "Bookmaker")
    return str(odd_entry.get("bookmaker_name") or odd_entry.get("bookmaker") or "Bookmaker")


def _extract_bookmaker_odds(
    fixture: dict[str, Any],
    selection: str,
    affiliate_links: dict[str, str],
) -> list[BookmakerOdd]:
    odds: list[BookmakerOdd] = []
    for entry in _as_list(fixture.get("odds")):
        if not isinstance(entry, dict) or not _market_matches(selection, entry):
            continue
        odd = _safe_float(entry.get("value") or entry.get("odd") or entry.get("price") or entry.get("decimal"))
        if not math.isfinite(odd) or odd <= 1:
            continue
        bookmaker = _bookmaker_name(entry)
        odds.append(BookmakerOdd(bookmaker=bookmaker, odd=odd, affiliate_url=affiliate_links.get(bookmaker)))

    return sorted(odds, key=lambda item: item.odd, reverse=True)


def load_affiliate_links(raw_json: str) -> dict[str, str]:
    try:
        data = json.loads(raw_json or "{}")
    except json.JSONDecodeError:
        return {}
    if not isinstance(data, dict):
        return {}
    return {str(key): str(value) for key, value in data.items() if value}


def build_fixture_markets(
    fixture: dict[str, Any],
    candidate_edge_threshold: float,
    affiliate_links: dict[str, str],
) -> list[FixtureMarket]:
    fixture_id = str(fixture.get("id") or "")
    home, away = _participant_names(fixture)
    league = str((fixture.get("league") or {}).get("name") or "Competizione")
    kickoff = _parse_kickoff(fixture.get("starting_at") or fixture.get("startingAt"))
    probabilities = _extract_probabilities(fixture)
    markets: list[FixtureMarket] = []

    for selection, probability in probabilities.items():
        if not math.isfinite(probability) or probability <= 0 or probability >= 1:
            continue

        odds = _extract_bookmaker_odds(fixture, selection, affiliate_links)
        if not odds:
            continue

        best = odds[0]
        model_odd = round(1 / probability, 2)
        edge = round(probability * best.odd, 3)
        if edge < candidate_edge_threshold:
            continue

        value_percent = round(((best.odd - model_odd) / model_odd) * 100, 1)
        market_name = "1X2" if selection in {"1", "X", "2"} else "U/O 2.5" if "2.5" in selection else "GG/NG"
        comparator = tuple(odds[:4])

        markets.append(
            FixtureMarket(
                fixture_id=fixture_id,
                home=home,
                away=away,
                league=league,
                kickoff=kickoff,
                market=market_name,
                selection=selection,
                model_probability=round(probability, 4),
                model_odd=model_odd,
                best_bookmaker=best.bookmaker,
                best_odd=best.odd,
                value_percent=value_percent,
                edge=edge,
                comparator=comparator,
            )
        )

    return sorted(markets, key=lambda item: item.edge, reverse=True)


def build_multibets(markets: list[FixtureMarket], min_events: int, max_events: int) -> list[MultiBet]:
    by_fixture: dict[str, FixtureMarket] = {}
    for market in markets:
        current = by_fixture.get(market.fixture_id)
        if current is None or market.edge > current.edge:
            by_fixture[market.fixture_id] = market

    unique_markets = sorted(by_fixture.values(), key=lambda item: item.edge, reverse=True)[:12]
    multibets: list[MultiBet] = []

    for size in range(min_events, max_events + 1):
        for combo in itertools.combinations(unique_markets, size):
            total_odd = math.prod(item.best_odd for item in combo)
            probability = math.prod(item.model_probability for item in combo)
            total_ev = math.prod(item.edge for item in combo)
            confidence_score = max(1, min(100, round(55 + (total_ev - 1) * 100)))
            multibets.append(
                MultiBet(
                    events=tuple(combo),
                    total_odd=round(total_odd, 2),
                    statistical_probability=round(probability, 4),
                    total_ev=round(total_ev, 3),
                    confidence_score=confidence_score,
                )
            )

    return sorted(multibets, key=lambda item: item.total_ev, reverse=True)
