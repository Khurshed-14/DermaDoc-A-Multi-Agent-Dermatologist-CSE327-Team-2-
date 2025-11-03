from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.routers import auth, chat
from app.routers import chat_sync
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.core.storage import STORAGE_ROOT
import traceback


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    # Log API key status (without exposing the actual key)
    gemini_status = "configured" if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip() else "not configured"
    print(f"Gemini API key: {gemini_status}")
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
        print(f"Gemini API key length: {len(settings.GEMINI_API_KEY.strip())} characters")
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title="DermaDoc API",
    description="DermaDoc Backend API for Skin Health Assistant",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware - MUST be added before routes
# Ensure CORS_ORIGINS is a list
cors_origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add exception handler to ensure CORS headers are sent even on errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all exceptions and ensure CORS headers are included"""
    print(f"Unhandled exception: {type(exc).__name__}: {str(exc)}")
    traceback.print_exc()
    
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": cors_origins[0] if cors_origins else "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(chat_sync.router, prefix="/api/chat", tags=["chat"])

# Serve storage files
@app.get("/api/storage/{file_path:path}")
async def serve_storage(file_path: str):
    """Serve files from storage directory"""
    file_full_path = STORAGE_ROOT / file_path
    if file_full_path.exists() and file_full_path.is_file():
        return FileResponse(file_full_path)
    raise HTTPException(status_code=404, detail="File not found")


@app.get("/")
async def root():
    return {"message": "DermaDoc API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

