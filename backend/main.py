from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import ensure_directories
from database import init_db
from routers import photos, moments, family


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_directories()
    init_db()
    yield


app = FastAPI(title="Polar API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3200",
        "https://polar.zoai.uk",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(photos.router, prefix="/api")
app.include_router(moments.router, prefix="/api")
app.include_router(family.router, prefix="/api")
