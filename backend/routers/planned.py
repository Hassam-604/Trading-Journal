"""
Planned / Missed Trade endpoints.
"""

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/api/planned", tags=["Planned Trades"])


@router.post("/", response_model=schemas.PlannedTradeOut, status_code=201)
def create_planned_trade(data: schemas.PlannedTradeCreate, db: Session = Depends(get_db)):
    return crud.create_planned_trade(db, data)


@router.get("/", response_model=List[schemas.PlannedTradeOut])
def list_planned_trades(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    direction: Optional[str] = None,
    session: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("planned_date"),
    sort_dir: str = Query("desc"),
    db: Session = Depends(get_db),
):
    return crud.get_planned_trades(
        db,
        skip=skip,
        limit=limit,
        status=status,
        direction=direction,
        session_filter=session,
        search=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )


@router.get("/count")
def planned_trade_count(
    status: Optional[str] = None,
    direction: Optional[str] = None,
    session: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return {
        "count": crud.count_planned_trades(
            db,
            status=status,
            direction=direction,
            session_filter=session,
            search=search,
        )
    }



@router.get("/{pt_id}", response_model=schemas.PlannedTradeOut)
def get_planned_trade(pt_id: int, db: Session = Depends(get_db)):
    pt = crud.get_planned_trade(db, pt_id)
    if not pt:
        raise HTTPException(status_code=404, detail="Planned trade not found")
    return pt


@router.put("/{pt_id}", response_model=schemas.PlannedTradeOut)
def update_planned_trade(pt_id: int, data: schemas.PlannedTradeUpdate, db: Session = Depends(get_db)):
    pt = crud.update_planned_trade(db, pt_id, data)
    if not pt:
        raise HTTPException(status_code=404, detail="Planned trade not found")
    return pt


@router.delete("/{pt_id}")
def delete_planned_trade(pt_id: int, db: Session = Depends(get_db)):
    if not crud.delete_planned_trade(db, pt_id):
        raise HTTPException(status_code=404, detail="Planned trade not found")
    return {"detail": "Planned trade deleted"}
