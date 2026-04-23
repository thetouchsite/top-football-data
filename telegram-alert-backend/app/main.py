import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query

from app.alert_webhook import post_from_multibet, post_from_single
from app.config import get_settings
from app.engine import build_all_modus_multibets, build_fixture_markets, build_official_value_markets, load_affiliate_links
from app.models import MultibetModus
from app.mongodb import MongoAlertRepository
from app.results import is_fixture_final, settle_alert_from_fixtures
from app.site_feed import SiteFeedClient, build_high_probability_picks, format_demo_picks_message
from app.sportmonks import SportmonksClient
from app.storage import AlertStore
from app.telegram import (
    TelegramClient,
    format_multibet_alert,
    format_performance_summary,
    format_settlement_alert,
    format_single_alert,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("telegram-alert-backend")
logging.getLogger("httpx").setLevel(logging.WARNING)


class AlertWorker:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.sportmonks = SportmonksClient(
            api_token=self.settings.resolved_sportmonks_token,
            base_url=self.settings.sportmonks_base_url,
            timezone=self.settings.sportmonks_timezone,
        )
        self.telegram = TelegramClient(
            bot_token=self.settings.telegram_bot_token,
            chat_id=self.settings.telegram_chat_id,
        )
        self.site_feed = SiteFeedClient(app_base_url=self.settings.app_base_url)
        self.repository = MongoAlertRepository(
            uri=self.settings.mongodb_uri,
            database_name=self.settings.mongodb_db,
        )
        self.store = AlertStore(self.settings.storage_path)
        self.running = False
        self.last_result: dict[str, int | str] = {"status": "not_started"}

    async def run_once(self) -> dict[str, int | str]:
        repaired_before_scan = self.repository.repair_settled_alert_statuses()
        settled_before_scan = await self.settle_open_alerts()
        affiliate_links = load_affiliate_links(self.settings.bookmaker_affiliate_links_json)
        fixtures = await self.sportmonks.fetch_schedule(
            days=self.settings.sportmonks_schedule_days,
            league_ids=self.settings.sportmonks_league_ids,
        )
        fixtures = await self.hydrate_fixtures_with_direct_feeds(fixtures)
        fixtures = [fixture for fixture in fixtures if not is_fixture_final(fixture)]

        markets = self.build_markets(fixtures, affiliate_links)
        singles = [
            market
            for market in markets
            if market.edge >= self.settings.notification_ev_threshold
        ]
        by_modus = build_all_modus_multibets(
            markets,
            min_events=self.settings.multibet_min_events,
            max_events=self.settings.multibet_max_events,
            min_total_ev=self.settings.notification_ev_threshold,
            algorithmic_min_leg_prob=self.settings.multibet_algorithmic_min_leg_prob,
            algorithmic_min_value_percent=self.settings.multibet_algorithmic_min_value_percent,
            min_leg_ev=self.settings.multibet_min_leg_ev,
            max_total_odd=self.settings.multibet_max_total_odd,
        )
        multibets = self._flatten_multibets_by_modus(by_modus)

        sent = 0
        persisted = 0
        skipped_due_mongo = 0
        app_url = self.settings.app_base_url or ""
        for market in singles[: self.settings.max_alerts_per_run]:
            already_sent = self.repository.was_telegram_sent(market.alert_key)
            should_send = (not already_sent) and self.store.mark_once(market.alert_key)
            saved = self.repository.save_single_alert(market, telegram_sent=False)
            if not saved:
                logger.warning(
                    "Mongo save failed for single alert %s. Telegram send skipped. Mongo error: %s",
                    market.alert_key,
                    self.repository.error,
                )
                skipped_due_mongo += 1
                continue

            persisted += 1
            if should_send and self.settings.alerts_webhook_url:
                await post_from_single(self.settings.alerts_webhook_url, market)
            if should_send and self.telegram.configured:
                await self.telegram.send_message(
                    format_single_alert(market, self.settings.cta_label, app_url)
                )
                self.repository.mark_telegram_sent(market.alert_key)
                sent += 1

        remaining_slots = max(0, self.settings.max_alerts_per_run - sent)
        for multibet in multibets[:remaining_slots]:
            already_sent = self.repository.was_telegram_sent(multibet.alert_key)
            should_send = (not already_sent) and self.store.mark_once(multibet.alert_key)
            saved = self.repository.save_multibet_alert(multibet, telegram_sent=False)
            if not saved:
                logger.warning(
                    "Mongo save failed for multibet alert %s. Telegram send skipped. Mongo error: %s",
                    multibet.alert_key,
                    self.repository.error,
                )
                skipped_due_mongo += 1
                continue

            persisted += 1
            if should_send and self.settings.alerts_webhook_url:
                await post_from_multibet(self.settings.alerts_webhook_url, multibet)
            if should_send and self.telegram.configured:
                await self.telegram.send_message(
                    format_multibet_alert(multibet, self.settings.cta_label, app_url)
                )
                self.repository.mark_telegram_sent(multibet.alert_key)
                sent += 1

        result = {
            "status": "ok",
            "fixtures": len(fixtures),
            "candidate_markets": len(markets),
            "single_alerts": len(singles),
            "multibet_alerts": len(multibets),
            "sent": sent,
            "persisted": persisted,
            "skipped_due_mongo": skipped_due_mongo,
            "repaired_statuses": repaired_before_scan,
            "settled": settled_before_scan,
            "mongodb_enabled": self.repository.enabled,
            "mongodb_error": self.repository.error or "",
            "mongodb_db": self.repository.database_name,
        }
        self.last_result = result
        return result

    async def hydrate_fixtures_with_direct_feeds(self, fixtures: list[dict]) -> list[dict]:
        direct_limit = self.settings.sportmonks_direct_fixture_limit
        hydrated: list[dict] = []

        for index, fixture in enumerate(fixtures):
            if index >= direct_limit:
                hydrated.append(fixture)
                continue

            fixture_id = str(fixture.get("id") or "")
            if not fixture_id:
                hydrated.append(fixture)
                continue

            enriched = dict(fixture)
            try:
                if self.settings.sportmonks_fetch_direct_odds:
                    direct_odds = await self.sportmonks.fetch_pre_match_odds_by_fixture(fixture_id)
                    if direct_odds:
                        enriched["odds"] = direct_odds

                if self.settings.sportmonks_fetch_direct_value_bets:
                    value_bets = await self.sportmonks.fetch_value_bets_by_fixture(fixture_id)
                    if value_bets:
                        enriched["valuebets"] = value_bets
            except Exception as error:
                logger.warning("Direct Sportmonks feed failed for fixture %s: %s", fixture_id, error)

            hydrated.append(enriched)

        return hydrated

    def _flatten_multibets_by_modus(self, by_modus: dict[str, list]) -> list:
        """Fino a N multibet per ogni `modus`, ordine fisso, senza sovrapposizione di alertKey."""
        order = (
            MultibetModus.ALGORITHMIC,
            MultibetModus.SAFE,
            MultibetModus.VALUE,
        )
        out: list[MultiBet] = []
        seen: set[str] = set()
        for modus in order:
            n = 0
            for multibet in by_modus.get(modus) or []:
                if n >= self.settings.multibet_per_modus_max:
                    break
                if multibet.alert_key in seen:
                    continue
                seen.add(multibet.alert_key)
                out.append(multibet)
                n += 1
        return out

    def build_markets(self, fixtures: list[dict], affiliate_links: dict[str, str]):
        markets = []
        seen: set[tuple[str, str, str, str]] = set()

        for fixture in fixtures:
            official_markets = build_official_value_markets(
                fixture=fixture,
                candidate_edge_threshold=self.settings.candidate_edge_threshold,
                affiliate_links=affiliate_links,
                max_single_edge=self.settings.max_single_edge,
                max_single_odd=self.settings.max_single_odd,
            )
            derived_markets = build_fixture_markets(
                fixture=fixture,
                candidate_edge_threshold=self.settings.candidate_edge_threshold,
                affiliate_links=affiliate_links,
                max_single_edge=self.settings.max_single_edge,
                max_single_odd=self.settings.max_single_odd,
            )

            for market in [*official_markets, *derived_markets]:
                key = (market.fixture_id, market.market, market.selection, market.leg_profile)
                if key in seen:
                    continue
                seen.add(key)
                markets.append(market)

        return sorted(markets, key=lambda item: item.edge, reverse=True)

    async def settle_open_alerts(self) -> int:
        open_alerts = self.repository.get_open_alerts()
        if not open_alerts:
            return 0

        fixture_ids = sorted(
            {
                str(fixture_id)
                for alert in open_alerts
                for fixture_id in alert.get("fixtureIds", [])
                if fixture_id
            }
        )
        fixtures_by_id = {}
        for fixture_id in fixture_ids:
            fixture = await self.sportmonks.fetch_fixture_by_id(fixture_id)
            if fixture:
                fixtures_by_id[fixture_id] = fixture

        settled = []
        for alert in open_alerts:
            result = settle_alert_from_fixtures(alert, fixtures_by_id)
            if result is None:
                continue
            status, legs = result
            settled.append((alert, status, legs))

        settled_count = self.repository.bulk_settle(settled)
        if settled_count:
            for alert, status, legs in settled:
                try:
                    await self.telegram.send_message(format_settlement_alert(alert, status, legs))
                except Exception as error:
                    logger.warning("Settlement Telegram alert failed: %s", error)

            summary = self.repository.get_performance_summary()
            if summary:
                try:
                    await self.telegram.send_message(format_performance_summary(summary, settled_count))
                except Exception as error:
                    logger.warning("Performance Telegram summary failed: %s", error)
        return settled_count

    async def send_demo_predictions(self) -> dict[str, object]:
        matches = await self.site_feed.fetch_schedule_matches(
            days=self.settings.demo_schedule_days
        )
        picks = build_high_probability_picks(
            matches=matches,
            min_probability=self.settings.demo_min_probability,
            max_picks=self.settings.demo_max_picks,
        )
        message = format_demo_picks_message(picks, self.settings.demo_min_probability)
        await self.telegram.send_message(message)

        result = {
            "status": "ok",
            "source": "site_feed",
            "matches": len(matches),
            "min_probability": self.settings.demo_min_probability,
            "picks": len(picks),
            "sent": 1,
        }
        self.last_result = result
        return result

    async def loop(self) -> None:
        self.running = True
        while self.running:
            try:
                result = await self.run_once()
                logger.info("Alert scan completed: %s", result)
            except Exception as error:
                self.last_result = {"status": "error", "message": str(error)}
                logger.exception("Alert scan failed")
            await asyncio.sleep(self.settings.poll_interval_seconds)


worker = AlertWorker()
worker_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global worker_task
    worker_task = asyncio.create_task(worker.loop())
    yield
    worker.running = False
    if worker_task:
        worker_task.cancel()


app = FastAPI(title="Top Football Data Telegram Alert Backend", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, object]:
    settings = get_settings()
    return {
        "ok": True,
        "sportmonks_configured": bool(settings.resolved_sportmonks_token),
        "telegram_configured": bool(settings.telegram_bot_token and settings.telegram_chat_id),
        "mongodb_configured": bool(settings.mongodb_uri),
        "mongodb_db": settings.mongodb_db,
        "mongodb_enabled": worker.repository.enabled,
        "mongodb_error": worker.repository.error,
        "last_result": worker.last_result,
    }


@app.post("/run-once")
async def run_once() -> dict[str, object]:
    return await worker.run_once()


@app.post("/test-telegram")
async def test_telegram() -> dict[str, object]:
    await worker.telegram.send_message(
        "Test Top Football Data: backend Telegram collegato correttamente."
    )
    return {"ok": True, "sent": 1}


@app.post("/admin/reset-alerts")
async def admin_reset_alerts(
    secret: str = Query(default=""),
    clear_local_store: bool = Query(default=True),
    clear_performance: bool = Query(default=True),
) -> dict[str, object]:
    """
    Svuota `betAlerts` (e opzionalmente `betPerformance`) e il file mark_once locale.
    Richiede `ALERTS_RESET_SECRET` in .env e stesso `secret` in query, es. ?secret=…
    """
    expected = (worker.settings.alerts_reset_secret or "").strip()
    if not expected:
        return {
            "ok": False,
            "error": "Impostare ALERTS_RESET_SECRET in .env per abilitare l'azzeramento.",
        }
    if secret != expected:
        return {"ok": False, "error": "Secret non valido."}

    deleted_alerts = worker.repository.delete_all_bet_alerts()
    deleted_perf = worker.repository.delete_all_performance() if clear_performance else 0
    if clear_local_store and worker.settings.storage_path:
        try:
            worker.store.clear()
        except OSError as e:
            return {"ok": False, "error": f"File store: {e}"}

    return {
        "ok": True,
        "deletedBetAlerts": deleted_alerts,
        "deletedPerformance": deleted_perf,
        "localStoreCleared": clear_local_store,
    }


@app.post("/demo-pronostici")
async def demo_pronostici() -> dict[str, object]:
    return await worker.send_demo_predictions()


@app.get("/demo-pronostici")
async def demo_pronostici_get() -> dict[str, object]:
    return await worker.send_demo_predictions()
