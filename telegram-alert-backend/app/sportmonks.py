from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import httpx


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


class SportmonksClient:
    def __init__(self, api_token: str, base_url: str, timezone: str):
        self.api_token = api_token
        self.base_url = base_url.rstrip("/")
        self.timezone = timezone

    async def fetch_schedule(self, days: int, league_ids: str = "") -> list[dict[str, Any]]:
        if not self.api_token:
            raise RuntimeError("SPORTMONKS_API_TOKEN/SPORTMONKS_API_KEY non configurato.")

        tz = ZoneInfo(self.timezone)
        start = datetime.now(tz).date()
        end = start + timedelta(days=max(0, days - 1))
        fixtures: list[dict[str, Any]] = []

        params: dict[str, Any] = {
            "api_token": self.api_token,
            "timezone": self.timezone,
            "per_page": 50,
            "include": ";".join(
                [
                    "league",
                    "season",
                    "state",
                    "participants",
                    "scores",
                    "odds.bookmaker",
                    "predictions.type",
                    "expected.type",
                    "statistics.type",
                    "metadata",
                ]
            ),
        }
        if league_ids.strip():
            params["filters"] = f"fixtureLeagues:{league_ids.strip()}"

        page = 1
        async with httpx.AsyncClient(timeout=30) as client:
            while page <= 10:
                params["page"] = page
                response = await client.get(
                    f"{self.base_url}/fixtures/between/{start.isoformat()}/{end.isoformat()}",
                    params=params,
                    headers={"Accept": "application/json"},
                )
                try:
                    response.raise_for_status()
                except httpx.HTTPStatusError as error:
                    status_code = error.response.status_code
                    if status_code == 401:
                        raise RuntimeError(
                            "Sportmonks ha rifiutato la chiave API locale: controlla SPORTMONKS_API_TOKEN/SPORTMONKS_API_KEY."
                        ) from None
                    raise RuntimeError(f"Sportmonks request fallita con status {status_code}.") from None
                payload = response.json()
                fixtures.extend(_as_list(payload.get("data")))

                pagination = payload.get("pagination") or payload.get("meta", {}).get("pagination") or {}
                total_pages = int(pagination.get("total_pages") or pagination.get("totalPages") or 1)
                if page >= total_pages:
                    break
                page += 1

        return fixtures

    async def fetch_fixture_by_id(self, fixture_id: str) -> dict[str, Any] | None:
        if not self.api_token:
            raise RuntimeError("SPORTMONKS_API_TOKEN/SPORTMONKS_API_KEY non configurato.")

        params: dict[str, Any] = {
            "api_token": self.api_token,
            "timezone": self.timezone,
            "include": "league;state;participants;scores",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.base_url}/fixtures/{fixture_id}",
                params=params,
                headers={"Accept": "application/json"},
            )
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as error:
                status_code = error.response.status_code
                if status_code == 401:
                    raise RuntimeError(
                        "Sportmonks ha rifiutato la chiave API locale: controlla SPORTMONKS_API_TOKEN/SPORTMONKS_API_KEY."
                    ) from None
                raise RuntimeError(f"Sportmonks fixture request fallita con status {status_code}.") from None

        payload = response.json()
        data = payload.get("data")
        return data if isinstance(data, dict) else None
