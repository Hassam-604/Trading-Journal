"""
Screenshot upload and management endpoints.
Supports before / entry / after / general categories linked to trades, planned trades, or level tests.
"""

import os
import uuid
import shutil
from datetime import date
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/api/screenshots", tags=["Screenshots"])

# Upload directory: trading-journal-v2/backend/uploads
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


@router.post("/upload", response_model=schemas.ScreenshotOut, status_code=201)
async def upload_screenshot(
    file: UploadFile = File(...),
    trade_id: Optional[int] = Form(None),
    planned_trade_id: Optional[int] = Form(None),
    level_test_id: Optional[int] = Form(None),
    category: str = Form("general"),
    db: Session = Depends(get_db),
):
    if not (trade_id or planned_trade_id or level_test_id):
        raise HTTPException(
            status_code=400,
            detail="Screenshot must be attached to at least one entity (trade_id, planned_trade_id, or level_test_id)",
        )

    ext = Path(file.filename or "image.png").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File extension {ext} not allowed. Supported: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Unique stored filename
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = UPLOAD_DIR / unique_name

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return crud.create_screenshot(
        db,
        filename=unique_name,
        original_name=file.filename or unique_name,
        trade_id=trade_id,
        planned_trade_id=planned_trade_id,
        level_test_id=level_test_id,
        category=category,
    )


@router.get("/gallery", response_model=List[schemas.GalleryScreenshotOut])
def get_gallery(
    result: Optional[str] = Query(None),
    setup: Optional[str] = Query(None),
    session: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    min_r: Optional[float] = Query(None),
    is_reviewed: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    return crud.get_gallery_screenshots(
        db,
        result=result,
        setup=setup,
        session=session,
        direction=direction,
        category=category,
        date_from=date_from,
        date_to=date_to,
        min_r=min_r,
        is_reviewed=is_reviewed,
    )


@router.get("/file/{filename}")
def serve_screenshot(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


@router.delete("/{screenshot_id}")
def delete_screenshot(screenshot_id: int, db: Session = Depends(get_db)):
    filename = crud.delete_screenshot(db, screenshot_id)
    if not filename:
        raise HTTPException(status_code=404, detail="Screenshot not found")

    file_path = UPLOAD_DIR / filename
    if file_path.exists():
        try:
            os.remove(file_path)
        except OSError:
            pass

    return {"detail": "Screenshot deleted successfully"}
