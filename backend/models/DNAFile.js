/**
 * GenLab AI — Expanded DNAFile MongoDB Model
 * Stores uploaded DNA files AND their full analysis results
 * so the existing frontend (result.js, reports.js) works seamlessly.
 */
const mongoose = require('mongoose');

const dnaFileSchema = new mongoose.Schema({
  // File metadata
  originalName: { type: String, required: true },
  filename:     { type: String, required: true },
  path:         { type: String, required: true },
  storagePath:  { type: String },
  fileUrl:      { type: String },
  size:         { type: Number },
  mimetype:     { type: String },

  // Owner
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Manual paste support
  sequence: { type: String },

  // Lifecycle
  status: {
    type: String,
    enum: ['uploaded', 'analyzing', 'analyzed', 'failed'],
    default: 'uploaded'
  },

  // Linked analysis job (for queue-based analysis)
  analysisJobId: { type: String },
  analysisType:  { type: String, enum: ['instant', 'deep'] },

  // ── Core Analysis Results (from BioPython) ──────────────────────────────
  sequenceLength:      { type: Number },
  gcContent:           { type: Number },
  atContent:           { type: Number },
  nucleotideFrequency: {
    A: { type: Number },
    T: { type: Number },
    G: { type: Number },
    C: { type: Number },
    N: { type: Number }
  },
  nucleotidePercentage: {
    A: { type: Number },
    T: { type: Number },
    G: { type: Number },
    C: { type: Number },
    N: { type: Number }
  },
  gcSkew:  { type: Number },
  atSkew:  { type: Number },
  molecularWeightDa: { type: Number },

  // ── Codon Analysis ───────────────────────────────────────────────────────
  codonAnalysis: {
    totalCodons:                { type: Number },
    proteinLength:              { type: Number },
    startCodonCount:            { type: Number },
    stopCodonCount:             { type: Number },
    openReadingFramesDetected:  { type: Number },
    aminoAcidSequencePreview:   { type: String },
    codonFrequency:             { type: mongoose.Schema.Types.Mixed }
  },

  // ── Mutation / Variant Analysis (MyVariant.info) ─────────────────────────
  mutations:        [{ type: String }],
  hasAnomalies:     { type: Boolean, default: false },
  variantsAnalyzed: { type: Number },
  highSeverityCount:{ type: Number },
  diseaseAssociations: [{ type: String }],
  clinicalSummary:  { type: String },

  // Full variants array (for detailed views)
  variants: [{
    variantId:            String,
    gene:                 String,
    clinicalSignificance: String,
    severity:             String,
    diseaseAssociations:  [String],
    caddPhredScore:       Number,
    populationFrequency:  Number,
    rsid:                 String,
    chromosome:           String,
    position:             Number
  }],

  // ── BLAST Results (deep analysis) ───────────────────────────────────────
  blastResult: {
    status:              String,
    rid:                 String,
    totalHits:           Number,
    topOrganism:         String,
    topIdentity:         Number,
    topAccession:        String,
    topEvalue:           Number,
    organismsIdentified: [String],
    scientificExplanation: String,
    hits: [mongoose.Schema.Types.Mixed]
  },

  // ── Scientific Summary ───────────────────────────────────────────────────
  scientificSummary: { type: String },
  confidence:        { type: Number },

  // ── Top Repeats ──────────────────────────────────────────────────────────
  topRepeats: [{ kmer: String, count: Number, frequency: Number }],

  // ── Misc ─────────────────────────────────────────────────────────────────
  sampleType: { type: String },
  notes:      { type: String },
  errorMessage: { type: String }

}, { timestamps: true, collection: 'dna_sequences' });

// High-speed indices for querying files and analysis status
dnaFileSchema.index({ doctor: 1 });
dnaFileSchema.index({ status: 1 });
dnaFileSchema.index({ analysisJobId: 1 });
dnaFileSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DNAFile', dnaFileSchema);
