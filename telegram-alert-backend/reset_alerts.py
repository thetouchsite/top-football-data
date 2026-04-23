"""
Pulizia dati alert (stesso effetto pratico di POST /admin/reset-alerts):
- collection betAlerts
- collection betPerformance
- file mark_once (STORAGE_PATH / .data/telegram-alerts.json)

Esecuzione (da questa directory):
  .\\.venv\\Scripts\\python.exe reset_alerts.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from app.config import get_settings
from app.mongodb import MongoAlertRepository
from app.storage import AlertStore


def main() -> int:
    s = get_settings()
    n_alerts = 0
    n_perf = 0
    if (s.mongodb_uri or "").strip():
        repo = MongoAlertRepository(s.mongodb_uri, s.mongodb_db)
        n_alerts = repo.delete_all_bet_alerts()
        n_perf = repo.delete_all_performance()
        print(f"Mongo: betAlerts eliminati={n_alerts}, betPerformance={n_perf} (connesso={repo.enabled})")
        if not repo.enabled and repo.error:
            print(f"  (nota: {repo.error})")
    else:
        print("MONGODB_URI assente: skip Mongo")

    p = s.storage_path
    if p:
        AlertStore(p).clear()
        print(f"File dedup azzerato: {p}")
    else:
        print("STORAGE_PATH vuoto: skip file locale")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
