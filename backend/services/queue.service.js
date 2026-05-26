/**
 * GenLab AI — BullMQ Queue Service
 * Sets up Redis connection, BullMQ queues, and worker processors
 * for async instant and deep genomics analysis jobs.
 *
 * Architecture:
 *   - Two queues: 'instant-analysis' (fast) and 'deep-analysis' (slow)
 *   - Workers call FastAPI service and write results to MongoDB
 *   - AnalysisJob model tracks every job's lifecycle
 */

const { Queue, Worker, QueueEvents } = require('bullmq');
const { createClient } = require('ioredis');
const AnalysisJob = require('../models/AnalysisJob');
const DNAFile = require('../models/DNAFile');
const fastapiService = require('./fastapi.service');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const { pipeline } = require('stream/promises');

// Optional S3 download helper (used when uploads are stored in S3)
const S3_BUCKET = process.env.S3_BUCKET;
let s3Client = null;
let GetObjectCommand = null;
if (S3_BUCKET) {
  const { S3Client, GetObjectCommand: _GetObjectCommand } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({ region: process.env.S3_REGION || 'us-east-1' });
  GetObjectCommand = _GetObjectCommand;
}

// ── Redis connection ──────────────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ioredis connection config (shared by BullMQ queues and workers)
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: null,  // Required by BullMQ
  enableReadyCheck: false
};

// ── Queue definitions ─────────────────────────────────────────────────────
let instantQueue = null;
let deepQueue = null;
let instantQueueEvents = null;
let deepQueueEvents = null;
let workersInitialized = false;

/**
 * Initialize queues and workers.
 * Must be called once at server startup (after MongoDB is connected).
 */
function initQueues() {
  if (workersInitialized) return;

  try {
    // ── Queues ──────────────────────────────────────────────────────────
    instantQueue = new Queue('instant-analysis', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 500 },
        removeOnFail:    { count: 200 }
      }
    });

    deepQueue = new Queue('deep-analysis', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: { count: 200 },
        removeOnFail:    { count: 100 }
      }
    });

    instantQueueEvents = new QueueEvents('instant-analysis', { connection: redisConnection });
    deepQueueEvents    = new QueueEvents('deep-analysis',    { connection: redisConnection });

    // ── Workers ─────────────────────────────────────────────────────────
    _createInstantWorker();
    _createDeepWorker();

    workersInitialized = true;
    console.log('✅ BullMQ queues and workers initialized');
  } catch (err) {
    console.warn('⚠️  BullMQ/Redis unavailable — queue system disabled:', err.message);
    console.warn('   Analysis requests will be processed synchronously.');
  }
}

// ── Instant Analysis Worker ───────────────────────────────────────────────
function _createInstantWorker() {
  const worker = new Worker('instant-analysis', async (job) => {
    const { jobId, filePath, fileName, sequence, sequenceName, variantIds, dnaFileId, userId, s3Key } = job.data;

    // Mark started in MongoDB
    await AnalysisJob.findOneAndUpdate(
      { jobId },
      { status: 'processing', startedAt: new Date(), progress: 5 }
    );

    await job.updateProgress(10);

    let result;
    let tempFilePath = null;
    try {
      if (s3Key && s3Client) {
        // Let FastAPI fetch the object from S3 directly by s3Key
        result = await fastapiService.runInstantAnalysisS3(s3Key, fileName, variantIds || []);
      } else if (filePath && fs.existsSync(filePath)) {
        result = await fastapiService.runInstantAnalysisFile(filePath, fileName, variantIds || []);
      } else if (sequence) {
        result = await fastapiService.runInstantAnalysisText(sequence, sequenceName || 'manual', variantIds || []);
      } else {
        throw new Error('No file path or sequence provided to instant analysis worker');
      }
    } catch (err) {
      // Mark job as failed
      await AnalysisJob.findOneAndUpdate(
        { jobId },
        { status: 'failed', errorMessage: err.message, completedAt: new Date(), progress: 0 }
      );
      if (dnaFileId) {
        await DNAFile.findByIdAndUpdate(dnaFileId, { status: 'failed', errorMessage: err.message });
      }
      throw err;
    }

    await job.updateProgress(80);

    // ── Persist result to MongoDB DNAFile ──────────────────────────────
    if (dnaFileId) {
      const updatePayload = _mapResultToDNAFile(result, 'instant', jobId);
      await DNAFile.findByIdAndUpdate(dnaFileId, updatePayload);
    }

    // no local temp cleanup needed when delegating S3 fetch to FastAPI

    await job.updateProgress(95);

    // ── Persist result to AnalysisJob ──────────────────────────────────
    await AnalysisJob.findOneAndUpdate(
      { jobId },
      {
        status: 'completed',
        completedAt: new Date(),
        progress: 100,
        result,
        inputSequenceLength: result.sequence_length || result.sequenceLength
      }
    );

    // Save in CacheStore (async)
    try {
      const cacheService = require('./cache.service');
      const cleanSeq = sequence || result.validation?.cleaned || '';
      if (cleanSeq) {
        await cacheService.setCachedResult(cleanSeq, 'instant', result, userId, dnaFileId);
      }
    } catch (cacheErr) {
      console.warn('⚠️ Cache store failed in worker:', cacheErr.message);
    }

    await job.updateProgress(100);
    return result;

  }, {
    connection: redisConnection,
    concurrency: 4  // Process up to 4 instant jobs in parallel
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Instant job ${job?.id} failed:`, err.message);
  });
}

// ── Deep Analysis Worker ──────────────────────────────────────────────────
function _createDeepWorker() {
  const worker = new Worker('deep-analysis', async (job) => {
    const { jobId, filePath, fileName, sequence, sequenceName, dnaFileId, s3Key } = job.data;

    await AnalysisJob.findOneAndUpdate(
      { jobId },
      { status: 'processing', startedAt: new Date(), progress: 5 }
    );

    await job.updateProgress(10);

    let result;
    const { bypassBLAST, userId } = job.data;
    try {
      if (bypassBLAST) {
        const alignmentService = require('./alignment.service');
        result = alignmentService.alignLocally(sequence || '');
      } else {
        try {
          if (filePath && fs.existsSync(filePath)) {
            result = await fastapiService.runDeepAnalysisFile(filePath, fileName);
          } else if (sequence) {
            result = await fastapiService.runDeepAnalysisText(sequence, sequenceName || 'manual');
          } else {
            throw new Error('No file path or sequence provided to deep analysis worker');
          }
        } catch (apiErr) {
          console.warn('⚠️ Deep BLAST API failed, falling back to local Smith-Waterman alignment:', apiErr.message);
          const alignmentService = require('./alignment.service');
          result = alignmentService.alignLocally(sequence || '');
        }
      }

      // Save in CacheStore (async)
      try {
        const cacheService = require('./cache.service');
        const cleanSeq = sequence || result.sequence || '';
        if (cleanSeq) {
          await cacheService.setCachedResult(cleanSeq, 'deep', result, userId, dnaFileId);
        }
      } catch (cacheErr) {
        console.warn('⚠️ Cache store failed in worker:', cacheErr.message);
      }
    } catch (err) {
      await AnalysisJob.findOneAndUpdate(
        { jobId },
        { status: 'failed', errorMessage: err.message, completedAt: new Date(), progress: 0 }
      );
      if (dnaFileId) {
        await DNAFile.findByIdAndUpdate(dnaFileId, { status: 'failed', errorMessage: err.message });
      }
      throw err;
    }

    await job.updateProgress(85);

    // ── Persist BLAST result to DNAFile ───────────────────────────────
    if (dnaFileId) {
      await DNAFile.findByIdAndUpdate(dnaFileId, {
        status: 'analyzed',
        analysisType: 'deep',
        analysisJobId: jobId,
        sequence: sequence || result.sequence || undefined,
        gcContent: 0,                  // BLAST doesn't return GC — stays as-is
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

    // no local temp cleanup needed when delegating S3 fetch to FastAPI

    await AnalysisJob.findOneAndUpdate(
      { jobId },
      {
        status: 'completed',
        completedAt: new Date(),
        progress: 100,
        result
      }
    );

    await job.updateProgress(100);
    return result;

  }, {
    connection: redisConnection,
    concurrency: 1  // BLAST is rate-limited by NCBI — process 1 at a time
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Deep job ${job?.id} failed:`, err.message);
  });
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Enqueues an instant analysis job.
 * @param {Object} data - Job payload
 * @returns {Promise<string>} jobId (MongoDB AnalysisJob._id used as jobId)
 */
async function enqueueInstantAnalysis(data) {
  if (!instantQueue) {
    throw new Error('Queue system not initialized. Check Redis connection.');
  }

  const job = await instantQueue.add('instant', data, {
    jobId: data.jobId
  });

  return job.id;
}

/**
 * Enqueues a deep (BLAST) analysis job.
 * @param {Object} data - Job payload
 * @returns {Promise<string>} jobId
 */
async function enqueueDeepAnalysis(data) {
  if (!deepQueue) {
    throw new Error('Queue system not initialized. Check Redis connection.');
  }

  const job = await deepQueue.add('deep', data, {
    jobId: data.jobId
  });

  return job.id;
}

/**
 * Gets the current status of a BullMQ job.
 * Falls back to MongoDB if Redis has evicted the job.
 * @param {string} jobId
 * @returns {Promise<Object>} Status info
 */
async function getJobStatus(jobId) {
  // Try MongoDB first (always up to date via worker updates)
  const dbJob = await AnalysisJob.findOne({ jobId }).select('-result').lean();
  if (!dbJob) {
    return { status: 'not_found', jobId };
  }

  return {
    jobId,
    status: dbJob.status,
    progress: dbJob.progress,
    analysisType: dbJob.analysisType,
    inputFileName: dbJob.inputFileName,
    queuedAt: dbJob.queuedAt,
    startedAt: dbJob.startedAt,
    completedAt: dbJob.completedAt,
    errorMessage: dbJob.errorMessage
  };
}

/**
 * Gets the full result for a completed job.
 * @param {string} jobId
 * @returns {Promise<Object|null>} Full result or null
 */
async function getJobResult(jobId) {
  const dbJob = await AnalysisJob.findOne({ jobId }).lean();
  if (!dbJob) return null;
  return dbJob;
}

// ── Helper: Map FastAPI result to DNAFile update payload ──────────────────
function _mapResultToDNAFile(result, analysisType, jobId) {
  const stats = result.statistics || {};
  const nf = result.nucleotide_frequency || stats.nucleotide_frequency || {};
  const np = result.nucleotide_percentage || stats.nucleotide_percentage || {};
  const codon = result.codon_analysis || {};
  const mutationAnalysis = result.mutation_analysis || {};
  const variants = mutationAnalysis.variants || [];

  const mutations = variants
    .filter(v => v.severity === 'HIGH' || v.severity === 'MODERATE')
    .map(v => `${v.gene || 'Unknown'}: ${v.variant_id || v.rsid || 'variant'} (${v.severity})`);

  return {
    status: 'analyzed',
    analysisType,
    analysisJobId: jobId,
    sequence: result.validation?.cleaned || result.sequence || undefined,
    sequenceLength: result.sequence_length || stats.sequence_length,
    gcContent:  result.gc_content  || stats.gc_content,
    atContent:  result.at_content  || stats.at_content,
    nucleotideFrequency: { A: nf.A, T: nf.T, G: nf.G, C: nf.C, N: nf.N },
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
    variantsAnalyzed:   mutationAnalysis.variants_analyzed,
    highSeverityCount:  mutationAnalysis.high_severity_count,
    diseaseAssociations: mutationAnalysis.disease_associations || [],
    clinicalSummary:    mutationAnalysis.clinical_summary,
    variants: variants.map(v => ({
      variantId:            v.variant_id,
      gene:                 v.gene,
      clinicalSignificance: v.clinical_significance,
      severity:             v.severity,
      diseaseAssociations:  v.disease_associations,
      caddPhredScore:       v.cadd_phred_score,
      populationFrequency:  v.population_frequency,
      rsid:                 v.rsid,
      chromosome:           v.chromosome,
      position:             v.position
    })),
    scientificSummary: result.scientific_summary,
    confidence:        result.confidence,
    topRepeats: (result.top_repeats || []).slice(0, 10).map(r => ({
      kmer: r.kmer, count: r.count, frequency: r.frequency
    }))
  };
}

module.exports = {
  initQueues,
  enqueueInstantAnalysis,
  enqueueDeepAnalysis,
  getJobStatus,
  getJobResult
};
