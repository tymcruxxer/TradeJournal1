from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from time import time


MAX_SYNCED_TICKETS = 50000
LOGGER = logging.getLogger(__name__)


@dataclass
class SyncState:
    synced_tickets: set[int] = field(default_factory=set)
    last_deep_sync_at: float = 0.0

    @classmethod
    def load(cls, path: Path) -> "SyncState":
        if not path.exists():
            return cls()

        try:
            with path.open("r", encoding="utf-8") as state_file:
                raw = json.load(state_file)
        except (OSError, json.JSONDecodeError, TypeError, ValueError) as exc:
            corrupt_path = path.with_suffix(f"{path.suffix}.corrupt")
            try:
                path.replace(corrupt_path)
                LOGGER.warning("Moved corrupt sync state to %s", corrupt_path)
            except OSError:
                LOGGER.warning("Ignoring unreadable sync state at %s", path)
            LOGGER.warning("Starting with empty sync state after state load failure: %s", exc)
            return cls()

        try:
            return cls(
                synced_tickets={int(ticket) for ticket in raw.get("synced_tickets", [])},
                last_deep_sync_at=float(raw.get("last_deep_sync_at", 0.0)),
            )
        except (TypeError, ValueError) as exc:
            LOGGER.warning("Invalid sync state values at %s; starting empty: %s", path, exc)
            return cls()

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tickets = sorted(self.synced_tickets)[-MAX_SYNCED_TICKETS:]

        with path.open("w", encoding="utf-8") as state_file:
            json.dump(
                {
                    "synced_tickets": tickets,
                    "last_deep_sync_at": self.last_deep_sync_at,
                },
                state_file,
                indent=2,
            )
            state_file.write("\n")

    def due_for_deep_sync(self, interval_seconds: int) -> bool:
        return time() - self.last_deep_sync_at >= interval_seconds

    def mark_deep_sync(self) -> None:
        self.last_deep_sync_at = time()

    def mark_synced(self, tickets: list[int]) -> None:
        self.synced_tickets.update(int(ticket) for ticket in tickets)

    def filter_unsynced(self, trades: list[dict]) -> list[dict]:
        return [
            trade
            for trade in trades
            if int(trade["ticket"]) not in self.synced_tickets
        ]
