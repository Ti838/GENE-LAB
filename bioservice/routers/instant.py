"""
GenLab AI — Instant Analysis Router
POST /instant-analysis

Accepts a DNA file (FASTA/FASTQ/CSV/TXT) or raw sequence string,
runs BioPython analysis + MyVariant.info mutation interpretation,
and returns a full structured JSON report.

Also handles:
  POST /instant-analysis/from-text  — raw sequence string
  POST /instant-analysis/report     — returns PDF bytes for a pre-computed result
"""

import os
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response

from engines.sequence_parser import parse_file, validate_sequence
from engines.dna_analyzer import analyze_sequence, sequence_statistics, codon_analysis
from engines.mutation_analyzer import analyze_mutations
from engines.report_generator import generate_instant_analysis_pdf

router = APIRouter()

NCBI_API_KEY = os.getenv("NCBI_API_KEY", "")


def _run_instant_analysis(sequence: str, variant_ids: Optional[List[str]] = None) -> dict:
    """Core instant analysis logic shared by file and text endpoints."""

    validation = validate_sequence(sequence)
    if not validation["is_valid"] and len(sequence) < 10:
        raise HTTPException(status_code=400, detail={
            "error": "Invalid or too-short sequence",
            "validation_errors": validation["errors"]
        })

    cleaned_seq = validation["cleaned"] or sequence.upper()

    # ── 1. DNA statistics + codon analysis ───────────────────────────────
    stats = sequence_statistics(cleaned_seq)
    codon = codon_analysis(cleaned_seq)

    from engines.dna_analyzer import detect_repeats, reverse_complement, transcribe_to_rna
    repeats = detect_repeats(cleaned_seq)
    rc = reverse_complement(cleaned_seq)[:300]
    rna = transcribe_to_rna(cleaned_seq)[:300]

    # ── 2. Mutation analysis (MyVariant.info) ────────────────────────────
    mutation_result = analyze_mutations(cleaned_seq, variant_ids=variant_ids)

    # ── 3. Build scientific summary ──────────────────────────────────────
    gc = stats.get("gc_content", 0)
    length = stats.get("sequence_length", 0)
    high_sev = mutation_result.get("high_severity_count", 0)
    diseases = mutation_result.get("disease_associations", [])

    gc_interp = (
        "GC content is within the normal mammalian genome range (40–60%)."
        if 40 <= gc <= 60 else
        f"GC content of {gc}% is {'elevated' if gc > 60 else 'low'}, which may indicate "
        f"{'thermophilic adaptation or CpG islands' if gc > 60 else 'AT-rich regulatory regions'}."
    )

    scientific_summary = (
        f"Instant genomic analysis of a {length:,} bp sequence detected a GC content of {gc:.2f}%. "
        f"{gc_interp} "
        f"Codon analysis identified {codon.get('start_codon_count', 0)} start codon(s) and "
        f"{codon.get('stop_codon_count', 0)} stop codon(s), with {codon.get('open_reading_frames_detected', 0)} "
        f"potential open reading frame(s). "
        f"Variant interpretation via MyVariant.info assessed {mutation_result.get('variants_analyzed', 0)} "
        f"known genomic variant(s). "
        + (f"ALERT: {high_sev} high-severity pathogenic variant(s) detected. " if high_sev > 0 else
           "No high-severity pathogenic variants were detected. ")
        + (f"Disease associations found: {', '.join(diseases[:5])}." if diseases else
           "No disease associations were returned for the queried variants.")
    )

    confidence = min(98, max(60, 75 + (length // 500) - (len(validation.get("errors", [])) * 10)))

    return {
        "status": "completed",
        "analysis_type": "instant",
        "confidence": confidence,
        "validation": validation,
        "sequence_length": length,
        "gc_content": gc,
        "at_content": stats.get("at_content", 0),
        "nucleotide_frequency": stats.get("nucleotide_frequency", {}),
        "nucleotide_percentage": stats.get("nucleotide_percentage", {}),
        "gc_skew": stats.get("gc_skew", 0),
        "at_skew": stats.get("at_skew", 0),
        "molecular_weight_da": stats.get("molecular_weight_estimate_da", 0),
        "statistics": stats,
        "codon_analysis": codon,
        "top_repeats": repeats[:10],
        "reverse_complement_preview": rc,
        "rna_transcript_preview": rna,
        "mutation_analysis": mutation_result,
        "mutations": [v.get("variant_id", "") for v in mutation_result.get("variants", [])],
        "disease_associations": mutation_result.get("disease_associations", []),
        "scientific_summary": scientific_summary,
        "clinical_summary": mutation_result.get("clinical_summary", ""),
        "source": "BioPython + MyVariant.info"
    }


@router.post("/")
async def instant_analysis_from_file(
    file: UploadFile = File(...),
    variant_ids: Optional[str] = Form(None)
):
    """
    Accepts an uploaded DNA file (FASTA/FASTQ/CSV/TXT).
    Parses all sequences and runs instant analysis on the first (or primary) one.
    """
    filename = file.filename or "sequence.txt"
    ext = filename.lower().rsplit('.', 1)[-1] if '.' in filename else 'txt'

    # For CSV large files, stream-parse to avoid loading entire file into memory
    try:
        if ext == 'csv':
            records = parse_csv_stream(file.file)
        else:
            content_bytes = await file.read()
            try:
                content = content_bytes.decode("utf-8", errors="replace")
            except Exception:
                raise HTTPException(status_code=400, detail="Could not decode file — ensure it is plain text")
            records = parse_file(content, filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not records:
        raise HTTPException(status_code=400, detail="No valid sequences found in uploaded file")

    # Analyze primary sequence (combine all if multiple, capped at 50k bp)
    combined_seq = "".join(r["sequence"] for r in records)[:50_000]

    # Parse optional variant IDs
    var_ids = [v.strip() for v in variant_ids.split(",")] if variant_ids else None

    result = _run_instant_analysis(combined_seq, variant_ids=var_ids)
    result["file_name"] = file.filename
    result["sequences_parsed"] = len(records)
    result["records"] = [
        {"id": r["id"], "description": r["description"], "format": r["format"],
         "length": len(r["sequence"]), "validation": r["validation"]}
        for r in records[:50]
    ]
    return result


@router.post("/from-text")
async def instant_analysis_from_text(
    sequence: str = Form(...),
    name: Optional[str] = Form("manual_sequence"),
    variant_ids: Optional[str] = Form(None)
):
    """
    Accepts a raw DNA sequence string (pasted or sent as form data).
    Runs instant analysis and returns full structured JSON report.
    """
    var_ids = [v.strip() for v in variant_ids.split(",")] if variant_ids else None
    result = _run_instant_analysis(sequence.strip(), variant_ids=var_ids)
    result["file_name"] = name
    result["sequences_parsed"] = 1
    return result


@router.post("/report")
async def generate_pdf_report(result: dict):
    """
    Accepts a previously computed instant analysis result dict
    and returns a downloadable PDF report.
    """
    try:
        pdf_bytes = generate_instant_analysis_pdf(result, file_name=result.get("file_name", "analysis"))
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="genelab_report.pdf"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
