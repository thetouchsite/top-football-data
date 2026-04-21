from __future__ import annotations

from typing import Any

import httpx


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _safe_probability(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        parsed = float(value)
    elif isinstance(value, str):
        try:
            parsed = float(value.replace("%", "").replace(",", ".").strip())
        except ValueError:
            return None
    else:
        return None

    if parsed > 1:
        parsed = parsed / 100
    if parsed <= 0 or parsed >= 1:
        return None
    return parsed


def _safe_odd(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        parsed = float(value)
    elif isinstance(value, str):
        try:
            parsed = float(value.replace(",", ".").strip())
        except ValueError:
            return None
    else:
        return None
    return parsed if parsed > 1 else None


class SiteFeedClient:
    def __init__(self, app_base_url: str):
        self.app_base_url = app_base_url.rstrip("/")

    async def fetch_schedule_matches(self, days: int, hydrate_details: bool = True) -> list[dict[str, Any]]:
        if not self.app_base_url:
            raise RuntimeError("APP_BASE_URL non configurato per leggere il feed del sito.")

        url = f"{self.app_base_url}/api/football/schedules/window"
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, params={"days": days})
            response.raise_for_status()
            payload = response.json()

            matches = _as_list(payload.get("matches"))
            if not hydrate_details:
                return matches

            hydrated_matches = []
            for match in matches:
                match_id = str(match.get("id") or match.get("sportEventId") or "").strip()
                if not match_id:
                    hydrated_matches.append(match)
                    continue

                try:
                    detail_response = await client.get(
                        f"{self.app_base_url}/api/football/fixtures/{match_id}"
                    )
                    detail_response.raise_for_status()
                    detail_payload = detail_response.json()
                    detail = detail_payload.get("fixture")
                    hydrated_matches.append(detail if isinstance(detail, dict) else match)
                except httpx.HTTPError:
                    hydrated_matches.append(match)

        return hydrated_matches


def _derived_goal_market_probabilities(match: dict[str, Any]) -> dict[str, float]:
    xg = match.get("xg") or {}
    home_xg = _safe_float(xg.get("home"))
    away_xg = _safe_float(xg.get("away"))
    if home_xg is None or away_xg is None:
        return {}

    total_xg = home_xg + away_xg
    over25 = min(0.82, max(0.38, (18 + total_xg * 20) / 100))
    goal = min(0.84, max(0.35, (22 + min(home_xg, away_xg) * 22 + total_xg * 8) / 100))
    return {
        "over25": over25,
        "under25": 1 - over25,
        "goal": goal,
        "noGoal": 1 - goal,
    }


def _safe_float(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", ".").strip())
        except ValueError:
            return None
    return None


def build_high_probability_picks(
    matches: list[dict[str, Any]],
    min_probability: float,
    max_picks: int,
) -> list[dict[str, Any]]:
    picks: list[dict[str, Any]] = []

    for match in matches:
        value_pick = _build_value_bet_pick(match, min_probability)
        if value_pick:
            picks.append(value_pick)
            continue

        base = {
            "matchId": str(match.get("id") or match.get("sportEventId") or ""),
            "home": match.get("home") or "Home",
            "away": match.get("away") or "Away",
            "league": match.get("league") or "Competizione",
            "date": match.get("date") or "",
            "time": match.get("time") or "",
            "confidence": match.get("confidence"),
            "source": match.get("valueBetSource") or match.get("prediction_provider") or "feed sito",
            "isValueBet": False,
            "valueEdge": None,
        }

        prob = match.get("prob") or {}
        odds = match.get("odds") or {}
        candidates = [
            ("1X2", "1", prob.get("home"), odds.get("home")),
            ("1X2", "X", prob.get("draw"), odds.get("draw")),
            ("1X2", "2", prob.get("away"), odds.get("away")),
        ]

        ou_prob = match.get("ouProb") or {}
        ou_odds = match.get("ou") or {}
        candidates.extend(
            [
                ("U/O 2.5", "Over 2.5", ou_prob.get("over25"), ou_odds.get("over25")),
                ("U/O 2.5", "Under 2.5", ou_prob.get("under25"), ou_odds.get("under25")),
            ]
        )

        gg_prob = match.get("ggProb") or {}
        gg_odds = match.get("gg") or {}
        candidates.extend(
            [
                ("GG/NG", "Goal", gg_prob.get("goal"), gg_odds.get("goal")),
                ("GG/NG", "No Goal", gg_prob.get("noGoal"), gg_odds.get("noGoal")),
            ]
        )

        xg_prob = _derived_goal_market_probabilities(match)
        candidates.extend(
            [
                ("U/O 2.5 modello xG", "Over 2.5", xg_prob.get("over25"), ou_odds.get("over25")),
                ("U/O 2.5 modello xG", "Under 2.5", xg_prob.get("under25"), ou_odds.get("under25")),
                ("GG/NG modello xG", "Goal", xg_prob.get("goal"), gg_odds.get("goal")),
                ("GG/NG modello xG", "No Goal", xg_prob.get("noGoal"), gg_odds.get("noGoal")),
            ]
        )

        for market, selection, probability_value, odd_value in candidates:
            probability = _safe_probability(probability_value)
            if probability is None or probability < min_probability:
                continue

            odd = _safe_odd(odd_value)
            picks.append(
                {
                    **base,
                    "market": market,
                    "selection": selection,
                    "probability": probability,
                    "modelOdd": round(1 / probability, 2),
                    "displayOdd": odd,
                }
            )

    return sorted(
        picks,
        key=lambda item: (
            1 if item.get("isValueBet") else 0,
            item.get("valueEdge") or 0,
            item["probability"],
            item.get("confidence") or 0,
        ),
        reverse=True,
    )[:max_picks]


def _build_value_bet_pick(match: dict[str, Any], min_probability: float) -> dict[str, Any] | None:
    value_bet = match.get("valueBet") or {}
    selection = str(value_bet.get("type") or "").strip()
    market = str(value_bet.get("market") or "").strip()
    if not selection:
        return None

    probability = _probability_for_selection(match, selection, prefer_xg=True)
    if probability is None or probability < min_probability:
        return None

    display_odd = _odd_for_selection(match, selection)
    return {
        "matchId": str(match.get("id") or match.get("sportEventId") or ""),
        "home": match.get("home") or "Home",
        "away": match.get("away") or "Away",
        "league": match.get("league") or "Competizione",
        "date": match.get("date") or "",
        "time": match.get("time") or "",
        "confidence": match.get("confidence"),
        "source": match.get("valueBetSource") or match.get("prediction_provider") or "feed sito",
        "market": market or _market_for_selection(selection),
        "selection": selection,
        "probability": probability,
        "modelOdd": round(1 / probability, 2),
        "displayOdd": display_odd,
        "isValueBet": True,
        "valueEdge": _safe_float(value_bet.get("edge")),
    }


def _probability_for_selection(
    match: dict[str, Any],
    selection: str,
    prefer_xg: bool = False,
) -> float | None:
    normalized = selection.lower().replace(",", ".")

    if normalized in {"1", "x", "2"}:
        prob = match.get("prob") or {}
        key = {"1": "home", "x": "draw", "2": "away"}[normalized]
        return _safe_probability(prob.get(key))

    if prefer_xg:
        xg_prob = _derived_goal_market_probabilities(match)
        xg_key = {
            "over 2.5": "over25",
            "under 2.5": "under25",
            "goal": "goal",
            "gg": "goal",
            "no goal": "noGoal",
            "ng": "noGoal",
        }.get(normalized)
        if xg_key and xg_prob.get(xg_key) is not None:
            return xg_prob[xg_key]

    if normalized in {"over 2.5", "under 2.5"}:
        prob = match.get("ouProb") or {}
        key = "over25" if normalized.startswith("over") else "under25"
        return _safe_probability(prob.get(key))

    if normalized in {"goal", "gg", "no goal", "ng"}:
        prob = match.get("ggProb") or {}
        key = "goal" if normalized in {"goal", "gg"} else "noGoal"
        return _safe_probability(prob.get(key))

    return None


def _odd_for_selection(match: dict[str, Any], selection: str) -> float | None:
    normalized = selection.lower().replace(",", ".")
    if normalized in {"1", "x", "2"}:
        odds = match.get("odds") or {}
        key = {"1": "home", "x": "draw", "2": "away"}[normalized]
        return _safe_odd(odds.get(key))
    if normalized in {"over 2.5", "under 2.5"}:
        odds = match.get("ou") or {}
        key = "over25" if normalized.startswith("over") else "under25"
        return _safe_odd(odds.get(key))
    if normalized in {"goal", "gg", "no goal", "ng"}:
        odds = match.get("gg") or {}
        key = "goal" if normalized in {"goal", "gg"} else "noGoal"
        return _safe_odd(odds.get(key))
    return None


def _market_for_selection(selection: str) -> str:
    normalized = selection.lower()
    if normalized in {"1", "x", "2"}:
        return "1X2"
    if "over" in normalized or "under" in normalized:
        return "U/O 2.5"
    return "GG/NG"


def format_demo_picks_message(picks: list[dict[str, Any]], min_probability: float) -> str:
    threshold = round(min_probability * 100)
    if not picks:
        return (
            f"Demo pronostici Top Football Data\n\n"
            f"Nessun pronostico sopra {threshold}% nel feed attuale del sito."
        )

    lines = [
        "Demo pronostici Top Football Data",
        f"Filtro: probabilita modello >= {threshold}%",
        "Fonte: feed gia visibile nel sito e modello xG del dettaglio match.",
        "",
    ]

    for index, pick in enumerate(picks, start=1):
        odd_label = f" @ {pick['displayOdd']}" if pick.get("displayOdd") else ""
        value_label = (
            f" VALUE +{round(pick['valueEdge'], 1)}%" if pick.get("isValueBet") and pick.get("valueEdge") is not None else ""
        )
        lines.extend(
            [
                f"{index}. {pick['home']} - {pick['away']}",
                f"   {pick['league']} | {pick['date']} {pick['time']}".strip(),
                f"   Pronostico: {pick['market']} / {pick['selection']}{odd_label}{value_label}",
                f"   Probabilita modello: {round(pick['probability'] * 100)}%",
                f"   Quota modello: {pick['modelOdd']}",
                "",
            ]
        )

    return "\n".join(lines).strip()
