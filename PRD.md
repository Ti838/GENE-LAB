# 🧬 GeneLab — Product Requirements Document (PRD)

**Version:** 2.0.0  
**Status:** Approved  
**Author:** GeneLab Systems Engineering Team  

---

## 1. Project Overview & Boundaries

### 1.1 Purpose
GeneLab is an enterprise-grade, production-ready bioinformatics and genetic analysis platform designed for education, clinical research coordination, and genomic data visualization. The platform serves as a central registry for genetic sequence ingestion, alignment comparisons, and educational mutation mapping.

> [!IMPORTANT]
> **Clinical & Medical Boundary Notice:**  
> GeneLab is **not** a diagnostic tool and does not provide medical treatment recommendations. All output reports, disease mappings, and annotations are strictly for educational and scientific research purposes. Any clinical significance information displayed is sourced directly from public databases (e.g., ClinVar, dbSNP) and must be verified by a qualified molecular geneticist before clinical application.

---

## 2. Separate Applications & Portal Architectures

GeneLab is divided into five distinct application spaces, isolated by routing contexts and strictly regulated by Role-Based Access Control (RBAC).

```
                            ┌────────────────────────┐
                            │     Public Website     │
                            │   (genelab.ai / Home)  │
                            └───────────┬────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
   ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
   │   User Portal    │       │  Doctor Portal   │       │Researcher Portal │
   │ (portal.domain)  │       │ (doctor.domain)  │       │ (research.domain)│
   └──────────────────┘       └──────────────────┘       └──────────────────┘
                                        ▲
                                        │ (Managed by)
                               ┌────────┴────────┐
                               │  Admin Portal   │
                               │  (admin.domain) │
                               └─────────────────┘
```

### 2.1 Public Website (Marketing & Entry)
Provides public-facing documentation, educational resources, and authentication access.
*   **Home Page**: Marketing banner, modern dynamic hero illustrations, platform value propositions.
*   **About Page**: Project history, scientific advisory board, database integration sources.
*   **Features Directory**: Visual list of analysis tools (Transcription, Translation, Alignment, BLAST).
*   **Documentation Hub**: Detailed guides on sequence formats (FASTA, FASTQ, VCF) and database integrations.
*   **Diseases Search**: Public read-only index of common genetic disorders and corresponding affected genes.
*   **FAQ / Pricing Page**: Answers to common usage questions and future commercial tier outlines.
*   **Contact Page**: Form submission for educational inquiries and technical support.
*   **Login / Register Gates**: Secure entry points redirecting users to their respective subdomains/paths.

### 2.2 User Portal (Patient / Client Self-Service)
Allows self-registered users to submit sequences for analysis and view educational report readouts.
*   **Onboarding & Auth**: Signup, manual email verification flow, secure password resets.
*   **Dashboard**: Overview of uploaded files, active analysis statuses, and shortcuts.
*   **DNA Analysis Ingestion**: Supports pasting raw IUPAC sequences or uploading `.fasta`/`.txt` files.
*   **Bioinformatics Analyzer**: Runs local translation/transcription, restriction mapping, and motif searching.
*   **Sequence Comparison**: Simple local pairwise alignment utility for two self-owned assets.
*   **Saved Reports & History**: Persistent storage of previously executed runs.

### 2.3 Doctor Portal (Clinical Review Coordinator)
Provides doctors with clinical assessment interfaces to review DNA analysis reports, mutation lists, and write comments.
*   **Patient Directory**: Comprehensive registry search and filtering of associated patients.
*   **Patient Profile**: Age, sex, clinical history, and linked DNA sequence files.
*   **Clinical Assessment & Notes**: Ability to add observations and change review states (`Pending Approval`, `Approved`, `Needs Review`).
*   **Signatures & Credentials**: Ability to upload verified signature images to stamp approved reports.
*   **Guardrails**: Doctors cannot modify raw nucleotide sequences or alignment files.

### 2.4 Researcher Portal (Data Science & Dataset Hub)
A high-throughput portal for cohort-level research, batch dataset management, and advanced visualizations.
*   **Dataset Upload**: Supports massive cohort uploads including FASTQ, CSV, and VCF files.
*   **DNA/Gene/Protein Explorer**: Deep search indices into NCBI, Ensembl, and UniProt.
*   **Multiple Sequence Alignment**: Running alignment comparisons across multi-sequence FASTA files.
*   **Research Notes**: Markdown-based persistent workspace for writing scientific observations.
*   **Cohort Statistics**: Visual charts showing base composition, mutation distribution, and cohort variations.

### 2.5 Admin Portal (Ops & Platform Governance)
Desktop-only system control center with strict mobile blocking to prevent unauthorized administrative actions on small screens.
*   **User Management**: Full CRUD controls on Users, Doctors, and Researchers.
*   **Database Management**: Admin-level caching controls for Disease, Gene, and Variant local tables.
*   **Audit Logging**: Immutable, chronological logs tracking actions (IP, Timestamp, User, Resource).
*   **CMS Controller**: Management of announcements, FAQ pages, and public document indices.
*   **System Performance Monitoring**: Visual indicators of database connectivity and FastAPI health.

---

## 3. Detailed Feature Requirements

### 3.1 Sequence Validation & Extraction
All submitted data must pass a strict regex check verifying character legality under the IUPAC nomenclature:
*   **DNA Validation**: `^[ATGCNatgcn\s\-\d]+$`
*   **RNA Validation**: `^[AUGCNaugcn\s\-\d]+$`
*   **Protein Validation**: `^[ACDEFGHIKLMNPQRSTVWYacdefghiklmnpqrstvwy\*\s\-]+$`

### 3.2 Mutation Parsing
*   **Point Mutations**: Identification of Single Nucleotide Polymorphisms (SNPs) compared to a reference.
*   **Insertion/Deletion (Indels)**: Detection of frame shifts and downstream codon alterations.
*   **Clinical Significance Mapping**: Matching identified mutation coordinates with ClinVar severity fields (`Pathogenic`, `Likely Pathogenic`, `VUS`, `Benign`).

### 3.3 External Integrations
The platform queries the following public database layers for educational mapping:
1.  **NCBI E-Utilities**: Nucleotide query and PubMed citation fetches.
2.  **Ensembl REST API**: Gene location, exon coordinates, and transcript indexes.
3.  **UniProt REST API**: Protein functional descriptions and structural domain mapping.
4.  **MyGene.info & MyVariant.info**: Fast JSON annotations for genes and variant IDs (rsids).

---

## 4. Reports & Outputs

Every analyzed sequence yields a downloadable PDF report that must contain:
1.  **Unique System ID**: Ref ID and secure verification timestamp.
2.  **Patient Demographics** (Doctor Portal only): Patient ID, Age, Biological Sex.
3.  **Sequence Statistics**: GC/AT ratio, sequence length, molecular weight.
4.  **Mutation & Disease Risk Tables**: Complete lists of high-impact variants mapped to public databases.
5.  **Scientific References**: PubMed citations supporting mapped variant-disease links.
6.  **Educational Disclaimer**: Prominent display of the medical diagnostic boundary warning.
7.  **Signature Stamp**: The doctor's uploaded digital signature if the report has been marked "Approved".

---

## 5. Non-Functional & Security Requirements

*   **Security Baseline**: CORS restriction, Helmet headers, IP-based rate limiting (100 requests per 15 minutes).
*   **RBAC Boundaries**: JWT claims verify permissions. Any route escalation must log an immediate system warning.
*   **Fast-Fail DB Connections**: MongoDB connection pools must timeout within 8 seconds to prevent serverless function hangs.
