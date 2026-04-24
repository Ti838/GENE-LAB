/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
