/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    default: 'Untitled Note'
  },
  content: {
    type: String,
    trim: true,
    default: ''
  },
  dnaFile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DNAFile'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Note', noteSchema);
