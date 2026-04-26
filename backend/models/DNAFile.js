/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
const mongoose = require('mongoose');

const dnaFileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  filename: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number },
  status: { 
    type: String, 
    enum: ['uploaded', 'analyzing', 'analyzed', 'failed'], 
    default: 'uploaded' 
  },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sequence: { type: String }, // For manual paste or short sequences
  
  // Analysis Results
  gcContent: { type: Number },
  nucleotideFrequency: {
    a: { type: Number },
    t: { type: Number },
    g: { type: Number },
    c: { type: Number }
  },
  mutations: [{ type: String }],
  hasAnomalies: { type: Boolean, default: false },
  
  // Metadata
  sampleType: { type: String },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('DNAFile', dnaFileSchema);
