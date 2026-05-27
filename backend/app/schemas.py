from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


MAX_TEXT_LENGTH = 2000


def _clean_optional_text(value: Optional[str], max_length: int) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        return value

    cleaned = value.strip()
    if not cleaned:
        return None

    return cleaned[:max_length]


# ✅ CREATE (used internally if needed)
class TradeCreate(BaseModel):
    symbol: str
    profit: float
    volume: float

    entry_price: float
    exit_price: float

    open_time: datetime
    close_time: datetime
    duration: int

    trade_type: str
    ticket: int

    strategy: Optional[str] = None
    notes: Optional[str] = None
    emotion: Optional[str] = None

    # ── Multi-account support ─────────────────────────────────────────────
    account_id: Optional[str] = None
    account_name: Optional[str] = None


# ✅ RESPONSE (what frontend receives)
class TradeResponse(TradeCreate):
    id: int

    class Config:
        from_attributes = True


class TradeUpload(BaseModel):
    symbol: str = Field(min_length=1, max_length=40)
    profit: float
    volume: float = Field(ge=0)
    ticket: int = Field(gt=0)

    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    price: Optional[float] = None

    open_time: Optional[datetime] = None
    close_time: Optional[datetime] = None
    time: Optional[datetime] = None
    duration: Optional[int] = None

    trade_type: Optional[str] = Field(default=None, max_length=32)
    type: Optional[str] = Field(default=None, max_length=32)

    strategy: Optional[str] = Field(default=None, max_length=120)
    notes: Optional[str] = Field(default=None, max_length=MAX_TEXT_LENGTH)
    emotion: Optional[str] = Field(default=None, max_length=120)

    # ── Multi-account support ─────────────────────────────────────────────
    account_id: Optional[str] = Field(default=None, max_length=80)
    account_name: Optional[str] = Field(default=None, max_length=120)

    @field_validator(
        "symbol",
        "trade_type",
        "type",
        "strategy",
        "emotion",
        "account_id",
        "account_name",
        mode="before",
    )
    @classmethod
    def clean_short_text(cls, value):
        return _clean_optional_text(value, 120) if value is not None else value

    @field_validator("notes", mode="before")
    @classmethod
    def clean_notes(cls, value):
        return _clean_optional_text(value, MAX_TEXT_LENGTH)


class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ApiKeyResponse(BaseModel):
    api_key: Optional[str]
