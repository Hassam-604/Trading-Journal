"""
FastAPI application entrypoint for the XAUUSD Trading Journal.
Includes all routers, handles startup table creation and default seeding,
and mounts static frontend/upload directories.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from .database import engine, Base, SessionLocal
from . import crud
from .routers import (
    trades,
    planned,
    level_tests,
    screenshots,
    analytics,
    settings,
    export,
    auth,
)

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
UPLOADS_DIR = BASE_DIR / "backend" / "uploads"
DATA_DIR = BASE_DIR / "data"

# Ensure directories exist
FRONTEND_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup: Create tables and seed defaults ──
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as conn:
            cursor = conn.exec_driver_sql("PRAGMA table_info(trades)")
            cols = [row[1] for row in cursor.fetchall()]
            if cols and "is_reviewed" not in cols:
                conn.exec_driver_sql("ALTER TABLE trades ADD COLUMN is_reviewed BOOLEAN DEFAULT 0")
            if cols and "reviewed_at" not in cols:
                conn.exec_driver_sql("ALTER TABLE trades ADD COLUMN reviewed_at DATETIME")
            conn.commit()
    except Exception as e:
        print("Schema migration info:", e)

    with SessionLocal() as db:
        crud.seed_setup_tags(db)
        crud.seed_mistake_tags(db)
        crud.get_settings(db)
    yield
    # ── Shutdown ──


app = FastAPI(
    title="Trading Journal API",
    description="Professional, fast, and responsive trading journal backend with auto-calculations for multi-asset day and swing traders.",
    version="1.1.0",
    lifespan=lifespan,
)


PUBLIC_API_PATHS = {
    "/api/health",
    "/api/auth/status",
    "/api/auth/setup",
    "/api/auth/login",
    "/api/auth/logout",
}


@app.middleware("http")
async def protect_private_routes(request, call_next):
    path = request.url.path
    is_private = (
        (path.startswith("/api/") and path not in PUBLIC_API_PATHS)
        or path.startswith("/uploads/")
        or path in {"/docs", "/docs/oauth2-redirect", "/redoc", "/openapi.json"}
    )
    if is_private:
        with SessionLocal() as db:
            if not auth.request_is_authenticated(request, db):
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Authentication required."},
                )

    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        origin = request.headers.get("origin")
        if origin:
            expected_origin = f"{request.url.scheme}://{request.headers.get('host', '')}"
            if origin.rstrip("/").lower() != expected_origin.rstrip("/").lower():
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Cross-origin requests are not allowed."},
                )

    return await call_next(request)

# Include API Routers
app.include_router(trades.router)
app.include_router(planned.router)
app.include_router(level_tests.router)
app.include_router(screenshots.router)
app.include_router(analytics.router)
app.include_router(settings.router)
app.include_router(export.router)
app.include_router(auth.router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": "Trading Journal",
        "version": "1.1.0",
    }


# Mount uploads for direct file access
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Mount frontend directory for SPA
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
