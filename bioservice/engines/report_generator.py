"""
GenLab AI — PDF Report Generator
Generates professional PDF analysis reports using ReportLab.
"""

import io
import os
from datetime import datetime
from typing import Dict, Any

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


# ── Color palette matching GenLab AI brand ────────────────────────────────
DARK_BG = colors.HexColor("#0F172A")
CYAN = colors.HexColor("#06B6D4")
TEAL = colors.HexColor("#14B8A6")
CORAL = colors.HexColor("#F87171")
SLATE = colors.HexColor("#94A3B8")
WHITE = colors.white
LIGHT_GRAY = colors.HexColor("#F1F5F9")
DARK_GRAY = colors.HexColor("#1E293B")


def generate_instant_analysis_pdf(analysis_data: Dict[str, Any], file_name: str = "analysis") -> bytes:
    """
    Generates a PDF report for an instant (BioPython + MyVariant) analysis result.
    Returns raw PDF bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"GenLab AI — DNA Analysis Report — {file_name}"
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Custom styles ──────────────────────────────────────────────────────
    title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=22, textColor=DARK_BG, spaceAfter=6, alignment=TA_CENTER)
    subtitle_style = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=11, textColor=SLATE, alignment=TA_CENTER)
    section_style = ParagraphStyle("Section", parent=styles["Heading2"], fontSize=13, textColor=DARK_BG, spaceBefore=14, spaceAfter=6)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#334155"), leading=14)
    mono_style = ParagraphStyle("Mono", parent=styles["Code"], fontSize=8, textColor=colors.HexColor("#0F172A"), leading=11)

    # ── Header ─────────────────────────────────────────────────────────────
    story.append(Paragraph("🧬 GenLab AI", title_style))
    story.append(Paragraph("DNA Sequence Analysis Report", subtitle_style))
    story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", subtitle_style))
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=CYAN))
    story.append(Spacer(1, 0.3 * cm))

    # ── File info ──────────────────────────────────────────────────────────
    story.append(Paragraph("Sample Information", section_style))
    info_data = [
        ["Field", "Value"],
        ["File Name", file_name],
        ["Analysis Type", "Instant Analysis (BioPython + MyVariant.info)"],
        ["Report Date", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
        ["Sequences Analyzed", str(analysis_data.get("sequences_analyzed", 1))],
    ]
    story.append(_make_table(info_data))
    story.append(Spacer(1, 0.4 * cm))

    # ── Sequence Statistics ────────────────────────────────────────────────
    stats = analysis_data.get("statistics", {})
    if stats:
        story.append(Paragraph("Sequence Statistics", section_style))
        nf = stats.get("nucleotide_frequency", {})
        stats_data = [
            ["Metric", "Value"],
            ["Sequence Length", f"{stats.get('sequence_length', 0):,} bp"],
            ["GC Content", f"{stats.get('gc_content', 0):.2f}%"],
            ["AT Content", f"{stats.get('at_content', 0):.2f}%"],
            ["Adenine (A)", f"{nf.get('A', 0):,} ({stats.get('nucleotide_percentage', {}).get('A', 0):.1f}%)"],
            ["Thymine (T)", f"{nf.get('T', 0):,} ({stats.get('nucleotide_percentage', {}).get('T', 0):.1f}%)"],
            ["Guanine (G)", f"{nf.get('G', 0):,} ({stats.get('nucleotide_percentage', {}).get('G', 0):.1f}%)"],
            ["Cytosine (C)", f"{nf.get('C', 0):,} ({stats.get('nucleotide_percentage', {}).get('C', 0):.1f}%)"],
            ["GC Skew", str(stats.get("gc_skew", 0))],
            ["Estimated MW", f"{stats.get('molecular_weight_estimate_da', 0):,} Da"],
        ]
        story.append(_make_table(stats_data))
        story.append(Spacer(1, 0.4 * cm))

    # ── Codon Analysis ─────────────────────────────────────────────────────
    codon = analysis_data.get("codon_analysis", {})
    if codon and "error" not in codon:
        story.append(Paragraph("Codon Analysis", section_style))
        codon_data = [
            ["Metric", "Value"],
            ["Total Codons", str(codon.get("total_codons", 0))],
            ["Protein Length", f"{codon.get('protein_length', 0)} aa"],
            ["Start Codons (ATG)", str(codon.get("start_codon_count", 0))],
            ["Stop Codons", str(codon.get("stop_codon_count", 0))],
            ["ORFs Detected", str(codon.get("open_reading_frames_detected", 0))],
        ]
        story.append(_make_table(codon_data))

        # Protein sequence preview
        protein = codon.get("amino_acid_sequence", "")
        if protein:
            story.append(Spacer(1, 0.2 * cm))
            story.append(Paragraph("Translated Protein Sequence (first 200 aa):", body_style))
            story.append(Paragraph(protein[:200], mono_style))
        story.append(Spacer(1, 0.4 * cm))

    # ── Mutation Report ────────────────────────────────────────────────────
    mutation_data = analysis_data.get("mutation_analysis", {})
    if mutation_data:
        story.append(Paragraph("Mutation & Variant Analysis (MyVariant.info)", section_style))
        mut_summary = [
            ["Metric", "Value"],
            ["Variants Queried", str(mutation_data.get("variants_analyzed", 0))],
            ["High Severity", str(mutation_data.get("high_severity_count", 0))],
            ["Disease Associations", str(len(mutation_data.get("disease_associations", [])))],
            ["Data Source", mutation_data.get("source", "MyVariant.info")],
        ]
        story.append(_make_table(mut_summary))

        # Clinical summary
        clinical_summary = mutation_data.get("clinical_summary", "")
        if clinical_summary:
            story.append(Spacer(1, 0.2 * cm))
            story.append(Paragraph("Clinical Summary:", section_style))
            story.append(Paragraph(clinical_summary, body_style))

        # Individual variants
        variants = mutation_data.get("variants", [])
        if variants:
            story.append(Spacer(1, 0.3 * cm))
            story.append(Paragraph("Variant Details:", section_style))
            var_table_data = [["Variant ID", "Gene", "Clinical Significance", "Severity", "CADD Score"]]
            for v in variants[:20]:  # Limit to 20 in report
                var_table_data.append([
                    str(v.get("variant_id", "")[:25]),
                    str(v.get("gene", "N/A")),
                    str(v.get("clinical_significance", "N/A"))[:40],
                    str(v.get("severity", "N/A")),
                    str(v.get("cadd_phred_score", "N/A"))
                ])
            story.append(_make_table(var_table_data, header_color=TEAL))
        story.append(Spacer(1, 0.4 * cm))

    # ── Scientific Summary ─────────────────────────────────────────────────
    scientific_summary = analysis_data.get("scientific_summary", "")
    if scientific_summary:
        story.append(HRFlowable(width="100%", thickness=1, color=SLATE))
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph("Scientific Summary", section_style))
        story.append(Paragraph(scientific_summary, body_style))

    # ── Footer ─────────────────────────────────────────────────────────────
    story.append(Spacer(1, 1 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=SLATE))
    story.append(Spacer(1, 0.2 * cm))
    footer_text = "GenLab AI — Confidential Medical Report | For research purposes only | Not for clinical diagnosis without physician review"
    story.append(Paragraph(footer_text, ParagraphStyle("Footer", parent=styles["Normal"], fontSize=7, textColor=SLATE, alignment=TA_CENTER)))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


def generate_deep_analysis_pdf(blast_data: Dict[str, Any], file_name: str = "deep_analysis") -> bytes:
    """
    Generates a PDF report for a deep BLAST analysis result.
    Returns raw PDF bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"GenLab AI — Deep Analysis Report — {file_name}"
    )

    styles = getSampleStyleSheet()
    story = []

    title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=22, textColor=DARK_BG, spaceAfter=6, alignment=TA_CENTER)
    subtitle_style = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=11, textColor=SLATE, alignment=TA_CENTER)
    section_style = ParagraphStyle("Section", parent=styles["Heading2"], fontSize=13, textColor=DARK_BG, spaceBefore=14, spaceAfter=6)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#334155"), leading=14)

    # Header
    story.append(Paragraph("🧬 GenLab AI", title_style))
    story.append(Paragraph("Deep Sequence Analysis Report (NCBI BLAST)", subtitle_style))
    story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", subtitle_style))
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=CYAN))
    story.append(Spacer(1, 0.3 * cm))

    # BLAST Summary
    story.append(Paragraph("BLAST Analysis Summary", section_style))
    summary_data = [
        ["Parameter", "Value"],
        ["File Analyzed", file_name],
        ["BLAST RID", str(blast_data.get("rid", "N/A"))],
        ["Database", "NCBI Nucleotide (nt)"],
        ["Total Hits", str(blast_data.get("total_hits", 0))],
        ["Top Organism", str(blast_data.get("top_organism", "N/A"))],
        ["Top Identity", f"{blast_data.get('top_identity', 0):.2f}%"],
        ["Top E-value", str(blast_data.get("top_evalue", "N/A"))],
        ["Top Accession", str(blast_data.get("top_accession", "N/A"))],
    ]
    story.append(_make_table(summary_data))
    story.append(Spacer(1, 0.4 * cm))

    # Organisms identified
    organisms = blast_data.get("organisms_identified", [])
    if organisms:
        story.append(Paragraph("Organisms Identified", section_style))
        org_data = [["Rank", "Organism"]] + [[str(i + 1), org] for i, org in enumerate(organisms)]
        story.append(_make_table(org_data))
        story.append(Spacer(1, 0.4 * cm))

    # Top Hits Table
    hits = blast_data.get("hits", [])
    if hits:
        story.append(Paragraph("Top BLAST Hits", section_style))
        hits_data = [["#", "Accession", "Identity %", "E-value", "Bit Score", "Organism"]]
        for i, hit in enumerate(hits[:10]):
            hits_data.append([
                str(i + 1),
                str(hit.get("accession", ""))[:15],
                f"{hit.get('identity_percentage', 0):.1f}%",
                f"{hit.get('e_value', 1):.2e}",
                str(hit.get("bit_score", "")),
                str(hit.get("organism", "N/A"))[:30],
            ])
        story.append(_make_table(hits_data, header_color=CYAN))
        story.append(Spacer(1, 0.4 * cm))

    # Scientific Explanation
    explanation = blast_data.get("scientific_explanation", "")
    if explanation:
        story.append(HRFlowable(width="100%", thickness=1, color=SLATE))
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph("Scientific Interpretation", section_style))
        story.append(Paragraph(explanation, body_style))

    # Footer
    story.append(Spacer(1, 1 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=SLATE))
    story.append(Spacer(1, 0.2 * cm))
    footer_text = "GenLab AI — Confidential Research Report | NCBI BLAST results | For informational purposes only"
    story.append(Paragraph(footer_text, ParagraphStyle("Footer", parent=styles["Normal"], fontSize=7, textColor=SLATE, alignment=TA_CENTER)))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


def _make_table(data: list, header_color=None) -> Table:
    """Helper to create a styled ReportLab table."""
    if header_color is None:
        header_color = DARK_BG

    table = Table(data, repeatRows=1, hAlign="LEFT")
    style = TableStyle([
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), header_color),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        # Body rows
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#1E293B")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_GRAY, WHITE]),
        ("ALIGN", (0, 1), (-1, -1), "LEFT"),
        ("TOPPADDING", (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        # Grid
        ("GRID", (0, 0), (-1, -1), 0.3, SLATE),
        ("ROWHEIGHT", (0, 0), (-1, -1), 18),
    ])
    table.setStyle(style)
    return table
