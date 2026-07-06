# 🧬 GeneLab — Bioinformatics Ingestion & Processing Architecture

**Version:** 2.0.0  
**Scope:** Core Analysis Engine & External Integrations  

---

## 1. External API Integration Layer

To provide rich educational mapping, GeneLab integrates with primary bioinformatics registries. Below is a description of the request handling and query construction:

```
                  ┌───────────────────────────────────────────┐
                  │          GeneLab Backend Core             │
                  └─────────────────────┬─────────────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
   ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
   │ NCBI E-Utilities │       │   Ensembl REST   │       │   UniProt REST   │
   │  (Gene/PubMed)   │       │(Genome/Variants) │       │(Protein Details) │
   └──────────────────┘       └──────────────────┘       └──────────────────┘
```

### 1.1 NCBI E-Utilities (Entrez)
*   **Purpose**: Fetch nucleotide sequences, gene summaries, and scientific citations.
*   **Search Endpoint**: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`
*   **Fetch Endpoint**: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi`
*   **Parameters**: `db=nucleotide`, `id=<UID>`, `retmode=json`.
*   **Rate Limits**: Bound to 3 requests per second without an API key (10 requests per second with a valid developer key).

### 1.2 Ensembl REST API
*   **Purpose**: Ingest gene boundary annotations, transcription coordinates, and exon limits.
*   **Endpoint**: `https://rest.ensembl.org/lookup/symbol/homo_sapiens/<GENE_SYMBOL>`
*   **Headers**: `Content-Type: application/json`
*   **Caching Strategy**: Local Redis key caching matching schema `ensembl:gene:<symbol>` set to expire in 7 days to minimize external queries.

### 1.3 UniProt REST API
*   **Purpose**: Fetch protein structural properties, active sites, and UniProt Accession details.
*   **Endpoint**: `https://rest.uniprot.org/uniprotkb/search?query=gene:<GENE_SYMBOL>`
*   **Response Handling**: Extracts `primaryAccession`, `comments`, and `keywords` for educational display on the protein explorer page.

### 1.4 MyGene.info & MyVariant.info
*   **Purpose**: Query rapid gene summaries and HGVS/rsid coordinates.
*   **Gene Endpoint**: `https://mygene.info/v3/gene/<GENE_ID>`
*   **Variant Endpoint**: `https://myvariant.info/v3/variant/<rsid>`

---

## 2. Bioinformatics Processing Layer

All basic genomic operations are executed via high-speed javascript/python utilities:

### 2.1 Core DNA Arithmetic
*   **GC Content**: Calculations evaluate Guanine and Cytosine frequency relative to overall sequence length:
    $$\text{GC}\% = \frac{G + C}{A + T + G + C} \times 100$$
*   **RNA Transcription**: Substitution of Thymine bases (`T`) with Uracil (`U`).
*   **Protein Translation**: Parsing nucleotides sequentially into triplets (codons) and matching them to the standard genetic code table:
    *   *Start Codon*: `ATG` (translates to Methionine, `M`).
    *   *Stop Codons*: `TAA`, `TAG`, `TGA` (translates to stop character `*`).

### 2.2 ORF (Open Reading Frame) Searching
Scans all 6 reading frames (3 forward, 3 reverse complement) for sequences that begin with a start codon (`ATG`) and terminate at a stop codon.
*   **Parameter Thresholds**: Standard minimum length is set to 30 codons (90 base pairs) to prevent false-positive ORF flags.

### 2.3 Restriction Enzyme Mapping
Regex-based string searches identifying cut coordinates for common restriction endonucleases:
*   `EcoRI`: `G^AATTC`
*   `BamHI`: `G^GATCC`
*   `HindIII`: `A^AGCTT`

### 2.4 Pairwise Alignment (Needleman-Wunsch & Smith-Waterman)
*   **Global Alignment**: Scores alignment comparison across the entire sequence length.
*   **Local Alignment**: Identifies islands of high similarity between sequences of varying lengths.
*   **Score Matrix**: Standard parameters define Match (+2), Mismatch (-1), Gap Penalty (-2).

---

## 3. PDF Report Engine

When a doctor approves a DNA analysis file, the platform generates a signed, non-editable PDF report.

```
                          ┌────────────────────────┐
                          │   Trigger Approval     │
                          └───────────┬────────────┘
                                      │
                                      ▼
                        ┌────────────────────────────┐
                        │ FastAPI Report Generator   │
                        └─────────────┬──────────────┘
                                      │
             ┌────────────────────────┼────────────────────────┐
             ▼                        ▼                        ▼
   ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
   │ Gather Patient   │     │  Draw charts /   │     │ Attach Doctor    │
   │   Demographics   │     │  Base comps      │     │ Signature Image  │
   └──────────────────┘     └──────────────────┘     └──────────────────┘
```

### 3.1 PDF Layout Specifications
The report generator uses python's **ReportLab** library to structure the document pages:
*   **Document Canvas**: standard Letter format with 0.75-inch margins.
*   **Header Section**: GeneLab Logo, Unique Report ID, Verification Timestamp, and strict "Educational/Research Use Only" disclaimer.
*   **Patient Card** (Doctor Portal only): Demographics grid including Patient ID, Age, Biological Sex, and Clinical Indication.
*   **Metrics Grid**: Bar charts showing base compositions (A, T, G, C) and codon distributions.
*   **Mutation Findings Table**: Columns showing `Variant ID`, `Gene`, `HGVS Coordinate`, `ClinVar Significance`, and `PubMed ID Reference`.
*   **Verification Footer**: Automatically retrieves the approving doctor's uploaded digital signature image and stamps it at the bottom.
