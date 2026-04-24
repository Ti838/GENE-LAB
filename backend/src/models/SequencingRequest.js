/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
const mongoose = require('mongoose');

const sequencingRequestSchema = new mongoose.Schema({
  sampleId: { type: String, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Sample Information
  sampleType: {
    type: String,
    enum: ['Whole Genome', 'Whole Exome', 'Targeted Panel', 'RNA-seq'],
    required: true
  },
  specimenType: {
    type: String,
    enum: ['Blood', 'Buccal Swab', 'Tissue', 'Other'],
    required: true
  },
  collectionDate: { type: Date, required: true },
  dnaConcentration: { type: Number },
  dnaPurity: { type: Number },
  // Patient Information
  patientId: { type: String, required: true },
  patientAge: { type: Number, required: true },
  biologicalSex: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  ethnicity: { type: String },
  clinicalIndication: { type: String, required: true },
  familyHistory: { type: Boolean, default: false },
  // Analysis Parameters
  analysisType: {
    type: String,
    enum: ['Diagnostic', 'Research', 'Population Screening'],
    required: true
  },
  diseasePanels: [{ type: String }],
  annotations: [{ type: String }],
  priorityLevel: {
    type: String,
    enum: ['Standard', 'Express', 'Stat'],
    default: 'Standard'
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'analyzing', 'completed', 'rejected', 'error'],
    default: 'pending'
  },
  estimatedCost: { type: Number, default: 250 },
  notes: { type: String },
  adminNotes: { type: String },
  completedAt: { type: Date },
}, { timestamps: true });

// Auto-generate Sample ID
sequencingRequestSchema.pre('save', async function (next) {
  if (!this.sampleId) {
    const count = await mongoose.model('SequencingRequest').countDocuments();
    const year = new Date().getFullYear();
    this.sampleId = `GLS-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('SequencingRequest', sequencingRequestSchema);

