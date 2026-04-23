"""POST opzionale su ALERTS_WEBHOOK_URL (stesso giro notifica / Telegram)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.models import FixtureMarket, MultiBet

logger = logging.getLogger("telegram-alert-backend")


def _ev_pct(ev: float) -> float:
    return round((ev - 1) * 100, 1)


async def post_value_alert_webhook(
    base_url: str,
    kind: str,
    alert_key: str,
    ev: float,
    extra: dict[str, Any] | None = None,
) -> None:
    url = (base_url or "").strip()
    if not url:
        return
    body: dict[str, Any] = {
        "event": "value_alert",
        "kind": kind,
        "alertKey": alert_key,
        "ev": ev,
        "edgePercent": _ev_pct(ev),
    }
    if extra:
        body.update(extra)
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.post(url, json=body, headers={"Content-Type": "application/json"})
            response.raise_for_status()
    except Exception as e:
        logger.warning("ALERTS_WEBHOOK_URL fallita: %s", e)


async def post_from_single(url: str, market: FixtureMarket) -> None:
    await post_value_alert_webhook(
        url,
        "single",
        market.alert_key,
        market.edge,
        {"fixtureId": market.fixture_id, "league": market.league},
    )


async def post_from_multibet(url: str, multibet: MultiBet) -> None:
    await post_value_alert_webhook(
        url,
        "multibet",
        multibet.alert_key,
        multibet.total_ev,
        {"modus": multibet.modus, "events": len(multibet.events)},
    )
