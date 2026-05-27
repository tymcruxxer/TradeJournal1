from sqlalchemy.orm import Session
from app.models import Trade


def _apply_user_filters(query, user_id, account_id):
    """Apply user isolation and optional account filtering."""
    if user_id is not None:
        query = query.filter(Trade.user_id == user_id)
    if account_id is not None:
        query = query.filter(Trade.account_id == account_id)
    return query


def calculate_analytics(db: Session, user_id: int | None = None, account_id: str | None = None):
    query = _apply_user_filters(db.query(Trade), user_id, account_id)
    trades = query.all()

    if not trades:
        return {}

    # =============================
    # 🔥 BASIC
    # =============================
    total_pnl = sum(t.profit for t in trades)

    wins = [t for t in trades if t.profit > 0]
    losses = [t for t in trades if t.profit < 0]

    win_rate = (len(wins) / len(trades)) * 100 if trades else 0

    avg_win = sum(t.profit for t in wins) / len(wins) if wins else 0
    avg_loss = sum(t.profit for t in losses) / len(losses) if losses else 0

    profit_factor = abs(
        (sum(t.profit for t in wins)) /
        (sum(t.profit for t in losses) or 1)
    )

    expectancy = (win_rate / 100) * avg_win + (1 - win_rate / 100) * avg_loss

    # =============================
    # 🔥 EQUITY + DRAWDOWN
    # =============================
    sorted_trades = sorted(trades, key=lambda t: t.time)

    equity = 0
    peak = 0
    max_drawdown = 0

    for t in sorted_trades:
        equity += t.profit
        if equity > peak:
            peak = equity

        dd = peak - equity
        if dd > max_drawdown:
            max_drawdown = dd

    # =============================
    # 🔥 STREAKS
    # =============================
    win_streak = 0
    loss_streak = 0
    max_win_streak = 0
    max_loss_streak = 0

    for t in sorted_trades:
        if t.profit > 0:
            win_streak += 1
            loss_streak = 0
        else:
            loss_streak += 1
            win_streak = 0

        max_win_streak = max(max_win_streak, win_streak)
        max_loss_streak = max(max_loss_streak, loss_streak)

    # =============================
    # 🔥 SYMBOL PERFORMANCE
    # =============================
    symbol_stats = {}

    for t in trades:
        symbol_stats[t.symbol] = symbol_stats.get(t.symbol, 0) + t.profit

    best_symbol = max(symbol_stats, key=symbol_stats.get) if symbol_stats else ""
    worst_symbol = min(symbol_stats, key=symbol_stats.get) if symbol_stats else ""

    # =============================
    # 🔥 RESPONSE
    # =============================
    return {
        "totalPnL": total_pnl,
        "winRate": win_rate,
        "profitFactor": profit_factor,
        "expectancy": expectancy,
        "maxDrawdown": max_drawdown,
        "avgWin": avg_win,
        "avgLoss": avg_loss,
        "maxWinStreak": max_win_streak,
        "maxLossStreak": max_loss_streak,
        "bestSymbol": best_symbol,
        "worstSymbol": worst_symbol,
        "totalTrades": len(trades),
    }


def calculate_tag_analytics(db: Session, user_id: int | None = None, account_id: str | None = None):
    query = _apply_user_filters(db.query(Trade), user_id, account_id)
    trades = query.all()

    strategy_stats = {}
    emotion_stats = {}

    for t in trades:
        # STRATEGY
        if t.strategy:
            if t.strategy not in strategy_stats:
                strategy_stats[t.strategy] = {
                    "profit": 0,
                    "count": 0,
                }

            strategy_stats[t.strategy]["profit"] += t.profit
            strategy_stats[t.strategy]["count"] += 1

        # EMOTION
        if t.emotion:
            if t.emotion not in emotion_stats:
                emotion_stats[t.emotion] = {
                    "profit": 0,
                    "count": 0,
                }

            emotion_stats[t.emotion]["profit"] += t.profit
            emotion_stats[t.emotion]["count"] += 1

    return {
        "strategy": strategy_stats,
        "emotion": emotion_stats,
    }