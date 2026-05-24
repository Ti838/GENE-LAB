"""
GenLab AI — DNA Analyzer Engine
Performs all local DNA analysis using BioPython:
- Sequence statistics (GC%, AT%, nucleotide frequencies)
- Codon analysis (frequency, amino acid translation, start/stop codons)
- Repeat detection
- Reverse complement + RNA transcription
"""

from Bio.Seq import Seq
from collections import Counter
from typing import Dict, Any, List


# ── Standard genetic code (codon → amino acid 1-letter) ───────────────────
CODON_TABLE = {
    "TTT": "F", "TTC": "F", "TTA": "L", "TTG": "L",
    "CTT": "L", "CTC": "L", "CTA": "L", "CTG": "L",
    "ATT": "I", "ATC": "I", "ATA": "I", "ATG": "M",
    "GTT": "V", "GTC": "V", "GTA": "V", "GTG": "V",
    "TCT": "S", "TCC": "S", "TCA": "S", "TCG": "S",
    "CCT": "P", "CCC": "P", "CCA": "P", "CCG": "P",
    "ACT": "T", "ACC": "T", "ACA": "T", "ACG": "T",
    "GCT": "A", "GCC": "A", "GCA": "A", "GCG": "A",
    "TAT": "Y", "TAC": "Y", "TAA": "*", "TAG": "*",
    "CAT": "H", "CAC": "H", "CAA": "Q", "CAG": "Q",
    "AAT": "N", "AAC": "N", "AAA": "K", "AAG": "K",
    "GAT": "D", "GAC": "D", "GAA": "E", "GAG": "E",
    "TGT": "C", "TGC": "C", "TGA": "*", "TGG": "W",
    "CGT": "R", "CGC": "R", "CGA": "R", "CGG": "R",
    "AGT": "S", "AGC": "S", "AGA": "R", "AGG": "R",
    "GGT": "G", "GGC": "G", "GGA": "G", "GGG": "G",
}

START_CODON = "ATG"
STOP_CODONS = {"TAA", "TAG", "TGA"}

# Amino acid full names
AA_NAMES = {
    "A": "Alanine", "R": "Arginine", "N": "Asparagine", "D": "Aspartic acid",
    "C": "Cysteine", "Q": "Glutamine", "E": "Glutamic acid", "G": "Glycine",
    "H": "Histidine", "I": "Isoleucine", "L": "Leucine", "K": "Lysine",
    "M": "Methionine", "F": "Phenylalanine", "P": "Proline", "S": "Serine",
    "T": "Threonine", "W": "Tryptophan", "Y": "Tyrosine", "V": "Valine",
    "*": "Stop codon"
}


def sequence_statistics(sequence: str) -> Dict[str, Any]:
    """
    Computes nucleotide-level statistics for a DNA sequence.
    """
    seq = sequence.upper()
    length = len(seq)

    if length == 0:
        return {"error": "Empty sequence — cannot compute statistics"}

    counts = Counter(seq)
    a = counts.get("A", 0)
    t = counts.get("T", 0)
    g = counts.get("G", 0)
    c = counts.get("C", 0)
    n = counts.get("N", 0)

    gc_content = round(((g + c) / length) * 100, 2) if length > 0 else 0
    at_content = round(((a + t) / length) * 100, 2) if length > 0 else 0

    return {
        "sequence_length": length,
        "gc_content": gc_content,
        "at_content": at_content,
        "nucleotide_frequency": {
            "A": a,
            "T": t,
            "G": g,
            "C": c,
            "N": n
        },
        "nucleotide_percentage": {
            "A": round((a / length) * 100, 2),
            "T": round((t / length) * 100, 2),
            "G": round((g / length) * 100, 2),
            "C": round((c / length) * 100, 2),
            "N": round((n / length) * 100, 2),
        },
        "gc_skew": round((g - c) / (g + c), 4) if (g + c) > 0 else 0,
        "at_skew": round((a - t) / (a + t), 4) if (a + t) > 0 else 0,
        "molecular_weight_estimate_da": round(length * 330, 1)  # ~330 Da per nucleotide
    }


def codon_analysis(sequence: str) -> Dict[str, Any]:
    """
    Performs codon-level analysis on a DNA sequence using BioPython.
    Translates the sequence using the standard genetic code.
    Detects start and stop codons.
    """
    seq = sequence.upper()
    length = len(seq)

    if length < 3:
        return {"error": "Sequence too short for codon analysis (< 3 bp)"}

    # Count codons in the reading frame (frame +1 by default)
    codon_freq: Dict[str, int] = {}
    amino_acids: List[str] = []
    start_positions: List[int] = []
    stop_positions: List[int] = []

    for i in range(0, length - 2, 3):
        codon = seq[i:i + 3]
        if len(codon) < 3:
            break
        codon_freq[codon] = codon_freq.get(codon, 0) + 1
        aa = CODON_TABLE.get(codon, "?")
        amino_acids.append(aa)

        if codon == START_CODON:
            start_positions.append(i)
        if codon in STOP_CODONS:
            stop_positions.append(i)

    # BioPython translation
    try:
        bio_seq = Seq(seq[:length - (length % 3)])  # Trim to codon boundary
        protein = str(bio_seq.translate(to_stop=False))
    except Exception:
        protein = "".join(amino_acids)

    # Amino acid composition
    aa_counts = Counter(protein)
    aa_composition = {
        aa: {
            "count": count,
            "name": AA_NAMES.get(aa, "Unknown"),
            "percentage": round((count / len(protein)) * 100, 2) if protein else 0
        }
        for aa, count in aa_counts.most_common()
    }

    # Sort codons by frequency
    sorted_codons = sorted(codon_freq.items(), key=lambda x: x[1], reverse=True)[:20]

    return {
        "total_codons": len(amino_acids),
        "codon_frequency": dict(sorted_codons),
        "amino_acid_sequence": protein[:500],  # Limit output
        "amino_acid_composition": aa_composition,
        "protein_length": len(protein),
        "start_codon_positions": start_positions[:50],
        "stop_codon_positions": stop_positions[:50],
        "start_codon_count": len(start_positions),
        "stop_codon_count": len(stop_positions),
        "open_reading_frames_detected": len(start_positions)
    }


def detect_repeats(sequence: str, kmer_length: int = 6) -> List[Dict[str, Any]]:
    """
    Detects repeated k-mers in the sequence.
    Returns top 30 most repeated k-mers.
    """
    seq = sequence.upper()
    kmer_counts: Dict[str, int] = {}

    for i in range(len(seq) - kmer_length + 1):
        kmer = seq[i:i + kmer_length]
        kmer_counts[kmer] = kmer_counts.get(kmer, 0) + 1

    repeats = [
        {"kmer": kmer, "count": count, "frequency": round(count / (len(seq) - kmer_length + 1) * 100, 4)}
        for kmer, count in kmer_counts.items()
        if count > 1
    ]
    repeats.sort(key=lambda x: x["count"], reverse=True)
    return repeats[:30]


def reverse_complement(sequence: str) -> str:
    """Returns the reverse complement of a DNA sequence using BioPython."""
    return str(Seq(sequence.upper()).reverse_complement())


def transcribe_to_rna(sequence: str) -> str:
    """Transcribes DNA to RNA using BioPython."""
    return str(Seq(sequence.upper()).transcribe())


def analyze_sequence(sequence: str) -> Dict[str, Any]:
    """
    Master analysis function: runs all local DNA analysis steps
    on a single cleaned sequence string.
    Returns a comprehensive result dict.
    """
    stats = sequence_statistics(sequence)
    codons = codon_analysis(sequence)
    repeats = detect_repeats(sequence)

    return {
        "statistics": stats,
        "codon_analysis": codons,
        "top_repeats": repeats,
        "reverse_complement": reverse_complement(sequence)[:200],   # Truncate for API response
        "rna_transcript": transcribe_to_rna(sequence)[:200],
    }
