from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers.institutions import router as institutions_router
from .routers.accounts import router as accounts_router
from .routers.imports import router as imports_router
from .routers.transactions import router as transactions_router
from .routers.tags import router as tags_router

app = FastAPI(
    title="Finance Tracker API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"

app.include_router(institutions_router, prefix=PREFIX)
app.include_router(accounts_router, prefix=PREFIX)
app.include_router(imports_router, prefix=PREFIX)
app.include_router(transactions_router, prefix=PREFIX)
app.include_router(tags_router, prefix=PREFIX)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
