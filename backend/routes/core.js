/**
 * GenLab AI — Core Category-Wise API Router
 * Implements:
 *   - /api/core/dna         (Core DNA API - BioPython engine only, offline-ready, cache-validated)
 *   - /api/core/mutation    (Mutation API - Internal catalog first, MyVariant fallback)
 *   - /api/core/alignment   (Alignment API - Internal scoring first, async BLAST option)
 *   - /api/core/jobs        (Job system - BullMQ + Redis queue tracking)
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

const cacheService = require('../services/cache.service');
const mutationService = require('../services/mutation.service');
const alignmentService = require('../services/alignment.service');
const queueService = require('../services/queue.service');
const fastapiService = require('../services/fastapi.service');
const loggerService = require('../services/logger.service');

// ── Multer setup ───────────────────────────────────────────────────────────
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

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
});

// ────────────────────────────────────────────────────────────────────────────
// 1. CORE DNA API (INTERNAL & OFFLINE ONLY)
// POST /api/core/dna
// ────────────────────────────────────────────────────────────────────────────
router.post('/dna', protect, upload.single('file'), async (req, res, next) => {
  try {
    let sequence = req.body.sequence || '';
    let name = req.body.name || 'manual_sequence';
    const variantIds = req.body.variantIds 
      ? (Array.isArray(req.body.variantIds) ? req.body.variantIds : req.body.variantIds.split(',').map(s => s.trim()))
      : [];

    if (req.file) {
      const content = fs.readFileSync(req.file.path, 'utf-8');
      const parsed = require('../services/dna.service').parseSequence(content);
      sequence = parsed;
      name = req.file.originalname;
      // Cleanup temp uploaded file
      fs.unlinkSync(req.file.path);
    }

    if (!sequence) {
      return res.status(400).json({ status: 'error', message: 'No DNA sequence or file provided.' });
    }

    const cleanSeq = cacheService.cleanSequence(sequence);

    // ── Check cache first ───────────────────────────────────────────────────
    const cached = await cacheService.getCachedResult(cleanSeq, 'instant');
    if (cached) {
      return res.json({
        status: 'completed',
        cached: true,
        result: cached
      });
    }

    // ── Cache Miss → Run Offline BioPython microservice ──────────────────────
    try {
      const result = await fastapiService.runInstantAnalysisText(cleanSeq, name, variantIds);
      
      // Save in cache store (async)
      await cacheService.setCachedResult(cleanSeq, 'instant', result, req.user._id);

      return res.json({
        status: 'completed',
        cached: false,
        result
      });
    } catch (err) {
      loggerService.error(err, 'core.dna.biopython', req);
      return res.status(500).json({
        status: 'error',
        message: 'BioPython processing failed.',
        detail: err.message
      });
    }
  } catch (err) {
    loggerService.error(err, 'core.dna', req);
    next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 2. MUTATION API
// POST /api/core/mutation
// ────────────────────────────────────────────────────────────────────────────
router.post('/mutation', protect, async (req, res, next) => {
  try {
    const { sequence, variantIds = [] } = req.body;
    const cleanSeq = cacheService.cleanSequence(sequence);

    if (!cleanSeq && variantIds.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Provide sequence or variantIds (rsIDs).' });
    }

    const varIds = Array.isArray(variantIds) 
      ? variantIds 
      : String(variantIds).split(',').map(s => s.trim()).filter(Boolean);

    // Try MyVariant API via bioservice first
    try {
      const result = await fastapiService.runInstantAnalysisText(cleanSeq || 'A', 'mutation_query', varIds);
      
      // Save result to cache
      if (cleanSeq) {
        await cacheService.setCachedResult(cleanSeq, 'instant', result, req.user._id);
      }

      return res.json({
        status: 'completed',
        source: 'MyVariant.info REST API',
        result: result.mutation_analysis || result
      });
    } catch (apiErr) {
      // ── API FAIL FALLBACK ─────────────────────────────────────────────────
      loggerService.warn(`MyVariant API failed, executing local annotation fallback: ${apiErr.message}`, 'core.mutation.fallback', req);
      
      const localResult = mutationService.annotateLocalVariants(varIds);
      
      return res.json({
        status: 'completed',
        source: 'GeneLab Internal Fallback Database',
        result: localResult
      });
    }
  } catch (err) {
    loggerService.error(err, 'core.mutation', req);
    next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 3. ALIGNMENT API (DEEP & ASYNC QUEUED)
// POST /api/core/alignment
// ────────────────────────────────────────────────────────────────────────────
router.post('/alignment', protect, upload.single('file'), async (req, res, next) => {
  try {
    let sequence = req.body.sequence || '';
    let name = req.body.name || 'alignment_query';
    const bypassBLAST = req.body.bypassBLAST === 'true' || req.body.bypassBLAST === true;

    if (req.file) {
      const content = fs.readFileSync(req.file.path, 'utf-8');
      sequence = require('../services/dna.service').parseSequence(content);
      name = req.file.originalname;
      fs.unlinkSync(req.file.path);
    }

    if (!sequence) {
      return res.status(400).json({ status: 'error', message: 'Provide DNA sequence or file.' });
    }

    const cleanSeq = cacheService.cleanSequence(sequence);

    // ── Check Cache ─────────────────────────────────────────────────────────
    const cached = await cacheService.getCachedResult(cleanSeq, 'deep');
    if (cached) {
      return res.json({
        status: 'completed',
        cached: true,
        result: cached
      });
    }

    // ── Cache Miss → Queue Job ──────────────────────────────────────────────
    const jobId = uuidv4();
    
    // Create record in MongoDB analysis_jobs
    await AnalysisJob.create({
      jobId,
      userId: req.user._id,
      analysisType: 'deep',
      status: 'queued',
      inputFileName: name,
      inputSequenceLength: cleanSeq.length
    });

    const jobPayload = {
      jobId,
      userId: req.user._id.toString(),
      sequence: cleanSeq,
      sequenceName: name,
      bypassBLAST
    };

    try {
      await queueService.enqueueDeepAnalysis(jobPayload);
      return res.status(202).json({
        status: 'queued',
        message: 'Deep sequence alignment job queued successfully.',
        jobId,
        statusUrl: `/api/core/jobs/${jobId}`
      });
    } catch (queueErr) {
      // ── Queue Fallback to Instant Sync Local Alignment ─────────────────────
      loggerService.warn(`Redis/Queue down. Processing alignment synchronously: ${queueErr.message}`, 'core.alignment.sync', req);
      
      const localResult = alignmentService.alignLocally(cleanSeq);
      
      await cacheService.setCachedResult(cleanSeq, 'deep', localResult, req.user._id);
      
      await AnalysisJob.findOneAndUpdate(
        { jobId },
        { status: 'completed', completedAt: new Date(), progress: 100, result: localResult }
      );

      return res.json({
        status: 'completed',
        message: 'Processed synchronously (Queue Offline).',
        jobId,
        result: localResult
      });
    }
  } catch (err) {
    loggerService.error(err, 'core.alignment', req);
    next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 4. JOB SYSTEM
// GET /api/core/jobs/:id
// ────────────────────────────────────────────────────────────────────────────
router.get('/jobs/:id', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await AnalysisJob.findOne({ jobId: id }).lean();
    
    if (!job) {
      return res.status(404).json({ status: 'error', message: 'Job not found.' });
    }

    return res.json({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      queuedAt: job.queuedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
      result: job.status === 'completed' ? job.result : undefined
    });
  } catch (err) {
    loggerService.error(err, 'core.jobs', req);
    next(err);
  }
});

module.exports = router;
