"""
Trade endpoints — CRUD + list with filters, pagination, sorting.
"""

from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/api/trades", tags=["Trades"])


@router.post("/", response_model=schemas.TradeOut, status_code=201)
def create_trade(data: schemas.TradeCreate, db: Session = Depends(get_db)):
    return crud.create_trade(db, data)


@router.get("/", response_model=List[schemas.TradeOut])
def list_trades(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    pair: Optional[str] = None,
    session: Optional[str] = Query(None, alias="session_filter"),
    direction: Optional[str] = None,
    setup: Optional[str] = None,
    result: Optional[str] = None,
    rule_followed: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    sort_by: str = "date",
    sort_dir: str = "desc",
    db: Session = Depends(get_db),
):
    return crud.get_trades(
        db, skip=skip, limit=limit,
        pair=pair, session_filter=session,
        direction=direction, setup=setup,
        result=result, rule_followed=rule_followed,
        date_from=date_from, date_to=date_to,
        search=search,
        sort_by=sort_by, sort_dir=sort_dir,
    )


@router.get("/count")
def trade_count(
    pair: Optional[str] = None,
    session: Optional[str] = Query(None, alias="session_filter"),
    direction: Optional[str] = None,
    setup: Optional[str] = None,
    result: Optional[str] = None,
    rule_followed: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return {"count": crud.count_trades(
        db, pair=pair, session_filter=session,
        direction=direction, setup=setup,
        result=result, rule_followed=rule_followed,
        date_from=date_from, date_to=date_to,
        search=search,
    )}


@router.get("/review-queue", response_model=List[schemas.TradeOut])
def get_review_queue(
    is_reviewed: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    return crud.get_review_queue(db, is_reviewed=is_reviewed)


@router.post("/{trade_id}/review", response_model=schemas.TradeOut)
@router.put("/{trade_id}/review", response_model=schemas.TradeOut)
def toggle_review(
    trade_id: int,
    is_reviewed: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    trade = crud.toggle_trade_review(db, trade_id, is_reviewed)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade



@router.get("/{trade_id}", response_model=schemas.TradeOut)
def get_trade(trade_id: int, db: Session = Depends(get_db)):
    trade = crud.get_trade(db, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.put("/{trade_id}", response_model=schemas.TradeOut)
def update_trade(trade_id: int, data: schemas.TradeUpdate, db: Session = Depends(get_db)):
    trade = crud.update_trade(db, trade_id, data)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.delete("/{trade_id}")
def delete_trade(trade_id: int, db: Session = Depends(get_db)):
    if not crud.delete_trade(db, trade_id):
        raise HTTPException(status_code=404, detail="Trade not found")
    return {"detail": "Trade deleted"}
