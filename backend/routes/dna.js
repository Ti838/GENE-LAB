/**
 * GenLab AI — DNA File Routes
 * Handles upload, listing, manual paste, file retrieval,
 * and single-file analysis (wired to FastAPI/queue system).
 *
 * All routes: /api/dna/*
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { protect } = require('../middleware/auth');
const DNAFile = require('../models/DNAFile');
const AnalysisJob = require('../models/AnalysisJob');
const queueService = require('../services/queue.service');
const fastapiService = require('../services/fastapi.service');
const dnaService = require('../services/dna.service');

// ── Multer config ─────────────────────────────────────────────────────────
const UPLOADS_DIR = process.env.VERCEL === '1'
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.warn('⚠️ Failed to create uploads directory:', err.message);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.fasta', '.fa', '.fna', '.fastq', '.fq', '.csv', '.txt', '.ffn', '.faa'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${ext}`));
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/dna/upload — Upload a DNA file
// ────────────────────────────────────────────────────────────────────────────
router.post('/upload', protect, upload.single('dnaFile'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    const dnaFile = await DNAFile.create({
      originalName: req.file.originalname,
      filename:     req.file.filename,
      path:         req.file.path,
      size:         req.file.size,
      mimetype:     req.file.mimetype,
      doctor:       req.user._id,
      status:       'uploaded'
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully.',
      _id: dnaFile._id,
      originalName: dnaFile.originalName,
      size: dnaFile.size,
      status: dnaFile.status
    });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/dna/my-files — List all DNA files for this doctor
// ────────────────────────────────────────────────────────────────────────────
router.get('/my-files', protect, async (req, res, next) => {
  try {
    const files = await DNAFile.find({ doctor: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(files);
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/dna/paste — Save manually pasted DNA sequence
// ────────────────────────────────────────────────────────────────────────────
router.post('/paste', protect, async (req, res, next) => {
  try {
    const { sequence, name } = req.body;
    if (!sequence) return res.status(400).json({ message: 'Sequence is required.' });

    const dnaFile = await DNAFile.create({
      originalName: name || 'Manual_Sequence',
      filename:     'manual-input',
      path:         'internal',
      sequence:     sequence.trim().toUpperCase(),
      doctor:       req.user._id,
      status:       'uploaded'
    });

    res.status(201).json({
      success: true,
      message: 'Sequence saved.',
      _id: dnaFile._id,
      originalName: dnaFile.originalName
    });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/dna/file/:id — Get single DNA file with all analysis results
// ────────────────────────────────────────────────────────────────────────────
router.get('/file/:id', protect, async (req, res, next) => {
  try {
    const file = await DNAFile.findOne({ _id: req.params.id, doctor: req.user._id }).lean();
    if (!file) return res.status(404).json({ message: 'File not found.' });
    res.json(file);
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/dna/analyze/:id — Run analysis on an existing DNA file
// Queues an instant analysis job for the file.
// This is the endpoint used by frontend/js/analysis.js
// ────────────────────────────────────────────────────────────────────────────
router.post('/analyze/:id', protect, async (req, res, next) => {
  try {
    const file = await DNAFile.findOne({ _id: req.params.id, doctor: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found.' });

    if (file.status === 'analyzing') {
      return res.status(409).json({ message: 'Analysis already in progress for this file.' });
    }

    // Mark as analyzing
    file.status = 'analyzing';
    await file.save();

    // Build job
    const jobId = uuidv4();
    await AnalysisJob.create({
      jobId,
      userId: req.user._id,
      dnaFileId: file._id,
      analysisType: 'instant',
      status: 'queued',
      inputFileName: file.originalName,
      inputFileSize: file.size
    });

    const jobPayload = {
      jobId,
      userId:       req.user._id.toString(),
      dnaFileId:    file._id.toString(),
      filePath:     file.path !== 'internal' ? file.path : undefined,
      fileName:     file.originalName,
      sequence:     file.sequence || undefined,
      sequenceName: file.originalName,
      variantIds:   []
    };

    try {
      await queueService.enqueueInstantAnalysis(jobPayload);
      return res.json({
        message: 'Analysis started.',
        jobId,
        statusUrl: `/api/analysis/analysis-status/${jobId}`,
        dnaFileId: file._id
      });
    } catch (queueErr) {
      // Synchronous fallback
      console.warn('Queue fallback for /analyze/:id:', queueErr.message);
      let result;
      try {
        if (file.path !== 'internal' && fs.existsSync(file.path)) {
          result = await fastapiService.runInstantAnalysisFile(file.path, file.originalName, []);
        } else if (file.sequence) {
          result = await fastapiService.runInstantAnalysisText(file.sequence, file.originalName, []);
        } else {
          throw new Error('No file content available for analysis.');
        }

        const updateData = _mapInstantResultToDNAFile(result, jobId);
        await DNAFile.findByIdAndUpdate(file._id, updateData);
        await AnalysisJob.findOneAndUpdate(
          { jobId },
          { status: 'completed', completedAt: new Date(), progress: 100, result }
        );
        return res.json({ message: 'Analysis completed.', jobId, dnaFileId: file._id });
      } catch (fastapiErr) {
        await DNAFile.findByIdAndUpdate(file._id, { status: 'failed', errorMessage: fastapiErr.message });
        await AnalysisJob.findOneAndUpdate({ jobId }, { status: 'failed', errorMessage: fastapiErr.message });
        return next(fastapiErr);
      }
    }
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/dna/compare — Compare two DNA files (local JS engine)
// ────────────────────────────────────────────────────────────────────────────
router.post('/compare', protect, async (req, res, next) => {
  try {
    const { id1, id2 } = req.body;
    if (!id1 || !id2) return res.status(400).json({ message: 'Both id1 and id2 are required.' });

    const [file1, file2] = await Promise.all([
      DNAFile.findById(id1),
      DNAFile.findById(id2)
    ]);

    if (!file1 || !file2) return res.status(404).json({ message: 'One or both files not found.' });

    // Get sequence from file content or stored sequence
    let seq1 = file1.sequence || '';
    let seq2 = file2.sequence || '';

    // If file is on disk, read up to 100k chars
    if (!seq1 && file1.path && file1.path !== 'internal' && fs.existsSync(file1.path)) {
      const raw = fs.readFileSync(file1.path, 'utf-8');
      seq1 = dnaService.parseSequence(raw).slice(0, 100_000);
    }
    if (!seq2 && file2.path && file2.path !== 'internal' && fs.existsSync(file2.path)) {
      const raw = fs.readFileSync(file2.path, 'utf-8');
      seq2 = dnaService.parseSequence(raw).slice(0, 100_000);
    }

    if (!seq1 || !seq2) {
      return res.status(400).json({ message: 'Could not extract sequences from one or both files.' });
    }

    const comparison = dnaService.compareSequences(seq1, seq2);

    res.json({
      similarity: comparison.similarity,
      matchCount: comparison.matchCount,
      mismatchCount: comparison.mismatchCount,
      seq1Length: comparison.seq1Length,
      seq2Length: comparison.seq2Length,
      file1: file1.originalName,
      file2: file2.originalName,
      mismatches: comparison.mismatches.slice(0, 50)
    });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/dna/file/:id — Delete a DNA file record
// ────────────────────────────────────────────────────────────────────────────
router.delete('/file/:id', protect, async (req, res, next) => {
  try {
    const file = await DNAFile.findOne({ _id: req.params.id, doctor: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found.' });

    // Remove from disk if applicable
    if (file.path && file.path !== 'internal' && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    await DNAFile.deleteOne({ _id: file._id });
    res.json({ message: 'File deleted.' });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/dna/health — Check FastAPI service reachability
// ────────────────────────────────────────────────────────────────────────────
router.get('/health', async (req, res, next) => {
  try {
    const health = await fastapiService.checkFastAPIHealth();
    res.json({
      expressBackend: 'ok',
      fastapiService: health.reachable ? 'ok' : 'unreachable',
      fastapiDetail: health.data || health.error
    });
  } catch (err) { next(err); }
});

// ── Helper ────────────────────────────────────────────────────────────────
function _mapInstantResultToDNAFile(result, jobId) {
  const stats = result.statistics || {};
  const nf = result.nucleotide_frequency || stats.nucleotide_frequency || {};
  const np = result.nucleotide_percentage || stats.nucleotide_percentage || {};
  const codon = result.codon_analysis || {};
  const mutationAnalysis = result.mutation_analysis || {};
  const variants = mutationAnalysis.variants || [];
  const mutations = variants
    .filter(v => v.severity === 'HIGH' || v.severity === 'MODERATE')
    .map(v => `${v.gene || 'Unknown'}: ${v.variant_id || ''} (${v.severity})`);

  return {
    status: 'analyzed',
    analysisType: 'instant',
    analysisJobId: jobId,
    sequence: result.validation?.cleaned || result.sequence || undefined,
    sequenceLength: result.sequence_length || stats.sequence_length,
    gcContent:  result.gc_content  || stats.gc_content,
    atContent:  result.at_content  || stats.at_content,
    nucleotideFrequency:  { A: nf.A, T: nf.T, G: nf.G, C: nf.C, N: nf.N },
    nucleotidePercentage: { A: np.A, T: np.T, G: np.G, C: np.C, N: np.N },
    gcSkew: result.gc_skew || stats.gc_skew,
    atSkew: result.at_skew || stats.at_skew,
    molecularWeightDa: result.molecular_weight_da || stats.molecular_weight_estimate_da,
    codonAnalysis: {
      totalCodons:               codon.total_codons,
      proteinLength:             codon.protein_length,
      startCodonCount:           codon.start_codon_count,
      stopCodonCount:            codon.stop_codon_count,
      openReadingFramesDetected: codon.open_reading_frames_detected,
      aminoAcidSequencePreview:  codon.amino_acid_sequence,
      codonFrequency:            codon.codon_frequency
    },
    mutations,
    hasAnomalies: mutations.length > 0,
    variantsAnalyzed:    mutationAnalysis.variants_analyzed,
    highSeverityCount:   mutationAnalysis.high_severity_count,
    diseaseAssociations: mutationAnalysis.disease_associations || [],
    clinicalSummary:     mutationAnalysis.clinical_summary,
    variants: variants.map(v => ({
      variantId: v.variant_id, gene: v.gene,
      clinicalSignificance: v.clinical_significance, severity: v.severity,
      diseaseAssociations: v.disease_associations,
      caddPhredScore: v.cadd_phred_score, populationFrequency: v.population_frequency,
      rsid: v.rsid, chromosome: v.chromosome, position: v.position
    })),
    scientificSummary: result.scientific_summary,
    confidence:        result.confidence,
    topRepeats: (result.top_repeats || []).slice(0, 10).map(r => ({
      kmer: r.kmer, count: r.count, frequency: r.frequency
    }))
  };
}

module.exports = router;
