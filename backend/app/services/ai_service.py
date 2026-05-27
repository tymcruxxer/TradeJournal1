from sqlalchemy.orm import Session
from app.models import Trade


def _apply_user_filters(query, user_id, account_id):
    """Apply user isolation and optional account filtering."""
    if user_id is not None:
        query = query.filter(Trade.user_id == user_id)
    if account_id is not None:
        query = query.filter(Trade.account_id == account_id)
    return query


def generate_ai_insights(db: Session, user_id: int | None = None, account_id: str | None = None):
    query = _apply_user_filters(db.query(Trade), user_id, account_id)
    trades = query.all()

    if not trades:
        return {"insights": ["No trades available."]}

    insights = []

    # =============================
    # BASIC METRICS
    # =============================
    total_pnl = sum(t.profit for t in trades)

    wins = [t for t in trades if t.profit > 0]
    losses = [t for t in trades if t.profit < 0]

    win_rate = (len(wins) / len(trades)) * 100 if trades else 0

    avg_win = sum(t.profit for t in wins) / len(wins) if wins else 0
    avg_loss = sum(t.profit for t in losses) / len(losses) if losses else 0

    expectancy = (win_rate / 100) * avg_win + (1 - win_rate / 100) * avg_loss

    # =============================
    # EQUITY + DRAWDOWN
    # =============================
    equity = 0
    peak = 0
    max_drawdown = 0

    sorted_trades = sorted(trades, key=lambda t: t.time)

    for t in sorted_trades:
        equity += t.profit
        if equity > peak:
            peak = equity

        dd = peak - equity
        if dd > max_drawdown:
            max_drawdown = dd

    # =============================
    # STREAKS
    # =============================
    loss_streak = 0
    max_loss_streak = 0

    for t in sorted_trades:
        if t.profit < 0:
            loss_streak += 1
            max_loss_streak = max(max_loss_streak, loss_streak)
        else:
            loss_streak = 0

    # =============================
    # STRATEGY ANALYSIS
    # =============================
    strategy_stats = {}
    emotion_stats = {}

    for t in trades:
        if t.strategy:
            strategy_stats.setdefault(t.strategy, 0)
            strategy_stats[t.strategy] += t.profit

        if t.emotion:
            emotion_stats.setdefault(t.emotion, 0)
            emotion_stats[t.emotion] += t.profit

    # =============================
    # 🔥 INSIGHTS LOGIC
    # =============================

    if expectancy < 0:
        insights.append("Your expectancy is negative. You currently have no edge.")

    if win_rate < 40:
        insights.append("Your win rate is low. Consider refining your entries.")

    if max_drawdown > abs(total_pnl) * 2:
        insights.append("Your drawdown is too high relative to your profits.")

    if max_loss_streak >= 5:
        insights.append(f"You have long losing streaks ({max_loss_streak}). Risk management issue.")

    # Strategy insights
    for strat, profit in strategy_stats.items():
        if profit < 0:
            insights.append(f"Strategy '{strat}' is losing money.")

    # Emotion insights
    for emo, profit in emotion_stats.items():
        if profit < 0:
            insights.append(f"Trades tagged '{emo}' are unprofitable.")

    if total_pnl > 0:
        insights.append("You are overall profitable. Focus on consistency.")

    return {"insights": insights}