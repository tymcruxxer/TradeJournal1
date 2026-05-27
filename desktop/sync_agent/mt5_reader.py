from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
    MT5_IMPORT_ERROR: Exception | None = None
except Exception as exc:
    MT5_AVAILABLE = False
    MT5_IMPORT_ERROR = exc
    mt5 = None  # type: ignore


def fetch_closed_trades(days: int) -> list[dict[str, Any]]:
    if not MT5_AVAILABLE:
        detail = f" ({MT5_IMPORT_ERROR})" if MT5_IMPORT_ERROR else ""
        raise RuntimeError(
            "MetaTrader5 package is not installed. "
            "Install it with: pip install MetaTrader5"
            f"{detail}"
        )
    
    if not mt5.initialize():
        raise RuntimeError("MT5 initialization failed")

    try:
        # ── Capture account info ────────────────────────────────────────
        account_info = mt5.account_info()
        account_id = str(account_info.login) if account_info else None
        account_name = account_info.name if account_info else None

        date_to = datetime.now()
        date_from = date_to - timedelta(days=days)
        deals = mt5.history_deals_get(date_from, date_to)

        if deals is None:
            return []

        positions: dict[int, list[Any]] = {}

        for deal in deals:
            if not getattr(deal, "symbol", None) or getattr(deal, "volume", 0) == 0:
                continue

            position_id = int(getattr(deal, "position_id", 0) or getattr(deal, "ticket", 0))
            positions.setdefault(position_id, []).append(deal)

        trades = [_position_to_trade(position_deals) for position_deals in positions.values()]

        # Attach account info to every trade
        for trade in trades:
            if account_id:
                trade["account_id"] = account_id
            if account_name:
                trade["account_name"] = account_name

        return trades
    finally:
        mt5.shutdown()


def _position_to_trade(deals: list[Any]) -> dict[str, Any]:
    sorted_deals = sorted(deals, key=lambda deal: deal.time)
    entry = sorted_deals[0]
    exit_deal = sorted_deals[-1]

    return {
        "symbol": entry.symbol,
        "profit": float(sum(deal.profit for deal in sorted_deals)),
        "volume": float(entry.volume),
        "entry_price": float(entry.price),
        "exit_price": float(exit_deal.price),
        "open_time": datetime.fromtimestamp(entry.time).isoformat(),
        "close_time": datetime.fromtimestamp(exit_deal.time).isoformat(),
        "duration": int(exit_deal.time - entry.time),
        "ticket": int(exit_deal.ticket),
        "trade_type": _trade_type(entry),
    }


def _trade_type(deal: Any) -> str:
    if deal.type == mt5.DEAL_TYPE_BUY:
        return "buy"

    if deal.type == mt5.DEAL_TYPE_SELL:
        return "sell"

    return str(deal.type)
