"""
Pydantic schemas for request validation and response serialization.
"""

from __future__ import annotations

from datetime import date, time, datetime
from typing import Optional, List

from pydantic import BaseModel, Field, field_validator


# ═══════════════════════════════════════════════════════════════
# Settings
# ═══════════════════════════════════════════════════════════════

class SettingsBase(BaseModel):
    starting_balance: float = 0.0
    default_risk: float = 10.0
    currency: str = "USD"
    default_pair: str = "XAUUSD"
    default_rr: float = 2.0

class SettingsUpdate(BaseModel):
    starting_balance: Optional[float] = None
    default_risk: Optional[float] = None
    currency: Optional[str] = None
    default_pair: Optional[str] = None
    default_rr: Optional[float] = None

class SettingsOut(SettingsBase):
    id: int
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════
# Setup Tags
# ═══════════════════════════════════════════════════════════════

class SetupTagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class SetupTagOut(BaseModel):
    id: int
    name: str
    is_default: bool
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════
# Mistake Tags
# ═══════════════════════════════════════════════════════════════

class MistakeTagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class MistakeTagOut(BaseModel):
    id: int
    name: str
    is_default: bool
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════
# Screenshot
# ═══════════════════════════════════════════════════════════════

class ScreenshotOut(BaseModel):
    id: int
    trade_id: Optional[int] = None
    planned_trade_id: Optional[int] = None
    level_test_id: Optional[int] = None
    category: str = "general"
    filename: str
    original_name: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════
# Trade
# ═══════════════════════════════════════════════════════════════

class TradeCreate(BaseModel):
    date: date
    time: time
    pair: str = "XAUUSD"
    session: str                    # Asia / London / New York / Other
    direction: str                  # Buy / Sell
    entry_price: float
    stop_loss: float
    take_profit: float
    risk: float = Field(..., gt=0)
    rr: float
    setup: Optional[str] = None
    result: str                     # Win / Loss / BE

    # Optional fields
    daily_bias: Optional[str] = None
    hourly_bias: Optional[str] = None
    m30_bias: Optional[str] = None
    m15_bias: Optional[str] = None
    m5_bias: Optional[str] = None
    m1_bias: Optional[str] = None
    liquidity: Optional[str] = None
    displacement: Optional[str] = None
    rule_followed: Optional[str] = None
    mistake: Optional[str] = None
    lesson: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("result")
    @classmethod
    def validate_result(cls, v: str) -> str:
        if v not in ("Win", "Loss", "BE"):
            raise ValueError("result must be Win, Loss, or BE")
        return v

    @field_validator("direction")
    @classmethod
    def validate_direction(cls, v: str) -> str:
        if v not in ("Buy", "Sell"):
            raise ValueError("direction must be Buy or Sell")
        return v

    @field_validator("session")
    @classmethod
    def validate_session(cls, v: str) -> str:
        if v not in ("Asia", "London", "New York", "Other"):
            raise ValueError("session must be Asia, London, New York, or Other")
        return v


class TradeUpdate(BaseModel):
    date: Optional[date] = None
    time: Optional[time] = None
    pair: Optional[str] = None
    session: Optional[str] = None
    direction: Optional[str] = None
    entry_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    risk: Optional[float] = Field(None, gt=0)
    rr: Optional[float] = None
    setup: Optional[str] = None
    result: Optional[str] = None
    daily_bias: Optional[str] = None
    hourly_bias: Optional[str] = None
    m30_bias: Optional[str] = None
    m15_bias: Optional[str] = None
    m5_bias: Optional[str] = None
    m1_bias: Optional[str] = None
    liquidity: Optional[str] = None
    displacement: Optional[str] = None
    rule_followed: Optional[str] = None
    mistake: Optional[str] = None
    lesson: Optional[str] = None
    notes: Optional[str] = None
    is_reviewed: Optional[bool] = None

    @field_validator("result")
    @classmethod
    def validate_result(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("Win", "Loss", "BE"):
            raise ValueError("result must be Win, Loss, or BE")
        return v

    @field_validator("direction")
    @classmethod
    def validate_direction(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("Buy", "Sell"):
            raise ValueError("direction must be Buy or Sell")
        return v


class TradeOut(BaseModel):
    id: int
    date: date
    time: time
    pair: str
    session: str
    direction: str
    entry_price: float
    stop_loss: float
    take_profit: float
    risk: float
    rr: float
    setup: Optional[str] = None
    result: str
    pnl: float
    r_multiple: float
    daily_bias: Optional[str] = None
    hourly_bias: Optional[str] = None
    m30_bias: Optional[str] = None
    m15_bias: Optional[str] = None
    m5_bias: Optional[str] = None
    m1_bias: Optional[str] = None
    liquidity: Optional[str] = None
    displacement: Optional[str] = None
    rule_followed: Optional[str] = None
    mistake: Optional[str] = None
    lesson: Optional[str] = None
    notes: Optional[str] = None
    is_reviewed: bool = False
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    screenshots: List[ScreenshotOut] = []
    model_config = {"from_attributes": True}


class GalleryScreenshotOut(BaseModel):
    id: int
    trade_id: Optional[int] = None
    category: str = "general"
    filename: str
    original_name: Optional[str] = None
    created_at: Optional[datetime] = None

    # Linked Trade metadata for gallery filtering and lightbox
    trade_date: Optional[date] = None
    trade_time: Optional[time] = None
    pair: Optional[str] = None
    session: Optional[str] = None
    direction: Optional[str] = None
    entry_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    risk: Optional[float] = None
    rr: Optional[float] = None
    r_multiple: Optional[float] = None
    pnl: Optional[float] = None
    result: Optional[str] = None
    setup: Optional[str] = None
    mistake: Optional[str] = None
    lesson: Optional[str] = None
    is_reviewed: bool = False
    reviewed_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class SetupAnalysisReport(BaseModel):
    setup_name: str
    number_of_trades: int = 0
    wins: int = 0
    losses: int = 0
    breakeven: int = 0
    win_rate: float = 0.0
    total_pnl: float = 0.0
    total_r: float = 0.0
    avg_r: float = 0.0
    screenshots: List[GalleryScreenshotOut] = []



# ═══════════════════════════════════════════════════════════════
# Planned Trade (Missed)
# ═══════════════════════════════════════════════════════════════

class PlannedTradeCreate(BaseModel):
    planned_date: date
    pair: str = "XAUUSD"
    direction: str
    planned_entry: float
    invalidation: Optional[float] = None
    target: Optional[float] = None
    expected_rr: Optional[float] = None
    session: Optional[str] = None
    setup: Optional[str] = None
    timeframe: Optional[str] = None
    reason_not_activated: Optional[str] = None
    status: str = "Waiting"
    notes: Optional[str] = None

    @field_validator("direction")
    @classmethod
    def validate_direction(cls, v: str) -> str:
        if v not in ("Buy", "Sell"):
            raise ValueError("direction must be Buy or Sell")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = ("Waiting", "Not Activated", "Later Tested", "Invalidated")
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


class PlannedTradeUpdate(BaseModel):
    planned_date: Optional[date] = None
    pair: Optional[str] = None
    direction: Optional[str] = None
    planned_entry: Optional[float] = None
    invalidation: Optional[float] = None
    target: Optional[float] = None
    expected_rr: Optional[float] = None
    session: Optional[str] = None
    setup: Optional[str] = None
    timeframe: Optional[str] = None
    reason_not_activated: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class PlannedTradeOut(BaseModel):
    id: int
    planned_date: date
    pair: str
    direction: str
    planned_entry: float
    invalidation: Optional[float] = None
    target: Optional[float] = None
    expected_rr: Optional[float] = None
    session: Optional[str] = None
    setup: Optional[str] = None
    timeframe: Optional[str] = None
    reason_not_activated: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    level_tests: List["LevelTestOut"] = []
    screenshots: List[ScreenshotOut] = []
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════
# Level Test
# ═══════════════════════════════════════════════════════════════

class LevelTestCreate(BaseModel):
    planned_trade_id: int
    test_date: date
    price: Optional[float] = None
    reaction: str               # Strong / Moderate / Weak / No Reaction
    level_status: str           # Respected / Partially Respected / Broken
    notes: Optional[str] = None

    @field_validator("reaction")
    @classmethod
    def validate_reaction(cls, v: str) -> str:
        allowed = ("Strong", "Moderate", "Weak", "No Reaction")
        if v not in allowed:
            raise ValueError(f"reaction must be one of {allowed}")
        return v

    @field_validator("level_status")
    @classmethod
    def validate_level_status(cls, v: str) -> str:
        allowed = ("Respected", "Partially Respected", "Broken")
        if v not in allowed:
            raise ValueError(f"level_status must be one of {allowed}")
        return v


class LevelTestUpdate(BaseModel):
    test_date: Optional[date] = None
    price: Optional[float] = None
    reaction: Optional[str] = None
    level_status: Optional[str] = None
    notes: Optional[str] = None


class LevelTestOut(BaseModel):
    id: int
    planned_trade_id: int
    test_date: date
    test_number: int
    price: Optional[float] = None
    reaction: str
    level_status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    screenshots: List[ScreenshotOut] = []
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════
# Analytics / Dashboard response schemas
# ═══════════════════════════════════════════════════════════════

class DashboardKPI(BaseModel):
    total_trades: int = 0
    wins: int = 0
    losses: int = 0
    breakeven: int = 0
    win_rate: float = 0.0
    total_pnl: float = 0.0
    total_r: float = 0.0
    profit_factor: float = 0.0
    avg_r: float = 0.0
    largest_win: float = 0.0
    largest_loss: float = 0.0
    avg_win: float = 0.0
    avg_loss: float = 0.0
    current_balance: float = 0.0


class SessionPerformance(BaseModel):
    session: str
    trades: int = 0
    wins: int = 0
    losses: int = 0
    breakeven: int = 0
    win_rate: float = 0.0
    pnl: float = 0.0
    avg_r: float = 0.0


class SetupPerformance(BaseModel):
    setup: str
    trades: int = 0
    wins: int = 0
    losses: int = 0
    win_rate: float = 0.0
    pnl: float = 0.0
    avg_r: float = 0.0


class DirectionPerformance(BaseModel):
    direction: str
    trades: int = 0
    wins: int = 0
    losses: int = 0
    win_rate: float = 0.0
    pnl: float = 0.0
    avg_r: float = 0.0


class MistakeReport(BaseModel):
    mistake: str
    occurrences: int = 0
    total_pnl: float = 0.0
    avg_pnl: float = 0.0


class RetestPerformanceRow(BaseModel):
    retest: str
    tested: int = 0
    respected: int = 0
    broken: int = 0
    respect_rate: float = 0.0


class LevelValidityStats(BaseModel):
    total_planned: int = 0
    total_tested: int = 0
    levels_respected: int = 0
    levels_broken: int = 0
    respect_rate: float = 0.0
    avg_retests_before_break: float = 0.0
    retests: List[RetestPerformanceRow] = []



class EquityPoint(BaseModel):
    date: date
    cumulative_pnl: float
    trade_id: int


class MonthlyPnl(BaseModel):
    month: str
    trades: int = 0
    pnl: float = 0.0
    win_rate: float = 0.0
    wins: int = 0
    losses: int = 0
    total_r: float = 0.0


class WeeklyPnl(BaseModel):
    week_label: str       # e.g. "Week 1 (1–7)"
    week_num: int
    trades: int = 0
    wins: int = 0
    losses: int = 0
    breakeven: int = 0
    win_rate: float = 0.0
    pnl: float = 0.0
    total_r: float = 0.0


class MonthlyBreakdown(BaseModel):
    month: str            # e.g. "2026-09"
    month_label: str      # e.g. "September 2026"
    trades: int = 0
    wins: int = 0
    losses: int = 0
    breakeven: int = 0
    win_rate: float = 0.0
    pnl: float = 0.0
    total_r: float = 0.0
    weeks: List[WeeklyPnl] = []


class YearlyPerformance(BaseModel):
    year: int
    trades: int = 0
    wins: int = 0
    losses: int = 0
    breakeven: int = 0
    win_rate: float = 0.0
    pnl: float = 0.0
    total_r: float = 0.0
    months: List[MonthlyBreakdown] = []


class CalendarDay(BaseModel):
    date: date
    trades: int = 0
    pnl: float = 0.0
    wins: int = 0
    losses: int = 0
    breakeven: int = 0


class AdvancedAnalyticsReport(BaseModel):
    kpis: DashboardKPI
    setups: List[SetupPerformance] = []
    sessions: List[SessionPerformance] = []
    directions: List[DirectionPerformance] = []
    mistakes: List[MistakeReport] = []



