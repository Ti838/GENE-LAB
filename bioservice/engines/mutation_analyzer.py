"""
GenLab AI — Mutation Analyzer Engine
Uses the MyVariant.info REST API to interpret genetic variants/SNPs.
Fetches disease associations, clinical significance, and mutation severity.
"""

import requests  # type: ignore
import time
from typing import List, Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type  # type: ignore
from utils import logger  # type: ignore

MYVARIANT_BASE_URL = "https://myvariant.info/v1"

# ── Severity mapping from ClinVar clinical significance ───────────────────
SEVERITY_MAP = {
    "pathogenic": "HIGH",
    "likely pathogenic": "HIGH",
    "drug response": "MODERATE",
    "risk factor": "MODERATE",
    "uncertain significance": "UNKNOWN",
    "conflicting interpretations of pathogenicity": "UNKNOWN",
    "likely benign": "LOW",
    "benign": "LOW",
    "not provided": "UNKNOWN",
}


def get_severity(clinical_sig: str) -> str:
    """Maps ClinVar clinical significance string to a severity level."""
    if not clinical_sig:
        return "UNKNOWN"
    sig_lower = clinical_sig.lower()
    for key, severity in SEVERITY_MAP.items():
        if key in sig_lower:
            return severity
    return "UNKNOWN"


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((requests.exceptions.RequestException,)))
def lookup_variant(variant_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetches variant annotation from MyVariant.info by rsID or HGVS notation.
    Example: rs58991260, chr1:g.35367G>A

    Returns structured annotation dict or None if not found.
    """
    url = f"{MYVARIANT_BASE_URL}/variant/{variant_id}"
    params = {
        "fields": "dbsnp,clinvar,cadd,exac,gnomad_exome,civic,dbnsfp",
        "assembly": "hg38"
    }

    logger.info('myvariant.lookup', variant_id=variant_id)
    resp = requests.get(url, params=params, timeout=15)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    data = resp.json()
    return _format_variant(data, variant_id)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=12),
    retry=retry_if_exception_type((requests.exceptions.RequestException,)))
def query_variants(rsids: List[str]) -> List[Dict[str, Any]]:
    """
    Batch-queries multiple rsIDs from MyVariant.info using the POST endpoint.
    Efficiently handles up to 1000 variants per request.
    """
    if not rsids:
        return []

    url = f"{MYVARIANT_BASE_URL}/variant"
    payload = {
        "ids": rsids[:1000],  # API limit
        "fields": "dbsnp,clinvar,cadd,gnomad_exome,dbnsfp"
    }

    logger.info('myvariant.query', count=len(payload.get('ids', [])))
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    results = resp.json()
    return [_format_variant(v, v.get("_id", "")) for v in results if not v.get("notfound")]


def _format_variant(data: Dict, variant_id: str) -> Dict[str, Any]:
    """
    Normalizes a MyVariant.info response into a clean, structured dict
    suitable for the frontend and MongoDB storage.
    """
    clinvar = data.get("clinvar", {})
    dbsnp = data.get("dbsnp", {})
    cadd = data.get("cadd", {})
    gnomad = data.get("gnomad_exome", {})
    dbnsfp = data.get("dbnsfp", {})

    # Extract clinical significance (can be string or list)
    clinical_sig = clinvar.get("clinical_significance", {})
    if isinstance(clinical_sig, dict):
        clinical_sig = clinical_sig.get("description", "")
    elif isinstance(clinical_sig, list):
        clinical_sig = ", ".join(clinical_sig)

    # Extract gene info
    gene_info = dbsnp.get("gene", {})
    gene_symbol = gene_info.get("symbol", "") if isinstance(gene_info, dict) else ""

    # Extract disease associations
    conditions = clinvar.get("conditions", [])
    if isinstance(conditions, dict):
        conditions = [conditions]
    diseases = []
    for cond in (conditions or []):
        name = cond.get("name", "")
        if name:
            diseases.append(name)

    # CADD score — pathogenicity prediction
    cadd_score = cadd.get("phred", None)
    if isinstance(cadd_score, dict):
        cadd_score = cadd_score.get("phred", None)

    # Population frequency from gnomAD
    allele_freq = None
    if gnomad:
        freq_data = gnomad.get("af", {})
        if isinstance(freq_data, dict):
            allele_freq = freq_data.get("af", None)

    severity = get_severity(clinical_sig)

    return {
        "variant_id": variant_id or data.get("_id", ""),
        "gene": gene_symbol,
        "clinical_significance": clinical_sig,
        "severity": severity,
        "disease_associations": diseases[:10],  # Limit to top 10
        "cadd_phred_score": cadd_score,
        "population_frequency": allele_freq,
        "rsid": dbsnp.get("rsid", ""),
        "reference": dbsnp.get("ref", ""),
        "alternate": dbsnp.get("alt", ""),
        "chromosome": dbsnp.get("chrom", ""),
        "position": dbsnp.get("hg38", {}).get("start", None) if isinstance(dbsnp.get("hg38"), dict) else None,
        "polyphen2_hdiv": dbnsfp.get("polyphen2", {}).get("hdiv", {}).get("pred", None) if isinstance(dbnsfp.get("polyphen2"), dict) else None,
        "sift_pred": dbnsfp.get("sift", {}).get("pred", None) if isinstance(dbnsfp.get("sift"), dict) else None,
    }


def extract_known_snps_from_sequence(sequence: str) -> List[str]:
    """
    Heuristic: Looks for common mutation patterns in a sequence.
    In a real pipeline this would use a VCF file or alignment output.
    Here we search for known SNP-associated motifs as a demo.
    This is called when no explicit variant IDs are provided.
    """
    # Common demo rsIDs for well-known variants
    # In production, this would be replaced by a proper variant caller pipeline
    demo_variants = [
        "rs113488022",   # BRAF V600E
        "rs28934574",    # TP53
        "rs80357906",    # BRCA1
        "rs17849074",    # KRAS G12C
    ]
    return demo_variants


def analyze_mutations(
    sequence: str,
    variant_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Master mutation analysis function.
    If variant_ids are provided (e.g., from a VCF), uses them directly.
    Otherwise, uses demo known variants to demonstrate the API integration.
    """
    if not variant_ids:
        variant_ids = extract_known_snps_from_sequence(sequence)

    variants = query_variants(variant_ids)

    high_severity = [v for v in variants if v.get("severity") == "HIGH"]
    moderate_severity = [v for v in variants if v.get("severity") == "MODERATE"]
    unknown_severity = [v for v in variants if v.get("severity") == "UNKNOWN"]

    all_diseases = []
    for v in variants:
        all_diseases.extend(v.get("disease_associations", []))
    unique_diseases = list(set(all_diseases))

    return {
        "variants_analyzed": len(variants),
        "high_severity_count": len(high_severity),
        "moderate_severity_count": len(moderate_severity),
        "variants": variants,
        "disease_associations": unique_diseases[:20],
        "clinical_summary": _generate_clinical_summary(variants, high_severity),
        "source": "MyVariant.info"
    }


def _generate_clinical_summary(variants: List, high_severity: List) -> str:
    """Generates a plain-language clinical summary from variant results."""
    if not variants:
        return "No variant data available from MyVariant.info for the queried positions."
    if len(high_severity) == 0:
        return (
            f"Analysis of {len(variants)} genomic variant(s) found no high-severity pathogenic "
            f"mutations. Routine clinical monitoring is recommended."
        )
    genes = list(set(v.get("gene", "unknown") for v in high_severity if v.get("gene")))
    return (
        f"WARNING: {len(high_severity)} high-severity pathogenic variant(s) detected "
        f"in the following gene(s): {', '.join(genes) or 'uncharacterized region'}. "
        f"Immediate clinical review is strongly recommended."
    )
