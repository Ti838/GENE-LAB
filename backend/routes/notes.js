/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Note = require('../models/Note');

// ── GET /api/notes ── Get all notes for the authenticated user ─────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const notes = await Note.find({ userId: req.user._id })
      .populate('dnaFile', 'originalName')
      .sort({ updatedAt: -1 });
    res.json(notes);
  } catch (err) { next(err); }
});

// ── POST /api/notes ── Create a new note ──────────────────────────────────
router.post('/', protect, async (req, res, next) => {
  try {
    const { title, content, dnaFile } = req.body;
    
    const note = await Note.create({
      userId: req.user._id,
      title: title || 'Untitled Note',
      content: content || '',
      dnaFile: dnaFile || undefined
    });
    
    res.status(201).json(note);
  } catch (err) { next(err); }
});

// ── PUT /api/notes/:id ── Update a note ───────────────────────────────────
router.put('/:id', protect, async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found.' });

    const { title, content, dnaFile } = req.body;
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (dnaFile !== undefined) note.dnaFile = dnaFile || undefined;

    await note.save();
    res.json(note);
  } catch (err) { next(err); }
});

// ── DELETE /api/notes/:id ── Delete a note ────────────────────────────────
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found.' });

    await Note.deleteOne({ _id: req.params.id });
    res.json({ message: 'Note deleted successfully.' });
  } catch (err) { next(err); }
});

module.exports = router;
