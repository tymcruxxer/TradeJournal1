from datetime import datetime, timedelta


def _load_mt5():
    try:
        import MetaTrader5 as mt5  # type: ignore
    except Exception as exc:
        raise RuntimeError(
            "MetaTrader5 is not available in this backend environment. "
            "Use the local Windows sync agent to upload trades."
        ) from exc

    return mt5


def connect_mt5():
    mt5 = _load_mt5()

    if not mt5.initialize():
        raise RuntimeError("MT5 initialization failed")

    return mt5


def get_trades(days=30):
    mt5 = connect_mt5()

    try:
        date_to = datetime.now()
        date_from = date_to - timedelta(days=days)

        deals = mt5.history_deals_get(date_from, date_to)

        if deals is None:
            return []

        positions = {}

        for deal in deals:
            if not deal.symbol or deal.volume == 0:
                continue

            position_id = deal.position_id
            positions.setdefault(position_id, []).append(deal)

        trades = []

        for position_deals in positions.values():
            sorted_deals = sorted(position_deals, key=lambda deal: deal.time)
            entry = sorted_deals[0]
            exit_deal = sorted_deals[-1]

            trades.append(
                {
                    "symbol": entry.symbol,
                    "profit": float(sum(deal.profit for deal in sorted_deals)),
                    "volume": float(entry.volume),
                    "entry_price": float(entry.price),
                    "exit_price": float(exit_deal.price),
                    "open_time": datetime.fromtimestamp(entry.time),
                    "close_time": datetime.fromtimestamp(exit_deal.time),
                    "duration": int(exit_deal.time - entry.time),
                    "ticket": exit_deal.ticket,
                    "type": "buy" if entry.type == mt5.DEAL_TYPE_BUY else "sell",
                }
            )

        return trades
    finally:
        mt5.shutdown()
