/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 * Do not copy, distribute, or modify without permission.
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Note = require('../models/Note');

router.use(protect);

// Create a note (optionally linked to a DNA file)
router.post('/', async (req, res) => {
    try {
        const { title, content, dnaFileId } = req.body;
        const note = await Note.create({
            doctor: req.user.id,
            dnaFile: dnaFileId || null,
            title: title || 'Untitled Note',
            content: content || ''
        });
        res.status(201).json(note);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all notes for the logged-in doctor
router.get('/', async (req, res) => {
    try {
        const notes = await Note.find({ doctor: req.user.id }).populate('dnaFile', 'originalName').sort('-updatedAt');
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a note
router.put('/:id', async (req, res) => {
    try {
        const note = await Note.findOne({ _id: req.params.id, doctor: req.user.id });
        if (!note) return res.status(404).json({ message: 'Note not found' });

        note.title = req.body.title || note.title;
        note.content = req.body.content || note.content;
        await note.save();
        res.json(note);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a note
router.delete('/:id', async (req, res) => {
    try {
        const note = await Note.findOneAndDelete({ _id: req.params.id, doctor: req.user.id });
        if (!note) return res.status(404).json({ message: 'Note not found' });
        res.json({ message: 'Note deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

