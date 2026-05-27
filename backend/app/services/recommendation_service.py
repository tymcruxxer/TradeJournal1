from sqlalchemy.orm import Session
from app.models import Trade


def _apply_user_filters(query, user_id, account_id):
    """Apply user isolation and optional account filtering."""
    if user_id is not None:
        query = query.filter(Trade.user_id == user_id)
    if account_id is not None:
        query = query.filter(Trade.account_id == account_id)
    return query


def generate_recommendations(db: Session, user_id: int | None = None, account_id: str | None = None):
    query = _apply_user_filters(db.query(Trade), user_id, account_id)
    trades = query.all()

    if not trades:
        return {"recommendations": ["No data to generate recommendations."]}

    recs = []

    total_pnl = sum(t.profit for t in trades)

    wins = [t for t in trades if t.profit > 0]
    losses = [t for t in trades if t.profit < 0]

    win_rate = (len(wins) / len(trades)) * 100 if trades else 0

    avg_win = sum(t.profit for t in wins) / len(wins) if wins else 0
    avg_loss = sum(t.profit for t in losses) / len(losses) if losses else 0

    expectancy = (win_rate / 100) * avg_win + (1 - win_rate / 100) * avg_loss

    # Drawdown
    equity = 0
    peak = 0
    max_dd = 0

    for t in sorted(trades, key=lambda x: x.time):
        equity += t.profit
        peak = max(peak, equity)
        max_dd = max(max_dd, peak - equity)

    # Strategy + emotion
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
    # 🔥 RECOMMENDATIONS
    # =============================

    if expectancy < 0:
        recs.append("Review your strategy — current trades have negative expectancy.")

    if win_rate < 40:
        recs.append("Be more selective — low win rate suggests poor entries.")

    if max_dd > abs(total_pnl) * 1.5:
        recs.append("Reduce position size — drawdown is too high.")

    if len(trades) > 50 and win_rate < 50:
        recs.append("Trade less — overtrading may be hurting performance.")

    # Strategy
    for strat, profit in strategy_stats.items():
        if profit < 0:
            recs.append(f"Stop or refine '{strat}' strategy — it's losing money.")

    # Emotion
    for emo, profit in emotion_stats.items():
        if profit < 0:
            recs.append(f"Avoid trading when feeling '{emo}' — it leads to losses.")

    if total_pnl > 0:
        recs.append("You are profitable — focus on consistency and risk control.")

    return {"recommendations": recs}