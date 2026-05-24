"""
GenLab AI — Health Check Router
"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def health():
    return {
        "status": "ok",
        "service": "GenLab AI Bioinformatics Service",
        "engines": ["BioPython", "MyVariant.info", "NCBI BLAST", "ReportLab"]
    }
