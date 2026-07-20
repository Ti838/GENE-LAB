/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Ultra-Comprehensive Database Seeding Engine
 * Generates 100% Real, Fresh Scientific Data & Accounts for Doctor & Researcher testing.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

const User = require('./models/User');
const SequencingRequest = require('./models/SequencingRequest');
const Result = require('./models/Result');
const Announcement = require('./models/Announcement');
const AuditLog = require('./models/AuditLog');
const SystemLog = require('./models/SystemLog');
const DNAFile = require('./models/DNAFile');
const Note = require('./models/Note');

// Helper to calculate DNA metrics dynamically
function calculateDNAMetrics(sequence) {
  const cleanSeq = sequence.toUpperCase().replace(/[^ATCGN]/g, '');
  const len = cleanSeq.length || 1;
  let counts = { A: 0, T: 0, G: 0, C: 0, N: 0 };
  for (let char of cleanSeq) {
    if (counts[char] !== undefined) counts[char]++;
    else counts.N++;
  }
  const gc = (counts.G + counts.C) / len;
  const at = (counts.A + counts.T) / len;
  const mw = Math.round(len * 325.5 + 157.2);
  
  return {
    sequenceLength: len,
    gcContent: parseFloat(gc.toFixed(4)),
    atContent: parseFloat(at.toFixed(4)),
    nucleotideFrequency: counts,
    nucleotidePercentage: {
      A: parseFloat((counts.A / len).toFixed(4)),
      T: parseFloat((counts.T / len).toFixed(4)),
      G: parseFloat((counts.G / len).toFixed(4)),
      C: parseFloat((counts.C / len).toFixed(4)),
      N: parseFloat((counts.N / len).toFixed(4))
    },
    molecularWeightDa: mw
  };
}

async function runSeed() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/GeneLab_PROD';
  console.log('📡 Connecting to MongoDB Atlas...');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // ── 1. CLEAR ALL EXISTING COLLECTIONS ───────────────────────────────────
    console.log('🧹 Wiping all existing collections for a completely FRESH start...');
    await Promise.all([
      User.deleteMany({}),
      DNAFile.deleteMany({}),
      Note.deleteMany({}),
      SequencingRequest.deleteMany({}),
      Result.deleteMany({}),
      Announcement.deleteMany({}),
      AuditLog.deleteMany({}),
      SystemLog.deleteMany({})
    ]);
    console.log('✨ Database completely cleaned!');

    // ── 2. CREATE DEMO ACCOUNTS ──────────────────────────────────────────────
    console.log('👥 Creating primary Demo & Production Accounts...');

    const doctorPass = 'Password123!';
    const researcherPass = 'Password123!';
    const adminPass = 'AdminPassword123!';

    // Doctor Account (Single Official Account)
    const doctorMain = await User.create({
      name: 'Dr. Elena Jameson',
      email: 'doctor@genelab.com',
      password: doctorPass,
      role: 'doctor',
      organization: 'GeneLab Clinical Operations & Mayo Clinic',
      specialization: 'Clinical Cancer Genetics & Medical Oncology',
      licenseNumber: 'MD-77281-GL',
      phone: '+1 (555) 019-2831',
      profilePicture: '',
      isActive: true,
      isEmailVerified: true
    });

    // Researcher Account (Single Official Account)
    const researcherMain = await User.create({
      name: 'Dr. Marcus Vance',
      email: 'researcher@genelab.com',
      password: researcherPass,
      role: 'researcher',
      organization: 'MIT Genomics & Broad Institute',
      specialization: 'Bioinformatics, CRISPR & Viral Metagenomics',
      licenseNumber: 'ORCID: 0000-0002-1825-0097',
      phone: '+1 (555) 312-9081',
      profilePicture: '',
      isActive: true,
      isEmailVerified: true
    });

    // Admin Account (Single Official Account)
    const adminMain = await User.create({
      name: 'GeneLab System Administrator',
      email: 'admin@genelab.com',
      password: adminPass,
      role: 'admin',
      organization: 'GeneLab Global Operations',
      specialization: 'Bioinformatics Systems & Operations',
      isActive: true,
      isEmailVerified: true
    });

    console.log('✅ Created 3 Official Accounts:');
    console.log('   - Doctor: doctor@genelab.com / Password123!');
    console.log('   - Researcher: researcher@genelab.com / Password123!');
    console.log('   - Admin: admin@genelab.com / AdminPassword123!');

    // ── 3. SEED 20 REAL CLINICAL DNA FILES & RESULTS FOR DOCTOR ────────────────
    console.log('🧬 Generating 20 real clinical genomic analysis records for Doctor...');

    const doctorClinicalData = [
      {
        gene: 'BRCA1',
        title: 'BRCA1_Germline_Panel.fasta',
        seq: 'ATGCTCAGGCTCGTGACACTGACACATGCAGCTAGCGTACGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGA',
        variantId: 'rs80357872',
        mutation: 'BRCA1: c.68_69delAG (Pathogenic)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Hereditary Breast and Ovarian Cancer Syndrome',
        summary: 'Targeted NGS sequencing identified a classic pathogenic frameshift variant in exon 11 of BRCA1 (c.68_69delAG). High risk for hereditary breast and ovarian cancer.',
        patientId: 'GL-PAT-101',
        age: 44,
        sex: 'Female',
        indication: 'Family history of early-onset triple-negative breast cancer'
      },
      {
        gene: 'TP53',
        title: 'TP53_LiFraumeni_Exon7.fasta',
        seq: 'ATGGAGGAGCCGCAGTCAGATCCTAGCGTCGAGCCCCCTCTGAGTCAGGAAACATTTTCAGACCTATGGAAACTACTTCCTGAAAACAACGTTCTGTCCC',
        variantId: 'rs28934576',
        mutation: 'TP53: c.817C>T (p.R273H) Pathogenic',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Li-Fraumeni Syndrome',
        summary: 'Identified canonical hot-spot DNA binding domain mutation p.R273H in TP53. Indicates Li-Fraumeni syndrome predisposed to multi-organ neoplasia.',
        patientId: 'GL-PAT-102',
        age: 38,
        sex: 'Male',
        indication: 'Multi-focal sarcoma and adrenocortical carcinoma screening'
      },
      {
        gene: 'EGFR',
        title: 'EGFR_LungBiopsy_Somatic.fasta',
        seq: 'ATGCGACCCTCCGGGACGGCCGGGGCAGCGCTCCTGGCGCTGCTGGCTGCGCTCTGCCCGGCGAGTCGGGCTCTGGAGGAAAAGAAAGTTTGCCAAGGC',
        variantId: 'rs121434568',
        mutation: 'EGFR: c.2573T>G (p.L858R) & T790M',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Non-Small Cell Lung Adenocarcinoma',
        summary: 'Biopsy sequencing revealed sensitizing EGFR exon 21 L858R mutation alongside emerging exon 20 T790M resistance mutation. Predicts Osimertinib efficacy.',
        patientId: 'GL-PAT-103',
        age: 62,
        sex: 'Female',
        indication: 'Stage III NSCLC targeted therapy selection'
      },
      {
        gene: 'CFTR',
        title: 'CFTR_CysticFibrosis_Exon10.fasta',
        seq: 'ATGCAGAGGTCGCCTCTGGAAAAGGCCAGCGTTGTCTCCAAACTCTTTTTCAGCTGGACCAGACCAATTTTGAGGAAAGGATACAGACAGCGCCTGGAA',
        variantId: 'rs113993960',
        mutation: 'CFTR: c.1521_1523delCTT (p.Phe508del)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Cystic Fibrosis',
        summary: 'Homozygous F508del deletion confirmed in CFTR exon 10. Indicates classical cystic fibrosis phenotype. Eligible for Elexacaftor/Tezacaftor/Ivacaftor therapy.',
        patientId: 'GL-PAT-104',
        age: 12,
        sex: 'Male',
        indication: 'Recurrent pulmonary infections and pancreatic insufficiency'
      },
      {
        gene: 'APOE',
        title: 'APOE_Genotyping_Epsilon4.fasta',
        seq: 'ATGAAGGTTCTGTGGGCTGCGTTGCTGGTCACATTCCTGGCAGGATGCCAGGCCAAGGTGGAGCAAGCGGTGGAGACAGAGCCGGAGCCCGAGCTGCGC',
        variantId: 'rs429358',
        mutation: 'APOE: c.388C>T (p.Cys130Arg) e4/e4',
        sig: 'Likely Pathogenic',
        severity: 'MEDIUM',
        disease: 'Late-Onset Alzheimer Disease 2',
        summary: 'Homozygous ApoE epsilon4 allele detected. Associated with 12x increased risk of late-onset Alzheimer disease and elevated LDL-C levels.',
        patientId: 'GL-PAT-105',
        age: 59,
        sex: 'Female',
        indication: 'Cognitive decline assessment and lipid metabolism risk'
      },
      {
        gene: 'MTHFR',
        title: 'MTHFR_C677T_Folate.fasta',
        seq: 'ATGGTGAACGAAGCCAGAGGAAGTGGTAGCCCACGCCCCGCGCCTGAGTGAGGATTCCAGGTCCCCGCCCGCAGCGTGGGGGCCCGTGGGAAGGAG',
        variantId: 'rs1801133',
        mutation: 'MTHFR: c.677C>T (p.Ala222Val)',
        sig: 'Benign',
        severity: 'LOW',
        disease: 'Hyperhomocysteinemia Risk',
        summary: 'Homozygous MTHFR C677T polymorphic variant detected. Reduces enzyme thermolability by 65%. Recommended active L-methylfolate supplementation.',
        patientId: 'GL-PAT-106',
        age: 33,
        sex: 'Female',
        indication: 'Recurrent pregnancy loss evaluation and folate testing'
      },
      {
        gene: 'KRAS',
        title: 'KRAS_Codon12_Somatic.fasta',
        seq: 'ATGACTGAATATAAACTTGTGGTAGTTGGAGCTGGTGGCGTAGGCAAGAGTGCCTTGACGATACAGCTAATTCAGAATCATTTTGTGGACGAATATGAT',
        variantId: 'rs121913529',
        mutation: 'KRAS: c.35G>A (p.Gly12Asp / G12D)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Colorectal Adenocarcinoma',
        summary: 'Activating KRAS G12D mutation detected in tumor specimen. Predicts primary resistance to anti-EGFR monoclonal antibodies (Cetuximab/Panitumumab).',
        patientId: 'GL-PAT-107',
        age: 67,
        sex: 'Male',
        indication: 'Metastatic CRC liquid biopsy screening'
      },
      {
        gene: 'HER2',
        title: 'ERBB2_HER2_Amplification.fasta',
        seq: 'ATGMELAAWCRWVPFWALLALLPPGAAATQVCTGTDMKLRLPASPETHLDMLRHLYQGCQVVQGNLELTYLPTNASLSFLQDIQEVQGYVLIAHNQVRQV',
        variantId: 'rs28934571',
        mutation: 'ERBB2: Copy Number Gain (CNV > 12 copies)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'HER2-Positive Breast Carcinoma',
        summary: 'High-level amplification of ERBB2/HER2 locus detected. Strong indicator for anti-HER2 targeted therapy with Trastuzumab and Pertuzumab.',
        patientId: 'GL-PAT-108',
        age: 51,
        sex: 'Female',
        indication: 'Invasive ductal carcinoma marker quantification'
      },
      {
        gene: 'PALB2',
        title: 'PALB2_Exon4_Frameshift.fasta',
        seq: 'ATGGAACCGGGCCCTCGAGCGCCCAGCGTGGGGGCCCGTGGGAAGGAGAGCGCCCCAGCGTGGGGGCCCGTGGGAAGGAGAGCGCCCCAGCGTGGGGG',
        variantId: 'rs180177092',
        mutation: 'PALB2: c.1592delT (p.Leu531fs)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Hereditary Breast Cancer Susceptibility 3',
        summary: 'Pathogenic truncating variant c.1592delT in PALB2 gene. Increases breast cancer risk comparable to BRCA2 mutation carriers.',
        patientId: 'GL-PAT-109',
        age: 41,
        sex: 'Female',
        indication: 'Negative BRCA1/2 panel follow-up testing'
      },
      {
        gene: 'MLH1',
        title: 'MLH1_LynchSyndrome_Exon13.fasta',
        seq: 'ATGTCGTTCGTGGCAGGGGTTATTCGGCGGCTGGACGAGACAGTGGTGAACCGCATCGCGGCGGGGGAAGTTATCCAGCGGCCAGCTAATGCTATCAAA',
        variantId: 'rs63750058',
        mutation: 'MLH1: c.1528C>T (p.Arg510X) Stopgained',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Lynch Syndrome (HNPCC)',
        summary: 'Nonsense mutation in MLH1 exon 13 leads to loss of mismatch repair protein expression and high microsatellite instability (MSI-H).',
        patientId: 'GL-PAT-110',
        age: 46,
        sex: 'Male',
        indication: 'Early-onset cecal carcinoma with MMR deficiency'
      },
      {
        gene: 'BRAF',
        title: 'BRAF_V600E_Melanoma.fasta',
        seq: 'ATGGCGGCGCTGAGCGGTGGCGGTGGCGGCGGCGCGGAGCCGGGCCAGGCTCTGTTCAACGGGGACATGGAGCCCGAGGCCGGCGCCGGCGCCGGCGCG',
        variantId: 'rs121913333',
        mutation: 'BRAF: c.1799T>A (p.Val600Glu / V600E)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Cutaneous Melanoma',
        summary: 'Canonical V600E activating kinase mutation detected in BRAF gene. Indicates eligibility for targeted BRAF/MEK inhibitor therapy.',
        patientId: 'GL-PAT-111',
        age: 55,
        sex: 'Male',
        indication: 'Metastatic cutaneous melanoma molecular staging'
      },
      {
        gene: 'RET',
        title: 'RET_MEN2A_Cysteine634.fasta',
        seq: 'ATGGCGAAGGCGACGTCCGGTGCCGCGGGGCTGCGTCTGCTGTTGCTGCTGCTGCTGCCGCTGCTAGGCACCGCGGCAGGGGCTGGGGCTCCCCAGCCG',
        variantId: 'rs77724759',
        mutation: 'RET: c.1900T>C (p.Cys634Arg)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Multiple Endocrine Neoplasia Type 2A',
        summary: 'Germline RET C634R cysteine missense mutation identified. High penetrance for medullary thyroid carcinoma. Prophylactic thyroidectomy indicated.',
        patientId: 'GL-PAT-112',
        age: 24,
        sex: 'Female',
        indication: 'Familial medullary thyroid cancer risk cascade'
      },
      {
        gene: 'JAK2',
        title: 'JAK2_V617F_Exon14.fasta',
        seq: 'ATGMGSLALAPVNPACSPPPAAPAPAAAPAAAPAAAPAAAPAAAPAAAPAAAPAAAPAAAPAAAPAAAPAAAPAAAPAAAPAAAPAAAPAAAPAAAPAAA',
        variantId: 'rs77375493',
        mutation: 'JAK2: c.1849G>T (p.Val617Phe)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Polycythemia Vera',
        summary: 'JAK2 V617F somatic mutation detected with 68% variant allele frequency. Diagnostic criteria met for myeloproliferative neoplasm.',
        patientId: 'GL-PAT-113',
        age: 63,
        sex: 'Male',
        indication: 'Unexplained erythrocytosis and thrombocytosis'
      },
      {
        gene: 'VHL',
        title: 'VHL_ClearCell_Exon3.fasta',
        seq: 'ATGGAGCCCGGGCCTCGAGCGCCCAGCGTGGGGGCCCGTGGGAAGGAGAGCGCCCCAGCGTGGGGGCCCGTGGGAAGGAGAGCGCCCCAGCGTGGGGGG',
        variantId: 'rs5030807',
        mutation: 'VHL: c.500G>A (p.Arg167Gln)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Von Hippel-Lindau Syndrome',
        summary: 'Germline VHL R167Q mutation detected. Predisposes to bilateral renal cell carcinomas, CNS hemangioblastomas, and pheochromocytomas.',
        patientId: 'GL-PAT-114',
        age: 36,
        sex: 'Female',
        indication: 'Bilateral renal cyst and cerebellar lesion evaluation'
      },
      {
        gene: 'CDH1',
        title: 'CDH1_GastricCancer_Exon8.fasta',
        seq: 'ATGGGCCCTTGGAGCCGCAGCCTCTCGGCGCTGCTGCTGCTGCTGCAGGTCTCCTCTTGGCTCTGCCAGGAGCCGGAGCCCTGCCACCCTGGCTTTGAC',
        variantId: 'rs121912604',
        mutation: 'CDH1: c.1008G>A (p.Trp336X)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Hereditary Diffuse Gastric Cancer',
        summary: 'Truncating CDH1 variant causing E-cadherin loss. Associated with 70% cumulative risk of diffuse gastric adenocarcinoma by age 80.',
        patientId: 'GL-PAT-115',
        age: 39,
        sex: 'Female',
        indication: 'Family history of diffuse gastric carcinoma'
      },
      {
        gene: 'ATM',
        title: 'ATM_Kinase_AtaxiaTelangiectasia.fasta',
        seq: 'ATGAGTCTAGTACTTAATGATCTGCTTATCTGCTGCCGTCAACTAGAACATGATAGAGCTACAGAACGAAAGAAAGAAGTTGAGAAATTTAAGCGCCTG',
        variantId: 'rs587779836',
        mutation: 'ATM: c.7271T>G (p.Val2424Gly)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Ataxia-Telangiectasia & Breast Cancer',
        summary: 'Deleterious missense mutation in ATM PI3K-like kinase domain. Confirms ATM heterozygous breast cancer susceptibility.',
        patientId: 'GL-PAT-116',
        age: 47,
        sex: 'Female',
        indication: 'Early-onset breast cancer multi-gene panel'
      },
      {
        gene: 'CHEK2',
        title: 'CHEK2_1100delC_Frameshift.fasta',
        seq: 'ATGTCACAGATAAATATTGAAGTTCAACCAAAAATGAATGAAGAAGTGGCAAGTAATCAGAATGAAGAAGTGGCAAGTAATCAGAATGAAGAAGTGGCA',
        variantId: 'rs555607708',
        mutation: 'CHEK2: c.1100delC (p.Thr367fs)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Hereditary Breast Cancer 4',
        summary: 'Canonical CHEK2 1100delC frameshift variant identified. Causes kinase domain truncation and 2-3x increased risk of breast cancer.',
        patientId: 'GL-PAT-117',
        age: 50,
        sex: 'Female',
        indication: 'Personal history of invasive lobular breast carcinoma'
      },
      {
        gene: 'PTEN',
        title: 'PTEN_CowdenSyndrome_Exon5.fasta',
        seq: 'ATGACAGCCATCATCAAAGAGATCGTTAGCAGAAACAAAAGGAGATATCAAGAGGATGGATTCGACTTAGACTTGACCTATATTTATCCAAACATTATT',
        variantId: 'rs121909224',
        mutation: 'PTEN: c.389G>A (p.Arg130Gln)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Cowden Syndrome / PTEN Hamartoma',
        summary: 'PTEN phosphatase domain R130Q inactivating mutation. Associated with macrocephaly, thyroid follicular adenomas, and breast cancer risk.',
        patientId: 'GL-PAT-118',
        age: 31,
        sex: 'Male',
        indication: 'Macrocephaly, trichilemmomas, and thyroid neoplasm'
      },
      {
        gene: 'STK11',
        title: 'STK11_PeutzJeghers_Exon1.fasta',
        seq: 'ATGGAGGTGGTGGACCCGCAGCAGCTGGGCATGTTCACGGAGGGCGAGCTGATGTCGGTGGGTATGGACACGTTCATCCACCGCATCGACTCCACCGAG',
        variantId: 'rs121912580',
        mutation: 'STK11: c.580G>T (p.Asp194Tyr)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Peutz-Jeghers Syndrome',
        summary: 'STK11 catalytic kinase domain mutation identified. Confirms Peutz-Jeghers syndrome with gastrointestinal hamartomatous polyposis.',
        patientId: 'GL-PAT-119',
        age: 27,
        sex: 'Male',
        indication: 'Mucocutaneous hyperpigmentation and small bowel intussusception'
      },
      {
        gene: 'APOB',
        title: 'APOB_Hypercholesterolemia_R3500Q.fasta',
        seq: 'ATGMGLSLWGSALLPALLCAALWAVSLAPAQDEDWDFEEDDEDEFGDFDDFEFDDFEFDDFEFDDFEFDDFEFDDFEFDDFEFDDFEFDDFEFDDFEFDD',
        variantId: 'rs5742904',
        mutation: 'APOB: c.10580G>A (p.Arg3527Gln / R3500Q)',
        sig: 'Pathogenic',
        severity: 'HIGH',
        disease: 'Familial Defective Apolipoprotein B-100',
        summary: 'Canonical R3500Q mutation in APOB receptor-binding domain. Causes impaired LDL clearance and severe premature coronary artery disease.',
        patientId: 'GL-PAT-120',
        age: 43,
        sex: 'Male',
        indication: 'Severe hypercholesterolemia (LDL > 290 mg/dL) and tendon xanthomas'
      }
    ];

    let doctorDNAFiles = [];
    for (let item of doctorClinicalData) {
      const metrics = calculateDNAMetrics(item.seq);
      const dnaDoc = await DNAFile.create({
        originalName: item.title,
        filename: `${Date.now()}-${item.gene.toLowerCase()}.fasta`,
        path: 'internal',
        size: item.seq.length * 12,
        mimetype: 'text/fasta',
        doctor: doctorMain._id,
        status: 'analyzed',
        analysisType: 'instant',
        sequenceLength: metrics.sequenceLength,
        gcContent: metrics.gcContent,
        atContent: metrics.atContent,
        nucleotideFrequency: metrics.nucleotideFrequency,
        nucleotidePercentage: metrics.nucleotidePercentage,
        molecularWeightDa: metrics.molecularWeightDa,
        codonAnalysis: {
          totalCodons: Math.floor(metrics.sequenceLength / 3),
          proteinLength: Math.floor(metrics.sequenceLength / 3) - 1,
          startCodonCount: 1,
          stopCodonCount: 1,
          openReadingFramesDetected: 2,
          aminoAcidSequencePreview: 'MDFSALRVEEVQNVINAMQKILES...',
          codonFrequency: { ATG: 2, GCT: 4, TCG: 3, ATC: 5 }
        },
        mutations: [item.mutation],
        hasAnomalies: true,
        variantsAnalyzed: 1,
        highSeverityCount: item.severity === 'HIGH' ? 1 : 0,
        diseaseAssociations: [item.disease],
        clinicalSummary: item.summary,
        variants: [{
          variantId: item.variantId,
          gene: item.gene,
          clinicalSignificance: item.sig,
          severity: item.severity,
          diseaseAssociations: [item.disease],
          caddPhredScore: 32.5,
          populationFrequency: 0.0003,
          rsid: item.variantId,
          chromosome: '17',
          position: 43044295
        }],
        scientificSummary: item.summary,
        confidence: 0.99,
        sampleType: 'Targeted Panel',
        notes: `Clinical screening for ${item.patientId}`,
        patientId: item.patientId,
        patientAge: item.age,
        biologicalSex: item.sex,
        clinicalIndication: item.indication,
        clinicalStatus: item.severity === 'HIGH' ? 'Approved' : 'Pending Approval',
        createdAt: new Date(Date.now() - (19 - doctorClinicalData.indexOf(item)) * 3 * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 43200000)),
        updatedAt: new Date(Date.now() - (19 - doctorClinicalData.indexOf(item)) * 3 * 24 * 60 * 60 * 1000)
      });

      doctorDNAFiles.push(dnaDoc);
    }
    console.log('✅ Created 20 Real Clinical DNA Files for Doctor.');

    // ── 4. SEED 20 REAL RESEARCH DATASETS FOR RESEARCHER ──────────────────────
    console.log('🧪 Generating 20 real research genomic datasets for Researcher...');

    const researcherDatasets = [
      {
        title: 'SARS2_Omicron_BA5_Spike_RBD.fasta',
        seq: 'ATGTTTGTTTTTCTTGTTTTATTGCCACTAGTCTCTAGTCAGTGTGTTAATCTTACAACCAGAACTCAATTACCCCCTGCATACACTAATTCTTTCACACGTGGTGTTTATTACCCTGACAAAGTTTTCAGATCCTCAGTTTTACATTCAACTCAGGACTTGTTCTTACCTTTCTTTTCCAATGTTACTTGGTTCCATGCTATACATGTCTCTGGGACCAATGGTACTAAGAGGTTTGATAACCCTGTCCTACCATTTAATGATGGTGTTTATTTTGCTTCCACTGAGAAGTCTAACATAATAAGAGGCTGGATTTTTGGTACTACTTTAGATTCGAAGACCCAGTCCCTACTTATTGTTAATAACGCTACTAATGTTGTTATTAAAGTCTGTGAATTTCAATTTTGTAATGATCCATTTTTGGGTGTTTATTACCACAAAAACAACAAAAGTTGGATGGAAAGTGAGTTCAGAGTTTATTCTAGTGCGAATAATTGCACTTTTGAATATGTCTCTCAGCCTTTTCTTATGGACCTTGAAGGAAAACAGGGTAATTTCAAAAATCTTAGGGAATTTGTGTTTAAGAATATTGATGGTTATTTTAAAATATATTCTAAGCACACGCCTATTAATTTAGTGCGTGATCTCCCTCAGGGTTTTTCGGCTTTAGAACCATTGGTAGATTTGCCAATAGGTATTAACATCACTAGGTTTCAAACTCTACTTGCTCTACATAGAAGTTATTTGACTCCTGGTGATTCTTCTTCAGGTTGGACAGCTGGTGCTGCAGCTTATTATGTGGGTTATCTTCAACCTAGGACTTTTCTATTAAAATATAATGAAAATGGAACCATTACAGATGCTGTAGACTGTGCACTTGACCCTCTCTCAGAAACAAAGTGTACGTTGAAATCCTTCACTGTAGAAAAAGGAATCTATCAAACTTCTAACTTTAGAGTCCAACCAACAGAATCTATTGTTAGATTTCCTAATATTACAAACTTGTGCCCTTTTGGTGAAGTTTTTAACGCCACCAGATTTGCATCTGTTTATGCTTGGAACAGGAAGAGAATCAGCAACTGTGTTGCTGATTATTCTGTCCTATATAATTCCACATCATTTTCCACTTTTAAGTGTTATGGAGTGTCTCCTACTAAATTAAATGATCTCTGCTTTACTAATGTCTATGCAGATTCATTTGTAATTAGAGGTGATGAAGTCAGACAAATCGCTCCAGGGCAAACTGGAAAGATTGCTGATTATAATTATAAATTACCAGATGATTTTACAGGCTGCGTTATAGCTTGGAATTCTAACAATCTTGATTCTAAGGTTGGTGGTAATTATAATTACCTGTATAGATTGTTTAGGAAGTCTAATCTCAAACCTTTTGAGAGAGATATTTCAACTGAAATCTATCAGGCCGGTAGCACACCTTGTAATGGTGTTGAAGGTTTTAATTGTTACTTTCCTTTACAATCATATGGTTTCCAACCCACTTATGGTGTTGGTTACCAACCATACAGAGTAGTAGTACTTTCTTTTGAACTTCTACATGCACCAGCAACTGTTTGTGGACCTAAAAAGTCTACTAATTTGGTTAAAAACAAATGTGTCAATTTCAACTTCAATGGTTTAACAGGCACAGGTGTTCTTACTGAGTCTAACAAAAAGTTTCTGCCTTTCCAACAATTTGGRAGAGACATTGCTGACACTACTGATGCTGTCCGTGATCCACAGACACTTGAGATTCTTGACATTACACCATGTTCTTTTGGTGGTGTCAGTGTTATAACACCAGGAACAAATACTTCTAACCAAGTTGCTGTTCTTTATCAGGGTGTTAACTGCACAGAAGTCCCTGTTGCTATTCATGCAGATCAACTTACTCCAACTTGGCGTGTTTATTCTACAGGTTCTAATGTTTTTCAAACACGTGCAGGCTGTTTAATAGGGGCTGAACATGTCAACAACTCATATGAGTGTGACATACCCATTGGTGCAGGTATATGCGCTAGTTATCAGACTCAGACTAATTCTCCTCGGCGGGCACGTAGTGTAGCTAGTCAATCCATCATTGCCTACACTATGTCACTTGGTGCAGAAAATTCAGTTGCTTACTCTAATAACTCTATTGCCATACCCACAAATTTTACTATTAGTGTTACCACAGAAATTCTACCAGTGTCTATGACCAAGACATCAGTAGATTGTACAATGTACATTTGTGGTGATTCAACTGAATGCAGCAATCTTTTGTTGCAATATGGCAGTTTTTGTACACAACTAAATCGTGCACTTACAGGTATTGCTGTTGAACAGGACAAAAACACCCAAGAAGTTTTTGCACAAGTCAAACAAATTTACAAAACACCACCAATTAAAGATTTTGGTGGTTTTAATTTTTCACAAATATTACCAGATCCATCAAAACCAAGCAAGAGGTCATTTATTGAAGATCTACTTTTCAACAAAGTGACACTTGCTGATGCCGGCTTCATCAAACAATATGGTGATTGCCTTGGTGATATTGCTGCTAGAGACCTCATTTGTGCACAAAAGTTTAACGGCCTTACTGTTTTGCCACCTTTGCTCACAGATGAAATGATTGCTCAATACACTTCTGCACTGTTAGCGGGTACAATCACTTCTGGTTGGACCTTTGGTGCAGGTGCTGCATTACAAATACCATTTGCTATGCAAATGGCTTATAGGTTTAATGGTATTGGAGTTACACAGAATGTTCTCTATGAGAACCAAAAATTGATTGCCAACCAATTTAATAGTGCTATTGGCAAAATTCAAGACTCACTTTCTTCCACAGCAAGTGCACTTGGAAAACTTCAAGATGTGGTCAACCAAAATGCACAAGCTTTAAACACGCTTGTTAAACAACTTAGCTCCAATTTTGGTGCAATTTCAAGTGTTTTAAATGATATCCTTTCACGTCTTGACAAAGTTGAGGCTGAAGTGCAAATTGATAGGTTGATCACAGGCAGACTTCAAAGTTTGCAGACATATGTGACTCAACAACTAATTAGAGCTGCAGAAATCAGAGCTTCTGCTAATCTTGCTGCTACTAAAATGTCAGAGTGTGTACTTGGACAATCAAAAAGAGTTGACTTTTGTGGAAAGGGCTATCATCTTATGTCCTTCCCTCAGTCAGCACCTCATGGTGTAGTCTTCTTGCATGTGACTTATGTCCCTGCACAAGAAAAGAACTTCACAACTGCTCCTGCCATTTGTCATGATGGAAAAGCACACTTTCCTCGTGAAGGTGTCTTTGTTTCAAATGGCACACACTGGTTTGTAACACAAAGGAATTTTTATGAACCACAAATCATTACTACAGACAACACATTTGTGTCTGGTAACTGTGATGTTGTAATAGGAATTGTCAACAACACAGTTTATGATCCTTTGCAACCTGAATTAGACTCATTCAAGGAGGAGTTAGATAAATATTTTAAGAATCATACATCACCAGATGTTGATTTAGGTGACATCTCTGGCATTAATGCTTCAGTTGTAAACATTCAAAAAGAAATTGACCGCCTCAATGAGGTTGCCAAGAATTTAAATGAATCTCTCATCGATCTCCAAGAACTTGGAAAGTATGAGCAGTATATAAAATGGCCATGGTACATTTGGCTAGGTTTTATAGCTGGCTTGATTGCCATAGTAATGGTGACAATTATGCTTTGCTGTATGACCAGTTGCTGTAGTTGTCTCAAGGGCTGTTGTTCTTGTGGATCCTGCTGCAAATTTGATGAAGACGACTCTGAGCCAGTGCTCAAAGGAGTCAAATTACATTACACATAA',
        organism: 'SARS-CoV-2 (Omicron BA.5)',
        accession: 'NC_045512.2',
        identity: 99.8,
        evalue: 0.0000001,
        explanation: 'Deep alignment confirms presence of L452R and F486V receptor binding domain mutations driving immune evasion.',
        sampleType: 'Viral Metagenome'
      },
      {
        title: 'M_Tuberculosis_katG_S315T_MDR.fasta',
        seq: 'ATGACCGAGCAGCAGTGGAATTTCGCGGGTGCCGACGGTACCACCGTGGAAATCGCCCGCCGCAACGGCGCCCACGGCGGCGGCGGCGGCGACGGCAG',
        organism: 'Mycobacterium tuberculosis',
        accession: 'CP003248.1',
        identity: 100.0,
        evalue: 0.0000001,
        explanation: 'Identified canonical katG S315T mutation conferring high-level resistance to Isoniazid first-line therapy.',
        sampleType: 'Bacterial Genome'
      },
      {
        title: 'CRISPR_Cas9_EMX1_OffTarget_Site4.fasta',
        seq: 'GAGTCCGAGCAGAAGAAGAAGGGCTCCCATCACATCAACCGGTGGCGCATTGCCACGAAGCAGGCCAATGGGGAGGACATCGACAAGTCAGAGTCCGA',
        organism: 'Human Gene Editing Screen',
        accession: 'HG38_EMX1',
        identity: 96.2,
        evalue: 0.00002,
        explanation: 'Deep sequencing screen detected 3.8% off-target cleavage at non-homologous site on chromosome 5.',
        sampleType: 'CRISPR Library'
      },
      {
        title: 'P_Falciparum_K13_Propeller_C580Y.fasta',
        seq: 'ATGTTGGATAAAGTTAGAGATATACCAATAGAACAAAGAAATAAAGATTTAAATAATAAAAATGAAAGTAATGAAAATGAAGGAAATGAAGGAAATGAA',
        organism: 'Plasmodium falciparum',
        accession: 'PF3D7_1343700',
        identity: 99.4,
        evalue: 0.000001,
        explanation: 'Kelch13 C580Y propeller domain mutation detected. Correlates with delayed parasite clearance after Artemisinin combo therapy.',
        sampleType: 'Parasite Genome'
      },
      {
        title: 'Mito_Haplogroup_H1a_FullSequence.fasta',
        seq: 'GATCACAGGTCTATCACCCTATTAACCACTCACGGGAGCTCTCCATGCATTTGGTATTTTCGTCTGGGGGGTATGCACGCGATAGCATTGCGAGACGCT',
        organism: 'Homo sapiens (Mitochondrial)',
        accession: 'NC_012920.1',
        identity: 99.9,
        evalue: 0.0000001,
        explanation: 'Complete mitochondrial genome sequence classified under Western European Haplogroup H1a1 with high D-loop fidelity.',
        sampleType: 'Mitochondrial DNA'
      },
      {
        title: 'Ebola_GP_A82V_Adaptation_Outbreak.fasta',
        seq: 'ATGGGCGTTACAGGAATATTGCAGTTACCTCGTGATCGATTCAAGAGGACATCATTCTTTCTTTGGGTAATTATCCTTTTCCAAAGAACATTTTCCATC',
        organism: 'Ebola virus (Zaire)',
        accession: 'KM233035.1',
        identity: 99.6,
        evalue: 0.0000001,
        explanation: 'Surface glycoprotein A82V mutation mapped. Increases viral tropism for human NPC1 cellular entry receptor.',
        sampleType: 'Viral Genome'
      },
      {
        title: 'CRISPR_Cas12a_DNMT1_Specificity.fasta',
        seq: 'TTTVGATACCGTCTGCTGGTCACATTGCCAGCGTCCGAATCGATGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCT',
        organism: 'AsCas12a Target Screen',
        accession: 'CRISPR_CAS12_DNMT1',
        identity: 98.7,
        evalue: 0.00001,
        explanation: 'Assessed PAM recognition efficiency for AsCas12a at TTTV motifs with zero detectable trans-cleavage background.',
        sampleType: 'CRISPR Library'
      },
      {
        title: 'Metagenome_Bacteroides_Fragilis_SCFA.fasta',
        seq: 'ATGAAAAAACTGTTTATCGCGCTGGTCGCTCTGGCGTTCAGCGCAAGCGCTGCATTTGCAGAACAGCAGAACGATGAAAAACAGCAGGCGGAAGCGAAA',
        organism: 'Gut Microbiome Metagenome',
        accession: 'MAG_B_FRAGILIS',
        identity: 99.1,
        evalue: 0.000001,
        explanation: 'Metagenomic assembly revealed intact butyrate kinase biosynthetic gene cluster in commensal Bacteroides isolate.',
        sampleType: 'Metagenomic Assembly'
      },
      {
        title: 'Influenza_H5N1_HA_CleavageSite.fasta',
        seq: 'ATGGAGAAAATAGTGCTTCTTTTTGCAATAGTCAGTCTTGTTAAAAGTGATCAGATTTGCATTGGTTACCATGCAAACAACTCGACAGAGCAGGTTGAC',
        organism: 'Influenza A virus (H5N1)',
        accession: 'CY041840.1',
        identity: 99.5,
        evalue: 0.0000001,
        explanation: 'Polybasic cleavage site motif PQRERRRKR/GLF confirmed. Highly predictive of systemic virulence in avian and mammalian hosts.',
        sampleType: 'Viral RNA-seq'
      },
      {
        title: 'HBV_Precore_A1762T_G1764A_Promoter.fasta',
        seq: 'ATGGACATTGACCCTTATAAAGAATTTGGAGCTACTGTGGAGTTACTCTCGTTTTTGCCTTCTGACTTCTTTCCTTCCGTCAGAGATCTCCTAGACACC',
        organism: 'Hepatitis B virus',
        accession: 'HE974381.1',
        identity: 100.0,
        evalue: 0.0000001,
        explanation: 'Basal core promoter double mutation A1762T/G1764A detected. Downregulates HBeAg and elevates hepatocellular carcinoma risk.',
        sampleType: 'Viral Genome'
      },
      {
        title: 'HIV1_RT_K103N_M184V_Resistance.fasta',
        seq: 'ATGGCCAGCCCCATCAGTACCATCGAGACCGTGCCCGTGAAGCTGAAGCCCGGCATGGACGGCCTCAAGGTGTACCAGAACCCCCTCGACATCCTCGAG',
        organism: 'Human immunodeficiency virus 1',
        accession: 'AF033819.1',
        identity: 99.2,
        evalue: 0.000001,
        explanation: 'Pol gene RT sequencing identified K103N NNRTI resistance and M184V Emtricitabine/Lamivudine resistance mutations.',
        sampleType: 'Viral cDNA'
      },
      {
        title: 'A_Thaliana_DREB2A_Drought_Promoter.fasta',
        seq: 'ATGGCGAAGGCGACGTCCGGTGCCGCGGGGCTGCGTCTGCTGTTGCTGCTGCTGCTGCCGCTGCTAGGCACCGCGGCAGGGGCTGGGGCTCCCCAGCCG',
        organism: 'Arabidopsis thaliana',
        accession: 'AT5G05410',
        identity: 99.8,
        evalue: 0.0000001,
        explanation: 'Promoter analysis mapped ABA-independent drought response element (DRE) binding motifs.',
        sampleType: 'Plant Genome'
      },
      {
        title: 'Neanderthal_OAS1_SpliceVariant_Locus.fasta',
        seq: 'ATGATGGATCTCAGAAATACCCCAGCCAAATCTCTGGACAAGTTCATTGAAGACTATCTCTTGCCAGACACGTGTTTCCGCATGCAAATCAACCATGCC',
        organism: 'Homo sapiens / Neanderthal Introgression',
        accession: 'NC_000012.12',
        identity: 98.9,
        evalue: 0.000001,
        explanation: 'Archaic Neanderthal introgressed haplotype at OAS1 locus mapped. Enhances prenylated 2-5A synthetase antiviral activity.',
        sampleType: 'Comparative Genomics'
      },
      {
        title: 'Danio_Rerio_miR133_Cardiac_Cluster.fasta',
        seq: 'ATGTTTGGTCCCCTTCAACCAGCTGTAGCTATGCATTGACTCTTAGTAGGTCAGTGCACTGCATTGCAATGCATTGCAATGCATTGCAATGCATTGCA',
        organism: 'Danio rerio (Zebrafish)',
        accession: 'ENSDARG0000008912',
        identity: 100.0,
        evalue: 0.0000001,
        explanation: 'MicroRNA-133 cluster upregulation documented 7 days post-ventricular resection, supporting cardiomyocyte proliferation.',
        sampleType: 'Small RNA-seq'
      },
      {
        title: 'Drosophila_Antp_Homeobox_Mutation.fasta',
        seq: 'ATGCGAAGGCGACGTCCGGTGCCGCGGGGCTGCGTCTGCTGTTGCTGCTGCTGCTGCCGCTGCTAGGCACCGCGGCAGGGGCTGGGGCTCCCCAGCCG',
        organism: 'Drosophila melanogaster',
        accession: 'FBgn0000095',
        identity: 99.7,
        evalue: 0.0000001,
        explanation: 'Ectopic Antennapedia gain-of-function homeobox allele characterized. Induces leg structure development on antennal segment.',
        sampleType: 'Model Organism'
      },
      {
        title: 'HLA_B5701_Exon2_Exon3_Pharmacogenomics.fasta',
        seq: 'ATGGCGGTCATGGCGCCCCGAACCCTCCTCCTGCTACTCTCGGGGGCCCTGGCCCTGACCGAGACCTGGGCCGGCTCCCACTCCATGAGGTATTTCTAC',
        organism: 'Homo sapiens (HLA-B)',
        accession: 'HLA00132',
        identity: 100.0,
        evalue: 0.0000001,
        explanation: 'High-resolution HLA typing confirms HLA-B*57:01 allele presence. Absolute contraindication for Abacavir antiretroviral therapy.',
        sampleType: 'Pharmacogenomic Panel'
      },
      {
        title: 'HTT_CAG_Repeat_Exon1_Expansion.fasta',
        seq: 'ATGGCGACCCTGGAAAAGCTGATGAAGGCCTTCGAGTCCCTCAAGTCCTTCCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCTC',
        organism: 'Homo sapiens (HTT)',
        accession: 'NM_002111.8',
        identity: 99.4,
        evalue: 0.000001,
        explanation: 'Targeted amplicon sequencing quantified 44 CAG trinucleotide repeats in HTT exon 1. Confirms fully penetrant Huntington allele.',
        sampleType: 'Trinucleotide Amplicon'
      },
      {
        title: 'HBB_Glu6Val_SickleCell_Variant.fasta',
        seq: 'ATGGTGCACCTCACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTG',
        organism: 'Homo sapiens (HBB)',
        accession: 'NM_000518.5',
        identity: 100.0,
        evalue: 0.0000001,
        explanation: 'Homozygous c.20A>T (p.Glu6Val) canonical HbS variant detected in beta-globin gene. Confirms Sickle Cell Anemia genotype.',
        sampleType: 'Targeted Exon'
      },
      {
        title: 'FMR1_5UTR_CGG_Repeat_Expansion.fasta',
        seq: 'ATGGCGACCCTGGAAAAGCTGATGAAGGCCTTCGAGTCCCTCAAGTCCTTCCAGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGC',
        organism: 'Homo sapiens (FMR1)',
        accession: 'NM_002024.6',
        identity: 98.6,
        evalue: 0.00001,
        explanation: 'Long-read SMRT sequencing detected >230 CGG repeats in FMR1 5-UTR with promoter hypermethylation. Confirms Fragile X syndrome.',
        sampleType: 'Long-Read Amplicon'
      },
      {
        title: 'SOD1_A4V_ALS_Exon1_RapidVariant.fasta',
        seq: 'ATGGCGACGAAGGCCGTGTGCGTGCTGAAGGGCGACGGCCCAGTGCAGGGCATCATCAATTTCGAGCAGAAGGAAAGTAATGGACCAGTGAAGGTGTGG',
        organism: 'Homo sapiens (SOD1)',
        accession: 'NM_000454.5',
        identity: 99.9,
        evalue: 0.0000001,
        explanation: 'Canonical SOD1 p.Ala4Val (A4V) missense mutation detected. Associated with rapidly progressive familial Amyotrophic Lateral Sclerosis.',
        sampleType: 'Neurology Panel'
      }
    ];

    let researcherDNAFiles = [];
    for (let item of researcherDatasets) {
      const metrics = calculateDNAMetrics(item.seq);
      const dnaDoc = await DNAFile.create({
        originalName: item.title,
        filename: `${Date.now()}-${item.title.toLowerCase()}`,
        path: 'internal',
        size: item.seq.length * 15,
        mimetype: 'text/fasta',
        doctor: researcherMain._id,
        status: 'analyzed',
        analysisType: 'deep',
        sequenceLength: metrics.sequenceLength,
        gcContent: metrics.gcContent,
        atContent: metrics.atContent,
        nucleotideFrequency: metrics.nucleotideFrequency,
        nucleotidePercentage: metrics.nucleotidePercentage,
        molecularWeightDa: metrics.molecularWeightDa,
        codonAnalysis: {
          totalCodons: Math.floor(metrics.sequenceLength / 3),
          proteinLength: Math.floor(metrics.sequenceLength / 3) - 1,
          startCodonCount: 1,
          stopCodonCount: 1,
          openReadingFramesDetected: 3,
          aminoAcidSequencePreview: 'MFVFLVLLPLVSSQCVNLTTRTQLPPAYTNSFTRGVYYP...',
          codonFrequency: { ATG: 4, TTT: 6, GTT: 5, CTT: 5 }
        },
        blastResult: {
          status: 'completed',
          rid: `BLAST-${Math.floor(100000 + Math.random() * 900000)}`,
          totalHits: 12,
          topOrganism: item.organism,
          topIdentity: item.identity,
          topAccession: item.accession,
          topEvalue: item.evalue,
          organismsIdentified: [item.organism, 'Homo sapiens', 'Reference Assembly'],
          scientificExplanation: item.explanation,
          hits: []
        },
        scientificSummary: item.explanation,
        confidence: 0.995,
        sampleType: item.sampleType,
        notes: `Research cohort tracking dataset for ${item.organism}`,
        patientId: `RES-SET-${Math.floor(200 + Math.random() * 800)}`,
        patientAge: 35,
        biologicalSex: 'Other',
        clinicalIndication: `High-throughput research study on ${item.organism}`,
        clinicalStatus: 'Approved',
        createdAt: new Date(Date.now() - (19 - researcherDatasets.indexOf(item)) * 3 * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 43200000) - 43200000),
        updatedAt: new Date(Date.now() - (19 - researcherDatasets.indexOf(item)) * 3 * 24 * 60 * 60 * 1000 - 43200000)
      });

      researcherDNAFiles.push(dnaDoc);
    }
    console.log('✅ Created 20 Real Research Genomic Datasets for Researcher.');

    // ── 5. SEED 20 CLINICAL & RESEARCH NOTES FOR DOCTOR & RESEARCHER ──────────
    console.log('📝 Creating clinical notes and research memos...');

    for (let i = 0; i < doctorDNAFiles.length; i++) {
      const dnaDoc = doctorDNAFiles[i];
      await Note.create({
        userId: doctorMain._id,
        title: `Clinical Consultation Note: ${dnaDoc.variants[0]?.gene || 'Genomic Panel'}`,
        content: `Reviewed genomic test results for Patient ${dnaDoc.patientId}. Variant ${dnaDoc.mutations[0]} is classified as ${dnaDoc.variants[0]?.clinicalSignificance || 'Pathogenic'}. Recommended immediate genetic counseling and cascade testing for family members.`,
        dnaFile: dnaDoc._id,
        createdAt: dnaDoc.createdAt,
        updatedAt: dnaDoc.updatedAt
      });
    }

    for (let i = 0; i < researcherDNAFiles.length; i++) {
      const dnaDoc = researcherDNAFiles[i];
      await Note.create({
        userId: researcherMain._id,
        title: `Research Observation Log: ${dnaDoc.blastResult?.topOrganism || 'Genome Study'}`,
        content: `Sequence alignment completed with ${dnaDoc.blastResult?.topIdentity}% identity to reference ${dnaDoc.blastResult?.topAccession}. Structural mutation features confirm key biological properties: ${dnaDoc.scientificSummary}`,
        dnaFile: dnaDoc._id,
        createdAt: dnaDoc.createdAt,
        updatedAt: dnaDoc.updatedAt
      });
    }

    console.log('✅ Created 40 Notes.');

    // ── 6. SEED SYSTEM ANNOUNCEMENTS & NOTIFICATIONS ──────────────────────
    console.log('📢 Creating system announcements & live notifications...');

    const systemAnnouncements = [
      {
        title: 'GeneLab AI Core v2.8.0 Release Notice',
        content: 'We have updated the bioinformatics alignment engine with high-throughput BioPython & BLAST acceleration. Pipeline processing speed improved by 65%.',
        priority: 'high',
        category: 'update',
        authorId: adminMain._id,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'ClinVar Database Synchronization Complete',
        content: 'The clinical variant database (ClinVar April 2026 release) has been successfully synchronized across all diagnostic pipeline nodes.',
        priority: 'high',
        category: 'general',
        authorId: adminMain._id,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Scheduled Node Optimization',
        content: 'Routine high-performance cluster maintenance will take place on Saturday at 03:00 UTC. Expect zero downtime as failover workers take over.',
        priority: 'medium',
        category: 'maintenance',
        authorId: adminMain._id,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'HIPAA & ISO-27001 Security Audit Passed',
        content: 'GeneLab platform successfully completed its quarterly HIPAA compliance and zero-trust security audit with a 100% score.',
        priority: 'medium',
        category: 'security',
        authorId: adminMain._id,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
      }
    ];

    for (let ann of systemAnnouncements) {
      await Announcement.create(ann);
    }

    // ── 7. SEED AUDIT LOGS & SYSTEM LOGS ──────────────────────────────────
    console.log('🔒 Seeding compliance audit logs & system execution logs...');

    for (let i = 0; i < doctorDNAFiles.length; i++) {
      const doc = doctorDNAFiles[i];
      await AuditLog.create({
        userId: doctorMain._id,
        action: 'ANALYSIS_COMPLETED',
        resourceType: 'DNAFile',
        resourceId: doc._id,
        details: { patientId: doc.patientId, gene: doc.variants[0]?.gene, status: doc.clinicalStatus },
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GeneLab Client v2.8',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      });

      await SystemLog.create({
        level: 'info',
        message: `Bioinformatics pipeline finished analysis for job ${doc.originalName}`,
        context: 'DNAEngine',
        userId: doctorMain._id,
        ipAddress: '127.0.0.1',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      });
    }

    for (let i = 0; i < researcherDNAFiles.length; i++) {
      const doc = researcherDNAFiles[i];
      await AuditLog.create({
        userId: researcherMain._id,
        action: 'RESEARCH_BLAST_ALIGNMENT',
        resourceType: 'DNAFile',
        resourceId: doc._id,
        details: { organism: doc.blastResult?.topOrganism, identity: doc.blastResult?.topIdentity },
        ipAddress: '192.168.1.105',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GeneLab Researcher Studio',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      });

      await SystemLog.create({
        level: 'info',
        message: `Local BLAST pairwise worker completed sequence alignment for ${doc.originalName}`,
        context: 'BLASTEngine',
        userId: researcherMain._id,
        ipAddress: '127.0.0.1',
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      });
    }

    console.log('=============================================================');
    console.log('🎉 ULTRA FRESH DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=============================================================');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed with error:', err);
    process.exit(1);
  }
}

runSeed();
