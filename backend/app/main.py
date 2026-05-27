"""
Trading Journal API — FastAPI application entry point.
"""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.config import settings
from app.database import engine, Base, ensure_auth_schema
from app.routes import auth, trades


Base.metadata.create_all(bind=engine)
ensure_auth_schema()

app = FastAPI(
    title="Trading Journal API",
    version="1.0.0",
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url="/redoc" if settings.docs_enabled else None,
)

# ── CORS ─────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────
app.include_router(trades.router)
app.include_router(auth.router)


# ── Health check (used by Docker / orchestrators) ────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0", "database": "sqlite" if settings.is_sqlite else "postgresql"}


@app.get("/")
def root():
    return {"message": "Backend running", "version": "1.0.0"}


@app.get("/downloads/desktop-sync-agent/windows")
def download_desktop_sync_agent():
    default_path = Path(__file__).resolve().parents[2] / "desktop" / "dist" / "TradeJournal-Sync-Agent.exe"
    agent_path = Path(os.getenv("DESKTOP_AGENT_DOWNLOAD_PATH", default_path)).resolve()

    if not agent_path.exists() or not agent_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Desktop sync agent package is not available on this server.",
        )

    return FileResponse(
        path=agent_path,
        filename="TradeJournal-Sync-Agent.exe",
        media_type="application/vnd.microsoft.portable-executable",
    )
