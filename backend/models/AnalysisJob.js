/**
 * GenLab AI — AnalysisJob MongoDB Model
 * Tracks every BullMQ analysis job in MongoDB for persistence,
 * history, and result retrieval even after Redis evicts the job.
 */
const mongoose = require('mongoose');

const analysisJobSchema = new mongoose.Schema({
  // BullMQ job ID (string)
  jobId: { type: String, required: true, unique: true, index: true },

  // Who submitted this job
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Linked DNA file (optional — from /api/dna/upload flow)
  dnaFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'DNAFile' },

  // 'instant' | 'deep'
  analysisType: {
    type: String,
    enum: ['instant', 'deep'],
    required: true
  },

  // Job lifecycle status
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued'
  },

  // Input metadata
  inputFileName: { type: String },
  inputFileSize: { type: Number },
  inputSequenceLength: { type: Number },

  // Progress 0–100 (updated by worker)
  progress: { type: Number, default: 0, min: 0, max: 100 },

  // Error message if failed
  errorMessage: { type: String },

  // Full analysis result stored here on completion
  result: { type: mongoose.Schema.Types.Mixed },

  // Timestamps
  queuedAt:    { type: Date, default: Date.now },
  startedAt:   { type: Date },
  completedAt: { type: Date },
}, {
  timestamps: true,
  collection: 'analysis_jobs'
});

// Advanced indexing for optimized queue tracking and history lookups
analysisJobSchema.index({ userId: 1 });
analysisJobSchema.index({ dnaFileId: 1 });
analysisJobSchema.index({ status: 1 });
analysisJobSchema.index({ queuedAt: -1 });

module.exports = mongoose.model('AnalysisJob', analysisJobSchema);
