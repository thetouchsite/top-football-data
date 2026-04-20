import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.engine import build_fixture_markets, build_multibets, load_affiliate_links
from app.mongodb import MongoAlertRepository
from app.results import settle_alert_from_fixtures
from app.sportmonks import SportmonksClient
from app.storage import AlertStore
from app.telegram import TelegramClient, format_multibet_alert, format_single_alert

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
        self.repository = MongoAlertRepository(
            uri=self.settings.mongodb_uri,
            database_name=self.settings.mongodb_db,
        )
        self.store = AlertStore(self.settings.storage_path)
        self.running = False
        self.last_result: dict[str, int | str] = {"status": "not_started"}

    async def run_once(self) -> dict[str, int | str]:
        settled_before_scan = await self.settle_open_alerts()
        affiliate_links = load_affiliate_links(self.settings.bookmaker_affiliate_links_json)
        fixtures = await self.sportmonks.fetch_schedule(
            days=self.settings.sportmonks_schedule_days,
            league_ids=self.settings.sportmonks_league_ids,
        )

        markets = [
            market
            for fixture in fixtures
            for market in build_fixture_markets(
                fixture=fixture,
                candidate_edge_threshold=self.settings.candidate_edge_threshold,
                affiliate_links=affiliate_links,
            )
        ]
        singles = [
            market
            for market in markets
            if market.edge >= self.settings.notification_ev_threshold
        ]
        multibets = [
            multibet
            for multibet in build_multibets(
                markets,
                min_events=self.settings.multibet_min_events,
                max_events=self.settings.multibet_max_events,
            )
            if multibet.total_ev >= self.settings.notification_ev_threshold
        ]

        sent = 0
        for market in singles[: self.settings.max_alerts_per_run]:
            should_send = self.store.mark_once(market.alert_key)
            if should_send:
                await self.telegram.send_message(format_single_alert(market, self.settings.cta_label))
                sent += 1
            self.repository.save_single_alert(market, telegram_sent=should_send)

        remaining_slots = max(0, self.settings.max_alerts_per_run - sent)
        for multibet in multibets[:remaining_slots]:
            should_send = self.store.mark_once(multibet.alert_key)
            if should_send:
                await self.telegram.send_message(format_multibet_alert(multibet, self.settings.cta_label))
                sent += 1
            self.repository.save_multibet_alert(multibet, telegram_sent=should_send)

        result = {
            "status": "ok",
            "fixtures": len(fixtures),
            "candidate_markets": len(markets),
            "single_alerts": len(singles),
            "multibet_alerts": len(multibets),
            "sent": sent,
            "settled": settled_before_scan,
            "mongodb_enabled": self.repository.enabled,
        }
        self.last_result = result
        return result

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

        return self.repository.bulk_settle(settled)

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
