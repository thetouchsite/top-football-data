from __future__ import annotations

from typing import Any


FINAL_STATES = {
    "ft",
    "aet",
    "pen",
    "finished",
    "full_time",
    "after_extra_time",
    "after_penalties",
}


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _norm(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_").replace("-", "_")


def is_fixture_final(fixture: dict[str, Any]) -> bool:
    state = fixture.get("state") or {}
    candidates = [
        state.get("short_name"),
        state.get("shortName"),
        state.get("name"),
        fixture.get("state_name"),
        fixture.get("status"),
    ]
    return any(_norm(candidate) in FINAL_STATES for candidate in candidates)


def extract_final_score(fixture: dict[str, Any]) -> tuple[int | None, int | None]:
    scores = _as_list(fixture.get("scores"))
    home_score = None
    away_score = None

    for entry in scores:
        if not isinstance(entry, dict):
            continue
        description = _norm(entry.get("description"))
        if description and description not in {"current", "fulltime", "full_time", "2nd_half"}:
            continue

        score_value = entry.get("score")
        if isinstance(score_value, dict):
            goals = score_value.get("goals")
            if isinstance(goals, int):
                location = _resolve_score_location(entry)
                if location == "home":
                    home_score = goals
                elif location == "away":
                    away_score = goals
            elif isinstance(score_value.get("participant"), str):
                location = _norm(score_value.get("participant"))
                goals_value = _safe_int(score_value.get("goals"))
                if location == "home":
                    home_score = goals_value
                elif location == "away":
                    away_score = goals_value

        direct_goals = _safe_int(entry.get("goals"))
        if direct_goals is not None:
            location = _resolve_score_location(entry)
            if location == "home":
                home_score = direct_goals
            elif location == "away":
                away_score = direct_goals

    if home_score is None:
        home_score = _safe_int(fixture.get("home_score") or fixture.get("homeScore"))
    if away_score is None:
        away_score = _safe_int(fixture.get("away_score") or fixture.get("awayScore"))

    return home_score, away_score


def settle_market(market: dict[str, Any], fixture: dict[str, Any]) -> dict[str, Any]:
    if not is_fixture_final(fixture):
        return {"status": "pending", "reason": "fixture_not_final"}

    home_score, away_score = extract_final_score(fixture)
    if home_score is None or away_score is None:
        return {"status": "pending", "reason": "score_not_available"}

    selection = str(market.get("selection") or "")
    total_goals = home_score + away_score
    both_scored = home_score > 0 and away_score > 0

    won = False
    if selection == "1":
        won = home_score > away_score
    elif selection == "X":
        won = home_score == away_score
    elif selection == "2":
        won = away_score > home_score
    elif selection == "Over 2.5":
        won = total_goals > 2.5
    elif selection == "Under 2.5":
        won = total_goals < 2.5
    elif selection == "GG":
        won = both_scored
    elif selection == "NG":
        won = not both_scored
    else:
        return {"status": "void", "reason": "unsupported_market"}

    return {
        "status": "won" if won else "lost",
        "homeScore": home_score,
        "awayScore": away_score,
        "selection": selection,
        "fixtureId": str(market.get("fixtureId") or ""),
    }


def settle_alert_from_fixtures(
    alert: dict[str, Any],
    fixtures_by_id: dict[str, dict[str, Any]],
) -> tuple[str, list[dict[str, Any]]] | None:
    if alert.get("type") == "single":
        market = alert.get("single") or {}
        fixture = fixtures_by_id.get(str(market.get("fixtureId") or ""))
        if not fixture:
            return None
        leg = settle_market(market, fixture)
        if leg["status"] == "pending":
            return None
        return leg["status"], [leg]

    events = (alert.get("multibet") or {}).get("events") or []
    legs: list[dict[str, Any]] = []
    for event in events:
        fixture = fixtures_by_id.get(str(event.get("fixtureId") or ""))
        if not fixture:
            return None
        leg = settle_market(event, fixture)
        if leg["status"] == "pending":
            return None
        legs.append(leg)

    if any(leg["status"] == "lost" for leg in legs):
        return "lost", legs
    if all(leg["status"] == "won" for leg in legs):
        return "won", legs
    return "void", legs


def _resolve_score_location(entry: dict[str, Any]) -> str | None:
    location = _norm(entry.get("location") or entry.get("participant"))
    if location in {"home", "away"}:
        return location

    score = entry.get("score")
    if isinstance(score, dict):
        participant = _norm(score.get("participant") or score.get("location"))
        if participant in {"home", "away"}:
            return participant

    return None


def _safe_int(value: Any) -> int | None:
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().lstrip("-").isdigit():
        return int(value)
    return None
