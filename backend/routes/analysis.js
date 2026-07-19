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
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Optional S3-backed uploads
const { v4: uuidv4 } = require('uuid');
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
const { protect } = require('../middleware/auth');
const AnalysisJob = require('../models/AnalysisJob');
const DNAFile = require('../models/DNAFile');
const queueService = require('../services/queue.service');
const fastapiService = require('../services/fastapi.service');

// ── Multer upload config ──────────────────────────────────────────────────
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
async function runSyncFallback(analysisType, filePath, fileName, sequence, sequenceName, variantIds, bypassBLAST = false) {
  console.log('🔄 runSyncFallback called:', { analysisType, sequenceName, bypassBLAST });
  if (analysisType === 'instant') {
    if (filePath) return fastapiService.runInstantAnalysisFile(filePath, fileName, variantIds || []);
    return fastapiService.runInstantAnalysisText(sequence, sequenceName, variantIds || []);
  } else {
    if (bypassBLAST) {
      console.log('🧬 bypassBLAST is true! Aligning locally...');
      const alignmentService = require('../services/alignment.service');
      const dnaService = require('../services/dna.service');
      let targetSeq = sequence || '';
      if (!targetSeq && filePath && fs.existsSync(filePath)) {
        targetSeq = dnaService.parseSequence(fs.readFileSync(filePath, 'utf-8'));
      }
      return alignmentService.alignLocally(targetSeq);
    }
    console.log('🌐 Calling remote FastAPI deep analysis...');
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
    const { sequence, name, bypassBLAST } = req.body;
    const isBypass = bypassBLAST === 'true' || bypassBLAST === true;
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
      s3Url: file?.location || undefined,
      bypassBLAST: isBypass
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
      const result = await runSyncFallback('deep', file?.path, file?.originalname, sequence, name, [], isBypass);
      if (dnaFileId) {
        await DNAFile.findByIdAndUpdate(dnaFileId, {
          status: 'analyzed',
          analysisType: 'deep',
          analysisJobId: jobId,
          sequence: sequence || result.sequence || undefined,
          blastResult: {
            status: result.status,
            rid: result.rid,
            totalHits: result.total_hits,
            topOrganism: result.top_organism,
            topIdentity: result.top_identity,
            topAccession: result.top_accession,
            topEvalue: result.top_evalue,
            organismsIdentified: result.organisms_identified,
            scientificExplanation: result.scientific_explanation,
            hits: result.hits
          },
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
    const { s3Key, s3Url, originalName } = req.body || {};

    // Support direct-S3 uploads: client uploads to S3 and posts s3Key + originalName here
    if (!file && !s3Key) return res.status(400).json({ message: 'No CSV file provided. Upload a file or provide s3Key.' });
    if (file && !file.originalname.toLowerCase().endsWith('.csv')) {
      return res.status(400).json({ message: 'File must be a .csv file.' });
    }

    // Create the DNAFile record for the CSV
    let dnaFilePayload;
    if (s3Key) {
      dnaFilePayload = {
        originalName: originalName || 'uploaded.csv',
        filename: originalName || 'uploaded.csv',
        path: `s3://${S3_BUCKET}/${s3Key}`,
        size: undefined,
        mimetype: 'text/csv',
        doctor: req.user._id,
        status: 'analyzing',
        analysisType: 'instant',
        notes: 'CSV batch upload (S3)',
        s3Key,
        s3Url: s3Url || (S3_BUCKET ? `https://${S3_BUCKET}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${s3Key}` : undefined)
      };
    } else {
      dnaFilePayload = {
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
      filePath: file?.path,
      fileName: (file && file.originalname) || originalName || dnaFile.originalName,
      variantIds: [],
      s3Key: s3Key || dnaFile.s3Key || undefined,
      s3Url: s3Url || dnaFile.s3Url || undefined
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
// Returns a PDF report download (supports both jobId and DNAFile ID)
// ────────────────────────────────────────────────────────────────────────────
router.get('/download-report/:jobId', protect, async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // 1. Try to find the DNAFile directly by its ID or by its analysisJobId
    let dnaFile = null;
    if (mongoose.Types.ObjectId.isValid(jobId)) {
      dnaFile = await DNAFile.findOne({ _id: jobId, doctor: req.user._id }).lean();
    }
    if (!dnaFile) {
      dnaFile = await DNAFile.findOne({ analysisJobId: jobId, doctor: req.user._id }).lean();
    }

    let pdfBuffer;
    let originalName = 'report';

    if (dnaFile) {
      if (dnaFile.status !== 'analyzed') {
        return res.status(202).json({ message: 'Analysis not yet complete.', status: dnaFile.status });
      }
      originalName = dnaFile.originalName;

      // Reconstruct FastAPI payload from DNAFile document
      const analysisType = dnaFile.analysisType || 'instant';
      const mappedResult = _mapDNAFileToFastAPIResult(dnaFile);

      if (analysisType === 'instant') {
        try {
          pdfBuffer = await fastapiService.getInstantAnalysisPDF(mappedResult);
        } catch (err) {
          logger.warn(`FastAPI PDF service unreachable: ${err.message}. Using fallback.`, { fileId: jobId });
          pdfBuffer = _generateFallbackPDF(originalName, mappedResult);
        }
      } else {
        try {
          pdfBuffer = await fastapiService.getDeepAnalysisPDF(mappedResult);
        } catch (err) {
          logger.warn(`FastAPI PDF service unreachable: ${err.message}. Using fallback.`, { fileId: jobId });
          pdfBuffer = _generateFallbackPDF(originalName, mappedResult);
        }
      }
    } else {
      // Fallback to original AnalysisJob lookup
      const jobData = await queueService.getJobResult(jobId);
      if (!jobData) return res.status(404).json({ message: 'Report/Job not found.' });
      if (jobData.status !== 'completed') {
        return res.status(202).json({ message: 'Analysis not yet complete.', status: jobData.status });
      }

      originalName = jobData.inputFileName || 'report';
      if (jobData.analysisType === 'instant') {
        try {
          pdfBuffer = await fastapiService.getInstantAnalysisPDF(jobData.result);
        } catch (err) {
          logger.warn(`FastAPI PDF service unreachable: ${err.message}. Using fallback.`, { jobId });
          pdfBuffer = _generateFallbackPDF(originalName, jobData.result);
        }
      } else {
        try {
          pdfBuffer = await fastapiService.getDeepAnalysisPDF(jobData.result);
        } catch (err) {
          logger.warn(`FastAPI PDF service unreachable: ${err.message}. Using fallback.`, { jobId });
          pdfBuffer = _generateFallbackPDF(originalName, jobData.result);
        }
      }
    }

    const safeName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="genelab_report_${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (err) { next(err); }
});

// Helper: Reconstruct FastAPI response payload structure from DNAFile model fields
function _mapDNAFileToFastAPIResult(file) {
  if (file.analysisType === 'deep' || file.blastResult?.rid) {
    const blast = file.blastResult || {};
    return {
      rid: blast.rid,
      total_hits: blast.totalHits || 0,
      top_organism: blast.topOrganism,
      top_identity: blast.topIdentity || 0,
      top_accession: blast.topAccession,
      top_evalue: blast.topEvalue,
      organisms_identified: blast.organismsIdentified || [],
      scientific_explanation: blast.scientificExplanation || file.scientificSummary || '',
      hits: (blast.hits || []).map(h => ({
        accession: h.accession,
        identity_percentage: h.identity_percentage || h.identityPercentage || 0,
        e_value: h.e_value || h.eValue || 0,
        bit_score: h.bit_score || h.bitScore || 0,
        organism: h.organism
      }))
    };
  } else {
    const stats = {
      sequence_length: file.sequenceLength || 0,
      gc_content: file.gcContent > 0 && file.gcContent <= 1 ? file.gcContent * 100 : (file.gcContent || 0),
      at_content: file.atContent > 0 && file.atContent <= 1 ? file.atContent * 100 : (file.atContent || 0),
      nucleotide_frequency: file.nucleotideFrequency || {},
      nucleotide_percentage: file.nucleotidePercentage || {},
      gc_skew: file.gcSkew || 0,
      at_skew: file.atSkew || 0,
      molecular_weight_estimate_da: file.molecularWeightDa || 0
    };
    const codon = file.codonAnalysis ? {
      total_codons: file.codonAnalysis.totalCodons || 0,
      protein_length: file.codonAnalysis.proteinLength || 0,
      start_codon_count: file.codonAnalysis.startCodonCount || 0,
      stop_codon_count: file.codonAnalysis.stopCodonCount || 0,
      open_reading_frames_detected: file.codonAnalysis.openReadingFramesDetected || 0,
      amino_acid_sequence: file.codonAnalysis.aminoAcidSequencePreview || '',
      codon_frequency: file.codonAnalysis.codonFrequency || {}
    } : {};
    const mutation = {
      variants_analyzed: file.variantsAnalyzed || 0,
      high_severity_count: file.highSeverityCount || 0,
      disease_associations: file.diseaseAssociations || [],
      clinical_summary: file.clinicalSummary || '',
      variants: (file.variants || []).map(v => ({
        variant_id: v.variantId || v.rsid || '',
        gene: v.gene || '',
        clinical_significance: v.clinicalSignificance || '',
        severity: v.severity || '',
        disease_associations: v.diseaseAssociations || [],
        cadd_phred_score: v.caddPhredScore || 0,
        population_frequency: v.populationFrequency || 0,
        rsid: v.rsid || '',
        chromosome: v.chromosome || '',
        position: v.position || 0
      }))
    };
    return {
      statistics: stats,
      codon_analysis: codon,
      mutation_analysis: mutation,
      scientific_summary: file.scientificSummary || '',
      confidence: file.confidence || 1.0
    };
  }
}

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

function _generateFallbackPDF(fileName, data) {
  const len = data.sequenceLength || data.sequence_length || 0;
  const gc = ((data.gcContent || data.gc_content || 0) * 100).toFixed(1);
  const summary = data.scientificSummary || data.scientific_summary || 'Genomic analysis complete.';
  const codon = data.codonAnalysis || data.codon_analysis || {};
  const totalCodons = codon.totalCodons || codon.total_codons || 0;

  const lines = [
    'GENELAB CLINICAL DIAGNOSTIC REPORT',
    '==================================',
    `File Name: ${fileName}`,
    `Sequence Length: ${len} bp`,
    `GC Content: ${gc}%`,
    `Total Codons: ${totalCodons}`,
    `Scientific Summary: ${summary.substring(0, 200)}...`,
    '----------------------------------',
    'Note: This is a backup report generated locally because',
    'the heavy python bio-engine was offline during download.'
  ];

  let streamContent = 'BT\n/F1 12 Tf\n50 750 Td\n18 TL\n';
  lines.forEach(line => {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    streamContent += `(${escaped}) Tj T*\n`;
  });
  streamContent += 'ET';

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${streamContent.length} >>
stream
${streamContent}
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000286 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
${350 + streamContent.length}
%%EOF`;

  return Buffer.from(pdf, 'utf-8');
}

module.exports = router;
