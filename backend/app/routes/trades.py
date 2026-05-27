import logging
from datetime import datetime, timedelta
from math import ceil

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.services.ai_service import generate_ai_insights
from app.services.analytics_service import calculate_analytics, calculate_tag_analytics
from app.services.mt5_service import get_trades as mt5_get_trades
from app.services.recommendation_service import generate_recommendations

from ..auth import get_current_user, get_current_user_by_api_key
from ..database import get_db
from ..models import Trade, User
from ..schemas import TradeUpload


router = APIRouter(prefix="/api/trades")
LOGGER = logging.getLogger(__name__)

# ── Pagination constants ──────────────────────────────────────────────────
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 1000
MAX_UPLOAD_BATCH_SIZE = 1000


def _clamp(value: int | None, default: int, minimum: int, maximum: int) -> int:
    """Safely clamp an integer between min and max."""
    if value is None:
        return default
    return max(minimum, min(value, maximum))


# ── Helper: apply user + optional account filters ────────────────────────
def _filter_query(query, user_id, account_id=None):
    query = query.filter(Trade.user_id == user_id)
    if account_id:
        query = query.filter(Trade.account_id == account_id)
    return query


def _normalized_account_id(account_id: str | None) -> str:
    return (account_id or "").strip()


def _trade_identity_query(db: Session, user_id: int, ticket: int, account_id: str | None):
    normalized_account_id = _normalized_account_id(account_id)
    return (
        db.query(Trade)
        .filter(
            Trade.user_id == user_id,
            Trade.ticket == ticket,
            func.coalesce(Trade.account_id, "") == normalized_account_id,
        )
    )


# ── GET  /accounts ─────────────────────────────────────────────────────────
# Must be defined before the parameterised routes to avoid matching as /{id}.
@router.get("/accounts")
def get_user_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the distinct account IDs and names for the authenticated user.
    Used by the frontend to populate the account dropdown.
    """
    rows = (
        db.query(Trade.account_id, Trade.account_name)
        .filter(Trade.user_id == current_user.id)
        .filter(Trade.account_id.isnot(None))
        .filter(Trade.account_id != "")
        .distinct()
        .all()
    )

    accounts = []
    seen = set()

    for account_id, account_name in rows:
        if account_id and account_id not in seen:
            seen.add(account_id)
            accounts.append({
                "account_id": account_id,
                "account_name": account_name or account_id,
            })

    return sorted(accounts, key=lambda a: a["account_name"] or a["account_id"])


@router.get("/analytics/recommendations")
def get_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    account_id: str = Query(None),
):
    return generate_recommendations(db, user_id=current_user.id, account_id=account_id)


@router.get("/analytics/tags")
def get_tag_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    account_id: str = Query(None),
):
    return calculate_tag_analytics(db, user_id=current_user.id, account_id=account_id)


@router.get("/analytics/ai")
def get_ai_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    account_id: str = Query(None),
):
    return generate_ai_insights(db, user_id=current_user.id, account_id=account_id)


@router.get("/sync-mt5")
def sync_mt5(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    account_id: str = Query(None, description="Optional account_id to tag synced trades"),
    account_name: str = Query(None, description="Optional human-readable account name"),
    days: int = Query(30, ge=1, le=3650, description="Number of days to sync (1-3650, default 30)"),
):
    try:
        mt5_trades = mt5_get_trades(days)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    saved = 0

    for t in mt5_trades:
        if not t.get("symbol") or not t.get("ticket"):
            continue

        normalized_account_id = _normalized_account_id(account_id)
        exists = _trade_identity_query(
            db,
            current_user.id,
            t["ticket"],
            normalized_account_id,
        ).first()

        if exists:
            LOGGER.info(
                "Skipping duplicate MT5 sync trade ticket=%s user_id=%s account_id=%s",
                t["ticket"],
                current_user.id,
                normalized_account_id or "(none)",
            )
            continue

        new_trade = Trade(
            user_id=current_user.id,
            symbol=t["symbol"],
            profit=t["profit"],
            volume=t["volume"],
            entry_price=t["entry_price"],
            exit_price=t["exit_price"],
            open_time=t["open_time"],
            close_time=t["close_time"],
            duration=t["duration"],
            ticket=t["ticket"],
            trade_type=t["type"],
            time=t["close_time"],
            strategy=None,
            notes=None,
            emotion=None,
            account_id=normalized_account_id,
            account_name=account_name or None,
        )

        db.add(new_trade)
        saved += 1

    db.commit()

    LOGGER.info(
        "MT5 sync persisted saved=%s fetched=%s user_id=%s account_id=%s account_name=%s",
        saved,
        len(mt5_trades),
        current_user.id,
        _normalized_account_id(account_id) or "(none)",
        account_name or "(none)",
    )

    return {
        "message": "MT5 sync complete",
        "saved": saved,
        "total_fetched": len(mt5_trades),
        "account_id": account_id,
        "account_name": account_name,
    }


@router.get("")
def get_trades(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    days: int = Query(None),
    start: str = Query(None),
    end: str = Query(None),
    limit: int = Query(None, description="Number of trades per page (max 1000)"),
    offset: int = Query(None, description="Number of trades to skip"),
    account_id: str = Query(None, description="Filter by MT5 account ID"),
):
    """
    Returns a paginated list of trades for the authenticated user.

    Supports filtering by ``days`` (relative), ``start``/``end`` (absolute),
    and ``account_id`` (MT5 account).  Results are ordered newest-first.
    The response includes pagination metadata.
    """
    query = db.query(Trade).filter(Trade.user_id == current_user.id)

    # ── Filters ──────────────────────────────────────────────────────────
    if days:
        cutoff = datetime.utcnow() - timedelta(days=days)
        query = query.filter(Trade.time >= cutoff)

    if start and end:
        try:
            start_date = datetime.fromisoformat(start)
            end_date = datetime.fromisoformat(end)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid start or end date") from exc

        if end_date < start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")

        query = query.filter(Trade.time >= start_date, Trade.time <= end_date)

    if account_id:
        query = query.filter(Trade.account_id == account_id)

    # ── Count (before pagination) ────────────────────────────────────────
    total = query.count()

    # ── Pagination ───────────────────────────────────────────────────────
    safe_limit = _clamp(limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE)
    safe_offset = _clamp(offset, 0, 0, max(total - 1, 0))

    trades = (
        query
        .order_by(Trade.time.desc())
        .offset(safe_offset)
        .limit(safe_limit)
        .all()
    )

    total_pages = ceil(total / safe_limit) if safe_limit > 0 else 1

    return {
        "trades": trades,
        "total": total,
        "limit": safe_limit,
        "offset": safe_offset,
        "total_pages": total_pages,
    }


@router.get("/analytics")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    account_id: str = Query(None),
):
    return calculate_analytics(db, user_id=current_user.id, account_id=account_id)


@router.post("/upload")
def upload_trades(
    trades: list[TradeUpload] = Body(..., min_length=1, max_length=MAX_UPLOAD_BATCH_SIZE),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_by_api_key),
):
    saved = 0
    skipped = 0
    discovered_accounts: set[tuple[str, str]] = set()
    seen_batch_keys: set[tuple[str, int]] = set()

    for t in trades:
        normalized_account_id = _normalized_account_id(t.account_id)
        account_name = (t.account_name or "").strip()
        batch_key = (normalized_account_id, t.ticket)

        if batch_key in seen_batch_keys:
            skipped += 1
            LOGGER.info(
                "Skipping duplicate uploaded trade within batch ticket=%s user_id=%s account_id=%s",
                t.ticket,
                current_user.id,
                normalized_account_id or "(none)",
            )
            continue

        seen_batch_keys.add(batch_key)

        exists = _trade_identity_query(
            db,
            current_user.id,
            t.ticket,
            normalized_account_id,
        ).first()

        if exists:
            skipped += 1
            LOGGER.info(
                "Skipping duplicate uploaded trade ticket=%s user_id=%s account_id=%s",
                t.ticket,
                current_user.id,
                normalized_account_id or "(none)",
            )
            continue

        fallback_time = t.time or t.close_time or t.open_time or datetime.utcnow()
        close_time = t.close_time or fallback_time
        open_time = t.open_time or fallback_time
        entry_price = t.entry_price if t.entry_price is not None else t.price
        exit_price = t.exit_price if t.exit_price is not None else t.price

        if entry_price is None or exit_price is None:
            skipped += 1
            LOGGER.warning(
                "Skipping uploaded trade with missing price ticket=%s user_id=%s",
                t.ticket,
                current_user.id,
            )
            continue

        new_trade = Trade(
            user_id=current_user.id,
            symbol=t.symbol,
            profit=t.profit,
            volume=t.volume,
            entry_price=entry_price,
            exit_price=exit_price,
            open_time=open_time,
            close_time=close_time,
            duration=t.duration or 0,
            ticket=t.ticket,
            trade_type=t.trade_type or t.type or "unknown",
            time=close_time,
            strategy=t.strategy,
            notes=t.notes,
            emotion=t.emotion,
            account_id=normalized_account_id,
            account_name=account_name or None,
        )

        db.add(new_trade)
        saved += 1

        if normalized_account_id:
            discovered_accounts.add((normalized_account_id, account_name or normalized_account_id))

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        LOGGER.exception("Trade upload failed on database integrity check")
        raise HTTPException(
            status_code=409,
            detail="Upload contained duplicate or conflicting trades. Refresh and retry.",
        ) from exc

    for account_id, account_name in sorted(discovered_accounts):
        LOGGER.info(
            "Upload discovered account user_id=%s account_id=%s account_name=%s",
            current_user.id,
            account_id,
            account_name,
        )

    LOGGER.info(
        "Trade upload persisted saved=%s skipped=%s received=%s user_id=%s accounts=%s",
        saved,
        skipped,
        len(trades),
        current_user.id,
        [account_id for account_id, _ in sorted(discovered_accounts)],
    )

    return {
        "message": "Trades uploaded",
        "saved": saved,
        "skipped": skipped,
        "total_received": len(trades),
    }


@router.put("/{trade_id}")
def update_trade(
    trade_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = (
        db.query(Trade)
        .filter(
            Trade.id == trade_id,
            Trade.user_id == current_user.id,
        )
        .first()
    )

    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    trade.strategy = data.get("strategy")
    trade.notes = data.get("notes")
    trade.emotion = data.get("emotion")

    db.commit()

    return {"message": "Trade updated"}
