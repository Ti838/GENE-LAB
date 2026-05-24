/**
 * GenLab AI — Analysis Routes
 * Handles the main genomics analysis API endpoints:
 *
 *   POST /api/analysis/instant-analysis     — Queue instant (BioPython + MyVariant)
 *   POST /api/analysis/deep-analysis        — Queue deep (NCBI BLAST)
 *   POST /api/analysis/upload-csv           — CSV batch upload + instant analysis
 *   GET  /api/analysis/analysis-status/:id  — Poll job status
 *   GET  /api/analysis/analysis-result/:id  — Get full result
 *   GET  /api/analysis/download-report/:id  — Download PDF report
 *
 * All endpoints are JWT-protected.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Optional S3-backed uploads
const S3_BUCKET = process.env.S3_BUCKET;
let multerStorage = null;
if (S3_BUCKET) {
  const { S3Client } = require('@aws-sdk/client-s3');
  const multerS3 = require('multer-s3');
  const s3Client = new S3Client({ region: process.env.S3_REGION || 'us-east-1' });
  multerStorage = multerS3({
    s3: s3Client,
    bucket: S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `${Date.now()}-${uuidv4().slice(0,8)}${ext}`;
      cb(null, filename);
    }
  });
}
const { v4: uuidv4 } = require('uuid');
const { protect } = require('../middleware/auth');
const AnalysisJob = require('../models/AnalysisJob');
const DNAFile = require('../models/DNAFile');
const queueService = require('../services/queue.service');
const fastapiService = require('../services/fastapi.service');

// ── Multer upload config ──────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multerStorage || multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.fasta', '.fa', '.fna', '.fastq', '.fq', '.csv', '.txt', '.ffn', '.faa'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowed.join(', ')}`));
  }
};

// Multer upload instance. For serverless (Vercel) deployments, disk storage is not reliable.
// If running on Vercel and S3 is not configured, reject file uploads with a helpful error.
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB max
});

const isVercel = process.env.VERCEL === '1';
const S3_BUCKET = process.env.S3_BUCKET;

// ── Helper: Create AnalysisJob record in MongoDB ─────────────────────────
async function createJobRecord(userId, analysisType, extras = {}) {
  const jobId = uuidv4();
  const jobRecord = await AnalysisJob.create({
    jobId,
    userId,
    analysisType,
    status: 'queued',
    ...extras
  });
  return { jobId, jobRecord };
}

// ── Helper: Sync fallback when Redis is unavailable ──────────────────────
async function runSyncFallback(analysisType, filePath, fileName, sequence, sequenceName, variantIds) {
  if (analysisType === 'instant') {
    if (filePath) return fastapiService.runInstantAnalysisFile(filePath, fileName, variantIds || []);
    return fastapiService.runInstantAnalysisText(sequence, sequenceName, variantIds || []);
  } else {
    if (filePath) return fastapiService.runDeepAnalysisFile(filePath, fileName);
    return fastapiService.runDeepAnalysisText(sequence, sequenceName);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/analysis/instant-analysis
// Accepts: file upload OR { sequence, name } JSON body
// ────────────────────────────────────────────────────────────────────────────
router.post('/instant-analysis', protect, upload.single('file'), async (req, res, next) => {
  try {
    const { sequence, name, variantIds } = req.body;
    const file = req.file;

    // Serverless (Vercel) caution: disallow disk-based uploads when S3 not configured.
    if (isVercel && file && !S3_BUCKET) {
      return res.status(400).json({ message: 'File uploads are not supported on Vercel without S3 configured. Please set S3_BUCKET & AWS credentials or upload sequences as text.' });
    }

    if (!file && !sequence) {
      return res.status(400).json({ message: 'Provide a DNA file (file) or raw sequence (sequence) in the request body.' });
    }

    const varIds = variantIds
      ? (Array.isArray(variantIds) ? variantIds : variantIds.split(',').map(s => s.trim()))
      : [];

    // Create or link a DNAFile record
    let dnaFileId = null;
    if (file) {
      const dnaFilePayload = {
        originalName: file.originalname,
        filename: file.filename || file.key || file.originalname,
        path: file.path || (file.location ? `s3://${S3_BUCKET}/${file.key}` : file.location || file.path),
        size: file.size,
        mimetype: file.mimetype,
        doctor: req.user._id,
        status: 'analyzing',
        analysisType: 'instant'
      };
      if (S3_BUCKET && file.key) {
        dnaFilePayload.s3Key = file.key;
        dnaFilePayload.s3Url = file.location;
      }
      const dnaFile = await DNAFile.create(dnaFilePayload);
      dnaFileId = dnaFile._id.toString();
    } else if (sequence) {
      const dnaFile = await DNAFile.create({
        originalName: name || 'manual_sequence',
        filename: 'manual-input',
        path: 'internal',
        sequence,
        doctor: req.user._id,
        status: 'analyzing',
        analysisType: 'instant'
      });
      dnaFileId = dnaFile._id.toString();
    }

    // Create job record
    const { jobId } = await createJobRecord(req.user._id, 'instant', {
      dnaFileId,
      inputFileName: file?.originalname || name || 'manual_sequence',
      inputFileSize: file?.size
    });

    // Build job payload
    const jobPayload = {
      jobId,
      userId: req.user._id.toString(),
      dnaFileId,
      filePath: file?.path,
      fileName: file?.originalname,
      sequence: sequence || undefined,
      sequenceName: name,
      variantIds: varIds,
      s3Key: file?.key || undefined,
      s3Url: file?.location || undefined
    };

    // Try queued mode, fall back to sync if Redis unavailable
    try {
      await queueService.enqueueInstantAnalysis(jobPayload);
      return res.status(202).json({
        message: 'Instant analysis queued successfully.',
        jobId,
        dnaFileId,
        statusUrl: `/api/analysis/analysis-status/${jobId}`,
        resultUrl: `/api/analysis/analysis-result/${jobId}`
      });
    } catch (queueErr) {
      console.warn('Queue unavailable, running synchronously:', queueErr.message);
      // Sync fallback
      const result = await runSyncFallback('instant', file?.path, file?.originalname, sequence, name, varIds);
      // Save result
      if (dnaFileId) {
        const { default: qSvc } = await import('./queue.service.js').catch(() => ({ default: null }));
        // Use the mapping helper directly
        const updateData = _mapInstantResultToDNAFile(result, jobId);
        await DNAFile.findByIdAndUpdate(dnaFileId, updateData);
      }
      await AnalysisJob.findOneAndUpdate(
        { jobId },
        { status: 'completed', completedAt: new Date(), progress: 100, result }
      );
      return res.json({ message: 'Analysis completed (sync).', jobId, dnaFileId, result });
    }
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/analysis/deep-analysis
// ────────────────────────────────────────────────────────────────────────────
router.post('/deep-analysis', protect, upload.single('file'), async (req, res, next) => {
  try {
    const { sequence, name } = req.body;
    const file = req.file;

    if (!file && !sequence) {
      return res.status(400).json({ message: 'Provide a DNA file or raw sequence.' });
    }

    let dnaFileId = null;
    if (file) {
      const dnaFilePayload = {
        originalName: file.originalname,
        filename: file.filename || file.key || file.originalname,
        path: file.path || (file.location ? `s3://${S3_BUCKET}/${file.key}` : file.location || file.path),
        size: file.size,
        mimetype: file.mimetype,
        doctor: req.user._id,
        status: 'analyzing',
        analysisType: 'deep'
      };
      if (S3_BUCKET && file.key) {
        dnaFilePayload.s3Key = file.key;
        dnaFilePayload.s3Url = file.location;
      }
      const dnaFile = await DNAFile.create(dnaFilePayload);
      dnaFileId = dnaFile._id.toString();
    } else if (sequence) {
      const dnaFile = await DNAFile.create({
        originalName: name || 'manual_sequence',
        filename: 'manual-input',
        path: 'internal',
        sequence,
        doctor: req.user._id,
        status: 'analyzing',
        analysisType: 'deep'
      });
      dnaFileId = dnaFile._id.toString();
    }

    const { jobId } = await createJobRecord(req.user._id, 'deep', {
      dnaFileId,
      inputFileName: file?.originalname || name || 'manual_sequence',
      inputFileSize: file?.size
    });

    const jobPayload = {
      jobId,
      userId: req.user._id.toString(),
      dnaFileId,
      filePath: file?.path,
      fileName: file?.originalname,
      sequence: sequence || undefined,
      sequenceName: name,
      s3Key: file?.key || undefined,
      s3Url: file?.location || undefined
    };

    try {
      await queueService.enqueueDeepAnalysis(jobPayload);
      return res.status(202).json({
        message: 'Deep BLAST analysis queued. This may take 2–3 minutes.',
        jobId,
        dnaFileId,
        statusUrl: `/api/analysis/analysis-status/${jobId}`,
        resultUrl: `/api/analysis/analysis-result/${jobId}`
      });
    } catch (queueErr) {
      console.warn('Queue unavailable, running synchronously:', queueErr.message);
      const result = await runSyncFallback('deep', file?.path, file?.originalname, sequence, name, []);
      if (dnaFileId) {
        await DNAFile.findByIdAndUpdate(dnaFileId, {
          status: 'analyzed',
          analysisType: 'deep',
          analysisJobId: jobId,
          sequence: sequence || result.sequence || undefined,
          blastResult: result,
          scientificSummary: result.scientific_explanation,
          sequenceLength: result.sequence_length
        });
      }
      await AnalysisJob.findOneAndUpdate(
        { jobId },
        { status: 'completed', completedAt: new Date(), progress: 100, result }
      );
      return res.json({ message: 'Deep analysis completed (sync).', jobId, dnaFileId, result });
    }
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/analysis/upload-csv
// CSV batch upload — parses all sequences and runs instant analysis on each
// ────────────────────────────────────────────────────────────────────────────
router.post('/upload-csv', protect, upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No CSV file provided.' });
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      return res.status(400).json({ message: 'File must be a .csv file.' });
    }

    // Create the DNAFile record for the CSV
    const dnaFilePayload = {
      originalName: file.originalname,
      filename: file.filename || file.key || file.originalname,
      path: file.path || (file.location ? `s3://${S3_BUCKET}/${file.key}` : file.location || file.path),
      size: file.size,
      mimetype: file.mimetype,
      doctor: req.user._id,
      status: 'analyzing',
      analysisType: 'instant',
      notes: 'CSV batch upload'
    };
    if (S3_BUCKET && file.key) {
      dnaFilePayload.s3Key = file.key;
      dnaFilePayload.s3Url = file.location;
    }
    const dnaFile = await DNAFile.create(dnaFilePayload);

    const { jobId } = await createJobRecord(req.user._id, 'instant', {
      dnaFileId: dnaFile._id.toString(),
      inputFileName: file.originalname,
      inputFileSize: file.size
    });

    const jobPayload = {
      jobId,
      userId: req.user._id.toString(),
      dnaFileId: dnaFile._id.toString(),
      filePath: file.path,
      fileName: file.originalname,
      variantIds: []
    };

    try {
      await queueService.enqueueInstantAnalysis(jobPayload);
    } catch (queueErr) {
      // Sync fallback
      const result = await fastapiService.runInstantAnalysisFile(file.path, file.originalname, []);
      const updateData = _mapInstantResultToDNAFile(result, jobId);
      await DNAFile.findByIdAndUpdate(dnaFile._id, updateData);
      await AnalysisJob.findOneAndUpdate(
        { jobId },
        { status: 'completed', completedAt: new Date(), progress: 100, result }
      );
      return res.json({
        message: 'CSV batch analysis completed.',
        jobId,
        dnaFileId: dnaFile._id.toString(),
        sequencesParsed: result.sequences_parsed,
        result
      });
    }

    return res.status(202).json({
      message: 'CSV batch analysis queued.',
      jobId,
      dnaFileId: dnaFile._id.toString(),
      statusUrl: `/api/analysis/analysis-status/${jobId}`,
      resultUrl: `/api/analysis/analysis-result/${jobId}`
    });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/analysis/analysis-status/:jobId
// ────────────────────────────────────────────────────────────────────────────
router.get('/analysis-status/:jobId', protect, async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const status = await queueService.getJobStatus(jobId);

    if (status.status === 'not_found') {
      return res.status(404).json({ message: 'Job not found.', jobId });
    }

    return res.json(status);
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/analysis/analysis-result/:jobId
// ────────────────────────────────────────────────────────────────────────────
router.get('/analysis-result/:jobId', protect, async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const jobData = await queueService.getJobResult(jobId);

    if (!jobData) return res.status(404).json({ message: 'Job not found.', jobId });
    if (jobData.status === 'queued' || jobData.status === 'processing') {
      return res.status(202).json({
        message: 'Analysis still in progress.',
        status: jobData.status,
        progress: jobData.progress,
        jobId
      });
    }
    if (jobData.status === 'failed') {
      return res.status(500).json({
        message: 'Analysis failed.',
        error: jobData.errorMessage,
        jobId
      });
    }

    return res.json({
      jobId,
      status: jobData.status,
      analysisType: jobData.analysisType,
      completedAt: jobData.completedAt,
      result: jobData.result
    });
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/analysis/download-report/:jobId
// Returns a PDF report download
// ────────────────────────────────────────────────────────────────────────────
router.get('/download-report/:jobId', protect, async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const jobData = await queueService.getJobResult(jobId);

    if (!jobData) return res.status(404).json({ message: 'Job not found.' });
    if (jobData.status !== 'completed') {
      return res.status(202).json({ message: 'Analysis not yet complete.', status: jobData.status });
    }

    let pdfBuffer;
    if (jobData.analysisType === 'instant') {
      pdfBuffer = await fastapiService.getInstantAnalysisPDF(jobData.result);
    } else {
      pdfBuffer = await fastapiService.getDeepAnalysisPDF(jobData.result);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="genelab_report_${jobId.slice(0, 8)}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) { next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/analysis/my-jobs
// Lists all analysis jobs for the authenticated user
// ────────────────────────────────────────────────────────────────────────────
router.get('/my-jobs', protect, async (req, res, next) => {
  try {
    const jobs = await AnalysisJob.find({ userId: req.user._id })
      .select('-result')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json(jobs);
  } catch (err) { next(err); }
});

// ── Helper: map instant result to DNAFile schema ──────────────────────────
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
    gcContent: result.gc_content || stats.gc_content,
    atContent: result.at_content || stats.at_content,
    nucleotideFrequency: { A: nf.A, T: nf.T, G: nf.G, C: nf.C, N: nf.N },
    nucleotidePercentage: { A: np.A, T: np.T, G: np.G, C: np.C, N: np.N },
    gcSkew: result.gc_skew || stats.gc_skew,
    atSkew: result.at_skew || stats.at_skew,
    molecularWeightDa: result.molecular_weight_da || stats.molecular_weight_estimate_da,
    codonAnalysis: {
      totalCodons: codon.total_codons,
      proteinLength: codon.protein_length,
      startCodonCount: codon.start_codon_count,
      stopCodonCount: codon.stop_codon_count,
      openReadingFramesDetected: codon.open_reading_frames_detected,
      aminoAcidSequencePreview: codon.amino_acid_sequence,
      codonFrequency: codon.codon_frequency
    },
    mutations,
    hasAnomalies: mutations.length > 0,
    variantsAnalyzed: mutationAnalysis.variants_analyzed,
    highSeverityCount: mutationAnalysis.high_severity_count,
    diseaseAssociations: mutationAnalysis.disease_associations || [],
    clinicalSummary: mutationAnalysis.clinical_summary,
    variants: variants.map(v => ({
      variantId: v.variant_id,
      gene: v.gene,
      clinicalSignificance: v.clinical_significance,
      severity: v.severity,
      diseaseAssociations: v.disease_associations,
      caddPhredScore: v.cadd_phred_score,
      populationFrequency: v.population_frequency,
      rsid: v.rsid,
      chromosome: v.chromosome,
      position: v.position
    })),
    scientificSummary: result.scientific_summary,
    confidence: result.confidence,
    topRepeats: (result.top_repeats || []).slice(0, 10).map(r => ({
      kmer: r.kmer, count: r.count, frequency: r.frequency
    }))
  };
}

module.exports = router;
