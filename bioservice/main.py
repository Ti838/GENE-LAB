"""
GenLab AI — FastAPI Bioinformatics Service
Entry point for the Python microservice.
Handles instant analysis (BioPython + MyVariant.info) and
deep analysis (NCBI BLAST API).
"""

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import os

# Optional monitoring and Sentry
try:
    import sentry_sdk
    from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
except Exception:
    sentry_sdk = None
    SentryAsgiMiddleware = None
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from routers import instant, deep, health

app = FastAPI(
    title="GenLab AI Bioinformatics Service",
    description="Genomics analysis microservice: BioPython, MyVariant.info, NCBI BLAST",
    version="1.0.0"
)

# Init Sentry if available
SENTRY_DSN = os.environ.get('SENTRY_DSN')
if sentry_sdk and SENTRY_DSN:
    try:
        sentry_sdk.init(dsn=SENTRY_DSN)
        app.add_middleware(SentryAsgiMiddleware)
    except Exception:
        pass

# ── CORS (Express backend is the only caller) ──────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Restrict to Express backend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(instant.router, prefix="/instant-analysis", tags=["Instant Analysis"])
app.include_router(deep.router, prefix="/deep-analysis", tags=["Deep Analysis"])


@app.get("/")
async def root():
    return {"service": "GenLab AI Bioinformatics Service", "status": "running"}


# Prometheus metrics endpoint
@app.get('/metrics')
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
