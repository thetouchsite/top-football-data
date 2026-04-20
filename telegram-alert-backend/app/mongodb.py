from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pymongo import ASCENDING, DESCENDING, MongoClient, UpdateOne

from app.models import FixtureMarket, MultiBet


def _now() -> datetime:
    return datetime.now(UTC)


def _bookmaker_odd_to_doc(item) -> dict[str, Any]:
    return {
        "bookmaker": item.bookmaker,
        "odd": item.odd,
        "affiliateUrl": item.affiliate_url,
    }


def _market_to_doc(market: FixtureMarket) -> dict[str, Any]:
    return {
        "fixtureId": market.fixture_id,
        "home": market.home,
        "away": market.away,
        "league": market.league,
        "kickoff": market.kickoff,
        "market": market.market,
        "selection": market.selection,
        "modelProbability": market.model_probability,
        "modelOdd": market.model_odd,
        "bestBookmaker": market.best_bookmaker,
        "bestOdd": market.best_odd,
        "valuePercent": market.value_percent,
        "edge": market.edge,
        "comparator": [_bookmaker_odd_to_doc(item) for item in market.comparator],
    }


def _multibet_to_doc(multibet: MultiBet) -> dict[str, Any]:
    return {
        "events": [_market_to_doc(event) for event in multibet.events],
        "fixtureIds": [event.fixture_id for event in multibet.events],
        "totalOdd": multibet.total_odd,
        "statisticalProbability": multibet.statistical_probability,
        "totalEv": multibet.total_ev,
        "dataEdgePercent": multibet.data_edge_percent,
        "confidenceScore": multibet.confidence_score,
    }


class MongoAlertRepository:
    def __init__(self, uri: str, database_name: str):
        self.uri = uri
        self.database_name = database_name
        self.enabled = bool(uri)
        self.error: str | None = None
        self.client = None
        self.db = None
        self.alerts = None
        self.performance = None
        self._indexes_ready = False

    def _connect(self) -> bool:
        if not self.uri:
            self.enabled = False
            return False

        if self.client is not None:
            return True

        try:
            self.client = MongoClient(
                self.uri,
                connect=False,
                serverSelectionTimeoutMS=5000,
            )
            self.db = self.client[self.database_name]
            self.alerts = self.db["betAlerts"]
            self.performance = self.db["betPerformance"]
            self.enabled = True
            self.error = None
            return True
        except Exception as error:
            self.enabled = False
            self.error = str(error)
            self.client = None
            self.db = None
            self.alerts = None
            self.performance = None
            return False

    def ensure_indexes(self) -> None:
        if self._indexes_ready:
            return

        if not self._connect():
            return

        self.alerts.create_index([("alertKey", ASCENDING)], unique=True)
        self.alerts.create_index([("status", ASCENDING), ("createdAt", DESCENDING)])
        self.alerts.create_index([("fixtureIds", ASCENDING), ("status", ASCENDING)])
        self.performance.create_index([("alertKey", ASCENDING)], unique=True)
        self.performance.create_index([("settledAt", DESCENDING)])
        self._indexes_ready = True

    def save_single_alert(self, market: FixtureMarket, telegram_sent: bool) -> None:
        self.ensure_indexes()
        if not self.enabled:
            return

        now = _now()
        doc = {
            "alertKey": market.alert_key,
            "type": "single",
            "status": "pending",
            "telegramSent": telegram_sent,
            "fixtureIds": [market.fixture_id],
            "createdAt": now,
            "updatedAt": now,
            "single": _market_to_doc(market),
            "stakeUnits": 1,
        }
        self.alerts.update_one(
            {"alertKey": market.alert_key},
            {
                "$setOnInsert": doc,
                "$set": {
                    "updatedAt": now,
                    "telegramSent": telegram_sent,
                    "single": doc["single"],
                },
            },
            upsert=True,
        )

    def save_multibet_alert(self, multibet: MultiBet, telegram_sent: bool) -> None:
        self.ensure_indexes()
        if not self.enabled:
            return

        now = _now()
        body = _multibet_to_doc(multibet)
        doc = {
            "alertKey": multibet.alert_key,
            "type": "multibet",
            "status": "pending",
            "telegramSent": telegram_sent,
            "fixtureIds": body["fixtureIds"],
            "createdAt": now,
            "updatedAt": now,
            "multibet": body,
            "stakeUnits": 1,
        }
        self.alerts.update_one(
            {"alertKey": multibet.alert_key},
            {
                "$setOnInsert": doc,
                "$set": {
                    "updatedAt": now,
                    "telegramSent": telegram_sent,
                    "multibet": body,
                },
            },
            upsert=True,
        )

    def get_open_alerts(self, limit: int = 200) -> list[dict[str, Any]]:
        self.ensure_indexes()
        if not self.enabled:
            return []

        return list(
            self.alerts.find({"status": "pending"}).sort("createdAt", ASCENDING).limit(limit)
        )

    def settle_alert(self, alert: dict[str, Any], status: str, legs: list[dict[str, Any]]) -> None:
        if status not in {"won", "lost", "void"}:
            return

        self.ensure_indexes()
        if not self.enabled:
            return

        now = _now()
        stake = float(alert.get("stakeUnits") or 1)
        decimal_odd = _alert_decimal_odd(alert)
        profit = round((decimal_odd - 1) * stake, 2) if status == "won" else -stake
        if status == "void":
            profit = 0

        result_doc = {
            "alertKey": alert["alertKey"],
            "type": alert.get("type"),
            "status": status,
            "stakeUnits": stake,
            "decimalOdd": decimal_odd,
            "profitUnits": profit,
            "roiPercent": round((profit / stake) * 100, 2) if stake else 0,
            "legs": legs,
            "settledAt": now,
            "createdAt": alert.get("createdAt") or now,
        }

        self.alerts.update_one(
            {"alertKey": alert["alertKey"]},
            {
                "$set": {
                    "status": status,
                    "result": result_doc,
                    "updatedAt": now,
                    "settledAt": now,
                }
            },
        )
        self.performance.update_one(
            {"alertKey": alert["alertKey"]},
            {"$set": result_doc},
            upsert=True,
        )

    def bulk_settle(self, settled: list[tuple[dict[str, Any], str, list[dict[str, Any]]]]) -> int:
        if not settled:
            return 0

        self.ensure_indexes()
        if not self.enabled:
            return 0

        for alert, status, legs in settled:
            self.settle_alert(alert, status, legs)
        return len(settled)


def _alert_decimal_odd(alert: dict[str, Any]) -> float:
    if alert.get("type") == "single":
        return float(alert.get("single", {}).get("bestOdd") or 1)
    return float(alert.get("multibet", {}).get("totalOdd") or 1)
