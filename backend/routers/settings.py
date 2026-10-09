"""
Settings endpoints — account settings, custom setup tags, and custom mistake tags.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("/", response_model=schemas.SettingsOut)
def get_user_settings(db: Session = Depends(get_db)):
    return crud.get_settings(db)


@router.put("/", response_model=schemas.SettingsOut)
def update_user_settings(data: schemas.SettingsUpdate, db: Session = Depends(get_db)):
    return crud.update_settings(db, data)


# ── Setup Tags ──

@router.get("/setups", response_model=List[schemas.SetupTagOut])
def list_setup_tags(db: Session = Depends(get_db)):
    return crud.get_setup_tags(db)


@router.post("/setups", response_model=schemas.SetupTagOut, status_code=201)
def add_setup_tag(data: schemas.SetupTagCreate, db: Session = Depends(get_db)):
    return crud.create_setup_tag(db, data)


@router.delete("/setups/{tag_id}")
def remove_setup_tag(tag_id: int, db: Session = Depends(get_db)):
    if not crud.delete_setup_tag(db, tag_id):
        raise HTTPException(status_code=404, detail="Setup tag not found")
    return {"detail": "Setup tag deleted"}


# ── Mistake Tags ──

@router.get("/mistakes", response_model=List[schemas.MistakeTagOut])
def list_mistake_tags(db: Session = Depends(get_db)):
    return crud.get_mistake_tags(db)


@router.post("/mistakes", response_model=schemas.MistakeTagOut, status_code=201)
def add_mistake_tag(data: schemas.MistakeTagCreate, db: Session = Depends(get_db)):
    return crud.create_mistake_tag(db, data)


@router.delete("/mistakes/{tag_id}")
def remove_mistake_tag(tag_id: int, db: Session = Depends(get_db)):
    if not crud.delete_mistake_tag(db, tag_id):
        raise HTTPException(status_code=404, detail="Mistake tag not found")
    return {"detail": "Mistake tag deleted"}
