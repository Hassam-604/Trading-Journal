"""
Level Test endpoints — testing key price levels from planned trades.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/api/level-tests", tags=["Level Tests"])


@router.post("/", response_model=schemas.LevelTestOut, status_code=201)
def create_level_test(data: schemas.LevelTestCreate, db: Session = Depends(get_db)):
    # Validate planned trade exists
    pt = crud.get_planned_trade(db, data.planned_trade_id)
    if not pt:
        raise HTTPException(status_code=404, detail="Planned trade not found")
    return crud.create_level_test(db, data)


@router.get("/", response_model=List[schemas.LevelTestOut])
def list_level_tests(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return crud.get_all_level_tests(db, skip=skip, limit=limit)


@router.get("/planned/{planned_trade_id}", response_model=List[schemas.LevelTestOut])
def get_tests_for_planned_trade(planned_trade_id: int, db: Session = Depends(get_db)):
    return crud.get_level_tests_for_planned(db, planned_trade_id)


@router.get("/{lt_id}", response_model=schemas.LevelTestOut)
def get_level_test(lt_id: int, db: Session = Depends(get_db)):
    lt = crud.get_level_test(db, lt_id)
    if not lt:
        raise HTTPException(status_code=404, detail="Level test not found")
    return lt


@router.put("/{lt_id}", response_model=schemas.LevelTestOut)
def update_level_test(lt_id: int, data: schemas.LevelTestUpdate, db: Session = Depends(get_db)):
    lt = crud.update_level_test(db, lt_id, data)
    if not lt:
        raise HTTPException(status_code=404, detail="Level test not found")
    return lt


@router.delete("/{lt_id}")
def delete_level_test(lt_id: int, db: Session = Depends(get_db)):
    if not crud.delete_level_test(db, lt_id):
        raise HTTPException(status_code=404, detail="Level test not found")
    return {"detail": "Level test deleted"}
