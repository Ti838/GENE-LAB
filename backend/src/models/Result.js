/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SequencingRequest', required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Quality Metrics
  qualityMetrics: {
    coverageDepth: { type: String, default: '30x' },
    totalReads: { type: String, default: '3.2B' },
    gcContent: { type: String, default: '41%' },
    passQC: { type: String, default: '99.8%' },
    contamination: { type: String, default: '0%' },
    readLength: { type: String, default: '150bp' }
  },
  // Variant Summary
  variantSummary: {
    snvs: { type: Number, default: 0 },
    indels: { type: Number, default: 0 },
    svs: { type: Number, default: 0 },
    pathogenic: { type: Number, default: 0 },
    vus: { type: Number, default: 0 },
    benign: { type: Number, default: 0 }
  },
  // Variant Table (array of variants)
  variants: [{
    gene: String,
    variant: String,
    classification: { type: String, enum: ['Pathogenic', 'VUS', 'Benign', 'Likely Pathogenic', 'Likely Benign'] },
    frequency: String,
    clinVar: String,
    chromosome: String,
    position: Number,
    evidence: String
  }],
  analysisSummary: { type: String },
  clinicalRecommendations: { type: String },
  analystName: { type: String, default: 'GeneLab AI Analysis System' },
  analysisDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);

