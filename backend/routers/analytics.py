from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=schemas.DashboardKPI)
@router.get("/kpi", response_model=schemas.DashboardKPI)
def dashboard_kpis(db: Session = Depends(get_db)):
    return crud.get_dashboard_kpi(db)


@router.get("/equity-curve", response_model=List[schemas.EquityPoint])
def equity_curve(db: Session = Depends(get_db)):
    return crud.get_equity_curve(db)


@router.get("/sessions", response_model=List[schemas.SessionPerformance])
@router.get("/session-performance", response_model=List[schemas.SessionPerformance])
def session_performance(db: Session = Depends(get_db)):
    return crud.get_session_performance(db)


@router.get("/setups", response_model=List[schemas.SetupPerformance])
@router.get("/setup-performance", response_model=List[schemas.SetupPerformance])
def setup_performance(db: Session = Depends(get_db)):
    return crud.get_setup_performance(db)


@router.get("/directions", response_model=List[schemas.DirectionPerformance])
def direction_performance(db: Session = Depends(get_db)):
    return crud.get_direction_performance(db)


@router.get("/mistakes", response_model=List[schemas.MistakeReport])
def mistake_report(db: Session = Depends(get_db)):
    return crud.get_mistake_report(db)


@router.get("/level-validity", response_model=schemas.LevelValidityStats)
def level_validity(db: Session = Depends(get_db)):
    return crud.get_level_validity_stats(db)


@router.get("/monthly-pnl", response_model=List[schemas.MonthlyPnl])
def monthly_pnl(db: Session = Depends(get_db)):
    return crud.get_monthly_pnl(db)


@router.get("/performance", response_model=List[schemas.YearlyPerformance])
def yearly_performance(db: Session = Depends(get_db)):
    return crud.get_yearly_performance(db)


@router.get("/calendar", response_model=List[schemas.CalendarDay])
def calendar_data(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
):
    return crud.get_calendar_data(db, year=year, month=month)


@router.get("/advanced", response_model=schemas.AdvancedAnalyticsReport)
def advanced_analytics(
    pair: Optional[str] = None,
    session: Optional[str] = Query(None, alias="session_filter"),
    direction: Optional[str] = None,
    setup: Optional[str] = None,
    result: Optional[str] = None,
    rule_followed: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
):
    return crud.get_advanced_analytics(
        db,
        pair=pair,
        session_filter=session,
        direction=direction,
        setup=setup,
        result_filter=result,
        rule_followed=rule_followed,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/setup-analysis", response_model=schemas.SetupAnalysisReport)
def setup_analysis(
    setup: str = Query(..., description="Setup name to analyze"),
    result: Optional[str] = Query(None),
    session: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    min_r: Optional[float] = Query(None),
    db: Session = Depends(get_db),
):
    return crud.get_setup_analysis(
        db,
        setup_name=setup,
        result=result,
        session=session,
        direction=direction,
        date_from=date_from,
        date_to=date_to,
        min_r=min_r,
    )

