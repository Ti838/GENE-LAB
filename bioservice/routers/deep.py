"""
GenLab AI — Deep Analysis Router (NCBI BLAST)
POST /deep-analysis

Submits a DNA sequence or file to NCBI BLAST,
polls for completion, and returns structured alignment results
including organism identification and similarity stats.

Also handles:
  POST /deep-analysis/report — returns PDF bytes for BLAST result
"""

import os
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import tempfile
import boto3
import os
from fastapi.responses import Response

from engines.sequence_parser import parse_file
from engines.blast_engine import run_blast_analysis
from engines.report_generator import generate_deep_analysis_pdf

router = APIRouter()

NCBI_API_KEY = os.getenv("NCBI_API_KEY", "")
S3_BUCKET = os.getenv('S3_BUCKET')
S3_REGION = os.getenv('S3_REGION', 'us-east-1')
S3_CLIENT = None
if S3_BUCKET:
    try:
        S3_CLIENT = boto3.client('s3', region_name=S3_REGION)
    except Exception:
        S3_CLIENT = None


@router.post("/")
async def deep_analysis_from_file(
    file: UploadFile = File(None),
    s3_key: Optional[str] = Form(None)
):
    """
    Accepts an uploaded DNA file (FASTA/FASTQ/CSV/TXT).
    Submits the primary sequence to NCBI BLAST.
    NOTE: This call is synchronous and may take 30–180 seconds.
    For async/queued mode, use the Express.js /api/analysis/deep-analysis endpoint.
    """
    # If s3_key provided, fetch from S3 into temp file
    try:
        if s3_key:
            if not S3_CLIENT:
                raise HTTPException(status_code=500, detail='S3 not configured')
            tmpf = tempfile.NamedTemporaryFile(delete=False)
            try:
                obj = S3_CLIENT.get_object(Bucket=S3_BUCKET, Key=s3_key)
                body = obj['Body']
                while True:
                    chunk = body.read(8192)
                    if not chunk:
                        break
                    tmpf.write(chunk)
                tmpf.flush()
                tmpf.close()
                with open(tmpf.name, 'r', encoding='utf-8', errors='replace') as fh:
                    content = fh.read()
                    records = parse_file(content, tmpf.name)
            finally:
                try:
                    os.unlink(tmpf.name)
                except Exception:
                    pass
        else:
            if file is None:
                raise HTTPException(status_code=400, detail='No file uploaded')
            content_bytes = await file.read()
            try:
                content = content_bytes.decode("utf-8", errors="replace")
            except Exception:
                raise HTTPException(status_code=400, detail="Could not decode file")
            try:
                records = parse_file(content, file.filename or "sequence.txt")
            except ValueError as e:
                raise HTTPException(status_code=422, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not records:
        raise HTTPException(status_code=400, detail="No valid sequences found in file")

    # Use first valid sequence for BLAST
    primary_seq = records[0]["sequence"]
    if len(primary_seq) < 20:
        raise HTTPException(status_code=400, detail="Sequence is too short for BLAST analysis (minimum 20 bp)")

    try:
        blast_result = run_blast_analysis(primary_seq, ncbi_api_key=NCBI_API_KEY)
    except (RuntimeError, TimeoutError, ValueError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    blast_result["file_name"] = file.filename if file else (s3_key.split('/')[-1] if s3_key else "sequence.txt")
    blast_result["sequence_length"] = len(primary_seq)
    blast_result["sequence"] = primary_seq
    blast_result["analysis_type"] = "deep"
    return blast_result


@router.post("/from-text")
async def deep_analysis_from_text(
    sequence: str = Form(...),
    name: Optional[str] = Form("manual_sequence")
):
    """
    Accepts a raw DNA sequence string and runs NCBI BLAST.
    NOTE: This is synchronous and may take 30–180 seconds.
    """
    seq = sequence.strip().upper()
    if len(seq) < 20:
        raise HTTPException(status_code=400, detail="Sequence too short for BLAST (minimum 20 bp)")

    try:
        blast_result = run_blast_analysis(seq, ncbi_api_key=NCBI_API_KEY)
    except (RuntimeError, TimeoutError, ValueError) as e:
        raise HTTPException(status_code=500, detail=str(e))

    blast_result["file_name"] = name
    blast_result["sequence_length"] = len(seq)
    blast_result["sequence"] = seq
    blast_result["analysis_type"] = "deep"
    return blast_result


@router.post("/report")
async def generate_blast_pdf(result: dict):
    """
    Accepts a previously computed BLAST result dict
    and returns a downloadable PDF report.
    """
    try:
        pdf_bytes = generate_deep_analysis_pdf(result, file_name=result.get("file_name", "deep_analysis"))
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="genelab_blast_report.pdf"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
