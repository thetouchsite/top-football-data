from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import certifi
from pymongo import ASCENDING, DESCENDING, MongoClient

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
        "source": market.source,
        "legProfile": market.leg_profile,
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
        "modus": multibet.modus,
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
                tls=True,
                tlsCAFile=certifi.where(),
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

        try:
            self.alerts.create_index([("alertKey", ASCENDING)], unique=True)
            self.alerts.create_index([("status", ASCENDING), ("createdAt", DESCENDING)])
            self.alerts.create_index([("fixtureIds", ASCENDING), ("status", ASCENDING)])
            self.alerts.create_index(
                [("type", ASCENDING), ("status", ASCENDING), ("multibet.modus", ASCENDING)]
            )
            self.performance.create_index([("alertKey", ASCENDING)], unique=True)
            self.performance.create_index([("settledAt", DESCENDING)])
            self._indexes_ready = True
            self.enabled = True
            self.error = None
        except Exception as error:
            self._mark_unavailable(error)

    def save_single_alert(self, market: FixtureMarket, telegram_sent: bool) -> bool:
        self.ensure_indexes()
        if not self.enabled:
            return False

        now = _now()
        doc = {
            "alertKey": market.alert_key,
            "type": "single",
            "status": "pending",
            "fixtureIds": [market.fixture_id],
            "createdAt": now,
            "stakeUnits": 1,
        }
        update_fields = {
            "type": "single",
            "status": "pending",
            "fixtureIds": [market.fixture_id],
            "stakeUnits": 1,
            "updatedAt": now,
            "single": _market_to_doc(market),
        }
        if telegram_sent:
            update_fields["telegramSent"] = True

        try:
            self.alerts.update_one(
                {"alertKey": market.alert_key},
                {
                    "$setOnInsert": doc,
                    "$set": update_fields,
                },
                upsert=True,
            )
            return True
        except Exception as error:
            self._mark_unavailable(error)
            return False

    def save_multibet_alert(self, multibet: MultiBet, telegram_sent: bool) -> bool:
        self.ensure_indexes()
        if not self.enabled:
            return False

        now = _now()
        body = _multibet_to_doc(multibet)
        doc = {
            "alertKey": multibet.alert_key,
            "type": "multibet",
            "status": "pending",
            "fixtureIds": body["fixtureIds"],
            "createdAt": now,
            "stakeUnits": 1,
        }
        update_fields = {
            "type": "multibet",
            "status": "pending",
            "fixtureIds": body["fixtureIds"],
            "stakeUnits": 1,
            "updatedAt": now,
            "multibet": body,
        }
        if telegram_sent:
            update_fields["telegramSent"] = True

        try:
            self.alerts.update_one(
                {"alertKey": multibet.alert_key},
                {
                    "$setOnInsert": doc,
                    "$set": update_fields,
                },
                upsert=True,
            )
            return True
        except Exception as error:
            self._mark_unavailable(error)
            return False

    def mark_telegram_sent(self, alert_key: str) -> bool:
        self.ensure_indexes()
        if not self.enabled or self.alerts is None:
            return False

        try:
            self.alerts.update_one(
                {"alertKey": alert_key},
                {"$set": {"telegramSent": True, "updatedAt": _now()}},
            )
            return True
        except Exception as error:
            self._mark_unavailable(error)
            return False

    def delete_all_bet_alerts(self) -> int:
        self.ensure_indexes()
        if not self.enabled or self.alerts is None:
            return 0
        try:
            result = self.alerts.delete_many({})
            return int(result.deleted_count)
        except Exception as error:
            self._mark_unavailable(error)
            return 0

    def delete_all_performance(self) -> int:
        self.ensure_indexes()
        if not self.enabled or self.performance is None:
            return 0
        try:
            result = self.performance.delete_many({})
            return int(result.deleted_count)
        except Exception as error:
            self._mark_unavailable(error)
            return 0

    def get_open_alerts(self, limit: int = 200) -> list[dict[str, Any]]:
        self.ensure_indexes()
        if not self.enabled:
            return []

        try:
            return list(
                self.alerts.find({"status": "pending"}).sort("createdAt", ASCENDING).limit(limit)
            )
        except Exception as error:
            self._mark_unavailable(error)
            return []

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

        try:
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
        except Exception as error:
            self._mark_unavailable(error)

    def bulk_settle(self, settled: list[tuple[dict[str, Any], str, list[dict[str, Any]]]]) -> int:
        if not settled:
            return 0

        self.ensure_indexes()
        if not self.enabled:
            return 0

        for alert, status, legs in settled:
            self.settle_alert(alert, status, legs)
        return len(settled)

    def get_performance_summary(self) -> dict[str, Any] | None:
        self.ensure_indexes()
        if not self.enabled:
            return None

        try:
            settled = list(self.performance.find({}).sort("settledAt", ASCENDING))
        except Exception as error:
            self._mark_unavailable(error)
            return None

        stake_units = sum(float(item.get("stakeUnits") or 0) for item in settled)
        profit_units = round(sum(float(item.get("profitUnits") or 0) for item in settled), 2)
        won = sum(1 for item in settled if item.get("status") == "won")
        lost = sum(1 for item in settled if item.get("status") == "lost")
        void = sum(1 for item in settled if item.get("status") == "void")
        graded = won + lost
        equity_curve = []
        running_profit = 0.0
        running_stake = 0.0

        for item in settled:
            running_profit += float(item.get("profitUnits") or 0)
            running_stake += float(item.get("stakeUnits") or 0)
            equity_curve.append(
                {
                    "settledAt": item.get("settledAt"),
                    "profitUnits": round(running_profit, 2),
                    "roiPercent": round((running_profit / running_stake) * 100, 2) if running_stake else 0,
                }
            )

        return {
            "settled": len(settled),
            "won": won,
            "lost": lost,
            "void": void,
            "stakeUnits": stake_units,
            "profitUnits": profit_units,
            "roiPercent": round((profit_units / stake_units) * 100, 2) if stake_units else 0,
            "hitRatePercent": round((won / graded) * 100, 2) if graded else 0,
            "equityCurve": equity_curve[-20:],
        }

    def _mark_unavailable(self, error: Exception) -> None:
        self.enabled = False
        self.error = str(error)
        self.client = None
        self.db = None
        self.alerts = None
        self.performance = None
        self._indexes_ready = False


def _alert_decimal_odd(alert: dict[str, Any]) -> float:
    if alert.get("type") == "single":
        return float(alert.get("single", {}).get("bestOdd") or 1)
    return float(alert.get("multibet", {}).get("totalOdd") or 1)
