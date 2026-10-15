"""
CRUD operations for every model.
All P&L / R calculations happen here — the user never calculates manually.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional, List

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload


from . import models, schemas


# ═══════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════

def _calc_pnl(result: str, risk: float, rr: float) -> float:
    """Auto-calculate P&L from result, risk, and RR."""
    if result == "Win":
        return round(rr * risk, 2)
    elif result == "Loss":
        return round(-abs(risk), 2)
    return 0.0  # BE


def _calc_r(result: str, rr: float) -> float:
    """Auto-calculate R-multiple."""
    if result == "Win":
        return round(rr, 2)
    elif result == "Loss":
        return -1.0
    return 0.0  # BE


# ═══════════════════════════════════════════════════════════════
# Settings
# ═══════════════════════════════════════════════════════════════

def get_settings(db: Session) -> models.Settings:
    s = db.query(models.Settings).first()
    if not s:
        s = models.Settings(id=1)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


def update_settings(db: Session, data: schemas.SettingsUpdate) -> models.Settings:
    s = get_settings(db)
    for k, v in data.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


# ═══════════════════════════════════════════════════════════════
# Setup Tags
# ═══════════════════════════════════════════════════════════════

DEFAULT_SETUPS = []


def seed_setup_tags(db: Session) -> None:
    """Default setup tags removed per user request."""
    pass


def get_setup_tags(db: Session) -> List[models.SetupTag]:
    return db.query(models.SetupTag).order_by(models.SetupTag.name).all()


def create_setup_tag(db: Session, data: schemas.SetupTagCreate) -> models.SetupTag:
    tag = models.SetupTag(name=data.name, is_default=False)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def delete_setup_tag(db: Session, tag_id: int) -> bool:
    tag = db.query(models.SetupTag).get(tag_id)
    if not tag:
        return False
    db.delete(tag)
    db.commit()
    return True


# ═══════════════════════════════════════════════════════════════
# Mistake Tags
# ═══════════════════════════════════════════════════════════════

DEFAULT_MISTAKES = []


def seed_mistake_tags(db: Session) -> None:
    """Default mistake tags removed per user request."""
    pass


def get_mistake_tags(db: Session) -> List[models.MistakeTag]:
    return db.query(models.MistakeTag).order_by(models.MistakeTag.name).all()


def create_mistake_tag(db: Session, data: schemas.MistakeTagCreate) -> models.MistakeTag:
    tag = models.MistakeTag(name=data.name, is_default=False)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def delete_mistake_tag(db: Session, tag_id: int) -> bool:
    tag = db.query(models.MistakeTag).get(tag_id)
    if not tag:
        return False
    db.delete(tag)
    db.commit()
    return True


# ═══════════════════════════════════════════════════════════════
# Trades
# ═══════════════════════════════════════════════════════════════

def create_trade(db: Session, data: schemas.TradeCreate) -> models.Trade:
    pnl = _calc_pnl(data.result, data.risk, data.rr)
    r   = _calc_r(data.result, data.rr)
    trade = models.Trade(
        **data.model_dump(),
        pnl=pnl,
        r_multiple=r,
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return trade


def get_trade(db: Session, trade_id: int) -> Optional[models.Trade]:
    return (
        db.query(models.Trade)
        .options(joinedload(models.Trade.screenshots))
        .filter(models.Trade.id == trade_id)
        .first()
    )


def _apply_trade_search(query, search: Optional[str]):
    if not search or not search.strip():
        return query

    term = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    pattern = f"%{term}%"
    return query.filter(or_(
        models.Trade.pair.ilike(pattern, escape="\\"),
        models.Trade.setup.ilike(pattern, escape="\\"),
        models.Trade.mistake.ilike(pattern, escape="\\"),
        models.Trade.lesson.ilike(pattern, escape="\\"),
        models.Trade.notes.ilike(pattern, escape="\\"),
    ))


def get_trades(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    pair: Optional[str] = None,
    session_filter: Optional[str] = None,
    direction: Optional[str] = None,
    setup: Optional[str] = None,
    result: Optional[str] = None,
    rule_followed: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    sort_by: str = "date",
    sort_dir: str = "desc",
) -> List[models.Trade]:
    q = db.query(models.Trade).options(joinedload(models.Trade.screenshots))

    if pair:
        q = q.filter(models.Trade.pair == pair)
    if session_filter:
        q = q.filter(models.Trade.session == session_filter)
    if direction:
        q = q.filter(models.Trade.direction == direction)
    if setup:
        q = q.filter(models.Trade.setup.contains(setup))
    if result:
        q = q.filter(models.Trade.result == result)
    if rule_followed:
        q = q.filter(models.Trade.rule_followed == rule_followed)
    if date_from:
        q = q.filter(models.Trade.date >= date_from)
    if date_to:
        q = q.filter(models.Trade.date <= date_to)
    q = _apply_trade_search(q, search)

    # Sorting
    sort_col = getattr(models.Trade, sort_by, models.Trade.date)
    if sort_dir == "asc":
        q = q.order_by(sort_col.asc(), models.Trade.time.asc())
    else:
        q = q.order_by(sort_col.desc(), models.Trade.time.desc())

    return q.offset(skip).limit(limit).all()


def count_trades(
    db: Session,
    pair: Optional[str] = None,
    session_filter: Optional[str] = None,
    direction: Optional[str] = None,
    setup: Optional[str] = None,
    result: Optional[str] = None,
    rule_followed: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
) -> int:
    q = db.query(func.count(models.Trade.id))
    if pair:
        q = q.filter(models.Trade.pair == pair)
    if session_filter:
        q = q.filter(models.Trade.session == session_filter)
    if direction:
        q = q.filter(models.Trade.direction == direction)
    if setup:
        q = q.filter(models.Trade.setup.contains(setup))
    if result:
        q = q.filter(models.Trade.result == result)
    if rule_followed:
        q = q.filter(models.Trade.rule_followed == rule_followed)
    if date_from:
        q = q.filter(models.Trade.date >= date_from)
    if date_to:
        q = q.filter(models.Trade.date <= date_to)
    q = _apply_trade_search(q, search)
    return q.scalar() or 0


def update_trade(db: Session, trade_id: int, data: schemas.TradeUpdate) -> Optional[models.Trade]:
    trade = db.query(models.Trade).filter(models.Trade.id == trade_id).first()
    if not trade:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(trade, k, v)

    # Recalculate P&L and R if result/risk/rr changed
    result = update_data.get("result", trade.result)
    risk   = update_data.get("risk", trade.risk)
    rr     = update_data.get("rr", trade.rr)
    trade.pnl        = _calc_pnl(result, risk, rr)
    trade.r_multiple = _calc_r(result, rr)

    db.commit()
    db.refresh(trade)
    return trade


def delete_trade(db: Session, trade_id: int) -> bool:
    trade = db.query(models.Trade).filter(models.Trade.id == trade_id).first()
    if not trade:
        return False
    db.delete(trade)
    db.commit()
    return True


def get_all_trades_ordered(db: Session) -> List[models.Trade]:
    """All trades ordered chronologically — used for cumulative P&L."""
    return (
        db.query(models.Trade)
        .order_by(models.Trade.date.asc(), models.Trade.time.asc())
        .all()
    )


# ═══════════════════════════════════════════════════════════════
# Planned Trades
# ═══════════════════════════════════════════════════════════════

def create_planned_trade(db: Session, data: schemas.PlannedTradeCreate) -> models.PlannedTrade:
    pt = models.PlannedTrade(**data.model_dump())
    db.add(pt)
    db.commit()
    db.refresh(pt)
    return pt


def get_planned_trade(db: Session, pt_id: int) -> Optional[models.PlannedTrade]:
    return (
        db.query(models.PlannedTrade)
        .options(
            joinedload(models.PlannedTrade.level_tests).joinedload(models.LevelTest.screenshots),
            joinedload(models.PlannedTrade.screenshots),
        )
        .filter(models.PlannedTrade.id == pt_id)
        .first()
    )


def get_planned_trades(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    direction: Optional[str] = None,
    session_filter: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "planned_date",
    sort_dir: str = "desc",
) -> List[models.PlannedTrade]:
    q = (
        db.query(models.PlannedTrade)
        .options(
            joinedload(models.PlannedTrade.level_tests),
            joinedload(models.PlannedTrade.screenshots),
        )
    )
    if status:
        q = q.filter(models.PlannedTrade.status == status)
    if direction:
        q = q.filter(models.PlannedTrade.direction == direction)
    if session_filter:
        q = q.filter(models.PlannedTrade.session == session_filter)
    if search:
        pattern = f"%{search}%"
        q = q.filter(
            or_(
                models.PlannedTrade.setup.ilike(pattern),
                models.PlannedTrade.notes.ilike(pattern),
                models.PlannedTrade.reason_not_activated.ilike(pattern),
            )
        )

    sort_col = getattr(models.PlannedTrade, sort_by, models.PlannedTrade.planned_date)
    if sort_dir.lower() == "asc":
        q = q.order_by(sort_col.asc(), models.PlannedTrade.id.asc())
    else:
        q = q.order_by(sort_col.desc(), models.PlannedTrade.id.desc())

    return q.offset(skip).limit(limit).all()


def count_planned_trades(
    db: Session,
    status: Optional[str] = None,
    direction: Optional[str] = None,
    session_filter: Optional[str] = None,
    search: Optional[str] = None,
) -> int:
    q = db.query(func.count(models.PlannedTrade.id))
    if status:
        q = q.filter(models.PlannedTrade.status == status)
    if direction:
        q = q.filter(models.PlannedTrade.direction == direction)
    if session_filter:
        q = q.filter(models.PlannedTrade.session == session_filter)
    if search:
        pattern = f"%{search}%"
        q = q.filter(
            or_(
                models.PlannedTrade.setup.ilike(pattern),
                models.PlannedTrade.notes.ilike(pattern),
                models.PlannedTrade.reason_not_activated.ilike(pattern),
            )
        )
    return q.scalar() or 0



def update_planned_trade(db: Session, pt_id: int, data: schemas.PlannedTradeUpdate) -> Optional[models.PlannedTrade]:
    pt = db.query(models.PlannedTrade).filter(models.PlannedTrade.id == pt_id).first()
    if not pt:
        return None
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(pt, k, v)
    db.commit()
    db.refresh(pt)
    return pt


def delete_planned_trade(db: Session, pt_id: int) -> bool:
    pt = db.query(models.PlannedTrade).filter(models.PlannedTrade.id == pt_id).first()
    if not pt:
        return False
    db.delete(pt)
    db.commit()
    return True


# ═══════════════════════════════════════════════════════════════
# Level Tests
# ═══════════════════════════════════════════════════════════════

def _next_test_number(db: Session, planned_trade_id: int) -> int:
    """Get the next test number for a planned trade."""
    max_num = (
        db.query(func.max(models.LevelTest.test_number))
        .filter(models.LevelTest.planned_trade_id == planned_trade_id)
        .scalar()
    )
    return (max_num or 0) + 1


def create_level_test(db: Session, data: schemas.LevelTestCreate) -> models.LevelTest:
    test_num = _next_test_number(db, data.planned_trade_id)
    lt = models.LevelTest(
        planned_trade_id=data.planned_trade_id,
        test_date=data.test_date,
        test_number=test_num,
        price=data.price,
        reaction=data.reaction,
        level_status=data.level_status,
        notes=data.notes,
    )
    db.add(lt)

    # Auto-update the planned trade status to "Later Tested"
    pt = db.query(models.PlannedTrade).filter(
        models.PlannedTrade.id == data.planned_trade_id
    ).first()
    if pt and pt.status in ("Waiting", "Not Activated"):
        pt.status = "Later Tested"

    db.commit()
    db.refresh(lt)
    return lt


def get_level_test(db: Session, lt_id: int) -> Optional[models.LevelTest]:
    return (
        db.query(models.LevelTest)
        .options(joinedload(models.LevelTest.screenshots))
        .filter(models.LevelTest.id == lt_id)
        .first()
    )


def get_level_tests_for_planned(db: Session, planned_trade_id: int) -> List[models.LevelTest]:
    return (
        db.query(models.LevelTest)
        .options(joinedload(models.LevelTest.screenshots))
        .filter(models.LevelTest.planned_trade_id == planned_trade_id)
        .order_by(models.LevelTest.test_number.asc())
        .all()
    )


def get_all_level_tests(db: Session, skip: int = 0, limit: int = 100) -> List[models.LevelTest]:
    return (
        db.query(models.LevelTest)
        .options(joinedload(models.LevelTest.screenshots))
        .order_by(models.LevelTest.test_date.desc())
        .offset(skip).limit(limit).all()
    )


def update_level_test(db: Session, lt_id: int, data: schemas.LevelTestUpdate) -> Optional[models.LevelTest]:
    lt = db.query(models.LevelTest).filter(models.LevelTest.id == lt_id).first()
    if not lt:
        return None
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(lt, k, v)
    db.commit()
    db.refresh(lt)
    return lt


def delete_level_test(db: Session, lt_id: int) -> bool:
    lt = db.query(models.LevelTest).filter(models.LevelTest.id == lt_id).first()
    if not lt:
        return False
    db.delete(lt)
    db.commit()
    return True


# ═══════════════════════════════════════════════════════════════
# Screenshots
# ═══════════════════════════════════════════════════════════════

def create_screenshot(
    db: Session,
    filename: str,
    original_name: str,
    trade_id: Optional[int] = None,
    planned_trade_id: Optional[int] = None,
    level_test_id: Optional[int] = None,
    category: str = "general",
) -> models.Screenshot:
    ss = models.Screenshot(
        trade_id=trade_id,
        planned_trade_id=planned_trade_id,
        level_test_id=level_test_id,
        category=category,
        filename=filename,
        original_name=original_name,
    )
    db.add(ss)
    db.commit()
    db.refresh(ss)
    return ss


def delete_screenshot(db: Session, ss_id: int) -> Optional[str]:
    """Delete screenshot record, return filename for file cleanup."""
    ss = db.query(models.Screenshot).filter(models.Screenshot.id == ss_id).first()
    if not ss:
        return None
    filename = ss.filename
    db.delete(ss)
    db.commit()
    return filename


def get_gallery_screenshots(
    db: Session,
    result: Optional[str] = None,
    setup: Optional[str] = None,
    session: Optional[str] = None,
    direction: Optional[str] = None,
    category: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    min_r: Optional[float] = None,
    is_reviewed: Optional[bool] = None,
) -> List[schemas.GalleryScreenshotOut]:
    query = (
        db.query(models.Screenshot, models.Trade)
        .join(models.Trade, models.Screenshot.trade_id == models.Trade.id)
    )

    if result and result.lower() != "all":
        query = query.filter(models.Trade.result == result)
    if setup and setup.lower() != "all":
        query = query.filter(models.Trade.setup.ilike(f"%{setup}%"))
    if session and session.lower() != "all":
        query = query.filter(models.Trade.session == session)
    if direction and direction.lower() != "all":
        query = query.filter(models.Trade.direction == direction)
    if category and category.lower() != "all":
        query = query.filter(models.Screenshot.category == category)
    if date_from:
        query = query.filter(models.Trade.date >= date_from)
    if date_to:
        query = query.filter(models.Trade.date <= date_to)
    if min_r is not None:
        query = query.filter(models.Trade.r_multiple >= min_r)
    if is_reviewed is not None:
        query = query.filter(models.Trade.is_reviewed == is_reviewed)

    query = query.order_by(
        models.Trade.date.desc(),
        models.Trade.time.desc(),
        models.Screenshot.created_at.desc(),
    )

    results = []
    for ss, trade in query.all():
        results.append(
            schemas.GalleryScreenshotOut(
                id=ss.id,
                trade_id=trade.id,
                category=ss.category or "general",
                filename=ss.filename,
                original_name=ss.original_name,
                created_at=ss.created_at,
                trade_date=trade.date,
                trade_time=trade.time,
                pair=trade.pair,
                session=trade.session,
                direction=trade.direction,
                entry_price=trade.entry_price,
                stop_loss=trade.stop_loss,
                take_profit=trade.take_profit,
                risk=trade.risk,
                rr=trade.rr,
                r_multiple=trade.r_multiple,
                pnl=trade.pnl,
                result=trade.result,
                setup=trade.setup,
                mistake=trade.mistake,
                lesson=trade.lesson,
                is_reviewed=bool(trade.is_reviewed),
                reviewed_at=trade.reviewed_at,
            )
        )
    return results


def get_setup_analysis(
    db: Session,
    setup_name: str,
    result: Optional[str] = None,
    session: Optional[str] = None,
    direction: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    min_r: Optional[float] = None,
) -> schemas.SetupAnalysisReport:
    query = db.query(models.Trade)
    if setup_name and setup_name.lower() != "all":
        query = query.filter(models.Trade.setup.ilike(f"%{setup_name}%"))

    if result and result.lower() != "all":
        query = query.filter(models.Trade.result == result)
    if session and session.lower() != "all":
        query = query.filter(models.Trade.session == session)
    if direction and direction.lower() != "all":
        query = query.filter(models.Trade.direction == direction)
    if date_from:
        query = query.filter(models.Trade.date >= date_from)
    if date_to:
        query = query.filter(models.Trade.date <= date_to)
    if min_r is not None:
        query = query.filter(models.Trade.r_multiple >= min_r)

    trades = query.order_by(models.Trade.date.desc(), models.Trade.time.desc()).all()
    total_trades = len(trades)

    if total_trades == 0:
        return schemas.SetupAnalysisReport(
            setup_name=setup_name,
            number_of_trades=0,
            wins=0,
            losses=0,
            breakeven=0,
            win_rate=0.0,
            total_pnl=0.0,
            total_r=0.0,
            avg_r=0.0,
            screenshots=[],
        )

    wins = sum(1 for t in trades if t.result == "Win")
    losses = sum(1 for t in trades if t.result == "Loss")
    be = sum(1 for t in trades if t.result == "BE")
    win_rate = round((wins / total_trades) * 100, 2)
    total_pnl = round(sum(t.pnl for t in trades), 2)
    total_r = round(sum(t.r_multiple for t in trades), 2)
    avg_r = round(total_r / total_trades, 2)

    trade_ids = [t.id for t in trades]
    screenshots = (
        db.query(models.Screenshot, models.Trade)
        .join(models.Trade, models.Screenshot.trade_id == models.Trade.id)
        .filter(models.Screenshot.trade_id.in_(trade_ids))
        .order_by(models.Trade.date.desc(), models.Screenshot.created_at.desc())
        .all()
    )

    gallery_items = []
    for ss, trade in screenshots:
        gallery_items.append(
            schemas.GalleryScreenshotOut(
                id=ss.id,
                trade_id=trade.id,
                category=ss.category or "general",
                filename=ss.filename,
                original_name=ss.original_name,
                created_at=ss.created_at,
                trade_date=trade.date,
                trade_time=trade.time,
                pair=trade.pair,
                session=trade.session,
                direction=trade.direction,
                entry_price=trade.entry_price,
                stop_loss=trade.stop_loss,
                take_profit=trade.take_profit,
                risk=trade.risk,
                rr=trade.rr,
                r_multiple=trade.r_multiple,
                pnl=trade.pnl,
                result=trade.result,
                setup=trade.setup,
                mistake=trade.mistake,
                lesson=trade.lesson,
                is_reviewed=bool(trade.is_reviewed),
                reviewed_at=trade.reviewed_at,
            )
        )

    return schemas.SetupAnalysisReport(
        setup_name=setup_name,
        number_of_trades=total_trades,
        wins=wins,
        losses=losses,
        breakeven=be,
        win_rate=win_rate,
        total_pnl=total_pnl,
        total_r=total_r,
        avg_r=avg_r,
        screenshots=gallery_items,
    )


def toggle_trade_review(db: Session, trade_id: int, is_reviewed: Optional[bool] = None) -> Optional[models.Trade]:
    trade = db.query(models.Trade).filter(models.Trade.id == trade_id).first()
    if not trade:
        return None
    if is_reviewed is None:
        trade.is_reviewed = not bool(trade.is_reviewed)
    else:
        trade.is_reviewed = is_reviewed

    if trade.is_reviewed:
        trade.reviewed_at = datetime.utcnow()
    else:
        trade.reviewed_at = None

    db.commit()
    db.refresh(trade)
    return trade


def get_review_queue(db: Session, is_reviewed: Optional[bool] = None) -> List[models.Trade]:
    query = db.query(models.Trade).options(joinedload(models.Trade.screenshots))
    if is_reviewed is not None:
        query = query.filter(models.Trade.is_reviewed == is_reviewed)
    return query.order_by(models.Trade.date.desc(), models.Trade.time.desc()).all()



# ═══════════════════════════════════════════════════════════════
# Analytics helpers
# ═══════════════════════════════════════════════════════════════

def get_dashboard_kpi(db: Session) -> schemas.DashboardKPI:
    trades = get_all_trades_ordered(db)
    settings = get_settings(db)

    if not trades:
        return schemas.DashboardKPI(current_balance=settings.starting_balance)

    wins   = [t for t in trades if t.result == "Win"]
    losses = [t for t in trades if t.result == "Loss"]
    bes    = [t for t in trades if t.result == "BE"]

    total      = len(trades)
    win_count  = len(wins)
    loss_count = len(losses)
    be_count   = len(bes)

    total_pnl   = sum(t.pnl for t in trades)
    total_r     = sum(t.r_multiple for t in trades)
    gross_profit = sum(t.pnl for t in wins)
    gross_loss   = sum(abs(t.pnl) for t in losses)

    completed = win_count + loss_count  # exclude BE from win rate denominator
    win_rate  = (win_count / completed * 100) if completed > 0 else 0.0
    pf        = (gross_profit / gross_loss) if gross_loss > 0 else 0.0
    avg_r     = (total_r / total) if total > 0 else 0.0

    largest_win  = max((t.pnl for t in wins), default=0.0)
    largest_loss = min((t.pnl for t in losses), default=0.0)
    avg_win      = (gross_profit / win_count) if win_count > 0 else 0.0
    avg_loss     = (-gross_loss / loss_count) if loss_count > 0 else 0.0

    return schemas.DashboardKPI(
        total_trades=total,
        wins=win_count,
        losses=loss_count,
        breakeven=be_count,
        win_rate=round(win_rate, 1),
        total_pnl=round(total_pnl, 2),
        total_r=round(total_r, 2),
        profit_factor=round(pf, 2),
        avg_r=round(avg_r, 2),
        largest_win=round(largest_win, 2),
        largest_loss=round(largest_loss, 2),
        avg_win=round(avg_win, 2),
        avg_loss=round(avg_loss, 2),
        current_balance=round(settings.starting_balance + total_pnl, 2),
    )


def get_equity_curve(db: Session) -> List[schemas.EquityPoint]:
    trades = get_all_trades_ordered(db)
    cum = 0.0
    points = []
    for t in trades:
        cum += t.pnl
        points.append(schemas.EquityPoint(
            date=t.date, cumulative_pnl=round(cum, 2), trade_id=t.id
        ))
    return points


def get_session_performance(db: Session) -> List[schemas.SessionPerformance]:
    sessions = ["Asia", "London", "New York", "Other"]
    result = []
    for s in sessions:
        trades = db.query(models.Trade).filter(models.Trade.session == s).all()
        if not trades:
            result.append(schemas.SessionPerformance(session=s))
            continue
        wins   = [t for t in trades if t.result == "Win"]
        losses = [t for t in trades if t.result == "Loss"]
        bes    = [t for t in trades if t.result == "BE"]
        completed = len(wins) + len(losses)
        wr = (len(wins) / completed * 100) if completed > 0 else 0.0
        total_r = sum(t.r_multiple for t in trades)
        result.append(schemas.SessionPerformance(
            session=s,
            trades=len(trades),
            wins=len(wins),
            losses=len(losses),
            breakeven=len(bes),
            win_rate=round(wr, 1),
            pnl=round(sum(t.pnl for t in trades), 2),
            avg_r=round(total_r / len(trades), 2) if trades else 0.0,
        ))
    return result


def get_setup_performance(db: Session) -> List[schemas.SetupPerformance]:
    trades = db.query(models.Trade).filter(models.Trade.setup.isnot(None)).all()
    setup_map: dict[str, list[models.Trade]] = {}
    for t in trades:
        if t.setup:
            for tag in t.setup.split(","):
                tag = tag.strip()
                if tag:
                    setup_map.setdefault(tag, []).append(t)

    result = []
    for setup_name, ts in sorted(setup_map.items()):
        wins = [t for t in ts if t.result == "Win"]
        losses = [t for t in ts if t.result == "Loss"]
        completed = len(wins) + len(losses)
        wr = (len(wins) / completed * 100) if completed > 0 else 0.0
        total_r = sum(t.r_multiple for t in ts)
        result.append(schemas.SetupPerformance(
            setup=setup_name,
            trades=len(ts),
            wins=len(wins),
            losses=len(losses),
            win_rate=round(wr, 1),
            pnl=round(sum(t.pnl for t in ts), 2),
            avg_r=round(total_r / len(ts), 2) if ts else 0.0,
        ))
    return result


def get_direction_performance(db: Session) -> List[schemas.DirectionPerformance]:
    result = []
    for d in ["Buy", "Sell"]:
        trades = db.query(models.Trade).filter(models.Trade.direction == d).all()
        if not trades:
            result.append(schemas.DirectionPerformance(direction=d))
            continue
        wins = [t for t in trades if t.result == "Win"]
        losses = [t for t in trades if t.result == "Loss"]
        completed = len(wins) + len(losses)
        wr = (len(wins) / completed * 100) if completed > 0 else 0.0
        total_r = sum(t.r_multiple for t in trades)
        result.append(schemas.DirectionPerformance(
            direction=d,
            trades=len(trades),
            wins=len(wins),
            losses=len(losses),
            win_rate=round(wr, 1),
            pnl=round(sum(t.pnl for t in trades), 2),
            avg_r=round(total_r / len(trades), 2) if trades else 0.0,
        ))
    return result


def get_mistake_report(db: Session) -> List[schemas.MistakeReport]:
    trades = db.query(models.Trade).filter(models.Trade.mistake.isnot(None)).all()
    mistake_map: dict[str, list[models.Trade]] = {}
    for t in trades:
        if t.mistake:
            for tag in t.mistake.split(","):
                tag = tag.strip()
                if tag:
                    mistake_map.setdefault(tag, []).append(t)

    result = []
    for name, ts in sorted(mistake_map.items()):
        total_pnl = sum(t.pnl for t in ts)
        result.append(schemas.MistakeReport(
            mistake=name,
            occurrences=len(ts),
            total_pnl=round(total_pnl, 2),
            avg_pnl=round(total_pnl / len(ts), 2) if ts else 0.0,
        ))
    return result


def get_level_validity_stats(db: Session) -> schemas.LevelValidityStats:
    total_planned = db.query(func.count(models.PlannedTrade.id)).scalar() or 0

    # Planned trades that have at least one level test
    tested_ids = (
        db.query(models.LevelTest.planned_trade_id)
        .distinct()
        .all()
    )
    total_tested = len(tested_ids)

    # A level is "respected" if its latest test is Respected or Partially Respected
    # A level is "broken" if its latest test is Broken
    respected = 0
    broken = 0
    total_retests_before_break = 0
    break_count = 0

    for (pt_id,) in tested_ids:
        tests = (
            db.query(models.LevelTest)
            .filter(models.LevelTest.planned_trade_id == pt_id)
            .order_by(models.LevelTest.test_number.asc())
            .all()
        )
        if not tests:
            continue

        latest = tests[-1]
        if latest.level_status == "Broken":
            broken += 1
            # Count retests before break
            total_retests_before_break += len(tests)
            break_count += 1
        else:
            respected += 1

    respect_rate = (respected / total_tested * 100) if total_tested > 0 else 0.0
    avg_retests = (total_retests_before_break / break_count) if break_count > 0 else 0.0

    # Calculate Retest Performance breakdown (1st, 2nd, 3rd, 4+)
    all_tests = db.query(models.LevelTest).all()
    buckets = {
        "1st": {"tested": 0, "respected": 0, "broken": 0},
        "2nd": {"tested": 0, "respected": 0, "broken": 0},
        "3rd": {"tested": 0, "respected": 0, "broken": 0},
        "4+":  {"tested": 0, "respected": 0, "broken": 0},
    }
    for lt in all_tests:
        if lt.test_number == 1:
            key = "1st"
        elif lt.test_number == 2:
            key = "2nd"
        elif lt.test_number == 3:
            key = "3rd"
        else:
            key = "4+"

        buckets[key]["tested"] += 1
        if lt.level_status in ("Respected", "Partially Respected"):
            buckets[key]["respected"] += 1
        elif lt.level_status == "Broken":
            buckets[key]["broken"] += 1

    retest_rows = []
    for label in ["1st", "2nd", "3rd", "4+"]:
        b = buckets[label]
        rr = (b["respected"] / b["tested"] * 100) if b["tested"] > 0 else 0.0
        retest_rows.append(schemas.RetestPerformanceRow(
            retest=label,
            tested=b["tested"],
            respected=b["respected"],
            broken=b["broken"],
            respect_rate=round(rr, 1),
        ))

    return schemas.LevelValidityStats(
        total_planned=total_planned,
        total_tested=total_tested,
        levels_respected=respected,
        levels_broken=broken,
        respect_rate=round(respect_rate, 1),
        avg_retests_before_break=round(avg_retests, 1),
        retests=retest_rows,
    )



def get_monthly_pnl(db: Session) -> List[schemas.MonthlyPnl]:
    trades = get_all_trades_ordered(db)
    month_map: dict[str, list[models.Trade]] = {}
    for t in trades:
        ym = t.date.strftime("%Y-%m")
        month_map.setdefault(ym, []).append(t)

    result = []
    for ym in sorted(month_map.keys()):
        ts = month_map[ym]
        wins = [t for t in ts if t.result == "Win"]
        losses = [t for t in ts if t.result == "Loss"]
        completed = len(wins) + len(losses)
        wr = (len(wins) / completed * 100) if completed > 0 else 0.0
        pnl = sum(t.pnl for t in ts)
        total_r = sum(t.r_multiple for t in ts)
        result.append(schemas.MonthlyPnl(
            month=ym,
            trades=len(ts),
            pnl=round(pnl, 2),
            win_rate=round(wr, 1),
            wins=len(wins),
            losses=len(losses),
            total_r=round(total_r, 2),
        ))
    return result


def _week_bucket(day: int) -> int:
    """Return week bucket 1-5 based on day of month (spec: W1=1-7, W2=8-14, W3=15-21, W4=22-28, W5=29+)."""
    if day <= 7:
        return 1
    elif day <= 14:
        return 2
    elif day <= 21:
        return 3
    elif day <= 28:
        return 4
    else:
        return 5


_WEEK_LABELS = {
    1: "Week 1 (1–7)",
    2: "Week 2 (8–14)",
    3: "Week 3 (15–21)",
    4: "Week 4 (22–28)",
    5: "Week 5 (29+)",
}

_MONTH_NAMES = {
    "01": "January", "02": "February", "03": "March",
    "04": "April", "05": "May", "06": "June",
    "07": "July", "08": "August", "09": "September",
    "10": "October", "11": "November", "12": "December",
}


def _build_stats(ts: list) -> dict:
    wins   = [t for t in ts if t.result == "Win"]
    losses = [t for t in ts if t.result == "Loss"]
    bes    = [t for t in ts if t.result == "BE"]
    completed = len(wins) + len(losses)
    wr  = (len(wins) / completed * 100) if completed > 0 else 0.0
    pnl = sum(t.pnl for t in ts)
    total_r = sum(t.r_multiple for t in ts)
    return dict(
        trades=len(ts),
        wins=len(wins),
        losses=len(losses),
        breakeven=len(bes),
        win_rate=round(wr, 1),
        pnl=round(pnl, 2),
        total_r=round(total_r, 2),
    )


def get_yearly_performance(db: Session) -> List[schemas.YearlyPerformance]:
    trades = get_all_trades_ordered(db)

    # Group by year → month → week
    from collections import defaultdict
    year_map: dict = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    for t in trades:
        y  = t.date.year
        ym = t.date.strftime("%Y-%m")
        w  = _week_bucket(t.date.day)
        year_map[y][ym][w].append(t)

    result = []
    for year in sorted(year_map.keys()):
        months_data = []
        year_trades: list = []

        for ym in sorted(year_map[year].keys()):
            month_num = ym.split("-")[1]
            month_label = f"{_MONTH_NAMES.get(month_num, month_num)} {year}"
            month_trades: list = []

            weeks_data = []
            for w in sorted(year_map[year][ym].keys()):
                wts = year_map[year][ym][w]
                ws = _build_stats(wts)
                weeks_data.append(schemas.WeeklyPnl(
                    week_label=_WEEK_LABELS[w],
                    week_num=w,
                    **ws,
                ))
                month_trades.extend(wts)

            ms = _build_stats(month_trades)
            months_data.append(schemas.MonthlyBreakdown(
                month=ym,
                month_label=month_label,
                weeks=weeks_data,
                **ms,
            ))
            year_trades.extend(month_trades)

        ys = _build_stats(year_trades)
        result.append(schemas.YearlyPerformance(
            year=year,
            months=months_data,
            **ys,
        ))

    return result


def get_calendar_data(db: Session, year: int, month: int) -> List[schemas.CalendarDay]:
    from datetime import date as dt
    import calendar
    
    trades = (
        db.query(models.Trade)
        .filter(
            func.strftime("%Y", models.Trade.date) == str(year),
            func.strftime("%m", models.Trade.date) == f"{month:02d}",
        )
        .all()
    )

    day_map: dict[int, list] = {}
    for t in trades:
        d = t.date.day if hasattr(t.date, "day") else dt.fromisoformat(str(t.date)).day
        day_map.setdefault(d, []).append(t)

    # Build a record for every day in the month that has trades
    result = []
    for day, ts in sorted(day_map.items()):
        wins   = [t for t in ts if t.result == "Win"]
        losses = [t for t in ts if t.result == "Loss"]
        bes    = [t for t in ts if t.result == "BE"]
        pnl    = sum(t.pnl for t in ts)
        try:
            day_date = dt(year, month, day)
        except ValueError:
            continue
        result.append(schemas.CalendarDay(
            date=day_date,
            trades=len(ts),
            pnl=round(pnl, 2),
            wins=len(wins),
            losses=len(losses),
            breakeven=len(bes),
        ))

    return result


def get_advanced_analytics(
    db: Session,
    pair: Optional[str] = None,
    session_filter: Optional[str] = None,
    direction: Optional[str] = None,
    setup: Optional[str] = None,
    result_filter: Optional[str] = None,
    rule_followed: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> schemas.AdvancedAnalyticsReport:
    # 1. Fetch filtered trades
    q = db.query(models.Trade)
    if pair: q = q.filter(models.Trade.pair == pair)
    if session_filter: q = q.filter(models.Trade.session == session_filter)
    if direction: q = q.filter(models.Trade.direction == direction)
    if setup: q = q.filter(models.Trade.setup.contains(setup))
    if result_filter: q = q.filter(models.Trade.result == result_filter)
    if rule_followed: q = q.filter(models.Trade.rule_followed == rule_followed)
    if date_from: q = q.filter(models.Trade.date >= date_from)
    if date_to: q = q.filter(models.Trade.date <= date_to)
    trades = q.all()

    settings = get_settings(db)
    
    # 2. Compute KPIs
    wins = [t for t in trades if t.result == "Win"]
    losses = [t for t in trades if t.result == "Loss"]
    bes = [t for t in trades if t.result == "BE"]
    
    win_count = len(wins)
    loss_count = len(losses)
    be_count = len(bes)
    completed = win_count + loss_count
    
    total_pnl = sum(t.pnl for t in trades)
    total_r = sum(t.r_multiple for t in trades)
    gross_profit = sum(t.pnl for t in wins)
    gross_loss = sum(abs(t.pnl) for t in losses)
    
    win_rate = (win_count / completed * 100) if completed > 0 else 0.0
    pf = (gross_profit / gross_loss) if gross_loss > 0 else 0.0
    avg_r = (total_r / len(trades)) if len(trades) > 0 else 0.0
    
    largest_win = max((t.pnl for t in wins), default=0.0)
    largest_loss = min((t.pnl for t in losses), default=0.0)
    avg_win = (gross_profit / win_count) if win_count > 0 else 0.0
    avg_loss = (-gross_loss / loss_count) if loss_count > 0 else 0.0
    
    kpis = schemas.DashboardKPI(
        total_trades=len(trades),
        wins=win_count,
        losses=loss_count,
        breakeven=be_count,
        win_rate=round(win_rate, 1),
        total_pnl=round(total_pnl, 2),
        total_r=round(total_r, 2),
        profit_factor=round(pf, 2),
        avg_r=round(avg_r, 2),
        largest_win=round(largest_win, 2),
        largest_loss=round(largest_loss, 2),
        avg_win=round(avg_win, 2),
        avg_loss=round(avg_loss, 2),
        current_balance=round(settings.starting_balance + total_pnl, 2),
    )

    # Helper to calculate stats for a subset of trades
    def _stats_for_subset(subset: list):
        w = [t for t in subset if t.result == "Win"]
        l = [t for t in subset if t.result == "Loss"]
        be = [t for t in subset if t.result == "BE"]
        comp = len(w) + len(l)
        wr = (len(w) / comp * 100) if comp > 0 else 0.0
        return {
            "trades": len(subset),
            "wins": len(w),
            "losses": len(l),
            "breakeven": len(be),
            "win_rate": round(wr, 1),
            "pnl": round(sum(t.pnl for t in subset), 2),
            "avg_r": round((sum(t.r_multiple for t in subset) / len(subset)) if len(subset) > 0 else 0.0, 2)
        }

    # 3. Session Performance
    session_dict = {}
    for t in trades:
        session_dict.setdefault(t.session, []).append(t)
    sessions = []
    for s_name in ["Asia", "London", "New York", "Other"]:
        if s_name in session_dict:
            sessions.append(schemas.SessionPerformance(session=s_name, **_stats_for_subset(session_dict[s_name])))

    # 4. Setup Performance
    setup_dict = {}
    for t in trades:
        if t.setup:
            for s_tag in t.setup.split(","):
                s_tag = s_tag.strip()
                if s_tag:
                    setup_dict.setdefault(s_tag, []).append(t)
    setups = []
    for s_tag, s_trades in setup_dict.items():
        setups.append(schemas.SetupPerformance(setup=s_tag, **_stats_for_subset(s_trades)))
    setups.sort(key=lambda x: x.trades, reverse=True)

    # 5. Direction Performance
    dir_dict = {}
    for t in trades:
        dir_dict.setdefault(t.direction, []).append(t)
    directions = []
    for d_name in ["Buy", "Sell"]:
        if d_name in dir_dict:
            directions.append(schemas.DirectionPerformance(direction=d_name, **_stats_for_subset(dir_dict[d_name])))

    # 6. Mistake Performance
    mistake_dict = {}
    for t in trades:
        if t.mistake:
            for m_tag in t.mistake.split(","):
                m_tag = m_tag.strip()
                if m_tag:
                    mistake_dict.setdefault(m_tag, []).append(t)
    mistakes = []
    for m_tag, m_trades in mistake_dict.items():
        m_pnl = sum(t.pnl for t in m_trades)
        m_avg = m_pnl / len(m_trades) if len(m_trades) > 0 else 0.0
        mistakes.append(schemas.MistakeReport(
            mistake=m_tag, occurrences=len(m_trades),
            total_pnl=round(m_pnl, 2), average_pnl=round(m_avg, 2)
        ))
    mistakes.sort(key=lambda x: x.occurrences, reverse=True)

    return schemas.AdvancedAnalyticsReport(
        kpis=kpis,
        setups=setups,
        sessions=sessions,
        directions=directions,
        mistakes=mistakes
    )
