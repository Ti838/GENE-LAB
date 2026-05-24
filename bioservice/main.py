"""
GenLab AI — FastAPI Bioinformatics Service
Entry point for the Python microservice.
Handles instant analysis (BioPython + MyVariant.info) and
deep analysis (NCBI BLAST API).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import instant, deep, health

app = FastAPI(
    title="GenLab AI Bioinformatics Service",
    description="Genomics analysis microservice: BioPython, MyVariant.info, NCBI BLAST",
    version="1.0.0"
)

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
