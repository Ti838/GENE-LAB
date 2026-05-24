"""
GenLab AI — Sequence Parser Engine
Handles FASTA, FASTQ, CSV, and plain TXT formats using BioPython + pandas.
Returns a list of validated DNA sequences with metadata.
"""

import io
import re
import csv
import pandas as pd
from Bio import SeqIO
from Bio.Seq import Seq
from typing import List, Dict, Any

# ── Valid DNA nucleotide characters (IUPAC ambiguity codes included) ───────
VALID_DNA_CHARS = set("ATGCNatgcnRYSWKMBDHVryswkmbdhv")
STRICT_DNA_CHARS = set("ATGCatgc")


def validate_sequence(seq: str) -> Dict[str, Any]:
    """
    Validates a DNA sequence string.
    Returns a dict with is_valid flag and any validation errors detected.
    """
    seq = seq.strip().upper()
    errors = []

    if len(seq) == 0:
        errors.append("Empty sequence")
        return {"is_valid": False, "errors": errors, "cleaned": ""}

    invalid_chars = set(seq) - VALID_DNA_CHARS
    if invalid_chars:
        errors.append(f"Invalid characters detected: {', '.join(sorted(invalid_chars))}")

    if len(seq) < 10:
        errors.append("Sequence is too short (< 10 bp) — possible incomplete read")

    # Detect suspiciously high N content (> 50%) — indicates corrupted data
    n_ratio = seq.count("N") / len(seq)
    if n_ratio > 0.5:
        errors.append(f"High N-content ({n_ratio:.1%}) — possible corrupted or low-quality read")

    # Clean sequence: remove non-strict chars for downstream analysis
    cleaned = re.sub(r"[^ATGCatgc]", "", seq)

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "cleaned": cleaned.upper(),
        "original_length": len(seq),
        "cleaned_length": len(cleaned),
        "n_content": round(n_ratio * 100, 2)
    }


def parse_fasta(content: str) -> List[Dict[str, Any]]:
    """
    Parses FASTA format content using BioPython.
    Returns list of {id, description, sequence, validation} dicts.
    """
    records = []
    handle = io.StringIO(content)
    for record in SeqIO.parse(handle, "fasta"):
        seq_str = str(record.seq)
        validation = validate_sequence(seq_str)
        records.append({
            "id": record.id,
            "description": record.description,
            "sequence": validation["cleaned"],
            "original_sequence": seq_str,
            "format": "FASTA",
            "validation": validation
        })
    return records


def parse_fastq(content: str) -> List[Dict[str, Any]]:
    """
    Parses FASTQ format content using BioPython.
    Returns list of {id, sequence, quality_scores, avg_quality, validation} dicts.
    """
    records = []
    handle = io.StringIO(content)
    try:
        for record in SeqIO.parse(handle, "fastq"):
            seq_str = str(record.seq)
            quality_scores = record.letter_annotations.get("phred_quality", [])
            avg_quality = round(sum(quality_scores) / len(quality_scores), 2) if quality_scores else 0
            validation = validate_sequence(seq_str)
            records.append({
                "id": record.id,
                "description": record.description,
                "sequence": validation["cleaned"],
                "original_sequence": seq_str,
                "quality_scores": quality_scores[:100],  # Limit output size
                "avg_quality": avg_quality,
                "format": "FASTQ",
                "validation": validation
            })
    except Exception as e:
        raise ValueError(f"FASTQ parsing error: {str(e)}")
    return records


def parse_csv(content: str) -> List[Dict[str, Any]]:
    """
    Parses CSV files with 'id' and 'sequence' columns.
    Example:
        id,sequence
        1,ATCGATCG
        2,GCTAGCTA
    """
    records = []
    try:
        df = pd.read_csv(io.StringIO(content))
        # Normalize column names to lowercase
        df.columns = [c.strip().lower() for c in df.columns]

        if "sequence" not in df.columns:
            raise ValueError("CSV must have a 'sequence' column")

        id_col = "id" if "id" in df.columns else None

        for idx, row in df.iterrows():
            seq_str = str(row["sequence"]).strip()
            seq_id = str(row[id_col]) if id_col else str(idx + 1)
            validation = validate_sequence(seq_str)
            records.append({
                "id": seq_id,
                "description": f"CSV row {idx + 1}",
                "sequence": validation["cleaned"],
                "original_sequence": seq_str,
                "format": "CSV",
                "validation": validation
            })
    except Exception as e:
        raise ValueError(f"CSV parsing error: {str(e)}")
    return records


def parse_txt(content: str) -> List[Dict[str, Any]]:
    """
    Parses plain text DNA sequence files.
    Treats the whole content as a single sequence (after stripping whitespace/newlines).
    If it looks like FASTA (starts with '>'), delegates to parse_fasta.
    """
    content = content.strip()

    # Auto-detect FASTA inside TXT
    if content.startswith(">"):
        return parse_fasta(content)

    # Treat as raw sequence
    seq_str = re.sub(r"\s+", "", content).upper()
    validation = validate_sequence(seq_str)
    return [{
        "id": "seq_1",
        "description": "Plain text sequence",
        "sequence": validation["cleaned"],
        "original_sequence": seq_str,
        "format": "TXT",
        "validation": validation
    }]


def parse_file(content: str, filename: str) -> List[Dict[str, Any]]:
    """
    Auto-detects file format from filename extension and routes to correct parser.
    Returns a list of parsed sequence records.
    """
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else "txt"

    if ext in ("fa", "fasta", "fna", "ffn", "faa", "frn"):
        return parse_fasta(content)
    elif ext in ("fastq", "fq"):
        return parse_fastq(content)
    elif ext == "csv":
        return parse_csv(content)
    else:
        return parse_txt(content)
