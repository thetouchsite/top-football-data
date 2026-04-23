from __future__ import annotations

from datetime import timezone
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import httpx

from app.models import FixtureMarket, MultiBet


def _pct(value: float) -> str:
    return f"{round(value * 100, 1)}%"


def _edge_to_plus_pct(ev: float) -> str:
    return f"{round((ev - 1) * 100, 1)}"


def _kickoff_label(market: FixtureMarket) -> str:
    if not market.kickoff:
        return "Orario non disponibile"
    return market.kickoff.astimezone(timezone.utc).strftime("%d/%m %H:%M UTC")


def _tracked_url(url: str, *, campaign: str, content: str | None = None) -> str:
    raw = (url or "").strip()
    if not raw:
        return ""

    parsed = urlparse(raw)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query.setdefault("utm_source", "telegram")
    query.setdefault("utm_medium", "bot")
    query.setdefault("utm_campaign", campaign)
    if content:
        query.setdefault("utm_content", content)
    return urlunparse(parsed._replace(query=urlencode(query)))


def _site_url(app_base_url: str, path: str, *, campaign: str, content: str | None = None) -> str:
    base = (app_base_url or "").strip().rstrip("/")
    if not base:
        return ""
    route = path if path.startswith("/") else f"/{path}"
    return _tracked_url(f"{base}{route}", campaign=campaign, content=content)


def _tracked_affiliate_url(
    raw_url: str,
    *,
    campaign: str,
    content: str | None = None,
) -> str:
    return _tracked_url(raw_url, campaign=campaign, content=content)


def build_single_alert_buttons(
    market: FixtureMarket,
    app_base_url: str = "",
) -> list[list[dict[str, str]]]:
    analysis_url = _site_url(
        app_base_url,
        f"/match/{market.fixture_id}",
        campaign="value_bet",
        content=f"{market.fixture_id}_{market.market}_{market.selection}",
    )
    compare_url = analysis_url
    bookmaker_url = ""
    if market.comparator:
        top = market.comparator[0]
        bookmaker_url = _tracked_affiliate_url(
            top.affiliate_url or "",
            campaign="value_bet",
            content=f"{market.fixture_id}_{market.market}_{market.selection}_{top.bookmaker}",
        )

    rows: list[list[dict[str, str]]] = []
    first_row: list[dict[str, str]] = []
    if analysis_url:
        first_row.append({"text": "Apri analisi", "url": analysis_url})
    if compare_url:
        first_row.append({"text": "Confronta quote", "url": compare_url})
    if first_row:
        rows.append(first_row[:2])
    if bookmaker_url:
        rows.append([{"text": "Vedi quota", "url": bookmaker_url}])
    return rows


def build_multibet_alert_buttons(
    multibet: MultiBet,
    app_base_url: str = "",
) -> list[list[dict[str, str]]]:
    combo_path = f"/multi-bet?ref={multibet.alert_key}" if multibet.alert_key else "/multi-bet"
    combo_url = _site_url(
        app_base_url,
        combo_path,
        campaign="multibet",
        content=multibet.modus,
    )
    compare_url = combo_url
    bookmaker_url = ""
    first = multibet.events[0] if multibet.events else None
    if first and first.comparator:
        top = first.comparator[0]
        bookmaker_url = _tracked_affiliate_url(
            top.affiliate_url or "",
            campaign="multibet",
            content=f"{multibet.modus}_{first.fixture_id}_{first.selection}_{top.bookmaker}",
        )

    rows: list[list[dict[str, str]]] = []
    first_row: list[dict[str, str]] = []
    if combo_url:
        first_row.append({"text": "Vedi combo", "url": combo_url})
    if compare_url:
        first_row.append({"text": "Confronta quote", "url": compare_url})
    if first_row:
        rows.append(first_row[:2])
    if bookmaker_url:
        rows.append([{"text": "Vedi quota", "url": bookmaker_url}])
    return rows


def build_settlement_buttons(alert: dict, app_base_url: str = "") -> list[list[dict[str, str]]]:
    path = "/performance-storiche"
    content = "settlement"
    if alert.get("type") == "single":
        fixture_id = str((alert.get("single") or {}).get("fixtureId") or "").strip()
        if fixture_id:
            path = f"/match/{fixture_id}"
            content = f"single_{fixture_id}"
    else:
        alert_key = alert.get("alertKey") or ""
        if alert_key:
            path = f"/multi-bet?ref={alert_key}"
            content = "multibet"

    detail_url = _site_url(app_base_url, path, campaign="settlement", content=content)
    performance_url = _site_url(
        app_base_url,
        "/performance-storiche",
        campaign="performance",
        content="summary",
    )

    row: list[dict[str, str]] = []
    if detail_url:
        row.append({"text": "Apri dettaglio", "url": detail_url})
    if performance_url:
        row.append({"text": "Performance", "url": performance_url})
    return [row] if row else []


def build_performance_buttons(app_base_url: str = "") -> list[list[dict[str, str]]]:
    performance_url = _site_url(
        app_base_url,
        "/performance-storiche",
        campaign="performance",
        content="summary",
    )
    if not performance_url:
        return []
    return [[{"text": "Apri performance", "url": performance_url}]]


def build_top_value_day_buttons(picks: list[dict], app_base_url: str = "") -> list[list[dict[str, str]]]:
    rows: list[list[dict[str, str]]] = []
    for index, pick in enumerate(picks[:3], start=1):
        fixture_id = str(pick.get("matchId") or "").strip()
        if not fixture_id:
            continue
        pick_url = _site_url(
            app_base_url,
            f"/match/{fixture_id}",
            campaign="top_value_day",
            content=f"pick_{index}",
        )
        if pick_url:
            rows.append([{"text": f"Apri pick {index}", "url": pick_url}])
    return rows


def format_single_alert(
    market: FixtureMarket,
    cta_label: str,
    app_base_url: str = "",
) -> str:
    pct = _edge_to_plus_pct(market.edge)
    lines = [
        f"🎯 Singola · Value Bet · +{pct}%",
        "",
        f"{market.title}",
        f"{market.league} - {_kickoff_label(market)}",
        f"Mercato: {market.market} / {market.selection}",
        f"Probabilita modello: {_pct(market.model_probability)}",
        f"Quota modello: {market.model_odd}",
        f"Migliore quota: {market.best_odd} ({market.best_bookmaker})",
        f"EV singolo: {market.edge}",
    ]

    if market.comparator:
        lines.extend(["", "Comparatore quote (CTA):"])
        for odd in market.comparator:
            suffix = f" - {cta_label}" if odd.affiliate_url else ""
            lines.append(f"- {odd.bookmaker}: {odd.odd}{suffix}")

    if not market.comparator:
        lines.extend(["", f"Comparatore: configura APP_BASE_URL e link book ({cta_label})."])

    return "\n".join(lines)


def _modus_label(modus: str) -> str:
    return {
        "algorithmic": "Algoritmico",
        "safe": "Safe",
        "value": "Value",
    }.get(modus, modus)


def format_multibet_alert(
    multibet: MultiBet,
    cta_label: str,
    app_base_url: str = "",
) -> str:
    pct = _edge_to_plus_pct(multibet.total_ev)
    label = _modus_label(multibet.modus)
    lines = [
        f"🔥 Multipla · {label} · +{pct}%",
        "",
        f"Eventi: {len(multibet.events)}",
        f"Quota totale: {multibet.total_odd}",
        f"Probabilita statistica: {_pct(multibet.statistical_probability)}",
        f"EV composto: {multibet.total_ev}",
        f"Confidence Score: {multibet.confidence_score}/100",
        "",
        "Selezioni:",
    ]

    for index, event in enumerate(multibet.events, start=1):
        lines.append(
            f"{index}. {event.title} - {event.market} {event.selection} @ {event.best_odd} "
            f"({event.best_bookmaker}, EV {event.edge})"
        )

    first = multibet.events[0] if multibet.events else None
    if first and first.comparator:
        lines.extend(["", "Comparatore quote - 1a gamba (CTA):"])
        for odd in first.comparator:
            suffix = f" - {cta_label}" if odd.affiliate_url else ""
            lines.append(f"- {odd.bookmaker}: {odd.odd}{suffix}")

    if not (first and first.comparator):
        lines.extend(["", f"Comparatore: configura APP_BASE_URL e link book ({cta_label})."])

    return "\n".join(lines)


def format_performance_summary(summary: dict, settled_count: int, app_base_url: str = "") -> str:
    curve = summary.get("equityCurve") or []
    last_points = curve[-5:]
    lines = [
        "📊 Performance Storiche aggiornate",
        "",
        f"Alert chiusi in questo ciclo: {settled_count}",
        f"Totale alert chiusi: {summary.get('settled', 0)}",
        f"💰 Bilancio: {summary.get('profitUnits', 0)} unita",
        f"ROI reale: {summary.get('roiPercent', 0)}%",
        f"Hit rate: {summary.get('hitRatePercent', 0)}%",
        f"🏆 Record: {summary.get('won', 0)} vinte / {summary.get('lost', 0)} perse / {summary.get('void', 0)} void",
    ]

    if last_points:
        lines.extend(["", "Curva ROI recente:"])
        for point in last_points:
            settled_at = point.get("settledAt")
            label = settled_at.strftime("%d/%m %H:%M") if hasattr(settled_at, "strftime") else "N/D"
            lines.append(f"- {label}: {point.get('profitUnits', 0)} unita, ROI {point.get('roiPercent', 0)}%")

    return "\n".join(lines)


def format_settlement_alert(alert: dict, status: str, legs: list[dict], app_base_url: str = "") -> str:
    result = _settlement_result_label(status)
    icon = _settlement_result_icon(status)
    profit_units = _settlement_profit_units(alert, status)
    alert_type = "Singola" if alert.get("type") == "single" else "Multipla"
    title = _settlement_title(alert)
    stake_units = float(alert.get("stakeUnits") or 1)
    decimal_odd = _settlement_decimal_odd(alert)

    lines = [
        f"{icon} Alert {result}",
        "",
        f"{alert_type}: {title}",
        f"Quota: {decimal_odd}",
        f"Stake: {stake_units:g}u",
        f"💰 Profitto: {_signed_units(profit_units)}",
    ]

    if legs:
        lines.extend(["", "Esito selezioni:"])
        for index, leg in enumerate(legs, start=1):
            selection = leg.get("selection") or "Selezione"
            score = _leg_score_label(leg)
            leg_status = _settlement_result_label(leg.get("status")).lower()
            lines.append(f"{index}. {selection} - {leg_status}{score}")

    return "\n".join(lines)


def _settlement_result_label(status: str | None) -> str:
    if status == "won":
        return "vinto"
    if status == "lost":
        return "perso"
    if status == "void":
        return "void"
    return "chiuso"


def _settlement_result_icon(status: str | None) -> str:
    if status == "won":
        return "🏆"
    if status == "lost":
        return "❌"
    if status == "void":
        return "↩️"
    return "📌"


def _settlement_title(alert: dict) -> str:
    if alert.get("type") == "single":
        single = alert.get("single") or {}
        home = single.get("home") or "Home"
        away = single.get("away") or "Away"
        market = single.get("market") or "Mercato"
        selection = single.get("selection") or ""
        return f"{home} - {away}, {market} {selection}".strip()

    events = (alert.get("multibet") or {}).get("events") or []
    return f"{len(events)} eventi"


def _settlement_decimal_odd(alert: dict) -> float:
    if alert.get("type") == "single":
        return float((alert.get("single") or {}).get("bestOdd") or 1)
    return float((alert.get("multibet") or {}).get("totalOdd") or 1)


def _settlement_profit_units(alert: dict, status: str) -> float:
    stake_units = float(alert.get("stakeUnits") or 1)
    if status == "won":
        return round((_settlement_decimal_odd(alert) - 1) * stake_units, 2)
    if status == "lost":
        return -stake_units
    return 0


def _signed_units(value: float) -> str:
    prefix = "+" if value > 0 else ""
    return f"{prefix}{value:g}u"


def _leg_score_label(leg: dict) -> str:
    home_score = leg.get("homeScore")
    away_score = leg.get("awayScore")
    if home_score is None or away_score is None:
        return ""
    return f" ({home_score}-{away_score})"


class TelegramClient:
    def __init__(self, bot_token: str, chat_id: str):
        self.bot_token = bot_token
        self.chat_id = chat_id

    @property
    def configured(self) -> bool:
        return bool(self.bot_token and self.chat_id)

    async def send_message(self, text: str, buttons: list[list[dict[str, str]]] | None = None) -> None:
        if not self.configured:
            raise RuntimeError("TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID non configurati.")

        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "disable_web_page_preview": True,
        }
        if buttons:
            payload["reply_markup"] = {"inline_keyboard": buttons}
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                url,
                json=payload,
            )
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as error:
                status_code = error.response.status_code
                if status_code == 404:
                    raise RuntimeError(
                        "Telegram ha rifiutato il bot token: controlla TELEGRAM_BOT_TOKEN completo da BotFather."
                    ) from None
                if status_code == 400:
                    raise RuntimeError(
                        "Telegram ha rifiutato la chat: controlla TELEGRAM_CHAT_ID e che il bot sia admin del canale."
                    ) from None
                raise RuntimeError(f"Telegram sendMessage fallito con status {status_code}.") from None
