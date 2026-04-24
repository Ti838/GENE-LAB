/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Announcement = require('../models/Announcement');
const { body, validationResult } = require('express-validator');

// ── GET /api/announcements ── List all active announcements ─────────
router.get('/', protect, async (req, res, next) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .populate('authorId', 'name role')
      .sort({ createdAt: -1 });
    res.json({ announcements });
  } catch (err) { next(err); }
});

// ── POST /api/announcements ── Create announcement (Employee/Admin) ──
router.post('/', protect, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('priority').optional().isIn(['low', 'medium', 'high'])
], async (req, res, next) => {
  try {
    // Check if user is employee or admin
    if (req.user.role !== 'admin' && req.user.role !== 'employee') {
      return res.status(403).json({ message: 'Only employees and admins can post announcements.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, content, priority } = req.body;
    const announcement = await Announcement.create({
      title,
      content,
      priority,
      authorId: req.user._id
    });

    res.status(201).json({ message: 'Announcement posted successfully.', announcement });
  } catch (err) { next(err); }
});

// ── DELETE /api/announcements/:id ── Delete announcement ──────────────
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found.' });

    // Only author or admin can delete
    if (announcement.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this announcement.' });
    }

    await announcement.deleteOne();
    res.json({ message: 'Announcement deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
