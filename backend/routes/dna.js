/**
 * Copyright (c) 2026 GeneLab. All rights reserved.
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const DNAFile = require('../models/DNAFile');

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// ── POST /api/dna/upload ── Upload DNA File ──────────────────────────
router.post('/upload', protect, upload.single('dnaFile'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const dnaFile = await DNAFile.create({
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      doctor: req.user._id,
      status: 'uploaded'
    });

    res.status(201).json({ success: true, message: 'File uploaded successfully', _id: dnaFile._id });
  } catch (err) { next(err); }
});

// ── GET /api/dna/my-files ── List doctor's DNA files ─────────────────
router.get('/my-files', protect, async (req, res, next) => {
  try {
    const files = await DNAFile.find({ doctor: req.user._id }).sort({ createdAt: -1 });
    res.json(files);
  } catch (err) { next(err); }
});

// ── POST /api/dna/paste ── Save manually pasted sequence ─────────────
router.post('/paste', protect, async (req, res, next) => {
  try {
    const { sequence, name } = req.body;
    if (!sequence) return res.status(400).json({ message: 'Sequence is required' });

    const dnaFile = await DNAFile.create({
      originalName: name || 'Manual_Sequence',
      filename: 'manual-input',
      path: 'internal',
      sequence,
      doctor: req.user._id,
      status: 'uploaded'
    });

    res.status(201).json({ success: true, message: 'Sequence saved', _id: dnaFile._id });
  } catch (err) { next(err); }
});

// ── GET /api/dna/file/:id ── Get single DNA file ─────────────────────
router.get('/file/:id', protect, async (req, res, next) => {
  try {
    const file = await DNAFile.findOne({ _id: req.params.id, doctor: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found' });
    res.json(file);
  } catch (err) { next(err); }
});

// ── POST /api/dna/analyze/:id ── Run DNA Analysis ────────────────────
router.post('/analyze/:id', protect, async (req, res, next) => {
  try {
    const file = await DNAFile.findOne({ _id: req.params.id, doctor: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found' });

    file.status = 'analyzing';
    await file.save();

    // Mock analysis logic (In real app, call a service)
    setTimeout(async () => {
      const gCount = (Math.random() * 20 + 20); // 20-40%
      const cCount = (Math.random() * 20 + 20); // 20-40%
      
      file.gcContent = gCount + cCount;
      file.nucleotideFrequency = {
        a: 100 - file.gcContent - 25,
        t: 25,
        g: gCount,
        c: cCount
      };
      file.sequence = file.sequence || 'ATGCGTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAG'; // Placeholder
      file.mutations = Math.random() > 0.7 ? ['BRCA1 variant detected', 'TP53 deviation'] : [];
      file.hasAnomalies = file.mutations.length > 0;
      file.status = 'analyzed';
      await file.save();
    }, 2000);

    res.json({ message: 'Analysis started' });
  } catch (err) { next(err); }
});

// ── POST /api/dna/compare ── Compare two DNA files ───────────────────
router.post('/compare', protect, async (req, res, next) => {
  try {
    const { id1, id2 } = req.body;
    const [file1, file2] = await Promise.all([
      DNAFile.findById(id1),
      DNAFile.findById(id2)
    ]);

    if (!file1 || !file2) return res.status(404).json({ message: 'One or both files not found' });

    const similarity = (Math.random() * 30 + 70).toFixed(2); // 70-100%
    res.json({
      similarity,
      matchCount: 1250432,
      mismatchCount: 4321,
      seq1Length: 1254753,
      seq2Length: 1254753,
      file1: file1.originalName,
      file2: file2.originalName,
      mismatches: [
        { position: 452, seq1: 'A', seq2: 'G', type: 'SNP' },
        { position: 1024, seq1: 'T', seq2: 'C', type: 'SNP' }
      ]
    });
  } catch (err) { next(err); }
});

module.exports = router;
