from __future__ import annotations

from datetime import timezone

import httpx

from app.models import FixtureMarket, MultiBet


def _pct(value: float) -> str:
    return f"{round(value * 100, 1)}%"


def _kickoff_label(market: FixtureMarket) -> str:
    if not market.kickoff:
        return "Orario non disponibile"
    return market.kickoff.astimezone(timezone.utc).strftime("%d/%m %H:%M UTC")


def format_single_alert(market: FixtureMarket, cta_label: str) -> str:
    lines = [
        f"Alert Value Bet +{round((market.edge - 1) * 100, 1)}%",
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
        lines.extend(["", "Comparatore quote:"])
        for odd in market.comparator:
            suffix = f" - {cta_label}: {odd.affiliate_url}" if odd.affiliate_url else ""
            lines.append(f"- {odd.bookmaker}: {odd.odd}{suffix}")

    return "\n".join(lines)


def format_multibet_alert(multibet: MultiBet, cta_label: str) -> str:
    lines = [
        f"Alert Value Combo +{multibet.data_edge_percent}%",
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

    top_links = [
        odd.affiliate_url
        for event in multibet.events
        for odd in event.comparator[:1]
        if odd.affiliate_url
    ]
    if top_links:
        lines.extend(["", f"{cta_label}:"])
        lines.extend(f"- {link}" for link in top_links)

    return "\n".join(lines)


def format_performance_summary(summary: dict, settled_count: int) -> str:
    curve = summary.get("equityCurve") or []
    last_points = curve[-5:]
    lines = [
        "Performance Storiche aggiornate",
        "",
        f"Alert chiusi in questo ciclo: {settled_count}",
        f"Totale alert chiusi: {summary.get('settled', 0)}",
        f"Bilancio: {summary.get('profitUnits', 0)} unita",
        f"ROI reale: {summary.get('roiPercent', 0)}%",
        f"Hit rate: {summary.get('hitRatePercent', 0)}%",
        f"Record: {summary.get('won', 0)} vinte / {summary.get('lost', 0)} perse / {summary.get('void', 0)} void",
    ]

    if last_points:
        lines.extend(["", "Curva ROI recente:"])
        for point in last_points:
            settled_at = point.get("settledAt")
            label = settled_at.strftime("%d/%m %H:%M") if hasattr(settled_at, "strftime") else "N/D"
            lines.append(
                f"- {label}: {point.get('profitUnits', 0)} unita, ROI {point.get('roiPercent', 0)}%"
            )

    return "\n".join(lines)


class TelegramClient:
    def __init__(self, bot_token: str, chat_id: str):
        self.bot_token = bot_token
        self.chat_id = chat_id

    @property
    def configured(self) -> bool:
        return bool(self.bot_token and self.chat_id)

    async def send_message(self, text: str) -> None:
        if not self.configured:
            raise RuntimeError("TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID non configurati.")

        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                url,
                json={
                    "chat_id": self.chat_id,
                    "text": text,
                    "disable_web_page_preview": True,
                },
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
