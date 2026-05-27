import MetaTrader5 as mt5
from datetime import datetime

def connect_mt5():
    if not mt5.initialize():
        print("❌ MT5 initialization failed")
        return False

    print("✅ MT5 connected")
    return True


def get_trades():
    # Get trades from a wide date range
    from_date = datetime(2020, 1, 1)
    to_date = datetime.now()

    deals = mt5.history_deals_get(from_date, to_date)

    if deals is None:
        print("❌ No trades found or error")
        return []

    print(f"✅ Found {len(deals)} trades")

    trades = []
    for d in deals:
        trade = {
            "symbol": d.symbol,
            "type": d.type,
            "volume": d.volume,
            "price": d.price,
            "profit": d.profit,
            "time": datetime.fromtimestamp(d.time)
        }
        trades.append(trade)

    return trades


def shutdown_mt5():
    mt5.shutdown()