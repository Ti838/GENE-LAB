/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
const mongoose = require('mongoose');

const dnaSchema = new mongoose.Schema({
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: { type: String, required: true },
    sequence: { type: String }, // Stores extracted clean sequence (up to 500k chars)
    analysisResults: {
        totalNucleotides: { type: Number, default: 0 },
        gcContent: { type: Number, default: 0 },
        atRatio: { type: Number, default: 0 },
        counts: {
            A: { type: Number, default: 0 },
            T: { type: Number, default: 0 },
            G: { type: Number, default: 0 },
            C: { type: Number, default: 0 }
        },
        mutations: [{ locus: String, type: String }]
    },
    status: { type: String, enum: ['uploaded', 'analyzed', 'failed'], default: 'uploaded' },
    createdAt: { type: Date, default: Date.now }
});

// Index for fast lookup by doctor
dnaSchema.index({ doctor: 1, createdAt: -1 });

module.exports = mongoose.model('DNA', dnaSchema);

