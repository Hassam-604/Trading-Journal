"""
SQLAlchemy ORM models — application data and single-user authentication.

Settings, SetupTag, MistakeTag, Trade, PlannedTrade, LevelTest, Screenshot
"""

from datetime import date, time, datetime

from sqlalchemy import (
    Column, Integer, Float, String, Text, Boolean,
    Date, Time, DateTime, ForeignKey,
)
from sqlalchemy.orm import relationship

from .database import Base


# ─── 1. Settings (singleton) ────────────────────────────────────

class Settings(Base):
    __tablename__ = "settings"

    id              = Column(Integer, primary_key=True, default=1)
    starting_balance = Column(Float, default=0.0)
    default_risk    = Column(Float, default=10.0)
    currency        = Column(String(10), default="USD")
    default_pair    = Column(String(20), default="XAUUSD")
    default_rr      = Column(Float, default=2.0)


# ─── Authentication ─────────────────────────────────────────────

class AuthCredential(Base):
    __tablename__ = "auth_credentials"

    id              = Column(Integer, primary_key=True, default=1)
    password_hash   = Column(String(200), nullable=False)
    session_version = Column(Integer, nullable=False, default=1)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)


# ─── 2. Setup Tags ──────────────────────────────────────────────

class SetupTag(Base):
    __tablename__ = "setup_tags"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    name       = Column(String(100), unique=True, nullable=False)
    is_default = Column(Boolean, default=False)


# ─── 3. Mistake Tags ────────────────────────────────────────────

class MistakeTag(Base):
    __tablename__ = "mistake_tags"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    name       = Column(String(100), unique=True, nullable=False)
    is_default = Column(Boolean, default=False)


# ─── 4. Trade ────────────────────────────────────────────────────

class Trade(Base):
    __tablename__ = "trades"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    date          = Column(Date, nullable=False)
    time          = Column(Time, nullable=False)
    pair          = Column(String(20), default="XAUUSD")
    session       = Column(String(20), nullable=False)          # Asia / London / New York / Other
    direction     = Column(String(10), nullable=False)          # Buy / Sell
    entry_price   = Column(Float, nullable=False)
    stop_loss     = Column(Float, nullable=False)
    take_profit   = Column(Float, nullable=False)
    risk          = Column(Float, nullable=False)
    rr            = Column(Float, nullable=False)
    setup         = Column(String(200), nullable=True)
    result        = Column(String(10), nullable=False)          # Win / Loss / BE

    # Auto-calculated
    pnl           = Column(Float, nullable=False, default=0.0)
    r_multiple    = Column(Float, nullable=False, default=0.0)

    # Optional SMC/ICT context
    daily_bias    = Column(String(10), nullable=True)
    hourly_bias   = Column(String(10), nullable=True)
    m30_bias      = Column(String(10), nullable=True)
    m15_bias      = Column(String(10), nullable=True)
    m5_bias       = Column(String(10), nullable=True)
    m1_bias       = Column(String(10), nullable=True)

    liquidity     = Column(String(50), nullable=True)
    displacement  = Column(String(20), nullable=True)
    rule_followed = Column(String(20), nullable=True)

    mistake       = Column(String(200), nullable=True)
    lesson        = Column(Text, nullable=True)
    notes         = Column(Text, nullable=True)

    is_reviewed   = Column(Boolean, default=False)
    reviewed_at   = Column(DateTime, nullable=True)

    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    screenshots   = relationship("Screenshot", back_populates="trade",
                                 foreign_keys="Screenshot.trade_id",
                                 cascade="all, delete-orphan")


# ─── 5. Planned Trade (Missed) ──────────────────────────────────

class PlannedTrade(Base):
    __tablename__ = "planned_trades"

    id                    = Column(Integer, primary_key=True, autoincrement=True)
    planned_date          = Column(Date, nullable=False)
    pair                  = Column(String(20), default="XAUUSD")
    direction             = Column(String(10), nullable=False)
    planned_entry         = Column(Float, nullable=False)
    invalidation          = Column(Float, nullable=True)
    target                = Column(Float, nullable=True)
    expected_rr           = Column(Float, nullable=True)
    session               = Column(String(20), nullable=True)
    setup                 = Column(String(200), nullable=True)
    timeframe             = Column(String(10), nullable=True)
    reason_not_activated  = Column(String(100), nullable=True)
    status                = Column(String(20), default="Waiting")  # Waiting / Not Activated / Later Tested / Invalidated
    notes                 = Column(Text, nullable=True)

    created_at            = Column(DateTime, default=datetime.utcnow)
    updated_at            = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    level_tests           = relationship("LevelTest", back_populates="planned_trade",
                                         cascade="all, delete-orphan")
    screenshots           = relationship("Screenshot", back_populates="planned_trade",
                                         foreign_keys="Screenshot.planned_trade_id",
                                         cascade="all, delete-orphan")


# ─── 6. Level Test ──────────────────────────────────────────────

class LevelTest(Base):
    __tablename__ = "level_tests"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    planned_trade_id = Column(Integer, ForeignKey("planned_trades.id"), nullable=False)
    test_date        = Column(Date, nullable=False)
    test_number      = Column(Integer, nullable=False)          # Auto-numbered per planned trade
    price            = Column(Float, nullable=True)
    reaction         = Column(String(20), nullable=False)       # Strong / Moderate / Weak / No Reaction
    level_status     = Column(String(30), nullable=False)       # Respected / Partially Respected / Broken
    notes            = Column(Text, nullable=True)

    created_at       = Column(DateTime, default=datetime.utcnow)

    # Relationships
    planned_trade    = relationship("PlannedTrade", back_populates="level_tests")
    screenshots      = relationship("Screenshot", back_populates="level_test",
                                     foreign_keys="Screenshot.level_test_id",
                                     cascade="all, delete-orphan")


# ─── 7. Screenshot ──────────────────────────────────────────────

class Screenshot(Base):
    __tablename__ = "screenshots"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    trade_id         = Column(Integer, ForeignKey("trades.id"), nullable=True)
    planned_trade_id = Column(Integer, ForeignKey("planned_trades.id"), nullable=True)
    level_test_id    = Column(Integer, ForeignKey("level_tests.id"), nullable=True)
    category         = Column(String(50), default="general")    # HTF / 15M / 5M / 1M / Before entry / After entry / Result / general
    filename         = Column(String(255), nullable=False)
    original_name    = Column(String(255), nullable=True)

    created_at       = Column(DateTime, default=datetime.utcnow)

    # Relationships
    trade            = relationship("Trade", back_populates="screenshots",
                                    foreign_keys=[trade_id])
    planned_trade    = relationship("PlannedTrade", back_populates="screenshots",
                                    foreign_keys=[planned_trade_id])
    level_test       = relationship("LevelTest", back_populates="screenshots",
                                    foreign_keys=[level_test_id])
