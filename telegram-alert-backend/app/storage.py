import json
from pathlib import Path
from time import time


class AlertStore:
    def __init__(self, path: str, ttl_seconds: int = 60 * 60 * 24):
        self.path = Path(path)
        self.ttl_seconds = ttl_seconds
        self._seen = self._load()

    def _load(self) -> dict[str, float]:
        if not self.path.exists():
            return {}

        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}

        if not isinstance(data, dict):
            return {}

        now = time()
        return {
            str(key): float(value)
            for key, value in data.items()
            if isinstance(value, (int, float)) and now - float(value) <= self.ttl_seconds
        }

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self._seen, indent=2), encoding="utf-8")

    def mark_once(self, key: str) -> bool:
        now = time()
        if key in self._seen and now - self._seen[key] <= self.ttl_seconds:
            return False

        self._seen[key] = now
        self._save()
        return True
