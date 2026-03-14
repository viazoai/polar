from contextlib import asynccontextmanager

from fastapi import FastAPI

from config import ensure_directories
from database import init_db
from routers import photos, moments


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_directories()
    init_db()
    yield


app = FastAPI(title="Polar API", lifespan=lifespan)

app.include_router(photos.router, prefix="/api")
app.include_router(moments.router, prefix="/api")
