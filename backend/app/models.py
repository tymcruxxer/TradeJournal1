from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    api_key = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    trades = relationship("Trade", back_populates="user")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)

    symbol = Column(String, index=True)
    profit = Column(Float)
    volume = Column(Float)

    entry_price = Column(Float)
    exit_price = Column(Float)

    open_time = Column(DateTime)
    close_time = Column(DateTime)

    duration = Column(Integer)

    strategy = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    emotion = Column(String, nullable=True)

    ticket = Column(BigInteger, index=True)
    trade_type = Column(String)

    time = Column(DateTime, index=True)

    # ── Multi-account support ─────────────────────────────────────────────
    account_id = Column(String, nullable=True, index=True)
    account_name = Column(String, nullable=True)

    user = relationship("User", back_populates="trades")


Index("idx_trade_time", Trade.time)
Index("idx_trade_user_account", Trade.user_id, Trade.account_id)