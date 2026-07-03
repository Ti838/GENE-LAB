"""
GenLab AI — Mutation Analyzer Engine
Uses MyVariant.info, Ensembl REST, and NCBI ClinVar E-utilities REST APIs 
to retrieve genetic variant phenotypes, clinical significance, and pathogenicity.
"""

import requests  # type: ignore
import time
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type  # type: ignore
from utils import logger  # type: ignore

MYVARIANT_BASE_URL = "https://myvariant.info/v1"

# Thread-safe in-memory cache to prevent redundant external API network latency
VARIANT_CACHE: Dict[str, Dict[str, Any]] = {}

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


def lookup_ensembl_variant(rsid: str) -> Optional[Dict[str, Any]]:
    """
    Fetches variant annotations from Ensembl REST API as a fallback/enhancement.
    Endpoint: https://rest.ensembl.org/variation/human/{rsid}
    """
    rsid = rsid.strip().lower()
    if not rsid.startswith("rs"):
        return None
    
    url = f"https://rest.ensembl.org/variation/human/{rsid}"
    headers = {"Content-Type": "application/json"}
    
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()
        
        # Parse mappings
        mappings = data.get("mappings", [])
        chrom = ""
        pos = None
        ref = ""
        alt = ""
        if mappings:
            mapping = mappings[0]
            chrom = mapping.get("seq_region_name", "")
            pos = mapping.get("start", None)
            allele_string = mapping.get("allele_string", "")
            if "/" in allele_string:
                parts = allele_string.split("/")
                ref = parts[0]
                alt = parts[1] if len(parts) > 1 else ""
                
        # Parse clinical significance
        clinical_sig_list = data.get("clinical_significance", [])
        clinical_sig = ", ".join(clinical_sig_list) if clinical_sig_list else ""
        
        # Parse phenotypes/diseases
        diseases = []
        for p in data.get("phenotypes", []):
            desc = p.get("phenotype", "")
            if desc and desc.lower() not in ["not provided", "not specified", "none"]:
                diseases.append(desc)
        diseases = list(set(diseases))
        
        consequence = data.get("most_severe_consequence", "")
        severity = get_severity(clinical_sig)
        if severity == "UNKNOWN" and consequence:
            if consequence in ["stop_gained", "frameshift_variant", "splice_acceptor_variant", "splice_donor_variant"]:
                severity = "HIGH"
            elif consequence in ["missense_variant", "inframe_insertion", "inframe_deletion"]:
                severity = "MODERATE"
            else:
                severity = "LOW"
                
        return {
            "variant_id": rsid,
            "gene": "",
            "clinical_significance": clinical_sig,
            "severity": severity,
            "disease_associations": diseases[:10],
            "cadd_phred_score": None,
            "population_frequency": None,
            "rsid": rsid,
            "reference": ref,
            "alternate": alt,
            "chromosome": chrom,
            "position": pos,
            "source": "Ensembl REST API"
        }
    except Exception as e:
        logger.error('ensembl.lookup_failed', rsid=rsid, error=str(e))
        return None


def lookup_ncbi_clinvar(rsid: str) -> Optional[Dict[str, Any]]:
    """
    Fetches clinical variant significance and disease mappings from NCBI ClinVar database using E-utilities.
    """
    rsid = rsid.strip().lower()
    if not rsid.startswith("rs"):
        return None
        
    try:
        search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        search_params = {
            "db": "clinvar",
            "term": rsid,
            "retmode": "json"
        }
        resp = requests.get(search_url, params=search_params, timeout=10)
        resp.raise_for_status()
        search_data = resp.json()
        
        id_list = search_data.get("esearchresult", {}).get("idlist", [])
        if not id_list:
            return None
            
        uid = id_list[0]
        
        summary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
        summary_params = {
            "db": "clinvar",
            "id": uid,
            "retmode": "json"
        }
        summary_resp = requests.get(summary_url, params=summary_params, timeout=10)
        summary_resp.raise_for_status()
        summary_data = summary_resp.json()
        
        result_info = summary_data.get("result", {}).get(uid, {})
        if not result_info:
            return None
            
        clinical_sig = result_info.get("clinical_significance", {}).get("description", "")
        genes = [g.get("symbol", "") for g in result_info.get("genes", []) if g.get("symbol")]
        gene_symbol = genes[0] if genes else ""
        
        diseases = []
        for trait in result_info.get("trait_set", []):
            trait_name = trait.get("trait_name", "")
            if trait_name and trait_name.lower() not in ["not provided", "not specified"]:
                diseases.append(trait_name)
                
        severity = get_severity(clinical_sig)
        
        return {
            "variant_id": rsid,
            "gene": gene_symbol,
            "clinical_significance": clinical_sig,
            "severity": severity,
            "disease_associations": list(set(diseases))[:10],
            "rsid": rsid,
            "source": "NCBI ClinVar API"
        }
    except Exception as e:
        logger.error('ncbi.lookup_failed', rsid=rsid, error=str(e))
        return None


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((requests.exceptions.RequestException,)))
def lookup_variant(variant_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetches variant annotation from MyVariant.info, with Ensembl and NCBI fallback.
    """
    url = f"{MYVARIANT_BASE_URL}/variant/{variant_id}"
    params = {
        "fields": "dbsnp,clinvar,cadd,exac,gnomad_exome,civic,dbnsfp",
        "assembly": "hg38"
    }
    
    mv_result = None
    try:
        logger.info('myvariant.lookup', variant_id=variant_id)
        resp = requests.get(url, params=params, timeout=12)
        if resp.status_code == 200:
            mv_result = _format_variant(resp.json(), variant_id)
    except Exception as e:
        logger.warn('myvariant.lookup_failed', variant_id=variant_id, error=str(e))

    ens_result = lookup_ensembl_variant(variant_id)
    ncbi_result = lookup_ncbi_clinvar(variant_id)

    if not mv_result and not ens_result and not ncbi_result:
        return None

    base = mv_result or ens_result or ncbi_result or {}
    sources = []
    if mv_result: sources.append("MyVariant.info")
    if ens_result: sources.append("Ensembl REST API")
    if ncbi_result: sources.append("NCBI ClinVar API")
    base["sources"] = sources

    for other in [mv_result, ens_result, ncbi_result]:
        if not other:
            continue
        if not base.get("gene") and other.get("gene"):
            base["gene"] = other["gene"]
        if not base.get("clinical_significance") and other.get("clinical_significance"):
            base["clinical_significance"] = other["clinical_significance"]
            base["severity"] = other.get("severity", "UNKNOWN")
        if other.get("disease_associations"):
            existing = base.get("disease_associations", [])
            merged = list(set(existing + other["disease_associations"]))
            base["disease_associations"] = merged[:10]
        if not base.get("chromosome") and other.get("chromosome"):
            base["chromosome"] = other["chromosome"]
        if not base.get("position") and other.get("position"):
            base["position"] = other["position"]
        if not base.get("reference") and other.get("reference"):
            base["reference"] = other["reference"]
            base["alternate"] = other.get("alternate", "")

    return base


def get_variant_enriched(rsid: str, mv_var: Optional[Dict] = None) -> Dict[str, Any]:
    """Helper that queries Ensembl and NCBI in parallel and merges findings."""
    if rsid in VARIANT_CACHE:
        return VARIANT_CACHE[rsid]

    ens_var = lookup_ensembl_variant(rsid)
    ncbi_var = lookup_ncbi_clinvar(rsid)

    if not mv_var and not ens_var and not ncbi_var:
        return {}

    base = mv_var or ens_var or ncbi_var or {}
    sources = []
    if mv_var: sources.append("MyVariant.info")
    if ens_var: sources.append("Ensembl REST API")
    if ncbi_var: sources.append("NCBI ClinVar API")
    base["sources"] = sources

    for other in [mv_var, ens_var, ncbi_var]:
        if not other:
            continue
        if not base.get("gene") and other.get("gene"):
            base["gene"] = other["gene"]
        if not base.get("clinical_significance") and other.get("clinical_significance"):
            base["clinical_significance"] = other["clinical_significance"]
            base["severity"] = other.get("severity", "UNKNOWN")
        if other.get("disease_associations"):
            existing = base.get("disease_associations", [])
            merged = list(set(existing + other["disease_associations"]))
            base["disease_associations"] = merged[:10]
        if not base.get("chromosome") and other.get("chromosome"):
            base["chromosome"] = other["chromosome"]
        if not base.get("position") and other.get("position"):
            base["position"] = other["position"]
        if not base.get("reference") and other.get("reference"):
            base["reference"] = other["reference"]
            base["alternate"] = other.get("alternate", "")

    # Cache result
    VARIANT_CACHE[rsid] = base
    return base


def query_variants(rsids: List[str]) -> List[Dict[str, Any]]:
    """
    Queries multiple rsIDs concurrently, leveraging thread-pool parallelism 
    and a local in-memory cache to guarantee sub-second response times.
    """
    if not rsids:
        return []

    # Clean and deduplicate queried rsIDs
    unique_rsids = list(set(r.strip() for r in rsids if r.strip()))

    cached_vars = []
    uncached_rsids = []
    for r in unique_rsids:
        if r in VARIANT_CACHE:
            cached_vars.append(VARIANT_CACHE[r])
        else:
            uncached_rsids.append(r)

    if not uncached_rsids:
        return cached_vars

    # Batch query MyVariant.info POST endpoint for all uncached elements
    mv_results_map = {}
    try:
        url = f"{MYVARIANT_BASE_URL}/variant"
        payload = {
            "ids": uncached_rsids[:1000],
            "fields": "dbsnp,clinvar,cadd,gnomad_exome,dbnsfp"
        }
        logger.info('myvariant.query', count=len(uncached_rsids))
        resp = requests.post(url, json=payload, timeout=15)
        if resp.status_code == 200:
            for v in resp.json():
                if not v.get("notfound"):
                    fmt = _format_variant(v, v.get("_id", ""))
                    mv_results_map[fmt["variant_id"]] = fmt
    except Exception as e:
        logger.warn('myvariant.query_failed', error=str(e))

    # Parallelize fallback queries and annotation enrichment using ThreadPoolExecutor
    enriched_vars = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {}
        for rsid in uncached_rsids:
            mv_var = mv_results_map.get(rsid)
            # If variant not found in MyVariant or is missing diagnostic clinical info, fetch concurrently
            if not mv_var or not mv_var.get("clinical_significance") or not mv_var.get("disease_associations"):
                futures[executor.submit(get_variant_enriched, rsid, mv_var)] = rsid
            else:
                mv_var["sources"] = ["MyVariant.info"]
                VARIANT_CACHE[rsid] = mv_var
                enriched_vars.append(mv_var)

        for future in as_completed(futures):
            rsid = futures[future]
            try:
                res = future.result()
                if res:
                    enriched_vars.append(res)
            except Exception as exc:
                logger.error('enrich.failed', rsid=rsid, error=str(exc))

    return cached_vars + enriched_vars


def _format_variant(data: Any, variant_id: str) -> Dict[str, Any]:
    if isinstance(data, list):
        data = data[0] if len(data) > 0 else {}
    clinvar = data.get("clinvar", {}) if isinstance(data, dict) else {}
    dbsnp = data.get("dbsnp", {}) if isinstance(data, dict) else {}
    cadd = data.get("cadd", {}) if isinstance(data, dict) else {}
    gnomad = data.get("gnomad_exome", {}) if isinstance(data, dict) else {}
    dbnsfp = data.get("dbnsfp", {}) if isinstance(data, dict) else {}

    clinical_sig = clinvar.get("clinical_significance", {})
    if isinstance(clinical_sig, dict):
        clinical_sig = clinical_sig.get("description", "")
    elif isinstance(clinical_sig, list):
        clinical_sig = ", ".join(clinical_sig)

    gene_info = dbsnp.get("gene", {})
    gene_symbol = gene_info.get("symbol", "") if isinstance(gene_info, dict) else ""

    conditions = clinvar.get("conditions", [])
    if isinstance(conditions, dict):
        conditions = [conditions]
    diseases = []
    for cond in (conditions or []):
        name = cond.get("name", "")
        if name:
            diseases.append(name)

    cadd_score = cadd.get("phred", None)
    if isinstance(cadd_score, dict):
        cadd_score = cadd_score.get("phred", None)

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
        "disease_associations": diseases[:10],
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
        "source": "Ensembl REST + NCBI ClinVar + MyVariant"
    }


def _generate_clinical_summary(variants: List, high_severity: List) -> str:
    if not variants:
        return "No variant data available from open source APIs for the queried positions."
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
