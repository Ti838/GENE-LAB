"""
GenLab AI — NCBI BLAST Engine
Submits a DNA sequence to NCBI BLAST via the public REST API (QBlast).
Polls for completion, then parses and returns structured alignment results.
"""

import time
import requests
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from ..utils import logger

BLAST_BASE_URL = "https://blast.ncbi.nlm.nih.gov/blast/Blast.cgi"

# ── Max sequence length NCBI BLAST will accept for nt (blastn) ────────────
MAX_BLAST_SEQ_LEN = 10_000
# ── Max wait time in seconds before timing out ────────────────────────────
MAX_WAIT_SECONDS = 180
POLL_INTERVAL = 10  # seconds between polls


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=2, max=20),
    retry=retry_if_exception_type((requests.exceptions.RequestException, RuntimeError)))
def submit_blast_job(sequence: str, db: str = "nt", program: str = "blastn", ncbi_api_key: str = "") -> Optional[str]:
    """
    Submits a BLAST search to NCBI and returns the RID (Request ID).
    db: 'nt' for nucleotide database (best for organism identification)
    program: 'blastn' for DNA vs DNA comparison
    """
    seq = sequence.upper()[:MAX_BLAST_SEQ_LEN]  # Truncate long sequences

    params = {
        "CMD": "Put",
        "PROGRAM": program,
        "DATABASE": db,
        "QUERY": seq,
        "FORMAT_TYPE": "XML",
        "HITLIST_SIZE": 10,
        "EXPECT": 0.001,
        "FILTER": "L",          # Low-complexity filter
        "WORD_SIZE": 11,
        "GAPCOSTS": "5 2",
        "MATRIX_NAME": "BLOSUM62",
    }
    if ncbi_api_key:
        params["api_key"] = ncbi_api_key

    logger.info('blast.submit', database=db, program=program)
    resp = requests.post(BLAST_BASE_URL, data=params, timeout=30)
    resp.raise_for_status()

    # Extract RID from the response text
    rid = None
    for line in resp.text.split("\n"):
        if line.startswith("    RID = "):
            rid = line.split("=")[1].strip()
            break

    return rid


@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=2, min=5, max=30),
    retry=retry_if_exception_type((requests.exceptions.RequestException, TimeoutError, RuntimeError)))
def poll_blast_results(rid: str, ncbi_api_key: str = "") -> str:
    """
    Polls NCBI BLAST until the job is complete.
    Returns the raw XML results string.
    Raises TimeoutError if the job doesn't complete within MAX_WAIT_SECONDS.
    """
    elapsed = 0

    while elapsed < MAX_WAIT_SECONDS:
        time.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL

        params = {
            "CMD": "Get",
            "RID": rid,
            "FORMAT_TYPE": "XML",
            "RESULTS_FILE": "on"
        }
        if ncbi_api_key:
            params["api_key"] = ncbi_api_key

        logger.info('blast.poll', rid=rid, elapsed=elapsed)
        resp = requests.get(BLAST_BASE_URL, params=params, timeout=30)
        resp.raise_for_status()
        text = resp.text

        # Check status
        if "Status=WAITING" in text:
            continue
        elif "Status=FAILED" in text:
            raise RuntimeError("BLAST job failed on NCBI servers")
        elif "Status=UNKNOWN" in text:
            raise RuntimeError("BLAST RID expired or unknown")
        else:
            # Results ready
            return text

    raise TimeoutError(f"BLAST job {rid} did not complete within {MAX_WAIT_SECONDS}s")


def parse_blast_xml(xml_text: str) -> List[Dict[str, Any]]:
    """
    Parses NCBI BLAST XML output (Format 5 / XML format).
    Returns a list of hit records with alignment details.
    """
    hits = []
    try:
        root = ET.fromstring(xml_text)
        # Navigate XML structure: BlastOutput > BlastOutput_iterations > Iteration > Iteration_hits > Hit
        iterations = root.findall(".//Iteration")
        for iteration in iterations:
            for hit in iteration.findall(".//Hit"):
                hit_def = hit.findtext("Hit_def", "")
                hit_accession = hit.findtext("Hit_accession", "")
                hit_len = int(hit.findtext("Hit_len", "0"))

                # Best HSP (highest-scoring segment pair)
                hsp = hit.find(".//Hsp")
                if hsp is None:
                    continue

                hsp_score = float(hsp.findtext("Hsp_bit-score", "0"))
                hsp_evalue = float(hsp.findtext("Hsp_evalue", "1"))
                hsp_identity = int(hsp.findtext("Hsp_identity", "0"))
                hsp_align_len = int(hsp.findtext("Hsp_align-len", "1"))
                hsp_gaps = int(hsp.findtext("Hsp_gaps", "0"))
                hsp_qseq = hsp.findtext("Hsp_qseq", "")
                hsp_hseq = hsp.findtext("Hsp_hseq", "")

                identity_pct = round((hsp_identity / hsp_align_len) * 100, 2) if hsp_align_len > 0 else 0

                # Extract organism from hit definition (usually before '[organism]')
                organism = ""
                if "[" in hit_def and "]" in hit_def:
                    start = hit_def.rfind("[") + 1
                    end = hit_def.rfind("]")
                    organism = hit_def[start:end]

                hits.append({
                    "accession": hit_accession,
                    "description": hit_def[:300],
                    "organism": organism,
                    "subject_length": hit_len,
                    "bit_score": round(hsp_score, 2),
                    "e_value": hsp_evalue,
                    "identity_count": hsp_identity,
                    "alignment_length": hsp_align_len,
                    "identity_percentage": identity_pct,
                    "gaps": hsp_gaps,
                    "gap_percentage": round((hsp_gaps / hsp_align_len) * 100, 2) if hsp_align_len > 0 else 0,
                    "query_alignment": hsp_qseq[:100],
                    "subject_alignment": hsp_hseq[:100],
                })

    except ET.ParseError as e:
        raise ValueError(f"Failed to parse BLAST XML: {str(e)}")

    return hits


def run_blast_analysis(sequence: str, ncbi_api_key: str = "") -> Dict[str, Any]:
    """
    End-to-end BLAST analysis:
    1. Submit the job to NCBI
    2. Poll until complete
    3. Parse and return structured results

    Returns a dict with top hits, organism IDs, similarity stats.
    """
    seq = sequence.upper()
    if len(seq) < 20:
        raise ValueError("Sequence too short for BLAST (minimum 20 bp)")

    # Submit
    rid = submit_blast_job(seq, ncbi_api_key=ncbi_api_key)
    if not rid:
        raise RuntimeError("Failed to obtain BLAST RID from NCBI")

    # Poll
    xml_results = poll_blast_results(rid, ncbi_api_key=ncbi_api_key)

    # Parse
    hits = parse_blast_xml(xml_results)

    if not hits:
        return {
            "status": "no_hits",
            "rid": rid,
            "message": "No significant BLAST matches found. The sequence may be novel or too short.",
            "hits": [],
            "top_organism": None,
            "top_identity": 0.0,
            "scientific_explanation": "No homologous sequences were detected in the NCBI nucleotide (nt) database using blastn.",
        }

    top_hit = hits[0]
    organisms = list(dict.fromkeys(h["organism"] for h in hits if h["organism"]))

    scientific_explanation = (
        f"BLAST analysis against the NCBI nucleotide database (nt) returned {len(hits)} significant hit(s). "
        f"The top match is '{top_hit['description'][:100]}' with "
        f"{top_hit['identity_percentage']}% sequence identity over an alignment length of "
        f"{top_hit['alignment_length']} bp (E-value: {top_hit['e_value']:.2e}, "
        f"bit score: {top_hit['bit_score']}). "
        f"Organisms identified: {', '.join(organisms[:5]) if organisms else 'uncharacterized'}."
    )

    return {
        "status": "completed",
        "rid": rid,
        "hits": hits,
        "total_hits": len(hits),
        "top_organism": top_hit["organism"],
        "top_identity": top_hit["identity_percentage"],
        "top_accession": top_hit["accession"],
        "top_evalue": top_hit["e_value"],
        "organisms_identified": organisms[:10],
        "scientific_explanation": scientific_explanation,
        "source": "NCBI BLAST (nt database)"
    }
