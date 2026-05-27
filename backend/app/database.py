"""
Database engine and session management.

Reads settings from config.py so that switching between SQLite (local dev)
and PostgreSQL (production) requires nothing more than the DATABASE_URL env var.
"""

import logging

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings


# ── Engine ─────────────────────────────────────────────────────────────────
_engine_kwargs = {"pool_pre_ping": True}

# SQLite needs check_same_thread=False; PostgreSQL does not support it.
if settings.is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.database_url, **_engine_kwargs)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()
LOGGER = logging.getLogger(__name__)


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Schema migration helper (for the auth / user_id columns added later) ──
def ensure_auth_schema():
    """
    Backward-compatible migration for databases that were created before the
    auth columns existed.  This is intentionally SQLite-friendly.

    With a fresh database (or PostgreSQL in production) the models already
    define all columns, so the only thing we *must* create are the unique
    indexes that ``Base.metadata.create_all`` does *not* emit automatically
    (custom composite indexes, etc.).
    """
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    # ── Users table ────────────────────────────────────────────────────
    if "users" in table_names:
        user_columns = {column["name"] for column in inspector.get_columns("users")}

        if "api_key" not in user_columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE users ADD COLUMN api_key VARCHAR")
                )

        with engine.begin() as connection:
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_api_key "
                    "ON users (api_key)"
                )
            )

    # ── Trades table ───────────────────────────────────────────────────
    if "trades" not in table_names:
        return

    trade_columns = {column["name"] for column in inspector.get_columns("trades")}

    if "user_id" not in trade_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE trades ADD COLUMN user_id INTEGER")
            )
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_trades_user_id "
                    "ON trades (user_id)"
                )
            )

    # ── account_id / account_name columns (added for multi-account support) ─
    if "trades" in table_names:
        trade_columns = {column["name"] for column in inspector.get_columns("trades")}

        if "account_id" not in trade_columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE trades ADD COLUMN account_id VARCHAR")
                )
                connection.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS ix_trades_account_id "
                        "ON trades (account_id)"
                    )
                )

        if "account_name" not in trade_columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE trades ADD COLUMN account_name VARCHAR")
                )

        with engine.begin() as connection:
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_trade_user_account "
                    "ON trades (user_id, account_id)"
                )
            )

    for index in inspector.get_indexes("trades"):
        name = index.get("name")
        columns = index.get("column_names") or []
        unique = bool(index.get("unique"))

        if not name or not unique:
            continue

        if columns == ["ticket"] or columns == ["user_id", "ticket"]:
            LOGGER.info("Dropping legacy unique trades index %s on columns %s", name, columns)
            with engine.begin() as connection:
                connection.execute(text(f"DROP INDEX IF EXISTS {name}"))

    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_trade_user_account_ticket "
                "ON trades (user_id, COALESCE(account_id, ''), ticket)"
            )
        )

        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_trades_ticket "
                "ON trades (ticket)"
            )
        )
